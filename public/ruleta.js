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
  const gananciaPotencialEl = document.getElementById('ganancia-potencial');

  // --- Configuración de la Ruleta (Debe ser idéntica al servidor) ---
  const numbersCW = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const PAGO_DIRECTO = 36;
  const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const isRed   = n => redSet.has(n);
  const isGreen = n => n === 0;
  const getColor = n => isGreen(n) ? 'green' : (isRed(n) ? 'red' : 'black');

  const seg = 360 / numbersCW.length;
  // Ángulo donde comienza el primer número (0). 
  // Lo ajustamos para que el 0 quede exactamente bajo el puntero cuando la rotación es 0.
  const startAngle = 90 + seg / 2; // Invertido para que el 0 quede a la derecha de la flecha

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
    // Se elimina cualquier etiqueta existente para evitar duplicados
    wheel.querySelectorAll('.labels').forEach(el => el.remove());
    wheel.appendChild(labelsWrap);
    
    const R = wheel.clientWidth / 2 - 25; // Radio ajustado para centrado
    
    numbersCW.forEach((n, i) => {
      const label = document.createElement('div');
      label.className = 'label' + (n === 0 ? ' green' : '');
      label.textContent = n;
      
      // El ángulo del centro del segmento es: (i * seg) + (seg / 2)
      // Ajustamos el inicio a 90 grados (arriba) para rotar desde allí
      const phi = (i * seg) + (seg / 2) + 90; // Ángulo en grados
      const rad = phi * Math.PI / 180; // Ángulo en radianes
      
      const x = Math.cos(rad) * R;
      const y = Math.sin(rad) * R;

      // Posicionamiento de la etiqueta
      label.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${phi - 90}deg)`;
      
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
      // Llama a la API del SERVIDOR
      const response = await fetch('/api/apostar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, monto }),
        credentials: 'include' 
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error al apostar");
      }

      // Actualiza la UI con la respuesta del servidor
      saldoEl.textContent = `$${data.nuevoSaldo}`;
      totalBetAmount = data.apuestaTotal;
      apuestaTotalEl.textContent = `$${totalBetAmount}`;
      
      if (gananciaPotencialEl) {
        gananciaPotencialEl.textContent = `$${totalBetAmount * PAGO_DIRECTO}`;
      }
      
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
    if (spinning || totalBetAmount === 0) return;
    setControlsEnabled(false); // Deshabilita todo
    showStatus('Girando…');

    try {
      // Llama a la API del SERVIDOR para obtener el resultado!
      const response = await fetch('/api/girar', { method: 'POST', credentials: 'include' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al girar");
      }
      
      const { winningNumber, nuevoSaldo, ganancia } = data;

      // El servidor nos dijo el resultado!
      // Ahora, animamos la ruleta a ese número.
      spinTo(winningNumber, () => {
        // Esta función se ejecuta CUANDO LA ANIMACIÓN TERMINA
        
        // 1. Actualizar saldo y apuestas
        saldoEl.textContent = `$${nuevoSaldo}`;
        totalBetAmount = 0;
        apuestaTotalEl.textContent = '$0';
        if (gananciaPotencialEl) {
          gananciaPotencialEl.textContent = '$0';
        }
        
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
      spinBtn.disabled = (totalBetAmount === 0);
    }
  }

  // Función de animación (CORREGIDA)
  function spinTo(winningNumber, onAnimationEndCallback) {
    const targetIdx = numbersCW.indexOf(winningNumber);
    if (targetIdx < 0) {
      console.error(`Número ganador ${winningNumber} no encontrado!`);
      return;
    }

    // 1. Calcular la rotación base necesaria para centrar el número ganador.
    // El '0' está al inicio del array. Queremos que el centro del segmento
    // del número ganador esté en el punto de la flecha (posición 0, arriba).
    // La ruleta está dibujada con el 0 en la parte superior derecha (debido al conic-gradient).
    
    // Rotación del centro del segmento:
    const targetCenterAngle = (targetIdx * seg) + (seg / 2);

    // Queremos que el targetCenterAngle se alinee con el ángulo de la flecha (360 - 90 = 270 grados en la vista CSS)
    // El punto donde apunta la flecha está a 270 grados (o -90 grados).
    // La rotación para centrar el número es: 
    // targetRotation = (360 - targetCenterAngle) + offset_para_el_inicio_del_dibujo
    
    // El offset de dibujo es 90 + seg/2 (en paintWheel)
    // La rotación necesaria es la negativa del ángulo central
    let targetRotation = -targetCenterAngle;
    
    // 2. Asegurar que gire varias veces (5 vueltas extra)
    const extraSpins = 360 * 5; 
    
    // 3. Calcular la diferencia neta de rotación (asegurar el giro hacia adelante)
    const totalRotation = currentRotation + extraSpins + targetRotation;
    
    // Usamos el totalRotation para asegurar un giro suave y completo
    currentRotation = totalRotation;
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

      // Normaliza la rotación para que no se acumulen valores gigantes (y así la transición sea más limpia en la próxima)
      const normalizedRotation = currentRotation % 360;
      
      // La ruleta debe rotar hasta el ángulo negativo del centro del segmento del número ganador,
      // más 90 grados para compensar la flecha
      currentRotation = normalizedRotation - (targetCenterAngle - 90); 
      
      wheel.style.transition = 'none';
      wheel.style.transform = `rotate(${currentRotation}deg)`;
      void wheel.offsetWidth; // Forzar un reflow
      
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
    // Para asegurar que las etiquetas se redibujan correctamente en caso de redimensionamiento
    window.addEventListener('resize', drawLabels);
    
    // Asigna las funciones a los botones
    apostarBtn.addEventListener('click', handleBet);
    spinBtn.addEventListener('click', handleSpin);
  } else {
    // Si falta un elemento, avisa en la consola
    console.error("Faltan elementos de la ruleta en el DOM.");
  }
})();