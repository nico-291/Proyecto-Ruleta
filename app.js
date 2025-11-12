const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser'); 
const mongoose = require('mongoose');
require('dotenv').config(); 

const connectDB = require('./config/db');

const User = require('./models/User');
const Transaccion = require('./models/Transaccion');
const authRoutes = require('./routes/auth');
const ruletaRoutes = require('./routes/ruleta');
const transaccionRoutes = require('./routes/transacciones');
connectDB();
const app = express();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
      eq: function (a, b) {
        return a === b;
      },
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public')); 
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParser());

app.use(async (req, res, next) => {
  const userId = req.cookies.userId; 
  if (userId) {
    try {
      const user = await User.findById(userId).lean(); 
      if (user) {
        req.user = user;
        res.locals.user = user; 
      }
    }catch(error){
      console.error('Error cargando usuario de cookie:', error);
    }
  }
  next();
});

const ensureAuth = (req, res, next) => {
  if (req.user) {
    return next(); 
  }
  res.redirect('/login');
};
 

app.get('/', (req, res) => res.render('index'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));
app.get('/rules', (req, res) => res.render('rules'));
app.get('/info', (req, res) => res.render('info'));

app.use('/', authRoutes);

app.use('/api', ensureAuth, ruletaRoutes);
app.use('/', ensureAuth, transaccionRoutes); 

app.get('/perfil', ensureAuth, async (req, res) => {
  try {
    const transacciones = await Transaccion.find({ user: req.user._id })
      .limit(5)
      .sort('-fecha')
      .lean();
    res.render('perfil', { transacciones });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

app.get('/mesa-ruleta', ensureAuth, async (req, res) => {
  try {
    const apuestas = await Transaccion.find({ user: req.user._id, tipo: 'apuesta' })
      .limit(10)
      .sort('-fecha')
      .lean();
    res.render('mesa-ruleta', { apuestas });
  } catch (error) {
    console.error(error);
    res.redirect('/perfil');
  }
});

app.get('/transacciones', ensureAuth, async (req, res) => {
  try {
    const transacciones = await Transaccion.find({ user: req.user._id })
      .sort('-fecha')
      .lean();
    res.render('transacciones', { transacciones });
  } catch (error) {
    console.error(error);
    res.redirect('/perfil');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> {
    console.log(`Servidor en http://localhost:${PORT}`);
});