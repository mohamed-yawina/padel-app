const express = require("express");
const fs = require("fs");
const path = require("path");
const Terrain = require("../models/Terrain");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET
router.get("/", async (req, res) => {
  try {
    const terrains = await Terrain.find();
    res.json(terrains);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST
router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const { nom, type, prixParHeure, description, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: "Image obligatoire" });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const fileName = `terrain_${Date.now()}.jpg`;
    const uploadPath = path.join(__dirname, "..", "uploads", fileName);

    fs.writeFileSync(uploadPath, base64Data, "base64");

    const imageUrl = `${process.env.SERVER_URL}/uploads/${fileName}`;

    const terrain = await Terrain.create({
      nom,
      type,
      prixParHeure,
      description,
      imageUrl,
    });

    res.status(201).json(terrain);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT - Modifier un terrain
router.put("/:id", protect, async (req, res) => {
  try {
    const { nom, type, prixParHeure, description, imageBase64 } = req.body;
    const terrain = await Terrain.findById(req.params.id);
    if (!terrain) return res.status(404).json({ message: "Terrain not found" });

    // Mise à jour des champs
    if (nom) terrain.nom = nom;
    if (type) terrain.type = type;
    if (prixParHeure) terrain.prixParHeure = prixParHeure;
    if (description) terrain.description = description;

    if (imageBase64) {
      // Gestion de la nouvelle image
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const fileName = `terrain_${Date.now()}.jpg`;
      const uploadPath = path.join(__dirname, "..", "uploads", fileName);
      fs.writeFileSync(uploadPath, base64Data, "base64");

      // Suppression de l'ancienne image
      if (terrain.imageUrl) {
        const oldPath = path.join(__dirname, "..", "uploads", path.basename(terrain.imageUrl));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      terrain.imageUrl = `${process.env.SERVER_URL}/uploads/${fileName}`;
    }

    await terrain.save();
    res.json(terrain);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE - Supprimer un terrain
router.delete("/:id", protect, async (req, res) => {
  try {
    const terrain = await Terrain.findById(req.params.id);
    if (!terrain) return res.status(404).json({ message: "Terrain not found" });

    // Suppression de l'image associée
    if (terrain.imageUrl) {
      const imagePath = path.join(__dirname, "..", "uploads", path.basename(terrain.imageUrl));
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await Terrain.findByIdAndDelete(req.params.id);
    res.json({ message: "Terrain supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
