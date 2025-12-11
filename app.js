const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser'); 
const cors = require('cors');
require('dotenv').config(); 

const connectDB = require('./config/db');
const User = require('./models/User');


const app = express();
connectDB(); 

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


app.use(express.static('public')); 
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParser());
app.use(cors());

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

const ensureAuth = (req, res, next) => {
  if (req.user) return next(); 

  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  res.redirect('/login');
};
app.use('/api', require('./routes/auth'));        // Login/Registro API
app.use('/api', ensureAuth, require('./routes/ruleta')); // Ruleta API
app.use('/api', ensureAuth, require('./routes/transacciones')); // Transacciones API
app.use('/', require('./routes/views')); 

const PORT = process.env.PORT || 80;
app.listen(PORT, ()=> {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});
