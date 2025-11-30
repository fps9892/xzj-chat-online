import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, update, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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

const gameRef = ref(database, `games/ajedrez/${gameId}`);
let gameData = null;
let myColor = null;
let selectedSquare = null;
let validMoves = [];

const pieces = {
    white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
    black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

function initBoard() {
    return [
        ['♜','♞','♝','♛','♚','♝','♞','♜'],
        ['♟','♟','♟','♟','♟','♟','♟','♟'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['♙','♙','♙','♙','♙','♙','♙','♙'],
        ['♖','♘','♗','♕','♔','♗','♘','♖']
    ];
}

onValue(gameRef, (snapshot) => {
    if (!snapshot.exists()) {
        alert('El juego ha finalizado');
        window.location.href = '../index.html#juegos';
        return;
    }
    gameData = snapshot.val();
    updateUI();
});

document.getElementById('joinWhite').addEventListener('click', () => joinGame('white'));
document.getElementById('joinBlack').addEventListener('click', () => joinGame('black'));

async function joinGame(color) {
    const myId = currentUser.firebaseUid || currentUser.userId;
    if ((color === 'white' && gameData.playerWhite) || (color === 'black' && gameData.playerBlack)) {
        alert('Este color ya está ocupado');
        return;
    }
    
    const playerData = { id: myId, name: currentUser.username, avatar: currentUser.avatar };
    await update(gameRef, color === 'white' ? { playerWhite: playerData } : { playerBlack: playerData });
    myColor = color;
    
    if (gameData.playerWhite && gameData.playerBlack) {
        await update(gameRef, { status: 'playing' });
    }
}

function updateUI() {
    const hasWhite = !!gameData.playerWhite;
    const hasBlack = !!gameData.playerBlack;
    
    if (gameData.status === 'waiting') {
        document.querySelector('.join-buttons').style.display = 'flex';
        document.getElementById('joinWhite').style.display = hasWhite ? 'none' : 'block';
        document.getElementById('joinBlack').style.display = hasBlack ? 'none' : 'block';
        
        if (hasWhite) {
            document.getElementById('player1Name').textContent = gameData.playerWhite.name;
            document.getElementById('player1Avatar').style.backgroundImage = `url(${gameData.playerWhite.avatar})`;
        }
        if (hasBlack) {
            document.getElementById('player2Name').textContent = gameData.playerBlack.name;
            document.getElementById('player2Avatar').style.backgroundImage = `url(${gameData.playerBlack.avatar})`;
        }
    } else {
        document.querySelector('.join-buttons').style.display = 'none';
        renderBoard();
        document.getElementById('gameStatus').textContent = `Turno: ${gameData.currentTurn === 'white' ? '⚪ Blancas' : '⚫ Negras'}`;
    }
    
    document.getElementById('rounds').textContent = gameData.stats.rounds;
    document.getElementById('winsWhite').textContent = gameData.stats.winsWhite;
    document.getElementById('draws').textContent = gameData.stats.draws;
    document.getElementById('winsBlack').textContent = gameData.stats.winsBlack;
}

function renderBoard() {
    const board = document.getElementById('chessBoard');
    board.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.textContent = gameData.board[row][col];
            
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            if (validMoves.some(m => m.row === row && m.col === col)) {
                square.classList.add('valid-move');
            }
            
            square.addEventListener('click', () => handleSquareClick(row, col));
            board.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    if (gameData.status !== 'playing' || gameData.currentTurn !== myColor) return;
    
    const piece = gameData.board[row][col];
    
    if (selectedSquare) {
        if (validMoves.some(m => m.row === row && m.col === col)) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
        } else {
            selectedSquare = null;
            validMoves = [];
            renderBoard();
        }
    } else if (piece && isPieceColor(piece, myColor)) {
        selectedSquare = { row, col };
        validMoves = getValidMoves(row, col, piece);
        renderBoard();
    }
}

function isPieceColor(piece, color) {
    const whitePieces = '♔♕♖♗♘♙';
    const blackPieces = '♚♛♜♝♞♟';
    return color === 'white' ? whitePieces.includes(piece) : blackPieces.includes(piece);
}

function getValidMoves(row, col, piece) {
    const moves = [];
    const isWhite = isPieceColor(piece, 'white');
    
    // Movimientos básicos simplificados
    if (piece === '♙' || piece === '♟') { // Peón
        const dir = isWhite ? -1 : 1;
        if (gameData.board[row + dir]?.[col] === '') moves.push({ row: row + dir, col });
    } else if (piece === '♖' || piece === '♜') { // Torre
        for (let i = 1; i < 8; i++) {
            if (gameData.board[row + i]?.[col] !== undefined) {
                if (gameData.board[row + i][col] === '' || !isPieceColor(gameData.board[row + i][col], myColor)) {
                    moves.push({ row: row + i, col });
                    if (gameData.board[row + i][col] !== '') break;
                } else break;
            }
        }
    }
    
    return moves;
}

async function makeMove(fromRow, fromCol, toRow, toCol) {
    const newBoard = gameData.board.map(r => [...r]);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = '';
    
    await update(gameRef, {
        board: newBoard,
        currentTurn: myColor === 'white' ? 'black' : 'white'
    });
    
    selectedSquare = null;
    validMoves = [];
}

document.getElementById('exitBtn').addEventListener('click', () => {
    window.location.href = '../index.html#juegos';
});
