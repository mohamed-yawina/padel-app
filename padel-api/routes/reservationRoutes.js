// routes/reservationRoutes.js
const express = require('express');
const Reservation = require('../models/Reservation');
const Terrain = require('../models/Terrain');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/reservations  (joueur connecté ou admin)
router.post('/', protect, async (req, res) => {
  try {
    const { terrainId, date, time, methodePaiement, statusPaiement, statusReservation } = req.body;

    // Vérifier que tous les champs obligatoires sont présents
    if (!terrainId || !date || !time) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    // Vérifier terrain existe
    const terrain = await Terrain.findById(terrainId);
    if (!terrain) return res.status(404).json({ message: 'Terrain non trouvé' });

    // Parser la date au format JJ/MM/AAAA en UTC
    let reservationDate;
    if (date.includes('/')) {
      const [jour, mois, annee] = date.split('/');
      reservationDate = new Date(Date.UTC(parseInt(annee), parseInt(mois) - 1, parseInt(jour)));
    } else {
      reservationDate = new Date(date);
    }

    // Vérifier que la date est valide
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({ message: 'Format de date invalide. Utilisez JJ/MM/AAAA' });
    }

    // Vérifier que la date n'est pas dans le passé
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (reservationDate < todayUTC) {
      return res.status(400).json({ message: 'La date ne peut pas être dans le passé' });
    }

    // Parser l'heure et valider entre 9h et 23h
    const [heureStr, minutesStr] = time.split(':');
    const heure = parseInt(heureStr);
    const minutes = parseInt(minutesStr);

    if (isNaN(heure) || isNaN(minutes)) {
      return res.status(400).json({ message: 'Format d\'heure invalide. Utilisez HH:MM' });
    }

    if (heure < 9 || heure >= 23) {
      return res.status(400).json({ message: 'Les réservations sont disponibles de 9h à 23h' });
    }

    // Vérifier que ce n'est pas passé (pour aujourd'hui)
    if (reservationDate.getTime() === todayUTC.getTime()) {
      const now = new Date();
      if (heure < now.getHours() || (heure === now.getHours() && minutes <= now.getMinutes())) {
        return res.status(400).json({ message: 'Ce créneau est dans le passé' });
      }
    }

    const heureDebut = `${String(heure).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`; // ex: "18:00"
    const heureFin = `${String(heure + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`; // +1h

    // Vérifier disponibilité : pas de chevauchement avec les réservations CONFIRMEES ou EN_ATTENTE
    const dateDebut = new Date(reservationDate);
    dateDebut.setHours(heure, minutes, 0);
    
    const dateFin = new Date(reservationDate);
    dateFin.setHours(heure + 1, minutes, 0);

    const reservationExistante = await Reservation.findOne({
      terrain: terrainId,
      date: {
        $gte: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate()),
        $lt: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate() + 1)
      },
      statusReservation: { $in: ['en_attente', 'confirmee'] },
      $or: [
        { heureDebut: { $lt: heureFin }, heureFin: { $gt: heureDebut } }
      ]
    });

    if (reservationExistante) {
      return res.status(400).json({ 
        message: 'Ce créneau est déjà réservé',
        occupiedSlot: {
          heureDebut: reservationExistante.heureDebut,
          heureFin: reservationExistante.heureFin
        }
      });
    }

    // Calcul prix
    const prix = terrain.prixParHeure;

    // Créer la réservation avec les paramètres reçus
    const reservation = await Reservation.create({
      joueur: req.user._id,
      terrain: terrainId,
      date: reservationDate,
      heureDebut,
      heureFin,
      methodePaiement: methodePaiement || 'sur_site',
      statusPaiement: statusPaiement || 'en_attente',
      statusReservation: statusReservation || 'en_attente',
      prix
    });

    await reservation.populate('joueur', 'nom email');
    await reservation.populate('terrain');

    res.status(201).json(reservation);
  } catch (err) {
    console.error("Erreur POST réservation:", err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


// GET /api/reservations/occupied?terrainId=...&date=...  → créneaux occupés pour un terrain une date donnée
router.get('/occupied', async (req, res) => {
  try {
    const { terrainId, date } = req.query;

    if (!terrainId || !date) {
      return res.status(400).json({ message: 'terrainId et date sont obligatoires' });
    }

    // Parser la date
    let reservationDate;
    if (date.includes('/')) {
      const [jour, mois, annee] = date.split('/');
      reservationDate = new Date(Date.UTC(parseInt(annee), parseInt(mois) - 1, parseInt(jour)));
    } else {
      reservationDate = new Date(date);
    }

    // Récupérer toutes les réservations confirmées/en attente pour ce terrain ce jour
    const reservations = await Reservation.find({
      terrain: terrainId,
      date: {
        $gte: reservationDate,
        $lt: new Date(Date.UTC(reservationDate.getUTCFullYear(), reservationDate.getUTCMonth(), reservationDate.getUTCDate() + 1))
      },
      statusReservation: { $in: ['en_attente', 'confirmee'] }
    });

    const occupiedSlots = reservations.map(r => ({
      heureDebut: r.heureDebut,
      heureFin: r.heureFin,
      joueur: r.joueur
    }));

    res.json(occupiedSlots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/reservations/me  → réservations du joueur connecté
router.get('/me', protect, async (req, res) => {
  const reservations = await Reservation.find({ joueur: req.user._id })
    .populate('terrain');
  res.json(reservations);
});

// DELETE /api/reservations/:id  → annuler (joueur) ou supprimer (admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (req.user.role === 'admin') {
      // Admin : suppression complète
      await Reservation.findByIdAndDelete(req.params.id);
      res.json({ message: 'Réservation supprimée' });
    } else {
      // Joueur : annulation (suppression)
      if (reservation.joueur.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Vous ne pouvez annuler que vos propres réservations.' });
      }

      // Vérifier que la réservation n'est pas passée
      const now = new Date();
      const reservationDate = new Date(reservation.date);
      const [hours, minutes] = reservation.heureDebut.split(':');
      reservationDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (reservationDate < now) {
        return res.status(400).json({ message: 'Vous ne pouvez pas annuler une réservation déjà passée.' });
      }

      // Vérifier qu'il reste au moins 1 heure avant le match
      if (reservationDate - now < 60 * 60 * 1000) {
        return res.status(400).json({ message: 'Vous ne pouvez pas annuler une réservation moins de 1 heure avant le match.' });
      }

      // Suppression de la réservation
      await Reservation.findByIdAndDelete(req.params.id);

      res.json({
        message: 'Réservation annulée et supprimée avec succès.',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// GET /api/reservations  → liste complète (admin)
router.get('/', protect, isAdmin, async (req, res) => {
  const reservations = await Reservation.find()
    .populate('joueur', 'nom email')
    .populate('terrain');
  res.json(reservations);
});

// PUT /api/reservations/:id  → modifier (admin)
router.put('/:id', protect, isAdmin, async (req, res) => {
  try {
    const { terrainId, date, heureDebut, heureFin, statusReservation, statusPaiement, prix, joueurId } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    if (terrainId) {
      const terrain = await Terrain.findById(terrainId);
      if (!terrain) return res.status(404).json({ message: 'Terrain non trouvé' });
      reservation.terrain = terrainId;
    }

    if (joueurId) reservation.joueur = joueurId;
    if (date) reservation.date = date;
    if (heureDebut) reservation.heureDebut = heureDebut;
    if (heureFin) reservation.heureFin = heureFin;
    if (statusReservation) reservation.statusReservation = statusReservation;
    if (statusPaiement) reservation.statusPaiement = statusPaiement;
    if (prix) reservation.prix = prix;

    await reservation.save();
    await reservation.populate('joueur', 'nom email');
    await reservation.populate('terrain');

    res.json(reservation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/reservations/:id  → supprimer (admin)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });

    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Réservation supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
