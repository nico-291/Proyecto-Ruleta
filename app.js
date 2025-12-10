const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser'); 
const cors = require('cors');
require('dotenv').config(); 

const connectDB = require('./config/db');
const User = require('./models/User');

// Inicializar Express y conectar DB
const app = express();
connectDB(); // Solo llamamos a este, borramos el mongoose.connect redundante

// Configuración de Handlebars
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        eq: function (a, b) { return a === b; }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares Globales
app.use(express.static('public')); 
app.use(express.urlencoded({extended:true}));
app.use(express.json()); // Importante para la API
app.use(cookieParser());
app.use(cors());

// Middleware de Autenticación (Carga usuario si existe cookie)
app.use(async (req, res, next) => {
  const userId = req.cookies.userId; 
  if (userId) {
    try {
      const user = await User.findById(userId).lean(); 
      if (user) {
        req.user = user;
        res.locals.user = user; 
      }
    } catch(error){
      console.error('Error cookie:', error);
    }
  }
  next();
});

// Función para proteger rutas
const ensureAuth = (req, res, next) => {
  if (req.user) return next(); 
  
  // Si pide API y no está logueado -> Error 401 JSON
  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }
  // Si pide vista -> Redirigir login
  res.redirect('/login');
};

// --- RUTAS ---

// 1. Rutas de API (Devuelven JSON)
app.use('/api', require('./routes/auth'));        // Login/Registro API
app.use('/api', ensureAuth, require('./routes/ruleta')); // Ruleta API
app.use('/api', ensureAuth, require('./routes/transacciones')); // Transacciones API

// 2. Rutas de Vistas (Renderizan HTML)
// Las movemos a un archivo separado para no ensuciar app.js, 
// o las dejamos aquí simplificadas:
app.use('/', require('./routes/views')); 

// Puerto
const PORT = process.env.PORT || 80;
app.listen(PORT, ()=> {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});