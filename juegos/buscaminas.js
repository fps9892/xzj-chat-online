// Configuración de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, remove, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyDavetvIrVymmoiIpRxUigCd5hljMtsr0c",
    authDomain: "fyzar-80936.firebaseapp.com",
    databaseURL: "https://fyzar-80936-default-rtdb.firebaseio.com",
    projectId: "fyzar-80936",
    storageBucket: "fyzar-80936.firebasestorage.app",
    messagingSenderId: "718553577005",
    appId: "1:718553577005:web:74b5b9e790232edf6e2aa4"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const BOARD_SIZE = 10;
const MINES_COUNT = 15;

let gameId = null;
let currentUser = null;
let gameState = null;
let autoStartTimer = null;
let prevState = null;
let emptyGameTimer = null;
let betweenRoundsTimer = null;
let turnTimer = null;
let isReinitializing = false; // nuevo: flag para evitar múltiples reinicies

const gameBoard = document.getElementById('gameBoard');
const welcomeScreen = document.getElementById('welcomeScreen');
const finishScreen = document.getElementById('finishScreen');
const playersList = document.getElementById('playersList');
const playerCount = document.getElementById('playerCount');
const statsList = document.getElementById('statsList');
const joinBtn = document.getElementById('joinBtn');

const urlParams = new URLSearchParams(window.location.search);
gameId = urlParams.get('id');

if (!gameId) {
    alert('ID de juego no válido');
    window.close();
}

// Función para salir del juego y redirigir a index
function exitGame() {
    // limpiar timers
    if (autoStartTimer) clearInterval(autoStartTimer);
    if (emptyGameTimer) clearInterval(emptyGameTimer);
    if (betweenRoundsTimer) clearInterval(betweenRoundsTimer);
    if (turnTimer) clearInterval(turnTimer);
    // NO limpiar localStorage - mantener datos del usuario
    // redirigir a index
    window.location.href = '/index.html#general';
}

// Detectar cuando players vacío y eliminar sala después de 15min
function checkEmptyGame() {
    if (!gameState || Object.keys(gameState.players || {}).length === 0) {
        if (!emptyGameTimer) {
            console.log('Juego vacío detectado. Eliminando en 15 minutos...');
            emptyGameTimer = setTimeout(async () => {
                // Eliminar la sala completa
                try {
                    await remove(ref(database, `games/buscaminas/${gameId}`));
                    console.log('Sala eliminada por inactividad');
                } catch (e) {
                    console.error('Error eliminando sala:', e);
                }
            }, 15 * 60 * 1000); // 15 minutos
        }
    } else {
        // hay players, cancelar timer
        if (emptyGameTimer) {
            clearInterval(emptyGameTimer);
            emptyGameTimer = null;
            console.log('Juego no está vacío. Timer de limpieza cancelado.');
        }
    }
}

// Detectar si queda 1 solo jugador durante el juego y reiniciar
async function checkGamePlayersCount() {
    if (!gameState || !gameState.players) return;
    
    const playerCount = Object.keys(gameState.players).length;
    
    // Si estamos jugando y quedan menos de 2 jugadores, reiniciar a "waiting"
    if (gameState.status === 'playing' && playerCount < 2 && !isReinitializing) {
        isReinitializing = true;
        console.log('Solo queda 1 jugador. Reiniciando ronda...');
        
        // Limpiar todos los timers
        stopTurnTimer();
        if (autoStartTimer) {
            clearInterval(autoStartTimer);
            autoStartTimer = null;
        }
        if (betweenRoundsTimer) {
            clearInterval(betweenRoundsTimer);
            betweenRoundsTimer = null;
        }
        
        showToast('Jugador desconectado. Esperando más jugadores...', 'warn', 3000);
        
        // Resetear a estado "waiting"
        try {
            await update(ref(database, `games/buscaminas/${gameId}`), {
                status: 'waiting',
                gameOver: false,
                board: null,
                revealed: null,
                flagged: null,
                currentTurnIndex: 0,
                playerOrder: [],
                lastEvent: null
            });
        } catch (e) {
            console.error('Error reiniciando juego:', e);
        } finally {
            isReinitializing = false;
        }
    } else if (gameState.status === 'waiting' && playerCount >= 2) {
        // Si volvemos a waiting con 2+ jugadores, permitir reinicio
        isReinitializing = false;
    }
}

