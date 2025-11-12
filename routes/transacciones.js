const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaccion = require('../models/Transaccion');
// No necesitamos 'ensureAuth' aquí porque app.js ya protege estas rutas

/*
  Estas rutas son llamadas por los formularios en transacciones.hbs
*/

// POST /deposit
router.post('/deposit', async (req, res) => {
  const { monto } = req.body;
  const montoNum = parseFloat(monto);
  const userId = req.user._id; // Gracias al middleware en app.js

  if (!montoNum || montoNum <= 0) {
    // Recargar la página con un error
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    return res.render('transacciones', { 
      transacciones, 
      error: 'Monto de depósito inválido' 
    });
  }

  try {
    // 1. Añadir saldo al usuario
    const user = await User.findById(userId);
    user.saldo += montoNum;
    await user.save();

    // 2. Registrar la transacción
    const newTransaction = new Transaccion({
      userId,
      tipo: 'deposit',
      monto: montoNum,
      status: 'win' // 'win' o 'lose' no se aplican, pero podemos usarlo para marcarla como 'completa'
    });
    await newTransaction.save();

    // 3. Recargar la página con mensaje de éxito
    // (req.user no se actualiza solo, así que pasamos el user actualizado)
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    res.render('transacciones', { 
      user: user.toObject(), // Pasa el usuario actualizado
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

// POST /withdraw
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

    // 1. Revisar si tiene saldo suficiente
    if (user.saldo < montoNum) {
      const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
      return res.render('transacciones', { 
        transacciones, 
        error: 'Saldo insuficiente para este retiro' 
      });
    }

    // 2. Restar saldo
    user.saldo -= montoNum;
    await user.save();

    // 3. Registrar la transacción
    const newTransaction = new Transaccion({
      userId,
      tipo: 'withdraw',
      monto: montoNum,
      status: 'lose' // 'lose' o 'win' no se aplican, pero podemos usarlo para marcarla como 'completa'
    });
    await newTransaction.save();

    // 4. Recargar la página
    const transacciones = await Transaccion.find({ userId }).sort('-fecha').lean();
    res.render('transacciones', { 
      user: user.toObject(), // Pasa el usuario actualizado
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