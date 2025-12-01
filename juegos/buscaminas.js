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
        
        await update(ref(database, `games/buscaminas/${gameId}`), {
            revealed: newRevealed,
            gameOver: true,
            loser: currentUser.id
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
        
        await update(ref(database, `games/buscaminas/${gameId}`), {
            revealed: newRevealed,
            currentTurnIndex: nextTurnIndex,
            [`players/${currentUser.id}/score`]: newScore,
            gameOver: won,
            winner: won ? currentUser.id : null
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
    
    setTimeout(async () => {
        // Resetear puntos
        const updates = {};
        Object.keys(gameState.players).forEach(playerId => {
            updates[`players/${playerId}/score`] = 0;
        });
        await update(ref(database, `games/buscaminas/${gameId}`), updates);
        
        await startNewRound();
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

// Escuchar cambios en Firebase cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    const gameRef = ref(database, `games/buscaminas/${gameId}`);
    onValue(gameRef, (snapshot) => {
    if (snapshot.exists()) {
        gameState = snapshot.val();
        
        updatePlayersList();
        
        if (gameState.status === 'waiting') {
            welcomeScreen.style.display = 'block';
            gameBoard.style.display = 'none';
            finishScreen.style.display = 'none';
            
            const playerCount = Object.keys(gameState.players || {}).length;
            
            // Auto-inicio con 2+ jugadores
            if (playerCount >= 2 && !autoStartTimer) {
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
            } else if (playerCount < 2) {
                if (autoStartTimer) {
                    clearInterval(autoStartTimer);
                    autoStartTimer = null;
                }
                welcomeScreen.querySelector('p').textContent = 'Esperando más jugadores...';
            }
        } else if (gameState.status === 'playing') {
            welcomeScreen.style.display = 'none';
            finishScreen.style.display = 'none';
            
            renderBoard();
            updateStats();
        }
    }
    });
    
    updateStats();
});
