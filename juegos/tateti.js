import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

if (!gameId || !currentUser) {
    alert('Sesión inválida');
    window.location.href = '../index.html#juegos';
}

document.getElementById('roomId').textContent = gameId.substring(0, 8);

const gameRef = ref(database, `games/tateti/${gameId}`);
let mySymbol = null;
let gameData = null;
let timerInterval = null;

// Escuchar cambios del juego
onValue(gameRef, (snapshot) => {
    if (!snapshot.exists()) {
        alert('El juego ha finalizado');
        window.location.href = '../index.html#juegos';
        return;
    }
    
    gameData = snapshot.val();
    updateUI();
});

// Unirse al juego
async function joinGame() {
    const myId = currentUser.firebaseUid || currentUser.userId;
    
    if (gameData.player1 && gameData.player1.id === myId) {
        mySymbol = 'X';
        return;
    }
    if (gameData.player2 && gameData.player2.id === myId) {
        mySymbol = 'O';
        return;
    }
    
    if (!gameData.player1 && !gameData.player2) {
        const choice = confirm('¿Quieres ser X? (Aceptar = X, Cancelar = O)');
        mySymbol = choice ? 'X' : 'O';
        
        if (mySymbol === 'X') {
            await update(gameRef, {
                player1: {
                    id: myId,
                    name: currentUser.username,
                    avatar: currentUser.avatar
                }
            });
        } else {
            await update(gameRef, {
                player2: {
                    id: myId,
                    name: currentUser.username,
                    avatar: currentUser.avatar
                }
            });
        }
    } else if (!gameData.player1) {
        mySymbol = 'X';
        await update(gameRef, {
            player1: {
                id: myId,
                name: currentUser.username,
                avatar: currentUser.avatar
            },
            status: 'playing',
            currentTurn: 'X'
        });
    } else if (!gameData.player2) {
        mySymbol = 'O';
        await update(gameRef, {
            player2: {
                id: myId,
                name: currentUser.username,
                avatar: currentUser.avatar
            },
            status: 'playing',
            currentTurn: 'X'
        });
    }
}

joinGame();

function updateUI() {
    // Actualizar jugadores
    if (gameData.player1) {
        document.getElementById('player1Name').textContent = gameData.player1.name;
        document.getElementById('player1Avatar').style.backgroundImage = `url(${gameData.player1.avatar})`;
    }
    
    if (gameData.player2) {
        document.getElementById('player2Name').textContent = gameData.player2.name;
        document.getElementById('player2Avatar').style.backgroundImage = `url(${gameData.player2.avatar})`;
    }
    
    // Actualizar tablero
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const value = gameData.board[index];
        cell.textContent = value === 'X' ? '❌' : value === 'O' ? '⭕' : '';
        cell.classList.toggle('taken', value !== '');
    });
    
    // Actualizar estado
    if (gameData.status === 'waiting') {
        document.getElementById('gameStatus').textContent = 'Esperando jugadores...';
    } else if (gameData.status === 'playing') {
        const isMyTurn = gameData.currentTurn === mySymbol;
        document.getElementById('gameStatus').textContent = isMyTurn ? '¡Tu turno!' : `Turno de ${gameData.currentTurn}`;
    } else if (gameData.status === 'finished') {
        if (gameData.winner === 'draw') {
            document.getElementById('gameStatus').textContent = '¡Empate!';
        } else {
            document.getElementById('gameStatus').textContent = `¡Ganó ${gameData.winner}!`;
        }
        document.getElementById('newRoundBtn').style.display = 'inline-block';
    }
    
    // Actualizar stats
    document.getElementById('rounds').textContent = gameData.stats.rounds;
    document.getElementById('winsX').textContent = gameData.stats.winsX;
    document.getElementById('draws').textContent = gameData.stats.draws;
    document.getElementById('winsO').textContent = gameData.stats.winsO;
    
    // Timer
    if (gameData.expiresAt && !timerInterval) {
        timerInterval = setInterval(() => {
            const remaining = gameData.expiresAt - Date.now();
            if (remaining <= 0) {
                clearInterval(timerInterval);
                document.getElementById('timer').textContent = '00:00';
            } else {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                document.getElementById('timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
}

// Click en celda
document.getElementById('gameBoard').addEventListener('click', async (e) => {
    if (!e.target.classList.contains('cell')) return;
    if (gameData.status !== 'playing') return;
    if (gameData.currentTurn !== mySymbol) return;
    
    const index = parseInt(e.target.dataset.index);
    if (gameData.board[index] !== '') return;
    
    const newBoard = [...gameData.board];
    newBoard[index] = mySymbol;
    
    const winner = checkWinner(newBoard);
    const nextTurn = mySymbol === 'X' ? 'O' : 'X';
    
    if (winner) {
        await update(gameRef, {
            board: newBoard,
            status: 'finished',
            winner: winner,
            [`stats/${winner === 'draw' ? 'draws' : winner === 'X' ? 'winsX' : 'winsO'}`]: gameData.stats[winner === 'draw' ? 'draws' : winner === 'X' ? 'winsX' : 'winsO'] + 1
        });
    } else {
        await update(gameRef, {
            board: newBoard,
            currentTurn: nextTurn
        });
    }
});

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    if (board.every(cell => cell !== '')) return 'draw';
    return null;
}

// Nueva ronda
document.getElementById('newRoundBtn').addEventListener('click', async () => {
    await update(gameRef, {
        board: ['', '', '', '', '', '', '', '', ''],
        status: 'playing',
        currentTurn: 'X',
        winner: null,
        'stats/rounds': gameData.stats.rounds + 1
    });
    document.getElementById('newRoundBtn').style.display = 'none';
});

// Salir
document.getElementById('exitBtn').addEventListener('click', () => {
    if (confirm('¿Salir del juego?')) {
        window.location.href = '../index.html#juegos';
    }
});
