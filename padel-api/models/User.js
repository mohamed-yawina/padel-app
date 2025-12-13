// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    motDePasse: { type: String, required: true },
    role: { type: String, enum: ['joueur', 'admin'], default: 'joueur' },
    niveau: { type: String, enum: ['debutant', 'intermediaire', 'avance'], default: 'debutant' },
    dateInscription: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function () {
  if (!this.isModified('motDePasse')) return;

  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});


// Méthode pour comparer le mot de passe
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.motDePasse);
};

module.exports = mongoose.model('User', userSchema);
