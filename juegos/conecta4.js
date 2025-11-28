import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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

if (!gameId || !currentUser) {
    alert('Sesión inválida');
    window.location.href = '../index.html#juegos';
}

document.getElementById('roomId').textContent = `Sala: ${gameId.substring(0, 8)}`;

const gameRef = ref(database, `games/conecta4/${gameId}`);
let gameData = null;
let myColor = null;

onValue(gameRef, (snapshot) => {
    if (!snapshot.exists()) {
        alert('El juego ha finalizado');
        window.location.href = '../index.html#juegos';
        return;
    }
    gameData = snapshot.val();
    updateUI();
});

async function joinGame(color) {
    const myId = currentUser.firebaseUid || currentUser.userId;
    if (gameData.playerRed && gameData.playerYellow) {
        alert('El juego está lleno');
        return;
    }
    
    const playerData = { id: myId, name: currentUser.username, avatar: currentUser.avatar };
    await update(gameRef, color === 'red' ? { playerRed: playerData } : { playerYellow: playerData });
    myColor = color;
    
    if (gameData.playerRed && gameData.playerYellow) {
        await update(gameRef, { status: 'playing' });
    }
}

document.getElementById('joinRed').addEventListener('click', () => joinGame('red'));
document.getElementById('joinYellow').addEventListener('click', () => joinGame('yellow'));

