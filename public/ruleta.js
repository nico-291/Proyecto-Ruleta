window.onload = () => {

    const wheel = document.getElementById('wheel');
    const spinBtn = document.getElementById('spinBtn');
    const clearBetsBtn = document.getElementById('clearBetsBtn'); // Nuevo botón
    const statusEl = document.getElementById('status');
    const winningNumbersListEl = document.getElementById('winning-numbers-list');
    const saldoEl = document.getElementById('saldo-actual');
    const apuestaTotalEl = document.getElementById('apuesta-actual');
    const chipSelector = document.getElementById('chip-selector');
    const bettingTable = document.querySelector('.betting-table');
    const numberGrid = document.querySelector('.number-grid');

    const numbersCW = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];
    const redSet = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const blackSet = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);
    const isRed = n => redSet.has(n);
    const isGreen = n => n === 0;
    const getColor = n => isGreen(n) ? 'green' : (isRed(n) ? 'red' : 'black');
    const seg = 360 / numbersCW.length;
    const startAngle = 0;

    let currentRotation = 0;
    let spinning = false;
    let lastWinIdx = null;
    let winningNumbersHistory = [];
    const MAX_HISTORY = 10;
    
    let currentChipValue = 1; // Valor de la ficha seleccionada
    let currentBets = {}; // Objeto para guardar las apuestas
    let totalBetAmount = 0;

    // Dibuja la cuadrícula de números 1-36
    function createNumberGrid() {
    if (!numberGrid) {
        console.error("Error: no se encontró '.number-grid'. El tablero no se puede dibujar.");
        return;
    }

    numberGrid.innerHTML = ''; 
    const fragment = document.createDocumentFragment();
    
    for (let r = 3; r >= 1; r--) {
        for (let c = 1; c <= 12; c++) {
            const number = (c - 1) * 3 + r;
            const cell = document.createElement('div');
            
            let classes = ['bet-cell', 'number'];

            if (redSet.has(number)) {
                    classes.push('red');
                } else if (blackSet.has(number)) {
                    classes.push('black');
                }
            cell.className = classes.join(' ');

            cell.textContent = number;
            cell.dataset.betType = 'number';
            cell.dataset.betValue = number;
            
            fragment.appendChild(cell);
        }
    }
    numberGrid.appendChild(fragment);
}

    // Seleccionar ficha
