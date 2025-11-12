const mongoose = require('mongoose');

const TransaccionSchema = new mongoose.Schema({
  // CAMPO CRÍTICO: Debe ser 'user' para coincidir con `req.user` y las consultas en ruleta.js
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
},
  // Tipos: depósito, retiro, o apuesta. 'apuesta' es el tipo que usa la ruleta.
  tipo: { 
    type: String, 
    enum: ['deposito', 'retiro', 'apuesta'], 
    required: true 
},
  // Cantidad de dinero movida
  monto: { 
    type: Number, 
    required: true, 
    min: 0 
},
  // El número específico al que se apostó (solo si tipo es 'apuesta')
  numero: { 
    type: Number, 
    min: 0, 
    max: 36, 
    default: null 
}, 
   status: { 
    type: String, 
    enum: ['completed', 'pending', 'win', 'lose'], 
    default: 'completed' 
},
   ganancia: { 
    type: Number, 
    default: 0, 
    min: 0 
}, 
   fecha: { type: Date, default: Date.now },
});

TransaccionSchema.path('numero').required(function() {
    return this.tipo === 'apuesta';
});

TransaccionSchema.pre('validate', function(next) {
    if (this.tipo !== 'apuesta' && (this.status === 'pending' || this.status === 'win' || this.status === 'lose')) {
        this.status = 'completed';
    }
    next();
});

module.exports = mongoose.model('Transaccion', TransaccionSchema);