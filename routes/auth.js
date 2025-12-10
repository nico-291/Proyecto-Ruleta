const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    
    // Validaciones básicas
    if (!username || !password || !email) {
        return res.status(400).json({ success: false, error: 'Faltan datos' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Usuario o email ya existen' });
    }

    const newUser = new User({ nombre: name, email, username, password });
    await newUser.save();

    // Crear Cookie manual (como lo tenías)
    res.cookie('userId', newUser._id.toString(), { httpOnly: true, maxAge: 7 * 24 * 3600000 });

    res.json({ success: true, redirectUrl: '/perfil' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, error: 'Credenciales inválidas' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, error: 'Credenciales inválidas' });

    // Crear Cookie
    res.cookie('userId', user._id.toString(), { httpOnly: true, maxAge: 7 * 24 * 3600000 });

    res.json({ success: true, redirectUrl: '/perfil' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;