// Auto-unirse con datos del usuario cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('currentUser'));
    if (userData && userData.username) {
        joinGame(userData.username);
    }
});

async function joinGame(username) {
    const playerId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    currentUser = { id: playerId, name: username };
    
    const playerRef = ref(database, `games/buscaminas/${gameId}/players/${playerId}`);
    await set(playerRef, {
        name: username,
        score: 0,
        level: 0, // inicializar nivel si no existía
        joinedAt: Date.now()
    });
    
    onDisconnect(playerRef).remove();
    
    if (joinBtn) {
        joinBtn.textContent = 'Jugando';
        joinBtn.disabled = true;
    }
}

function generateBoard() {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    
    let minesPlaced = 0;
    while (minesPlaced < MINES_COUNT) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        
        if (board[row][col] !== -1) {
            board[row][col] = -1;
            minesPlaced++;
            
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const newRow = row + i;
                    const newCol = col + j;
                    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
                        if (board[newRow][newCol] !== -1) {
                            board[newRow][newCol]++;
                        }
                    }
                }
            }
        }
    }
    
    return board;
}

async function startNewRound() {
    const board = generateBoard();
    const playerIds = Object.keys(gameState.players);
    
    await update(ref(database, `games/buscaminas/${gameId}`), {
        status: 'playing',
        board: board,
        revealed: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)),
        flagged: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)),
        currentTurnIndex: 0,
        playerOrder: playerIds,
        startedAt: Date.now(),
        gameOver: false
    });
}

