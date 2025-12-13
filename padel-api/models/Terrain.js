const mongoose = require("mongoose");

const terrainSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    type: { type: String, enum: ["indoor", "outdoor"], default: "outdoor" },
    prixParHeure: { type: Number, required: true },
    description: { type: String },
    
    // 🔥 Image stockée localement -> URL relative
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Terrain", terrainSchema);
