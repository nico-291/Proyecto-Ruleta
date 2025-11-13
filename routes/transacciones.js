const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaccion = require('../models/Transaccion');

router.post('/deposit', async (req, res) => {
  const { monto } = req.body;
  const montoNum = parseFloat(monto);
  const userId = req.user._id; 

  if (!montoNum || montoNum <= 0) {
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    return res.render('transacciones', { 
      transacciones, 
      error: 'Monto de depósito inválido' 
    });
  }

  try {
    const user = await User.findById(userId);
    user.saldo += montoNum;
    await user.save();

    const newTransaction = new Transaccion({
      userId,
      tipo: 'deposit',
      monto: montoNum,
      status: 'win' 
    });
    await newTransaction.save();

    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    res.render('transacciones', { 
      user: user.toObject(), 
      transacciones, 
      success: 'Depósito realizado con éxito' 
    });

  } catch (error) {
    console.error(error);
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    res.render('transacciones', { 
      transacciones, 
      error: 'Error al procesar el depósito' 
    });
  }
});

router.post('/withdraw', async (req, res) => {
  const { monto } = req.body;
  const montoNum = parseFloat(monto);
  const userId = req.user._id;

  if (!montoNum || montoNum <= 0) {
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    return res.render('transacciones', { 
      transacciones, 
      error: 'Monto de retiro inválido' 
    });
  }

  try {
    const user = await User.findById(userId);

    if (user.saldo < montoNum) {
      const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
      return res.render('transacciones', { 
        transacciones, 
        error: 'Saldo insuficiente para este retiro' 
      });
    }

    user.saldo -= montoNum;
    await user.save();

    const newTransaction = new Transaccion({
      userId,
      tipo: 'withdraw',
      monto: montoNum,
      status: 'lose'
    });
    await newTransaction.save();

    // recargar la página
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    res.render('transacciones', { 
      user: user.toObject(), 
      transacciones, 
      success: 'Retiro procesado con éxito' 
    });

  } catch (error) {
    console.error(error);
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    res.render('transacciones', { 
      transacciones, 
      error: 'Error al procesar el retiro' 
    });
  }
});

module.exports = router;