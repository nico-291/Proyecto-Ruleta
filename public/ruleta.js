/*
  ARCHIVO FRONTEND: public/js/ruleta.js
  Este script se ejecuta en el NAVEGADOR del usuario.
  Se encarga de dibujar la ruleta y llamar a la API del servidor.
*/
(() => {
  // --- Elementos del DOM ---
  // Busca todos los elementos HTML que necesitamos controlar
  const wheel = document.getElementById('wheel');
  const spinBtn = document.getElementById('spinBtn');
  const apostarBtn = document.getElementById('apostarBtn');
  const numeroInput = document.getElementById('numeroInput');
  const montoInput = document.getElementById('montoInput');
  const statusEl = document.getElementById('status');
  const winningNumbersListEl = document.getElementById('winning-numbers-list');
  const saldoEl = document.getElementById('saldo-actual');
  const apuestaTotalEl = document.getElementById('apuesta-actual');

  // --- Configuración de la Ruleta (Debe ser idéntica al servidor) ---
  const numbersCW = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const isRed   = n => redSet.has(n);
  const isGreen = n => n === 0;
  const getColor = n => isGreen(n) ? 'green' : (isRed(n) ? 'red' : 'black');

  const seg = 360 / numbersCW.length;
  const startAngle = -90 - seg / 2;

  // --- Estado del Juego (Cliente) ---
  let currentRotation = 0;
  let spinning = false;
  let lastWinIdx = null;
  let winningNumbersHistory = [];
  const MAX_HISTORY = 10;
  let totalBetAmount = 0;

  // --- Funciones de Dibujo ---
  // Dibuja la ruleta usando CSS conic-gradient
  function paintWheel() {
    const parts = numbersCW.map((n, i) => {
      const colorVar = isGreen(n) ? 'var(--green)' : (isRed(n) ? 'var(--red)' : 'var(--black)');
      const from = (i * seg).toFixed(6);
      const to = ((i + 1) * seg).toFixed(6);
      return `${colorVar} ${from}deg ${to}deg`;
    });
    const bg = `
      radial-gradient(circle at 50% 50%, #0000 58%, rgba(255,255,255,.06) 58.2% 59%, #0000 59%),
      conic-gradient(from ${startAngle}deg, ${parts.join(',')})
    `;
    wheel.style.background = bg;
  }

  // Dibuja los números alrededor de la ruleta
  function drawLabels() {
    const labelsWrap = document.createElement('div');
    labelsWrap.className = 'labels';
    wheel.appendChild(labelsWrap);
    const R = wheel.clientWidth / 2 - 40; // Radio
    numbersCW.forEach((n, i) => {
      const label = document.createElement('div');
      label.className = 'label' + (n === 0 ? ' green' : '');
      label.textContent = n;
      const phi = startAngle + (i + 0.5) * seg; // Ángulo
      const rad = phi * Math.PI / 180;
      const x = Math.cos(rad) * R;
      const y = Math.sin(rad) * R;
      label.style.setProperty('--pos', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`);
      label.style.transform = `translate(-50%, -50%) var(--pos)`;
      labelsWrap.appendChild(label);
    });
  }

  // --- Funciones de UI ---
  // Muestra un mensaje en el estado
  function showStatus(message, isError = false) {
    statusEl.innerHTML = `<span class="result-chip ${isError ? 'error' : ''}" role="status">${message}</span>`;
  }

  // Muestra el chip del número ganador
  function showResult(n) {
    const colorName = isGreen(n) ? 'VERDE' : (isRed(n) ? 'ROJO' : 'NEGRO');
    const dotClass = `dot-${getColor(n)}`;
    statusEl.innerHTML = `
      <span class="result-chip" role="status">
        <span class="result-dot ${dotClass}"></span>
        ${n} — ${colorName}
      </span>
    `;
  }

  // Actualiza la lista de "Últimos Números Ganadores"
  function updateWinningNumbersUI() {
    if (!winningNumbersListEl) return;
    winningNumbersListEl.innerHTML = ''; // Limpia la lista
    winningNumbersHistory.slice().reverse().forEach(n => {
      const li = document.createElement('li');
      const dotClass = `dot-${getColor(n)}`;
      li.innerHTML = `<span class="result-dot ${dotClass}"></span> ${n}`;
      winningNumbersListEl.appendChild(li);
    });
  }

  // Habilita o deshabilita los botones y inputs
  function setControlsEnabled(enabled) {
    spinning = !enabled;
    spinBtn.disabled = !enabled;
    apostarBtn.disabled = !enabled;
    numeroInput.disabled = !enabled;
    montoInput.disabled = !enabled;
  }

  // --- Lógica de Apuestas (Cliente) ---
  // Se llama al presionar "Apostar"
  async function handleBet() {
    const numero = parseInt(numeroInput.value);
    const monto = parseInt(montoInput.value);

    // Validación simple en el cliente
    if (isNaN(numero) || numero < 0 || numero > 36) {
      showStatus("Número debe ser entre 0 y 36.", true);
      return;
    }
    if (isNaN(monto) || monto <= 0) {
      showStatus("Monto debe ser mayor a 0.", true);
      return;
    }

    setControlsEnabled(false); // Deshabilita botones
    showStatus("Procesando apuesta...");

    try {
      // ¡Llama a la API del SERVIDOR!
      const response = await fetch('/api/apostar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, monto })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error al apostar");
      }

      // Actualiza la UI con la respuesta del servidor
      saldoEl.textContent = `$${data.nuevoSaldo}`;
      totalBetAmount = data.apuestaTotal;
      apuestaTotalEl.textContent = `$${totalBetAmount}`;
      
      showStatus(`Apuesta de $${monto} al ${numero} aceptada.`);
      numeroInput.value = '';
      montoInput.value = '';

    } catch (error) {
      console.error("Error en handleBet:", error);
      showStatus(error.message, true);
    } finally {
      // Vuelve a habilitar los controles
      setControlsEnabled(true);
      // El botón de girar solo se habilita si hay una apuesta
      spinBtn.disabled = (totalBetAmount === 0);
    }
  }

  // --- Lógica de Giro (Cliente) ---
  // Se llama al presionar "GIRAR RULETA"
  async function handleSpin() {
    if (spinning) return;
    setControlsEnabled(false); // Deshabilita todo
    showStatus('Girando…');

    try {
      // ¡Llama a la API del SERVIDOR para obtener el resultado!
      const response = await fetch('/api/girar', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al girar");
      }
      
      const { winningNumber, nuevoSaldo, ganancia } = data;

      // ¡El servidor nos dijo el resultado!
      // Ahora, animamos la ruleta a ese número.
      spinTo(winningNumber, () => {
        // Esta función se ejecuta CUANDO LA ANIMACIÓN TERMINA
        
        // 1. Actualizar saldo y apuestas
        saldoEl.textContent = `$${nuevoSaldo}`;
        totalBetAmount = 0;
        apuestaTotalEl.textContent = '$0';
        
        // 2. Mostrar mensaje de ganancia/pérdida
        showStatus(ganancia > 0 ? `¡Ganaste $${ganancia}!` : "No ganaste esta ronda.");
        showResult(winningNumber); // Muestra el chip del número

        // 3. Actualizar historial de números
        winningNumbersHistory.push(winningNumber);
        if (winningNumbersHistory.length > MAX_HISTORY) {
          winningNumbersHistory.shift();
        }
        updateWinningNumbersUI();

        // 4. Habilitar controles para la próxima ronda
        setControlsEnabled(true);
        spinBtn.disabled = true; // Deshabilitado hasta la próxima apuesta
      });

    } catch (error) {
      console.error("Error en handleSpin:", error);
      showStatus(error.message, true);
      setControlsEnabled(true);
    }
  }

  // Función de animación
  function spinTo(winningNumber, onAnimationEndCallback) {
    const targetIdx = numbersCW.indexOf(winningNumber);
    if (targetIdx < 0) {
      console.error(`Número ganador ${winningNumber} no encontrado!`);
      return;
    }

    // Calcula a dónde debe girar
    const targetBaseRotation = -(targetIdx * seg); // Rotación base para ese número
    const extraSpins = 360 * 5; // 5 vueltas extra
    const currentNormalized = ((currentRotation % 360) + 360) % 360;
    const targetNormalized = ((targetBaseRotation % 360) + 360) % 360;
    
    let spinAmount = (targetNormalized - currentNormalized) + extraSpins;
    if (spinAmount < extraSpins) spinAmount += 360; // Asegura que gire en la dirección correcta

    currentRotation += spinAmount;
    const duration = 4.5; // Duración de la animación en segundos

    // Aplica la animación CSS
    wheel.style.transition = `transform ${duration}s cubic-bezier(.12,.63,.16,1)`;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    // Escucha el evento de que la animación terminó
    const onEnd = () => {
      wheel.removeEventListener('transitionend', onEnd);
      
      // Marca la etiqueta del número ganador
      const labels = wheel.querySelectorAll('.label');
      if (lastWinIdx !== null && labels[lastWinIdx]) labels[lastWinIdx].classList.remove('win');
      if (labels[targetIdx]) labels[targetIdx].classList.add('win');
      lastWinIdx = targetIdx;

      // Normaliza la rotación
      currentRotation = ((currentRotation % 360) + 360) % 360;
      wheel.style.transition = 'none';
      wheel.style.transform = `rotate(${currentRotation}deg)`;
      void wheel.offsetWidth;
      
      // Llama a la función de callback
      if (onAnimationEndCallback) {
        onAnimationEndCallback();
      }
    };
    
    wheel.addEventListener('transitionend', onEnd);
  }

  // --- Inicialización ---
  // Esto se ejecuta apenas carga la página
  if (wheel && spinBtn && statusEl) {
    paintWheel(); // Dibuja el fondo de la ruleta
    drawLabels(); // Dibuja los números
    showStatus('Haz tu apuesta y gira');
    spinBtn.disabled = true; // Deshabilitado hasta que se apueste
    
    // Asigna las funciones a los botones
    apostarBtn.addEventListener('click', handleBet);
    spinBtn.addEventListener('click', handleSpin);
  } else {
    // Si falta un elemento, avisa en la consola
    console.error("Faltan elementos de la ruleta en el DOM.");
  }
})();