function renderBoard() {
    if (!gameState || !gameState.board) return;
    
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'grid';
    // usar la variable CSS para que las celdas sean responsivas
    gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, var(--cell-size))`;
    
    const isMyTurn = gameState.playerOrder && 
                     gameState.playerOrder[gameState.currentTurnIndex] === currentUser?.id;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if (gameState.revealed[row][col]) {
                cell.classList.add('revealed');
                const value = gameState.board[row][col];
                if (value === -1) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (value > 0) {
                    cell.classList.add(`number-${value}`);
                    cell.textContent = value;
                }
            } else if (gameState.flagged[row][col]) {
                cell.classList.add('flagged');
                cell.textContent = '🚩';
            }
            
            if (isMyTurn && !gameState.gameOver) {
                cell.addEventListener('click', () => handleCellClick(row, col));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleRightClick(row, col);
                });
            }
            
            gameBoard.appendChild(cell);
        }
    }
}

// Mostrar efecto de explosión en la celda (cliente)
function showExplosionAt(row, col) {
    const selector = `.cell[data-row="${row}"][data-col="${col}"]`;
    const cell = document.querySelector(selector);
    if (!cell) return;
    // evitar duplicados
    if (cell.querySelector('.explosion-effect')) return;
    const e = document.createElement('div');
    e.className = 'explosion-effect';
    cell.appendChild(e);
    // marcar celda como "exploded" visualmente
    cell.classList.add('exploded');
    setTimeout(() => {
        if (cell.contains(e)) cell.removeChild(e);
        cell.classList.remove('exploded');
    }, 900);
}

async function handleCellClick(row, col) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.revealed[row][col] || gameState.flagged[row][col]) return;
    
    const isMyTurn = gameState.playerOrder[gameState.currentTurnIndex] === currentUser.id;
    if (!isMyTurn) return;
    
    const value = gameState.board[row][col];
    
    if (value === -1) {
        // Mina - fin del juego
        const newRevealed = JSON.parse(JSON.stringify(gameState.revealed));
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                newRevealed[r][c] = true;
            }
        }

        // registrar evento de explosión en la BD para que todos lo vean
        await update(ref(database, `games/buscaminas/${gameId}`), {
            revealed: newRevealed,
            gameOver: true,
            loser: currentUser.id,
            lastEvent: { type: 'explosion', row, col, playerId: currentUser.id, ts: Date.now() }
        });
        
        setTimeout(() => endGame(false), 1000);
    } else {
        // Revelar celda
        const newRevealed = JSON.parse(JSON.stringify(gameState.revealed));
        revealCells(row, col, newRevealed);
        
        // Actualizar puntos
        let points = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (newRevealed[r][c] && !gameState.revealed[r][c] && gameState.board[r][c] !== -1) {
                    points += gameState.board[r][c] === 0 ? 1 : gameState.board[r][c];
                }
            }
        }
        
        const newScore = (gameState.players[currentUser.id]?.score || 0) + points;
        
        // Verificar victoria
        let revealedCount = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (newRevealed[r][c] && gameState.board[r][c] !== -1) {
                    revealedCount++;
                }
            }
        }
        
        const won = revealedCount === (BOARD_SIZE * BOARD_SIZE - MINES_COUNT);
        
        // Siguiente turno
        const nextTurnIndex = (gameState.currentTurnIndex + 1) % gameState.playerOrder.length;

        // si gana, calcular nuevo level localmente (mejorar con reglas de concurrencia si necesario)
        const currentLevel = gameState.players?.[currentUser.id]?.level || 0;
        const newLevel = won ? currentLevel + 1 : currentLevel;
        
        await update(ref(database, `games/buscaminas/${gameId}`), {
            revealed: newRevealed,
            currentTurnIndex: nextTurnIndex,
            [`players/${currentUser.id}/score`]: newScore,
            [`players/${currentUser.id}/level`]: newLevel,
            gameOver: won,
            winner: won ? currentUser.id : null,
            lastEvent: won ? { type: 'victory', playerId: currentUser.id, ts: Date.now() } : (gameState.lastEvent || null)
        });
        
        if (won) {
            setTimeout(() => endGame(true), 1000);
        }
    }
}

async function handleRightClick(row, col) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.revealed[row][col]) return;
    
    const isMyTurn = gameState.playerOrder[gameState.currentTurnIndex] === currentUser.id;
    if (!isMyTurn) return;
    
    const newFlagged = JSON.parse(JSON.stringify(gameState.flagged));
    newFlagged[row][col] = !newFlagged[row][col];
    
    await update(ref(database, `games/buscaminas/${gameId}`), {
        flagged: newFlagged
    });
}

function revealCells(row, col, revealed) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    if (revealed[row][col]) return;
    
    revealed[row][col] = true;
    
    if (gameState.board[row][col] === 0) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                revealCells(row + i, col + j, revealed);
            }
        }
    }
}

async function endGame(won) {
    gameBoard.style.display = 'none';
    finishScreen.style.display = 'block';
    
    const winnerText = document.getElementById('winnerText');
    const finalScores = document.getElementById('finalScores');
    
    const sortedPlayers = Object.entries(gameState.players)
        .sort((a, b) => b[1].score - a[1].score);
    
    const medals = ['🥇', '🥈', '🥉'];
    
    if (won) {
        winnerText.textContent = `🎉 ¡${sortedPlayers[0][1].name} ganó!`;
    } else {
        const loserName = gameState.players[gameState.loser]?.name || 'Alguien';
        winnerText.textContent = `💥 ${loserName} tocó una mina`;
    }
    
    finalScores.innerHTML = sortedPlayers.map(([id, player], index) => `
        <div class="score-item ${index === 0 ? 'winner' : index === 1 ? 'second' : index === 2 ? 'third' : ''}">
            <span>${medals[index] || (index + 1) + '.'} ${player.name}</span>
            <span>${player.score} pts</span>
        </div>
    `).join('');
    
    const revealedBoard = document.getElementById('revealedBoard');
    // usar la variable CSS también aquí
    revealedBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, var(--cell-size))`;
    revealedBoard.innerHTML = '';
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell revealed';
            const value = gameState.board[row][col];
            
            if (value === -1) {
                cell.classList.add('mine');
                cell.textContent = '💣';
            } else if (value > 0) {
                cell.classList.add(`number-${value}`);
                cell.textContent = value;
            }
            
            revealedBoard.appendChild(cell);
        }
    }
    
    // En lugar de setTimeout directo a startNewRound, mostrar pantalla entre-rondas
    setTimeout(async () => {
        // Resetear puntos
        const updates = {};
        Object.keys(gameState.players).forEach(playerId => {
            updates[`players/${playerId}/score`] = 0;
        });
        await update(ref(database, `games/buscaminas/${gameId}`), updates);

        // Mostrar pantalla de espera (10 segundos)
        finishScreen.style.display = 'none';
        const betweenRoundsScreen = document.getElementById('betweenRoundsScreen');
        const roundCountdown = document.getElementById('roundCountdown');
        if (betweenRoundsScreen && roundCountdown) {
            betweenRoundsScreen.style.display = 'block';
            let countdown = 10;
            roundCountdown.textContent = countdown;
            if (betweenRoundsTimer) clearInterval(betweenRoundsTimer);
            betweenRoundsTimer = setInterval(() => {
                countdown--;
                if (countdown >= 0) {
                    roundCountdown.textContent = countdown;
                } else {
                    clearInterval(betweenRoundsTimer);
                    betweenRoundsTimer = null;
                    betweenRoundsScreen.style.display = 'none';
                    startNewRound();
                }
            }, 1000);
        }
    }, 5000);
}

