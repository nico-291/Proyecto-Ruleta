const mongoose = require('mongoose');

const TransaccionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tipo: { type: String, enum: ['deposito', 'retiro', 'apuesta'], required: true },
  monto: { type: Number, required: true },
  detallesApuesta: { type: String },
  numeroGanador: { type: Number },
  ganancia: { type: Number, default: 0 },
  fecha: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaccion', TransaccionSchema);