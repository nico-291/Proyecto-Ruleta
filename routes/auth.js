const express = require('express');
const router = express.Router();
const User = require('../models/User');


router.post('/register', async (req, res) => {
  try{
    const { name, email, username, password }  = req.body;
    const confirmPassword = req.body['confirm-password'];

    if(password !== confirmPassword){
      return res.render('register', { error: 'Las contraseñas no coinciden' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('register', { error: 'El nombre de usuario o email ya está en uso' });
    }

  //Crear el nuevo usuario
    const newUser = new User({
      nombre: name,
      email: email, 
      username: username,
      password:password 
    });
    await newUser.save();

  //Iniciar sesión automáticamente (crear la cookie)
    res.cookie('userId', newUser._id.toString(), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 //Expira en 7 días
    });

    res.redirect('/perfil');

  }catch(error){
    console.error(error);
    res.render('register', { error: 'Error al crear la cuenta' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    //Buscar al usuario
    const user = await User.findOne({ username });
    if (!user) {
      return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    const isMatch = await user.comparePassword(password);
    if(!isMatch){
      return res.render('login', {error: 'Usuario o contraseña incorrectos'});
    }

    res.cookie('userId', user._id.toString(), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    res.redirect('/perfil');

  }catch (error){
    console.error(error);
    res.render('login', { error: 'Error al iniciar sesión' });
  }
});

//logout
router.get('/logout', (req, res) => {
  res.clearCookie('userId');
  res.redirect('/');
});

module.exports = router;