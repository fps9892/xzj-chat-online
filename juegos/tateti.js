import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

if (!gameId || !currentUser) {
    alert('Sesión inválida');
    window.location.href = '../index.html#juegos';
}

document.getElementById('roomId').textContent = gameId.substring(0, 8);

// Función para incrementar nivel del usuario (+0.25 por victoria)
async function incrementUserLevel(userId, isWin = true) {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            const updates = {};
            
            if (isWin) {
                updates.level = (data.level || 1) + 0.25;
                updates.wins = (data.wins || 0) + 1;
            } else {
                updates.losses = (data.losses || 0) + 1;
            }
            
            await updateDoc(userRef, updates);
        } else {
            await setDoc(userRef, {
                level: 1,
                wins: isWin ? 1 : 0,
                losses: isWin ? 0 : 1,
                draws: 0,
                userId: userId
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error incrementando nivel:', error);
    }
}

// Función para incrementar empates
async function incrementUserDraw(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            await updateDoc(userRef, {
                draws: (data.draws || 0) + 1
            });
        } else {
            await setDoc(userRef, {
                level: 1,
                wins: 0,
                losses: 0,
                draws: 1,
                userId: userId
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error incrementando empates:', error);
    }
}

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

// Verificar si ya está unido
function checkIfJoined() {
    const myId = currentUser.firebaseUid || currentUser.userId;
    
    if (gameData.player1 && gameData.player1.id === myId) {
        mySymbol = 'X';
        return true;
    }
    if (gameData.player2 && gameData.player2.id === myId) {
        mySymbol = 'O';
        return true;
    }
    return false;
}

// Unirse como X
document.getElementById('joinX').addEventListener('click', async () => {
    const myId = currentUser.firebaseUid || currentUser.userId;
    if (gameData.player1) return;
    
    mySymbol = 'X';
    await update(gameRef, {
        player1: {
            id: myId,
            name: currentUser.username,
            avatar: currentUser.avatar
        },
        status: gameData.player2 ? 'playing' : 'waiting',
        currentTurn: gameData.player2 ? 'X' : null
    });
});

// Unirse como O
document.getElementById('joinO').addEventListener('click', async () => {
    const myId = currentUser.firebaseUid || currentUser.userId;
    if (gameData.player2) return;
    
    mySymbol = 'O';
    await update(gameRef, {
        player2: {
            id: myId,
            name: currentUser.username,
            avatar: currentUser.avatar
        },
        status: gameData.player1 ? 'playing' : 'waiting',
        currentTurn: gameData.player1 ? 'X' : null
    });
});

function updateUI() {
    const myId = currentUser.firebaseUid || currentUser.userId;
    const isJoined = checkIfJoined();
    
    // Mostrar/ocultar botones de unirse
    const joinXBtn = document.getElementById('joinX');
    const joinOBtn = document.getElementById('joinO');
    
    if (!isJoined) {
        joinXBtn.style.display = gameData.player1 ? 'none' : 'block';
        joinOBtn.style.display = gameData.player2 ? 'none' : 'block';
    } else {
        joinXBtn.style.display = 'none';
        joinOBtn.style.display = 'none';
    }
    
    // Actualizar jugadores
    if (gameData.player1) {
        document.getElementById('player1Name').textContent = gameData.player1.name;
        document.getElementById('player1Avatar').style.backgroundImage = `url(${gameData.player1.avatar})`;
    } else {
        document.getElementById('player1Name').textContent = 'Esperando...';
        document.getElementById('player1Avatar').style.backgroundImage = 'none';
    }
    
    if (gameData.player2) {
        document.getElementById('player2Name').textContent = gameData.player2.name;
        document.getElementById('player2Avatar').style.backgroundImage = `url(${gameData.player2.avatar})`;
    } else {
        document.getElementById('player2Name').textContent = 'Esperando...';
        document.getElementById('player2Avatar').style.backgroundImage = 'none';
    }
    
    // Actualizar tablero
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const value = gameData.board[index];
        cell.innerHTML = '';
        if (value === 'X') {
            cell.innerHTML = '<img src="../images/x.svg" style="width: 60%; height: 60%; filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(326deg) brightness(104%) contrast(97%);" />';
        } else if (value === 'O') {
            cell.innerHTML = '<img src="../images/o.svg" style="width: 60%; height: 60%; filter: invert(64%) sepia(23%) saturate(1234%) hue-rotate(318deg) brightness(91%) contrast(89%);" />';
        }
        cell.classList.toggle('taken', value !== '');
        
        // Resaltar celdas ganadoras
        if (gameData.winner && gameData.winner !== 'draw') {
            const winningLines = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];
            
            for (const line of winningLines) {
                if (line.every(i => gameData.board[i] === gameData.winner)) {
                    if (line.includes(index)) {
                        cell.classList.add('winner');
                    }
                    break;
                }
            }
        } else {
            cell.classList.remove('winner');
        }
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
    if (!mySymbol) return;
    if (gameData.status !== 'playing') return;
    if (gameData.currentTurn !== mySymbol) return;
    
    const index = parseInt(e.target.dataset.index);
    if (gameData.board[index] !== '') return;
    
    const newBoard = [...gameData.board];
    newBoard[index] = mySymbol;
    
    const winner = checkWinner(newBoard);
    const nextTurn = mySymbol === 'X' ? 'O' : 'X';
    
    if (winner) {
        const updates = {
            board: newBoard,
            status: 'finished',
            winner: winner
        };
        
        if (winner === 'draw') {
            updates['stats/draws'] = (gameData.stats.draws || 0) + 1;
        } else if (winner === 'X') {
            updates['stats/winsX'] = (gameData.stats.winsX || 0) + 1;
        } else {
            updates['stats/winsO'] = (gameData.stats.winsO || 0) + 1;
        }
        
        await update(gameRef, updates);
        
        // Enviar notificación a sala #juegos
        sendResultNotification(winner);
        
        // Mostrar notificación temporal y reiniciar
        showRoundResult(winner);
        setTimeout(() => {
            startNewRound();
        }, 3000);
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

async function startNewRound() {
    if (!gameData.player1 || !gameData.player2) return;
    
    document.getElementById('gameStatus').textContent = '⏳ Reiniciando ronda...';
    
    // El ganador de la ronda anterior empieza
    let nextStarter = 'X';
    if (gameData.winner && gameData.winner !== 'draw') {
        nextStarter = gameData.winner;
    }
    
    await update(gameRef, {
        board: ['', '', '', '', '', '', '', '', ''],
        status: 'playing',
        currentTurn: nextStarter,
        winner: null,
        'stats/rounds': (gameData.stats.rounds || 0) + 1
    });
    document.getElementById('newRoundBtn').style.display = 'none';
}

function showRoundResult(winner) {
    const statusEl = document.getElementById('gameStatus');
    if (winner === 'draw') {
        statusEl.textContent = '🤝 ¡Empate!';
    } else {
        const winnerName = winner === 'X' ? gameData.player1.name : gameData.player2.name;
        statusEl.textContent = `🎉 ¡${winnerName} ganó!`;
    }
}

async function sendResultNotification(winner) {
    if (!gameData.player1 || !gameData.player2) return;
    
    const player1Name = gameData.player1.name;
    const player2Name = gameData.player2.name;
    const gameLink = window.location.href;
    
    let resultText;
    let winnerId = null;
    if (winner === 'draw') {
        resultText = `🤝 Ta-Te-Ti: Empate entre ${player1Name} y ${player2Name}`;
    } else {
        const winnerName = winner === 'X' ? player1Name : player2Name;
        const loserName = winner === 'X' ? player2Name : player1Name;
        winnerId = winner === 'X' ? gameData.player1.id : gameData.player2.id;
        resultText = `🎉 Ta-Te-Ti: ${winnerName} ganó la ronda contra ${loserName}`;
        
        // Incrementar stats de los jugadores
        if (winner === 'draw') {
            // Empate: ambos jugadores suman empate
            if (gameData.player1) await incrementUserDraw(gameData.player1.id);
            if (gameData.player2) await incrementUserDraw(gameData.player2.id);
        } else {
            // Victoria: ganador suma nivel y victoria, perdedor suma derrota
            const loserId = winner === 'X' ? gameData.player2.id : gameData.player1.id;
            if (winnerId) await incrementUserLevel(winnerId, true);
            if (loserId) await incrementUserLevel(loserId, false);
        }
    }
    
    const messageRef = ref(database, `rooms/juegos/messages`);
    await push(messageRef, {
        userId: 'bot-juegos',
        username: '🎮 Bot de Juegos',
        text: resultText,
        timestamp: serverTimestamp(),
        type: 'game-result',
        userAvatar: '/images/logo.svg',
        gameLink: gameLink
    });
}

// Nueva ronda
document.getElementById('newRoundBtn').addEventListener('click', async () => {
    if (!gameData.player1 || !gameData.player2) {
        alert('Se necesitan 2 jugadores para iniciar una nueva ronda');
        return;
    }
    await startNewRound();
});

// Salir del juego (no de la página)
document.getElementById('exitBtn').addEventListener('click', async () => {
    if (confirm('¿Salir del juego?')) {
        const myId = currentUser.firebaseUid || currentUser.userId;
        
        // Remover jugador del juego
        if (gameData.player1 && gameData.player1.id === myId) {
            await update(gameRef, { player1: null });
        } else if (gameData.player2 && gameData.player2.id === myId) {
            await update(gameRef, { player2: null });
        }
        
        // Volver a sala juegos
        window.location.href = '../index.html#juegos';
    }
});
