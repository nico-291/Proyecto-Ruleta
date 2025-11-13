const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaccion = require('../models/Transaccion');

// --- CONSTANTES DE LA RULETA EUROPEA ---

// Definiciones de Pagos (Payout)
// Payout es X a 1 (ej: 35 significa que ganas 35 + 1 de vuelta)
const PAYOUTS = {
    'number': 35,
    'dozen': 2,
    'column': 2,
    'outside': 1 // (Rojo/Negro, Par/Impar, 1-18/19-36)
};

// Conjuntos de números para comprobaciones rápidas
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);
const COLUMN_1 = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
const COLUMN_2 = new Set([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]);
const COLUMN_3 = new Set([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]);
const DOZEN_1 = new Set(Array.from({ length: 12 }, (_, i) => i + 1)); // 1-12
const DOZEN_2 = new Set(Array.from({ length: 12 }, (_, i) => i + 13)); // 13-24
const DOZEN_3 = new Set(Array.from({ length: 12 }, (_, i) => i + 25)); // 25-36
const OUTSIDE_1_18 = new Set(Array.from({ length: 18 }, (_, i) => i + 1)); // 1-18
const OUTSIDE_19_36 = new Set(Array.from({ length: 18 }, (_, i) => i + 19)); // 19-36
const OUTSIDE_EVEN = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]);
const OUTSIDE_ODD = new Set([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35]);


/**
 * Función para calcular las ganancias de un conjunto de apuestas.
 * @param {Object} bets - El objeto de apuestas del cliente (ej: {'number-5': 100, 'outside-red': 50})
 * @param {number} winningNumber - El número ganador (0-36)
 * @returns {Object} - { gananciaNeta, montoTotalApostado }
 */
function calcularGanancias(bets, winningNumber) {
    let gananciaNeta = 0;
    let montoTotalApostado = 0;

    // Si el número ganador es 0, todas las apuestas externas pierden automáticamente.
    const esCero = winningNumber === 0;

    for (const betId in bets) {
        const montoApostado = bets[betId];
        montoTotalApostado += montoApostado;
        
        const [betType, betValue] = betId.split('-');
        let haGanado = false;

        switch (betType) {
            case 'number':
                haGanado = (parseInt(betValue, 10) === winningNumber);
                break;
            case 'dozen':
                if (esCero) break; // El 0 pierde
                const dozen = parseInt(betValue, 10);
                if (dozen === 1) haGanado = DOZEN_1.has(winningNumber);
                if (dozen === 2) haGanado = DOZEN_2.has(winningNumber);
                if (dozen === 3) haGanado = DOZEN_3.has(winningNumber);
                break;
            case 'column':
                if (esCero) break; // El 0 pierde
                const column = parseInt(betValue, 10);
                if (column === 1) haGanado = COLUMN_1.has(winningNumber);
                if (column === 2) haGanado = COLUMN_2.has(winningNumber);
                if (column === 3) haGanado = COLUMN_3.has(winningNumber);
                break;
            case 'outside':
                if (esCero) break; // El 0 pierde
                if (betValue === 'red') haGanado = RED_NUMBERS.has(winningNumber);
                if (betValue === 'black') haGanado = BLACK_NUMBERS.has(winningNumber);
                if (betValue === 'even') haGanado = OUTSIDE_EVEN.has(winningNumber);
                if (betValue === 'odd') haGanado = OUTSIDE_ODD.has(winningNumber);
                if (betValue === '1-18') haGanado = OUTSIDE_1_18.has(winningNumber);
                if (betValue === '19-36') haGanado = OUTSIDE_19_36.has(winningNumber);
                break;
        }

        if (haGanado) {
            const payout = PAYOUTS[betType];
            // La ganancia NETA es (monto * payout)
            // El usuario ya pagó el 'montoApostado', así que solo le damos la ganancia.
            // (montoApostado * payout) + montoApostado = Ganancia Total Bruta
            // (montoApostado * payout) = Ganancia Neta
            gananciaNeta += (montoApostado * payout);
        } else {
            // Si pierde, la ganancia neta de esta apuesta es negativa
            gananciaNeta -= montoApostado;
        }
    }

    return { gananciaNeta, montoTotalApostado };
}


