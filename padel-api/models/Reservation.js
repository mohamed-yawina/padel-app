// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    joueur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    terrain: { type: mongoose.Schema.Types.ObjectId, ref: 'Terrain', required: true },
    date: { type: Date, required: true },
    heureDebut: { type: String, required: true }, // ex: "18:00"
    heureFin: { type: String, required: true },   // ex: "19:00"
    statusReservation: {
      type: String,
      enum: ['en_attente', 'confirmee', 'annulee'],
      default: 'en_attente',
    },
    methodePaiement: {
      type: String,
      enum: ['en_ligne', 'sur_site'],
      required: true,
    },
    statusPaiement: {
      type: String,
      enum: ['paye', 'en_attente'],
      default: 'en_attente',
    },
    prix: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);
