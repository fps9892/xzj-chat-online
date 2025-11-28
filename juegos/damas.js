import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getFirestore, doc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

document.getElementById('roomId').textContent = `Sala: ${gameId.substring(0, 8)}`;

const gameRef = ref(database, `games/damas/${gameId}`);
let gameData = null;
let myColor = null;
let selectedPiece = null;

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
    if (gameData.playerWhite && gameData.playerBlack) {
        alert('El juego está lleno');
        return;
    }
    
    const playerData = { id: myId, name: currentUser.username, avatar: currentUser.avatar };
    await update(gameRef, color === 'white' ? { playerWhite: playerData } : { playerBlack: playerData });
    myColor = color;
    
    if (gameData.playerWhite && gameData.playerBlack) {
        await update(gameRef, { status: 'playing' });
    }
}

document.getElementById('joinWhite').addEventListener('click', () => joinGame('white'));
document.getElementById('joinBlack').addEventListener('click', () => joinGame('black'));

function updateUI() {
    const hasWhite = !!gameData.playerWhite;
    const hasBlack = !!gameData.playerBlack;
    document.getElementById('playerCount').textContent = `👥 ${(hasWhite ? 1 : 0) + (hasBlack ? 1 : 0)}/2`;
    
    if (gameData.status === 'waiting') {
        document.getElementById('waitingRoom').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
        
        const myId = currentUser.firebaseUid || currentUser.userId;
        document.getElementById('joinWhite').style.display = (hasWhite && gameData.playerWhite.id === myId) || hasWhite ? 'none' : 'block';
        document.getElementById('joinBlack').style.display = (hasBlack && gameData.playerBlack.id === myId) || hasBlack ? 'none' : 'block';
        
        const playersWaiting = document.getElementById('playersWaiting');
        playersWaiting.innerHTML = '';
        if (hasWhite) playersWaiting.innerHTML += `<div class="player-card"><div class="player-avatar" style="background-image: url(${gameData.playerWhite.avatar})"></div><div class="player-name">⚪ ${gameData.playerWhite.name}</div></div>`;
        if (hasBlack) playersWaiting.innerHTML += `<div class="player-card"><div class="player-avatar" style="background-image: url(${gameData.playerBlack.avatar})"></div><div class="player-name">⚫ ${gameData.playerBlack.name}</div></div>`;
    } else if (gameData.status === 'playing') {
        document.getElementById('waitingRoom').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('resultsScreen').style.display = 'none';
        renderBoard();
        document.getElementById('turnIndicator').textContent = `Turno: ${gameData.currentTurn === 'white' ? '⚪ Blancas' : '⚫ Negras'}`;
        document.getElementById('stats').textContent = `Rondas: ${gameData.stats.rounds} | ⚪: ${gameData.stats.winsWhite} | ⚫: ${gameData.stats.winsBlack}`;
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
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            const idx = row * 8 + col;
            const piece = gameData.board[idx];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${piece.color} ${piece.king ? 'king' : ''}`;
                cell.appendChild(pieceEl);
            }
            cell.addEventListener('click', () => handleCellClick(row, col));
            board.appendChild(cell);
        }
    }
}

async function handleCellClick(row, col) {
    const myId = currentUser.firebaseUid || currentUser.userId;
    if (!myColor || (myColor === 'white' && gameData.playerWhite.id !== myId) || (myColor === 'black' && gameData.playerBlack.id !== myId)) return;
    if (gameData.currentTurn !== myColor) return;
    
    const idx = row * 8 + col;
    const piece = gameData.board[idx];
    
    if (selectedPiece === null && piece && piece.color === myColor) {
        selectedPiece = { row, col, idx };
    } else if (selectedPiece !== null) {
        const newBoard = [...gameData.board];
        newBoard[idx] = newBoard[selectedPiece.idx];
        newBoard[selectedPiece.idx] = null;
        
        if ((myColor === 'white' && row === 0) || (myColor === 'black' && row === 7)) {
            newBoard[idx].king = true;
        }
        
        await update(gameRef, { board: newBoard, currentTurn: myColor === 'white' ? 'black' : 'white' });
        selectedPiece = null;
        checkWinner(newBoard);
    }
}

function checkWinner(board) {
    const whitePieces = board.filter(p => p && p.color === 'white').length;
    const blackPieces = board.filter(p => p && p.color === 'black').length;
    
    if (whitePieces === 0) finishGame('black');
    else if (blackPieces === 0) finishGame('white');
}

async function finishGame(winner) {
    const stats = { ...gameData.stats, rounds: gameData.stats.rounds + 1 };
    if (winner === 'white') stats.winsWhite++;
    else stats.winsBlack++;
    
    await update(gameRef, { status: 'finished', winner, stats });
    
    const winnerId = winner === 'white' ? gameData.playerWhite.id : gameData.playerBlack.id;
    if (!winnerId.startsWith('guest-')) {
        try {
            await updateDoc(doc(db, 'users', winnerId), { level: increment(1) });
        } catch (error) {
            console.error('Error incrementando nivel:', error);
        }
    }
    
    await sendResultNotification(winner);
}

async function sendResultNotification(winner) {
    const winnerName = winner === 'white' ? gameData.playerWhite.name : gameData.playerBlack.name;
    const gameLink = window.location.href;
    const messageRef = push(ref(database, 'rooms/juegos/messages'));
    await set(messageRef, {
        userId: 'bot-juegos',
        userName: '🤖 Bot de Juegos',
        text: `👑 Damas: ${winnerName} ganó la partida`,
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
    const title = `¡${gameData.winner === 'white' ? '⚪ Blancas' : '⚫ Negras'} Ganan!`;
    document.getElementById('resultTitle').textContent = title;
}

document.getElementById('newRoundBtn').addEventListener('click', async () => {
    const initialBoard = Array(64).fill(null);
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) initialBoard[row * 8 + col] = { color: 'black', king: false };
        }
    }
    for (let row = 5; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) initialBoard[row * 8 + col] = { color: 'white', king: false };
        }
    }
    await update(gameRef, { status: 'playing', board: initialBoard, currentTurn: 'white', winner: null });
});

document.getElementById('exitBtn').addEventListener('click', () => {
    window.location.href = '../index.html#juegos';
});