/**
 * RUTA POST: /api/girar
 * Recibe todas las apuestas, valida el saldo, descuenta, gira, y paga.
 */
router.post('/girar', async (req, res) => {
    // 1. Autenticación (req.user es establecido por tu middleware ensureAuth)
    const userId = req.user?._id;
    if (!userId) {
        // Esto no debería pasar si ensureAuth está activo, pero es una doble comprobación.
        return res.status(401).json({ message: "No estás autenticado (Ref: _id)" });
    }

    const { bets } = req.body; // { 'number-5': 100, 'outside-red': 50 }

    if (!bets || Object.keys(bets).length === 0) {
        return res.status(400).json({ message: "No se han realizado apuestas." });
    }

    try {
        // 2. Obtener usuario y validar saldo
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Calcular el monto total apostado
        const montoTotalApostado = Object.values(bets).reduce((sum, amount) => sum + amount, 0);

        if (user.saldo < montoTotalApostado) {
            return res.status(400).json({ message: "Saldo insuficiente." });
        }

        // 3. Descontar el saldo
        user.saldo -= montoTotalApostado;
        
        // 4. Girar la ruleta
        const numeroGanador = Math.floor(Math.random() * 37); // 0-36

        // 5. Calcular ganancias
        const { gananciaNeta, montoTotalApostado: montoVerificado } = calcularGanancias(bets, numeroGanador);
        
        // El monto total devuelto al usuario es:
        // Si ganó 50 (neto): montoTotalApostado + 50
        // Si perdió 100 (neto): 0 (ya se descontó)
        // gananciaNeta ya es la ganancia/pérdida neta.
        // Si gananciaNeta es 50, se suma 50.
        // Si gananciaNeta es -100, se suma -100 (que es 0, porque ya descontamos 100).
        // ¡Error! La ganancia neta es la ganancia *sobre* la apuesta.
        // Si apostó 100 y ganó (1:1), gananciaNeta es 100.
        // El saldo final es: saldo_viejo - 100 (descontado) + 100 (ganancia neta) + 100 (devolución apuesta) = saldo_viejo + 100
        
        // Simplifiquemos:
        // Saldo Final = Saldo (ya descontado) + Ganancia Bruta
        // Ganancia Bruta = Ganancia Neta + Monto Apostado (si la ganancia neta es positiva)
        
        let gananciaBruta = 0;
        if (gananciaNeta > -montoTotalApostado) { // Si no perdió todo
             // gananciaNeta es la ganancia neta real (positiva o negativa)
             // Saldo final = Saldo (ya descontado) + Monto Apostado + Ganancia Neta
             gananciaBruta = montoTotalApostado + gananciaNeta;
        }
        
        // Si gananciaNeta es -100 y montoTotalApostado es 100, gananciaBruta es 0. Correcto.
        // Si apuesta 100 (neto 100), monto 100. gananciaBruta = 100 + 100 = 200. Correcto.

        user.saldo += gananciaBruta;
        
        await user.save();

        // 6. Crear la transacción
        const nuevaTransaccion = new Transaccion({
            user: userId,
            tipo: 'apuesta',
            monto: montoTotalApostado,
            numero: numeroGanador, // Guardamos el número ganador
            ganancia: gananciaNeta > 0 ? gananciaNeta : 0, // Solo guardamos la ganancia neta positiva
            status: gananciaNeta > -montoTotalApostado ? 'win' : 'lose' // 'win' si ganó algo
        });
        await nuevaTransaccion.save();
        
        // 7. Enviar respuesta al cliente
        res.json({
            winningNumber: numeroGanador,
            nuevoSaldo: user.saldo,
            gananciaNeta: gananciaNeta // La ganancia neta (positiva o negativa)
        });

    } catch (error) {
        console.error("Error en /api/girar:", error);
        res.status(500).json({ message: "Error del servidor al girar la ruleta" });
    }
});

module.exports = router;