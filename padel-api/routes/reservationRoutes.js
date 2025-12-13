// routes/reservationRoutes.js
const express = require('express');
const Reservation = require('../models/Reservation');
const Terrain = require('../models/Terrain');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/reservations  (joueur connecté ou admin)
router.post('/', protect, async (req, res) => {
  try {
    const { terrainId, date, heureDebut, heureFin, methodePaiement, joueurId } = req.body;

    // Vérifier terrain existe
    const terrain = await Terrain.findById(terrainId);
    if (!terrain) return res.status(404).json({ message: 'Terrain non trouvé' });

    // Vérifier disponibilité
    const reservationExistante = await Reservation.findOne({
      terrain: terrainId,
      date,
      $or: [
        { heureDebut: { $lt: heureFin }, heureFin: { $gt: heureDebut } }
      ]
    });

    if (reservationExistante) {
      return res.status(400).json({ message: 'Terrain déjà réservé à ce créneau.' });
    }

    // Calcul prix
    const prix = terrain.prixParHeure;

    // Créer la réservation
    const reservation = await Reservation.create({
      joueur: joueurId || req.user._id, // admin peut spécifier joueurId
      terrain: terrainId,
      date,
      heureDebut,
      heureFin,
      methodePaiement: methodePaiement || 'en_ligne',
      statusPaiement: methodePaiement === 'en_ligne' ? 'paye' : 'en_attente',
      statusReservation: 'confirmee',
      prix
    });

    res.status(201).json(reservation);
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
      // Joueur : annulation
      if (reservation.joueur.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Vous ne pouvez annuler que vos propres réservations.' });
      }

      // Vérifier que la réservation n'est pas passée
      const now = new Date();
      const dateRes = new Date(reservation.date + ' ' + reservation.heureDebut);

      if (dateRes < now) {
        return res.status(400).json({ message: 'Vous ne pouvez pas annuler une réservation déjà passée.' });
      }

      // Annulation
      reservation.statusReservation = 'annulee';
      await reservation.save();

      res.json({
        message: 'Réservation annulée avec succès.',
        reservation
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
