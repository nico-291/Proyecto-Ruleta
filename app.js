const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({extended:true}));

app.get('/', (req, res)=>res.render('index'));
app.get('/login', (req, res)=>res.render('login'));
app.get('/register', (req, res)=>res.render('register'));
app.get('/rules', (req, res)=>res.render('rules'));
app.get('/info', (req, res)=>res.render('info'));
app.get('/perfil', (req, res)=>res.render('perfil', {
    user: {nombre: 'Ejemplo', email: 'mi@email.com', saldo: 500}
}));
app.get('/mesa-ruleta', (req, res)=>res.render('mesa-ruleta'));
app.get('/transacciones', (req, res)=>res.render('transacciones'));

const PORT = 3000;
app.listen(PORT, ()=> {
    console.log('Servidor en http://localhost:${PORT}');
});
