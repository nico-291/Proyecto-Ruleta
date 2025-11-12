/*
  ARCHIVO BACKEND: routes/ruleta.js
  Maneja la lógica de la API del juego.
*/
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// --- ¡IMPORTAR MODELOS REALES! ---
const User = require('../models/User');
const Transaccion = require('../models/Transaccion');


// --- CONSTANTES DEL JUEGO (DEBEN SER IDÉNTICAS AL CLIENTE) ---
const numbersCW = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const PAGO_DIRECTO = 36; // Pago 36 a 1


// --- RUTAS API ---

/**
 * RUTA POST: /api/apostar
 * El cliente envía una apuesta.
 */
router.post('/apostar', async (req, res) => {
  // ¡¡AUTENTICACIÓN!! 
  // 'req.user' es adjuntado por nuestro middleware en app.js
  // (que leyó la cookie 'userId')
  const userId = req.user?.id; 
  
  if (!userId) {
    return res.status(401).json({ message: "No estás autenticado" });
  }

  const { numero, monto } = req.body;

  // Validaciones del servidor
  if (numero === undefined || numero < 0 || numero > 36) {
    return res.status(400).json({ message: "Número inválido." });
  }
  if (!monto || monto <= 0) {
    return res.status(400).json({ message: "Monto inválido." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.saldo < monto) {
      return res.status(400).json({ message: "Saldo insuficiente" });
    }

    // 1. Restar saldo
    user.saldo -= monto;
    await user.save();

    // 2. Crear la apuesta pendiente (ahora 'Transaccion')
    const newBet = new Transaccion({ 
      userId, 
      numero, 
      monto, 
      tipo: 'bet', // Especificamos que es una apuesta
      status: 'pending' 
    });
    await newBet.save();

    // 3. Calcular la apuesta total pendiente actual
    const pendingBets = await Transaccion.find({ userId, status: 'pending', tipo: 'bet' });
    const apuestaTotal = pendingBets.reduce((sum, bet) => sum + bet.monto, 0);

    // 4. Enviar respuesta al cliente
    res.json({
      message: "Apuesta registrada",
      nuevoSaldo: user.saldo,
      apuestaTotal: apuestaTotal
    });

  } catch (error) {
    console.error("Error en /api/apostar:", error);
    res.status(500).json({ message: "Error del servidor al apostar" });
  }
});


/**
 * RUTA POST: /api/girar
 * El cliente pide girar.
 */
router.post('/girar', async (req, res) => {
  const userId = req.user?.id; 
  
  if (!userId) {
    return res.status(401).json({ message: "No estás autenticado" });
  }

  try {
    const pendingBets = await Transaccion.find({ userId, status: 'pending', tipo: 'bet' });
    if (pendingBets.length === 0) {
      return res.status(400).json({ message: "Debes realizar una apuesta antes de girar" });
    }

    // 1. ¡GENERAR EL NÚMERO GANADOR (SEGURO EN EL SERVIDOR!)
    const randomIndex = Math.floor(Math.random() * numbersCW.length);
    const winningNumber = numbersCW[randomIndex];

    let gananciaTotal = 0;
    const user = await User.findById(userId);

    // 2. Procesar cada apuesta pendiente
    for (const bet of pendingBets) {
      if (bet.numero === winningNumber) {
        // ¡Ganó!
        const payout = bet.monto * PAGO_DIRECTO;
        gananciaTotal += payout;
        bet.status = 'win';
        bet.ganancia = payout; // Guardamos cuánto ganó
      } else {
        // Perdió
        bet.status = 'lose';
        bet.ganancia = 0; // Guardamos que no ganó
      }
      await bet.save(); // Marcar la apuesta como procesada
    }

    // 3. Añadir ganancias al saldo del usuario
    if (gananciaTotal > 0) {
      user.saldo += gananciaTotal;
      await user.save();
    }

    // 4. Enviar el resultado al cliente
    res.json({
      winningNumber: winningNumber,
      nuevoSaldo: user.saldo,
      ganancia: gananciaTotal // Ganancia neta de este giro
    });

  } catch (error) {
    console.error("Error en /api/girar:", error);
    res.status(500).json({ message: "Error del servidor al girar" });
  }
});

// ¡Exporta el router para usarlo en tu server.js!
module.exports = router;