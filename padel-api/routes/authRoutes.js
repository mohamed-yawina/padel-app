// routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nom, email, motDePasse, role, niveau } = req.body;

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: 'Email déjà utilisé' });

    const user = await User.create({ nom, email, motDePasse, role, niveau });

    const token = createToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const isMatch = await user.comparePassword(motDePasse);
    if (!isMatch) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const token = createToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/auth/users  → liste des utilisateurs (admin)
router.get('/users', protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('nom email role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/auth/profile  → profil de l'utilisateur connecté
router.get('/profile', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