function updatePlayersList() {
    if (!gameState || !gameState.players) return;
    
    const players = Object.entries(gameState.players);
    playerCount.textContent = players.length;
    
    const currentTurnId = gameState.playerOrder?.[gameState.currentTurnIndex];
    
    playersList.innerHTML = players.map(([id, player]) => `
        <div class="player-item ${id === currentTurnId ? 'active-turn' : ''}">
            <span class="player-name">${player.name}${id === currentTurnId ? ' 🎯' : ''}</span>
            <span class="player-score">${player.score}</span>
        </div>
    `).join('');
}

function updateStats() {
    if (!gameState || !gameState.revealed) return;
    
    const totalCells = BOARD_SIZE * BOARD_SIZE;
    const revealedCount = gameState.revealed.flat().filter(Boolean).length;
    const flaggedCount = gameState.flagged.flat().filter(Boolean).length;
    const remainingCells = totalCells - MINES_COUNT - revealedCount;
    
    statsList.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Minas totales</span>
            <span class="stat-value">${MINES_COUNT}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Banderas colocadas</span>
            <span class="stat-value">${flaggedCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Celdas reveladas</span>
            <span class="stat-value">${revealedCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Celdas restantes</span>
            <span class="stat-value">${Math.max(0, remainingCells)}</span>
        </div>
    `;
}

// Mostrar toasts globales (usa #toastContainer en HTML)
function showToast(message, type = 'info', ttl = 3500) {
	const container = document.getElementById('toastContainer');
	if (!container) return;
	const t = document.createElement('div');
	t.className = `toast ${type}`;
	t.textContent = message;
	container.appendChild(t);
	setTimeout(() => {
		t.style.opacity = '0';
		t.style.transform = 'translateY(-8px)';
		setTimeout(() => {
			if (container.contains(t)) container.removeChild(t);
		}, 300);
	}, ttl);
}

// Popup encima del buscaminas cuando es tu turno (parpadea 1 vez y desaparece)
function showTurnPopup() {
	const boardContainer = document.querySelector('.board-container');
	if (!boardContainer) return;
	// evitar duplicados
	if (document.getElementById('turnPopup')) return;
	const popup = document.createElement('div');
	popup.id = 'turnPopup';
	popup.className = 'turn-popup';
	popup.textContent = 'TU TURNO';
	boardContainer.appendChild(popup);
	// quitar después de la animación (1.2s)
	setTimeout(() => {
		if (popup.parentNode) popup.parentNode.removeChild(popup);
	}, 1200);
}

// Temporizador de turno: 10seg para jugar, luego auto-skip
function startTurnTimer() {
    if (turnTimer) clearInterval(turnTimer);
    
    let timeLeft = 10;
    const turnCountdownEl = document.getElementById('turnCountdown');
    const turnInfo = document.getElementById('turnInfo');
    
    if (turnInfo) turnInfo.style.display = 'flex';
    if (turnCountdownEl) turnCountdownEl.textContent = `${timeLeft}s`;
    
    turnTimer = setInterval(async () => {
        timeLeft--;
        if (turnCountdownEl) turnCountdownEl.textContent = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
            clearInterval(turnTimer);
            turnTimer = null;
            // Auto-skip al siguiente turno
            if (gameState && gameState.playerOrder && gameState.playerOrder.length > 0) {
                const nextIndex = (gameState.currentTurnIndex + 1) % gameState.playerOrder.length;
                await update(ref(database, `games/buscaminas/${gameId}`), {
                    currentTurnIndex: nextIndex
                });
                showToast('Tiempo agotado. Turno siguiente.', 'warn', 2000);
            }
        }
    }, 1000);
}

function stopTurnTimer() {
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
    const turnInfo = document.getElementById('turnInfo');
    if (turnInfo) turnInfo.style.display = 'none';
}

// Conectar botón de salir y modal de unirse
window.addEventListener('DOMContentLoaded', () => {
    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) {
        exitBtn.addEventListener('click', exitGame);
    }

    // Modal de unirse
    const joinBtn = document.getElementById('joinBtn');
    const joinModal = document.getElementById('joinModal');
    const closeModal = document.getElementById('closeModal');
    const confirmJoin = document.getElementById('confirmJoin');
    const usernameInput = document.getElementById('usernameInput');

    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            // Si ya hay usuario unido, mostrar notificación
            if (currentUser) {
                showToast('Ya estás unido al juego', 'info', 2000);
                return;
            }
            
            // Obtener username del localStorage
            const userData = JSON.parse(localStorage.getItem('currentUser'));
            const savedUsername = userData?.username || '';
            
            // Si hay username guardado, unirse directamente
            if (savedUsername) {
                joinGame(savedUsername);
                showToast(`Bienvenido de vuelta, ${savedUsername} 🎮`, 'success', 2500);
            } else {
                // Si no hay username, abrir modal para ingresarlo
                if (joinModal) {
                    joinModal.style.display = 'flex';
                    if (usernameInput) {
                        usernameInput.value = '';
                        usernameInput.focus();
                    }
                }
            }
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (joinModal) joinModal.style.display = 'none';
        });
    }

    // Cerrar modal si hace click fuera del contenido
    if (joinModal) {
        joinModal.addEventListener('click', (e) => {
            if (e.target === joinModal) {
                joinModal.style.display = 'none';
            }
        });
    }

    if (confirmJoin) {
        confirmJoin.addEventListener('click', async () => {
            const name = usernameInput.value?.trim();
            if (!name) {
                showToast('Ingresa un nombre válido', 'warn', 2000);
                return;
            }
            if (joinModal) joinModal.style.display = 'none';
            // Guardar en localStorage antes de unirse
            localStorage.setItem('currentUser', JSON.stringify({ username: name }));
            await joinGame(name);
            showToast(`Bienvenido, ${name} 🎮`, 'success', 2500);
        });
    }

    // Enter en input para confirmar
    if (usernameInput) {
        usernameInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const name = usernameInput.value?.trim();
                if (!name) {
                    showToast('Ingresa un nombre válido', 'warn', 2000);
                    return;
                }
                if (joinModal) joinModal.style.display = 'none';
                localStorage.setItem('currentUser', JSON.stringify({ username: name }));
                await joinGame(name);
                showToast(`Bienvenido, ${name} 🎮`, 'success', 2500);
            }
        });
    }

    // Auto-unirse si hay datos en localStorage
    const userData = JSON.parse(localStorage.getItem('currentUser'));
    if (userData && userData.username && !currentUser) {
        joinGame(userData.username);
    }

    const gameRef = ref(database, `games/buscaminas/${gameId}`);
    onValue(gameRef, (snapshot) => {
    if (snapshot.exists()) {
        const newState = snapshot.val();

        // detectar transición a gameOver para todos los clientes
        if (newState.gameOver && (!prevState || !prevState.gameOver)) {
            stopTurnTimer();
            if (autoStartTimer) {
                clearInterval(autoStartTimer);
                autoStartTimer = null;
            }
            // Si hay loser -> mostrar mensaje que tocó mina; si hay winner -> mostrar ganador
            if (newState.loser) {
                const loserName = newState.players?.[newState.loser]?.name || 'Alguien';
                showToast(`${loserName} tocó una mina`, 'warn', 4000);
            }
            if (newState.winner) {
                const winnerName = newState.players?.[newState.winner]?.name || 'Alguien';
                showToast(`${winnerName} ganó la partida 🎉`, 'success', 4000);
            }
            // Actualizar gameState antes de llamar endGame
            gameState = newState;
            // reproducir animación de event si existe
            if (newState.lastEvent?.type === 'explosion') {
                // renderBoard se llamará más abajo en flujo normal, pero asegurar animación breve:
                setTimeout(() => showExplosionAt(newState.lastEvent.row, newState.lastEvent.col), 200);
            }
            // Llamar endGame para que cada cliente muestre la pantalla final
            setTimeout(() => {
                try { endGame(!!newState.winner); } catch (e) { /* ignore */ }
            }, 300);
            prevState = newState;
            updatePlayersList();
            updateStats();
            return;
        }

        // Actualizar gameState local
        gameState = newState;

        // Detectar y manejar juego vacío
        checkEmptyGame();

        // Detectar si quedan menos de 2 jugadores durante el juego (CRÍTICO: antes de cambio de turno)
        checkGamePlayersCount();

        // Detectar cambio de turno solo si NO estamos reiniciando
        if (!isReinitializing) {
            const currentTurnId = gameState.playerOrder?.[gameState.currentTurnIndex];
            const prevTurnId = prevState?.playerOrder?.[prevState.currentTurnIndex];
            if (currentTurnId !== prevTurnId) {
                // Turno cambió
                stopTurnTimer();
                if (gameState.status === 'playing' && !gameState.gameOver) {
                    // Iniciar temporizador de turno (10seg)
                    startTurnTimer();
                }
                
                if (currentUser && currentUser.id && currentTurnId === currentUser.id) {
                    // Es mi turno
                    showTurnPopup();
                    showToast('Es tu turno', 'info', 1400);
                }
            }
        }

        updatePlayersList();

        if (gameState.status === 'waiting') {
            stopTurnTimer();
            welcomeScreen.style.display = 'block';
            gameBoard.style.display = 'none';
            finishScreen.style.display = 'none';
            document.getElementById('betweenRoundsScreen').style.display = 'none';
            
            const playerCountLocal = Object.keys(gameState.players || {}).length;
            
            // Auto-inicio con 2+ jugadores
            if (playerCountLocal >= 2 && !autoStartTimer) {
                let countdown = 10;
                welcomeScreen.querySelector('p').textContent = `Iniciando en ${countdown} segundos...`;
                
                autoStartTimer = setInterval(async () => {
                    countdown--;
                    if (countdown > 0) {
                        welcomeScreen.querySelector('p').textContent = `Iniciando en ${countdown} segundos...`;
                    } else {
                        clearInterval(autoStartTimer);
                        autoStartTimer = null;
                        await startNewRound();
                    }
                }, 1000);
            } else if (playerCountLocal < 2) {
                if (autoStartTimer) {
                    clearInterval(autoStartTimer);
                    autoStartTimer = null;
                }
                welcomeScreen.querySelector('p').textContent = 'Esperando más jugadores...';
            }
        } else if (gameState.status === 'playing') {
            welcomeScreen.style.display = 'none';
            finishScreen.style.display = 'none';
            document.getElementById('betweenRoundsScreen').style.display = 'none';
            
            renderBoard();
            updateStats();

            // si hay un evento nuevo (explosion/victory) y cambia respecto a prevState, manejarlo
            if (newState.lastEvent && JSON.stringify(newState.lastEvent) !== JSON.stringify(prevState?.lastEvent)) {
                if (newState.lastEvent.type === 'explosion') {
                    setTimeout(() => showExplosionAt(newState.lastEvent.row, newState.lastEvent.col), 120);
                    const pl = newState.players?.[newState.lastEvent.playerId]?.name || 'Alguien';
                    showToast(`${pl} tocó una mina`, 'warn', 3200);
                } else if (newState.lastEvent.type === 'victory') {
                    const pl = newState.players?.[newState.lastEvent.playerId]?.name || 'Alguien';
                    showToast(`${pl} ganó y subió de nivel 🎉`, 'success', 3500);
                }
            }
        }

        // guardar estado previo para la próxima actualización
        prevState = JSON.parse(JSON.stringify(newState));
    }
    });
    
    updateStats();
});
