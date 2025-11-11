const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) =>{
  const { nombre, email, username, password, 'confirm-password': confirm } = req.body;

  if(password !== confirm){
    return res.render('register', {error: 'Las contraseñas no coinciden'});
  }
  try{
    let user = await User.findOne({$or: [{email}, {username}]});
    if(user){
      return res.render('register', {error: 'El email o usuario ya existe'});
    }

    user = new User({nombre, email, username, password});
    await user.save();
    
    req.session.user = {
      _id: user._id,
      nombre: user.nombre,
      username: user.username,
      saldo: user.saldo
    };
    res.redirect('/perfil');

  }catch (err){
    res.render('register', {error: 'Error al registrar. Intente de nuevo.'});
  }
});

router.post('/login', async (req, res) => {
  const {usuario: username, password} = req.body;
  try{
    const user = await User.findOne({username});
    if (!user){
      return res.render('login', {error: 'Usuario o contraseña incorrectos'});
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch){
      return res.render('login', {error: 'Usuario o contraseña incorrectos'});
    }

    //Guarda usuario en la sesión
    req.session.user = {
      _id: user._id,
      nombre: user.nombre,
      username: user.username,
      saldo: user.saldo
    };
    res.redirect('/perfil');

  }catch (err){
    res.render('login', {error: 'Error del servidor'});
  }
});

router.get('/logout', (req, res) =>{
  req.session.destroy((err) =>{
    res.redirect('/');
  });
});

module.exports = router;