function updateUI() {
    const hasRed = !!gameData.playerRed;
    const hasYellow = !!gameData.playerYellow;
    document.getElementById('playerCount').textContent = `👥 ${(hasRed ? 1 : 0) + (hasYellow ? 1 : 0)}/2`;
    
    if (gameData.status === 'waiting') {
        document.getElementById('waitingRoom').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
        
        const myId = currentUser.firebaseUid || currentUser.userId;
        document.getElementById('joinRed').style.display = (hasRed && gameData.playerRed.id === myId) || hasRed ? 'none' : 'block';
        document.getElementById('joinYellow').style.display = (hasYellow && gameData.playerYellow.id === myId) || hasYellow ? 'none' : 'block';
        
        const playersWaiting = document.getElementById('playersWaiting');
        playersWaiting.innerHTML = '';
        if (hasRed) playersWaiting.innerHTML += `<div class="player-card"><div class="player-avatar" style="background-image: url(${gameData.playerRed.avatar})"></div><div class="player-name">🔴 ${gameData.playerRed.name}</div></div>`;
        if (hasYellow) playersWaiting.innerHTML += `<div class="player-card"><div class="player-avatar" style="background-image: url(${gameData.playerYellow.avatar})"></div><div class="player-name">🟡 ${gameData.playerYellow.name}</div></div>`;
    } else if (gameData.status === 'playing') {
        document.getElementById('waitingRoom').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('resultsScreen').style.display = 'none';
        renderBoard();
        const currentPlayerName = gameData.currentTurn === 'red' ? gameData.playerRed?.name : gameData.playerYellow?.name;
        document.getElementById('turnIndicator').textContent = `Turno de: ${currentPlayerName || 'Esperando...'}`;
        document.getElementById('stats').textContent = `Rondas: ${gameData.stats.rounds} | 🔴: ${gameData.stats.winsRed} | 🟡: ${gameData.stats.winsYellow} | Empates: ${gameData.stats.draws}`;
    } else if (gameData.status === 'finished') {
        document.getElementById('waitingRoom').style.display = 'none';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'block';
        showResults();
    }
    
    if (gameData.expiresAt) {
        const remaining = gameData.expiresAt - Date.now();
        if (remaining > 0) {
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            document.getElementById('timer').textContent = `⏱️ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const idx = row * 7 + col;
            if (gameData.board[idx]) cell.classList.add(gameData.board[idx]);
            cell.addEventListener('click', () => dropPiece(col));
            board.appendChild(cell);
        }
    }
}

async function dropPiece(col) {
    const myId = currentUser.firebaseUid || currentUser.userId;
    if (!myColor || (myColor === 'red' && gameData.playerRed.id !== myId) || (myColor === 'yellow' && gameData.playerYellow.id !== myId)) return;
    if (gameData.currentTurn !== myColor) return;
    
    for (let row = 5; row >= 0; row--) {
        const idx = row * 7 + col;
        if (!gameData.board[idx]) {
            const newBoard = [...gameData.board];
            newBoard[idx] = myColor;
            await update(gameRef, { board: newBoard, currentTurn: myColor === 'red' ? 'yellow' : 'red' });
            checkWinner(newBoard);
            return;
        }
    }
}

function checkWinner(board) {
    const lines = [
        ...Array(6).fill().map((_, r) => Array(4).fill().map((_, c) => [r * 7 + c, r * 7 + c + 1, r * 7 + c + 2, r * 7 + c + 3])).flat(),
        ...Array(7).fill().map((_, c) => Array(3).fill().map((_, r) => [r * 7 + c, (r + 1) * 7 + c, (r + 2) * 7 + c, (r + 3) * 7 + c])).flat(),
        ...Array(3).fill().map((_, r) => Array(4).fill().map((_, c) => [r * 7 + c, (r + 1) * 7 + c + 1, (r + 2) * 7 + c + 2, (r + 3) * 7 + c + 3])).flat(),
        ...Array(3).fill().map((_, r) => Array(4).fill().map((_, c) => [r * 7 + c + 3, (r + 1) * 7 + c + 2, (r + 2) * 7 + c + 1, (r + 3) * 7 + c])).flat()
    ];
    
    for (const line of lines) {
        const colors = line.map(i => board[i]);
        if (colors.every(c => c === 'red')) return finishGame('red');
        if (colors.every(c => c === 'yellow')) return finishGame('yellow');
    }
    
    if (board.every(c => c)) finishGame('draw');
}

async function finishGame(winner) {
    const stats = { ...gameData.stats, rounds: gameData.stats.rounds + 1 };
    if (winner === 'red') stats.winsRed++;
    else if (winner === 'yellow') stats.winsYellow++;
    else stats.draws++;
    
    await update(gameRef, { status: 'finished', winner, stats });
    
    if (winner === 'draw') {
        if (gameData.playerRed) await incrementUserDraw(gameData.playerRed.id);
        if (gameData.playerYellow) await incrementUserDraw(gameData.playerYellow.id);
    } else {
        const winnerId = winner === 'red' ? gameData.playerRed.id : gameData.playerYellow.id;
        const loserId = winner === 'red' ? gameData.playerYellow.id : gameData.playerRed.id;
        await incrementUserLevel(winnerId, true);
        await incrementUserLevel(loserId, false);
    }
    
    await sendResultNotification(winner);
}

async function sendResultNotification(winner) {
    const winnerName = winner === 'red' ? gameData.playerRed.name : winner === 'yellow' ? gameData.playerYellow.name : 'Empate';
    const gameLink = window.location.href;
    const messageRef = push(ref(database, 'rooms/juegos/messages'));
    await set(messageRef, {
        userId: 'bot-juegos',
        userName: '🤖 Bot de Juegos',
        text: `🔴 Conecta 4: ${winnerName} ganó la partida`,
        timestamp: Date.now(),
        type: 'game-result',
        userAvatar: '/images/logo.svg',
        textColor: '#00ff88',
        gameLink: gameLink,
        isGuest: false,
        role: 'bot',
        firebaseUid: null
    });
}

function showResults() {
    const resultsDiv = document.getElementById('resultsScreen');
    if (gameData.winner === 'draw') {
        resultsDiv.innerHTML = `
            <h2>🤝 ¡Empate!</h2>
            <div class="winner-info">
                <p style="font-size: 1.5em; color: #d4a59a;">Ambos jugadores empataron</p>
            </div>
            <button id="newRoundBtn" class="btn-primary">Nueva Ronda</button>
            <button id="exitBtn" class="btn-secondary">Salir</button>
        `;
    } else {
        const winner = gameData.winner === 'red' ? gameData.playerRed : gameData.playerYellow;
        const emoji = gameData.winner === 'red' ? '🔴' : '🟡';
        resultsDiv.innerHTML = `
            <h2>🏆 ¡${winner.name} Gana!</h2>
            <div class="winner-info">
                <div class="winner-avatar" style="background-image: url(${winner.avatar})"></div>
                <div class="winner-name">${emoji} ${winner.name}</div>
                <p style="font-size: 1.2em; color: #d4a59a; margin-top: 15px;">¡Felicitaciones por la victoria!</p>
            </div>
            <button id="newRoundBtn" class="btn-primary">Nueva Ronda</button>
            <button id="exitBtn" class="btn-secondary">Salir</button>
        `;
    }
    
    document.getElementById('newRoundBtn').addEventListener('click', async () => {
        await update(gameRef, { status: 'playing', board: Array(42).fill(''), currentTurn: 'red', winner: null });
    });
    
    document.getElementById('exitBtn').addEventListener('click', () => {
        window.location.href = '../index.html#juegos';
    });
}


