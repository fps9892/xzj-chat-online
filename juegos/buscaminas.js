// Configuración de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, push, remove, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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

// Configuración del juego
const BOARD_SIZE = 10;
const MINES_COUNT = 15;

// Estado del juego
let gameState = {
    board: [],
    revealed: [],
    flagged: [],
    players: {},
    currentPlayer: null,
    gameStarted: false,
    gameOver: false
};

let gameId = null;
let currentUser = null;

// Elementos del DOM
const joinBtn = document.getElementById('joinBtn');
const joinModal = document.getElementById('joinModal');
const closeModal = document.getElementById('closeModal');
const usernameInput = document.getElementById('usernameInput');
const confirmJoin = document.getElementById('confirmJoin');
const startBtn = document.getElementById('startBtn');
const gameBoard = document.getElementById('gameBoard');
const welcomeScreen = document.getElementById('welcomeScreen');
const finishScreen = document.getElementById('finishScreen');
const playersList = document.getElementById('playersList');
const playerCount = document.getElementById('playerCount');
const statsList = document.getElementById('statsList');

// Obtener ID del juego de la URL
const urlParams = new URLSearchParams(window.location.search);
gameId = urlParams.get('id');

if (!gameId) {
    alert('ID de juego no válido');
    window.close();
}

// Auto-unirse con datos del usuario
const userData = JSON.parse(localStorage.getItem('currentUser'));
if (userData && userData.username) {
    joinGame(userData.username);
}

// Event Listeners
joinBtn.addEventListener('click', () => {
    if (userData && userData.username) {
        joinGame(userData.username);
    } else {
        joinModal.style.display = 'flex';
    }
});

closeModal.addEventListener('click', () => {
    joinModal.style.display = 'none';
});

confirmJoin.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        joinGame(username);
        joinModal.style.display = 'none';
        usernameInput.value = '';
    }
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        confirmJoin.click();
    }
});

startBtn.addEventListener('click', () => {
    if (gameState.currentPlayer && Object.keys(gameState.players).length > 0) {
        startGame();
    }
});

// Funciones del juego
async function joinGame(username) {
    const playerId = Date.now().toString();
    currentUser = { id: playerId, name: username };
    
    const playerRef = ref(database, `games/buscaminas/${gameId}/players/${playerId}`);
    await set(playerRef, {
        name: username,
        score: 0,
        joinedAt: Date.now()
    });
    
    onDisconnect(playerRef).remove();
    
    gameState.currentPlayer = playerId;
    joinBtn.textContent = 'Jugando';
    joinBtn.disabled = true;
    startBtn.disabled = false;
}

async function startGame() {
    const gameRef = ref(database, `games/buscaminas/${gameId}`);
    const board = generateBoard();
    
    await set(gameRef, {
        status: 'playing',
        board: board,
        revealed: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)),
        flagged: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false)),
        players: gameState.players,
        startedAt: Date.now()
    });
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

function renderBoard() {
    gameBoard.innerHTML = '';
    
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
            
            cell.addEventListener('click', () => handleCellClick(row, col));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(row, col);
            });
            
            gameBoard.appendChild(cell);
        }
    }
}

async function handleCellClick(row, col) {
    if (!gameState.gameStarted || gameState.gameOver) return;
    if (gameState.revealed[row][col] || gameState.flagged[row][col]) return;
    
    const value = gameState.board[row][col];
    
    if (value === -1) {
        gameState.gameOver = true;
        revealAll();
        await endGame(false);
    } else {
        revealCell(row, col);
        
        if (gameState.currentPlayer) {
            gameState.players[gameState.currentPlayer].score += value === 0 ? 1 : value;
            const playerRef = ref(database, `games/buscaminas/${gameId}/players/${gameState.currentPlayer}`);
            await set(playerRef, gameState.players[gameState.currentPlayer]);
        }
        
        if (checkWin()) {
            gameState.gameOver = true;
            await endGame(true);
        }
        
        const gameRef = ref(database, `games/buscaminas/${gameId}`);
        await set(gameRef, {
            ...gameState,
            revealed: gameState.revealed,
            flagged: gameState.flagged
        });
        
        renderBoard();
        updateStats();
    }
}

async function handleRightClick(row, col) {
    if (!gameState.gameStarted || gameState.gameOver) return;
    if (gameState.revealed[row][col]) return;
    
    gameState.flagged[row][col] = !gameState.flagged[row][col];
    
    const gameRef = ref(database, `games/buscaminas/${gameId}`);
    await set(gameRef, {
        ...gameState,
        flagged: gameState.flagged
    });
    
    renderBoard();
    updateStats();
}

function revealCell(row, col) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    if (gameState.revealed[row][col]) return;
    
    gameState.revealed[row][col] = true;
    
    if (gameState.board[row][col] === 0) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                revealCell(row + i, col + j);
            }
        }
    }
}

function revealAll() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            gameState.revealed[row][col] = true;
        }
    }
    renderBoard();
}

function checkWin() {
    let revealedCount = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.revealed[row][col] && gameState.board[row][col] !== -1) {
                revealedCount++;
            }
        }
    }
    return revealedCount === (BOARD_SIZE * BOARD_SIZE - MINES_COUNT);
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
        winnerText.textContent = '💥 ¡Mina explotada!';
    }
    
    finalScores.innerHTML = sortedPlayers.map(([id, player], index) => `
        <div class="score-item ${index === 0 ? 'winner' : index === 1 ? 'second' : index === 2 ? 'third' : ''}">
            <span>${medals[index] || (index + 1) + '.'} ${player.name}</span>
            <span>${player.score} pts</span>
        </div>
    `).join('');
    
    const revealedBoard = document.getElementById('revealedBoard');
    revealedBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 40px)`;
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
    
    const gameRef = ref(database, `games/buscaminas/${gameId}`);
    await set(gameRef, {
        status: 'finished',
        winner: sortedPlayers[0][1].name,
        finalScores: sortedPlayers.map(([id, p]) => ({ name: p.name, score: p.score }))
    });
    
    setTimeout(async () => {
        await startGame();
    }, 5000);
}

function updatePlayersList() {
    const players = Object.entries(gameState.players);
    playerCount.textContent = players.length;
    
    playersList.innerHTML = players.map(([id, player]) => `
        <div class="player-item">
            <span class="player-name">${player.name}</span>
            <span class="player-score">${player.score}</span>
        </div>
    `).join('');
}

function updateStats() {
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

// Escuchar cambios en Firebase
const gameRef = ref(database, `games/buscaminas/${gameId}`);
onValue(gameRef, (snapshot) => {
    if (snapshot.exists()) {
        const data = snapshot.val();
        
        if (data.players) {
            gameState.players = data.players;
            updatePlayersList();
        }
        
        if (data.status === 'playing') {
            gameState.gameStarted = true;
            gameState.board = data.board;
            gameState.revealed = data.revealed;
            gameState.flagged = data.flagged;
            
            welcomeScreen.style.display = 'none';
            finishScreen.style.display = 'none';
            gameBoard.style.display = 'grid';
            gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 40px)`;
            
            renderBoard();
            updateStats();
        }
    }
});

// Inicializar estadísticas
updateStats();
