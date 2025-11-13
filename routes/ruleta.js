const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaccion = require('../models/Transaccion');

const PAYOUTS = {
    'number': 35,
    'dozen': 2,
    'column': 2,
    'outside': 1 
};

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);
const COLUMN_1 = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
const COLUMN_2 = new Set([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]);
const COLUMN_3 = new Set([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]);
const DOZEN_1 = new Set(Array.from({ length: 12 }, (_, i) => i + 1)); 
const DOZEN_2 = new Set(Array.from({ length: 12 }, (_, i) => i + 13)); 
const DOZEN_3 = new Set(Array.from({ length: 12 }, (_, i) => i + 25));
const OUTSIDE_1_18 = new Set(Array.from({ length: 18 }, (_, i) => i + 1)); 
const OUTSIDE_19_36 = new Set(Array.from({ length: 18 }, (_, i) => i + 19)); 
const OUTSIDE_EVEN = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36]);
const OUTSIDE_ODD = new Set([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35]);



function calcularGanancias(bets, winningNumber) {
    let gananciaNeta = 0;
    let montoTotalApostado = 0;

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
                if (esCero) break; 
                const dozen = parseInt(betValue, 10);
                if (dozen === 1) haGanado = DOZEN_1.has(winningNumber);
                if (dozen === 2) haGanado = DOZEN_2.has(winningNumber);
                if (dozen === 3) haGanado = DOZEN_3.has(winningNumber);
                break;
            case 'column':
                if (esCero) break; 
                const column = parseInt(betValue, 10);
                if (column === 1) haGanado = COLUMN_1.has(winningNumber);
                if (column === 2) haGanado = COLUMN_2.has(winningNumber);
                if (column === 3) haGanado = COLUMN_3.has(winningNumber);
                break;
            case 'outside':
                if (esCero) break; 
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
            gananciaNeta += (montoApostado * payout);
        } else {
            gananciaNeta -= montoApostado;
        }
    }

    return { gananciaNeta, montoTotalApostado };
}


router.post('/girar', async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        return res.status(401).json({ message: "No estás autenticado (Ref: _id)" });
    }

    const { bets } = req.body; 

    if (!bets || Object.keys(bets).length === 0) {
        return res.status(400).json({ message: "No se han realizado apuestas." });
    }

    try {
        // Obtener usuario y validar saldo
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const montoTotalApostado = Object.values(bets).reduce((sum, amount) => sum + amount, 0);

        if (user.saldo < montoTotalApostado) {
            return res.status(400).json({ message: "Saldo insuficiente." });
        }

        user.saldo -= montoTotalApostado;
        
        const numeroGanador = Math.floor(Math.random() * 37); 

        // Calcular ganancias
        const { gananciaNeta, montoTotalApostado: montoVerificado } = calcularGanancias(bets, numeroGanador);
        
        let gananciaBruta = 0;
        if (gananciaNeta > -montoTotalApostado) {
             gananciaBruta = montoTotalApostado + gananciaNeta;
        }
      
        user.saldo += gananciaBruta;
        
        await user.save();

        const nuevaTransaccion = new Transaccion({
            user: userId,
            tipo: 'apuesta',
            monto: montoTotalApostado,
            numero: numeroGanador, 
            ganancia: gananciaNeta > 0 ? gananciaNeta : 0, 
            status: gananciaNeta > -montoTotalApostado ? 'win' : 'lose' });
        await nuevaTransaccion.save();
        
        res.json({
            winningNumber: numeroGanador,
            nuevoSaldo: user.saldo,
            gananciaNeta: gananciaNeta 
        });

    } catch (error) {
        console.error("Error en /api/girar:", error);
        res.status(500).json({ message: "Error del servidor al girar la ruleta" });
    }
});

module.exports = router;