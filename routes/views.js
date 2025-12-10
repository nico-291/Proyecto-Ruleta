const express = require('express');
const router = express.Router();
const Transaccion = require('../models/Transaccion');

// Middleware simple para verificar auth en vistas
const ensureAuthView = (req, res, next) => {
  if (req.user) return next();
  res.redirect('/login');
};

// Públicas
router.get('/', (req, res) => res.render('index'));
router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));
router.get('/rules', (req, res) => res.render('rules'));
router.get('/info', (req, res) => res.render('info'));

// Privadas
router.get('/perfil', ensureAuthView, async (req, res) => {
  const transacciones = await Transaccion.find({ user: req.user._id }).limit(5).sort('-fecha').lean();
  res.render('perfil', { transacciones });
});

router.get('/mesa-ruleta', ensureAuthView, async (req, res) => {
  res.render('mesa-ruleta'); // La ruleta carga datos via JS/Fetch
});

router.get('/transacciones', ensureAuthView, async (req, res) => {
  const transacciones = await Transaccion.find({ user: req.user._id }).sort('-fecha').lean();
  res.render('transacciones', { transacciones });
});

router.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect('/');
});

module.exports = router;