function selectChip(e) {
 const clickedChip = e.target.closest('.chip-btn');
 if (!clickedChip) {
    return;
 }
 const chipValue = clickedChip.dataset.value;

currentChipValue = parseInt(chipValue); 

document.querySelectorAll('.chip-btn').forEach(btn => {
 btn.classList.remove('selected');
 });
 clickedChip.classList.add('selected'); 
console.log(`Ficha seleccionada: ${currentChipValue}`); 
}

    
   function placeBet(e) {
    const betCell = e.target.closest('.bet-cell');

    if (!betCell) {
        return;
    }
    const chipValue = parseInt(currentChipValue);


    const saldoActual = parseInt(saldoEl.textContent.replace('$', ''));
    if (saldoActual < chipValue) {
        showStatus("Saldo insuficiente", true);
        return;
    }

    const chipEl = document.createElement('div');
    
    chipEl.className = 'chip-on-board'; 
    chipEl.classList.add(`chip-${chipValue}`);
    chipEl.textContent = chipValue;

    betCell.appendChild(chipEl);

    const betType = betCell.dataset.betType;
    const betValue = betCell.dataset.betValue;

    const betKey = `${betType}-${betValue}`;
    if (!currentBets[betKey]) {
        currentBets[betKey] = 0;
    }
    currentBets[betKey] += chipValue;
    
    totalBetAmount += chipValue;
    
    apuestaTotalEl.textContent = `$${totalBetAmount}`;
    spinBtn.disabled = false; // Activa el botón de girar

    console.log(`Apuesta de ${chipValue} en ${betKey}. Total en esta celda: ${currentBets[betKey]}`);
}

    // Limpiar todas las apuestas
    function clearBets() {
        if (spinning) return;
        currentBets = {};
        updateBetsUI();
        showStatus('Apuestas limpiadas. Haz tu próxima apuesta.');
    }

  function updateBetsUI() {
    
    //Limpia todas las fichas visuales
    if (bettingTable) {
        bettingTable.querySelectorAll('.chip-on-board').forEach(chip => chip.remove());
    }

    totalBetAmount = 0;
    
    if (apuestaTotalEl) {
        apuestaTotalEl.textContent = `$${totalBetAmount}`;
    }
    
    if (spinBtn) {
        spinBtn.disabled = (totalBetAmount === 0) || spinning;
    }
}

    function paintWheel() {
        if (!wheel) return;
        const parts = numbersCW.map((n, i) => {
            const colorVar = isGreen(n) ? 'var(--green)' : (isRed(n) ? 'var(--red)' : 'var(--black)');
            const from = (i * seg).toFixed(6);
            const to = ((i + 1) * seg).toFixed(6);
            return `${colorVar} ${from}deg ${to}deg`;
        });
        const bg = `
      radial-gradient(circle at 50% 50%, #0000 58%, rgba(255,255,255,.06) 58.2% 59%, #0000 59%),
      conic-gradient(from ${startAngle}deg, ${parts.join(',')})`;
        wheel.style.background = bg;
    }

 function drawLabels(){
    if (!wheel) return;
    
    const labelsWrap = document.createElement('div');
    labelsWrap.className = 'labels';
    wheel.querySelectorAll('.labels').forEach(el => el.remove());
    wheel.appendChild(labelsWrap);
    
    const R = wheel.clientWidth / 2 - 20; 
    
    numbersCW.forEach((n, i) => {
        const label = document.createElement('div');
        label.className = 'label' + (n === 0 ? ' green' : '');
        label.textContent = n;
        
        const centerAngle_deg = (i * seg) + (seg / 2);

        const posAngle_rad = (centerAngle_deg - 90) * Math.PI / 180;

        const textRot_deg = centerAngle_deg;

        const x = Math.cos(posAngle_rad) * R;
        const y = Math.sin(posAngle_rad) * R;

        label.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${textRot_deg}deg)`;
        
        labelsWrap.appendChild(label);
    });
}

    function showStatus(message, isError = false) {
        if (statusEl) {
            statusEl.innerHTML = `<span class="result-chip ${isError ? 'error' : ''}" role="status">${message}</span>`;
        }
    }

    function showResult(n) {
        const colorName = isGreen(n) ? 'VERDE' : (isRed(n) ? 'ROJO' : 'NEGRO');
        const dotClass = `dot-${getColor(n)}`;
        if (statusEl) {
            statusEl.innerHTML = `
            <span class="result-chip" role="status">
                <span class="result-dot ${dotClass}"></span>
                ${n} — ${colorName}
            </span>`;
        }
    }

    function updateWinningNumbersUI() {
        if (!winningNumbersListEl) return;
        winningNumbersListEl.innerHTML = '';
        winningNumbersHistory.slice().reverse().forEach(n => {
            const li = document.createElement('li');
            const dotClass = `dot-${getColor(n)}`;
            li.innerHTML = `<span class="result-dot ${dotClass}"></span> ${n}`;
            winningNumbersListEl.appendChild(li);
        });
    }

    function setControlsEnabled(enabled) {
        spinning = !enabled;
        if (spinBtn) {
            spinBtn.disabled = !enabled || (totalBetAmount === 0);
        }
        if (clearBetsBtn) {
            clearBetsBtn.disabled = !enabled;
        }
    }

    async function handleSpin() {
        if (spinning || totalBetAmount === 0) return;
        
        setControlsEnabled(false);
        showStatus('Girando…');

        try {
            //Llama a la API del SERVIDOR
            const response = await fetch('/api/girar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bets: currentBets }), // Envía el objeto de apuestas
                credentials: 'include' // Envía la cookie
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Error al girar");
            }

            const { winningNumber, nuevoSaldo, gananciaNeta } = data;

            spinTo(winningNumber, () => {
                
                // Actualizar saldo y limpiar apuestas
                if (saldoEl) {
                    saldoEl.textContent = `$${nuevoSaldo}`;
                }
                currentBets = {}; // Limpiar apuestas
                updateBetsUI(); // Deja el saldo en 0
                
                // Mostrar mensaje de ganancia/pérdida
                showStatus(gananciaNeta > 0 ? `¡Ganaste $${gananciaNeta}!` : "No ganaste esta ronda.");
                showResult(winningNumber); 

                winningNumbersHistory.push(winningNumber);
                if (winningNumbersHistory.length > MAX_HISTORY) {
                    winningNumbersHistory.shift();
                }
                updateWinningNumbersUI();

                setControlsEnabled(true);
            });

        } catch (error) {
            console.error("Error en handleSpin:", error);
            showStatus(error.message, true);
            setControlsEnabled(true);
        }
    }

    function spinTo(winningNumber, onAnimationEndCallback){
        if (!wheel) return;
        const targetIdx = numbersCW.indexOf(winningNumber);
        if (targetIdx < 0) {
            console.error(`Número ganador ${winningNumber} no encontrado!`);
            return;
        }

        const targetCenterAngle = (targetIdx * seg) + (seg / 2);
        let targetRotation = -targetCenterAngle;
        const normalizedCurrentRotation = currentRotation % 360;
        let rotationDifference = targetRotation - normalizedCurrentRotation;

        if (rotationDifference > 180) {
            rotationDifference -= 360;
        } else if (rotationDifference < -180) {
            rotationDifference += 360;
        }

        const extraSpins = 360 * 5;
        currentRotation = currentRotation + rotationDifference + extraSpins;
        const duration = 4.5;

        wheel.style.transition = `transform ${duration}s cubic-bezier(.12,.63,.16,1)`;
        wheel.style.transform = `rotate(${currentRotation}deg)`;

        const onEnd = () => {
            wheel.removeEventListener('transitionend', onEnd);
            
            const labels = wheel.querySelectorAll('.label');
            if (lastWinIdx !== null && labels[lastWinIdx]) labels[lastWinIdx].classList.remove('win');
            if (labels[targetIdx]) labels[targetIdx].classList.add('win');
            lastWinIdx = targetIdx;

            let finalRotation = (targetRotation % 360);
            if (finalRotation > 0) finalRotation -= 360;
            
            currentRotation = finalRotation;
            
            wheel.style.transition = 'none';
            wheel.style.transform = `rotate(${currentRotation}deg)`;
            void wheel.offsetWidth;
            
            if (onAnimationEndCallback) {
                onAnimationEndCallback();
            }
        };
        
        wheel.addEventListener('transitionend', onEnd);
    }

    //Inicialización
    function init() {
        if (!wheel || !spinBtn || !statusEl || !numberGrid || !bettingTable || !chipSelector) {
            console.error("Faltan elementos críticos de la ruleta en el DOM. El script no puede inicializarse.");
            console.log("Falta 'wheel':", wheel);
            console.log("Falta 'spinBtn':", spinBtn);
            console.log("Falta 'statusEl':", statusEl);
            console.log("Falta 'numberGrid':", numberGrid);
            console.log("Falta 'bettingTable':", bettingTable);
            console.log("Falta 'chipSelector':", chipSelector);
            return; // Detiene la ejecución si falta algo
        }
        
        createNumberGrid(); // tapete
        paintWheel(); // fondo de la ruleta
        drawLabels(); // numeros en la ruleta
        showStatus('Haz tu apuesta y gira');
        spinBtn.disabled = true;
        
        window.addEventListener('resize', drawLabels);
        chipSelector.addEventListener('click', selectChip);
        bettingTable.addEventListener('click', placeBet);
        spinBtn.addEventListener('click', handleSpin);
        clearBetsBtn.addEventListener('click', clearBets);

        console.log("Ruleta inicializada correctamente.");
    }

    init(); // Iniciar la aplicación

};