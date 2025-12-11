const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaccion = require('../models/Transaccion');

router.post('/deposit', async (req, res) => {
  const { monto } = req.body;
  const montoNum = parseFloat(monto);
  const userId = req.user._id;

  if (!montoNum || montoNum <= 0) return res.status(400).json({ success: false, error: 'Monto inválido' });

  try {
    const user = await User.findById(userId);
    user.saldo += montoNum;
    await user.save();

    const tx = new Transaccion({ user: userId, tipo: 'deposito', monto: montoNum, status: 'completed' });
    await tx.save();

    res.json({ success: true, nuevoSaldo: user.saldo, mensaje: 'Depósito exitoso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/withdraw', async (req, res) => {
  const { monto } = req.body;
  const montoNum = parseFloat(monto);
  const userId = req.user._id;

  if (!montoNum || montoNum <= 0) return res.status(400).json({ success: false, error: 'Monto inválido' });

  try {
    const user = await User.findById(userId);
    if (user.saldo < montoNum) return res.status(400).json({ success: false, error: 'Saldo insuficiente' });

    user.saldo -= montoNum;
    await user.save();

    const tx = new Transaccion({ user: userId, tipo: 'retiro', monto: montoNum, status: 'completed' });
    await tx.save();

    res.json({ success: true, nuevoSaldo: user.saldo, mensaje: 'Retiro exitoso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
