/*
  ARCHIVO BACKEND: routes/auth.js
  Maneja el login, registro y logout usando cookie-parser
*/
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Importa el modelo User

// POST /register
// (Llamado por el formulario en register.hbs)
router.post('/register', async (req, res) => {
  try {
    // Obtenemos todos los datos del formulario de register.hbs
    const { name, email, username, password }  = req.body;
    const confirmPassword = req.body['confirm-password']; // El guion requiere corchetes

    // --- ¡NUEVA VALIDACIÓN! ---
    // 1. Revisar si las contraseñas coinciden
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Las contraseñas no coinciden' });
    }

    // 2. Revisar si el usuario o email ya existen
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('register', { error: 'El nombre de usuario o email ya está en uso' });
    }

    // 3. (Opcional) Hashear la contraseña (¡MUY RECOMENDADO!)
    // ... (aquí iría la lógica con bcrypt) ...
    // Por ahora, la guardamos como texto plano (inseguro pero simple)

    // 4. Crear el nuevo usuario
    const newUser = new User({
      name, // <-- Añadido
      email, // <-- Añadido
      username,
      password // Guardar la contraseña (debería ser hasheada)
      // (Faltaría guardar la fecha de nacimiento si la quieres)
    });
    await newUser.save();

    // 5. Iniciar sesión automáticamente (crear la cookie)
    res.cookie('userId', newUser._id.toString(), {
      httpOnly: true, // La cookie no se puede leer con JS en el cliente
      maxAge: 7 * 24 * 60 * 60 * 1000 // Expira en 7 días
    });

    // 6. Redirigir al perfil
    res.redirect('/perfil');

  } catch (error) {
    console.error(error);
    res.render('register', { error: 'Error al crear la cuenta' });
  }
});

// POST /login
// (Llamado por el formulario en login.hbs)
router.post('/login', async (req, res) => {
  try {
    // ¡CORREGIDO! Usamos 'username', no 'usuario'
    const { username, password } = req.body;

    // 1. Buscar al usuario
    const user = await User.findOne({ username });
    if (!user) {
      return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    // 2. Validar la contraseña
    // (Si hasheaste la contraseña, aquí usarías bcrypt.compare)
    if (user.password !== password) {
      return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    // 3. Crear la cookie de sesión
    res.cookie('userId', user._id.toString(), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // 4. Redirigir al perfil
    res.redirect('/perfil');

  } catch (error) {
    console.error(error);
    res.render('login', { error: 'Error al iniciar sesión' });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  // 1. Limpia la cookie
  res.clearCookie('userId');
  // 2. Redirige al inicio
  res.redirect('/');
});

module.exports = router;