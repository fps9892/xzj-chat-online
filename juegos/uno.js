import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, remove, push, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getFirestore, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

const gameRef = ref(database, `games/uno/${gameId}`);
let gameData = null;
let myPlayerId = null;
let timerInterval = null;

// Crear mazo de cartas UNO
function createDeck() {
    const colors = ['red', 'yellow', 'green', 'blue'];
    const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', '+2'];
    const deck = [];
    
    colors.forEach(color => {
        values.forEach(value => {
            deck.push({ color, value });
            if (value !== '0') deck.push({ color, value });
        });
    });
    
    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', value: 'wild' });
        deck.push({ color: 'wild', value: '+4' });
    }
    
    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Incrementar nivel del usuario
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
        }
    } catch (error) {
        console.error('Error incrementando nivel:', error);
    }
}

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
document.getElementById('joinBtn').addEventListener('click', async () => {
    const myId = currentUser.firebaseUid || currentUser.userId;
    
    if (!gameData.players) gameData.players = {};
    
    const playerCount = Object.keys(gameData.players).length;
    if (playerCount >= 8) {
        alert('El juego está lleno (máximo 8 jugadores)');
        return;
    }
    
    if (gameData.players[myId]) {
        alert('Ya estás en el juego');
        return;
    }
    
    myPlayerId = myId;
    
    await update(gameRef, {
        [`players/${myId}`]: {
            id: myId,
            name: currentUser.username,
            avatar: currentUser.avatar,
            hand: [],
            saidUno: false
        }
    });
});

// Iniciar partida
document.getElementById('startBtn').addEventListener('click', async () => {
    if (!gameData.players || Object.keys(gameData.players).length < 2) {
        alert('Se necesitan al menos 2 jugadores');
        return;
    }
    
    const deck = createDeck();
    const players = Object.keys(gameData.players);
    const hands = {};
    
    players.forEach(playerId => {
        hands[playerId] = deck.splice(0, 7);
    });
    
    const firstCard = deck.pop();
    
    await update(gameRef, {
        status: 'playing',
        deck: deck,
        discardPile: [firstCard],
        currentColor: firstCard.color === 'wild' ? 'red' : firstCard.color,
        currentTurn: players[0],
        direction: 1,
        ...Object.keys(hands).reduce((acc, playerId) => {
            acc[`players/${playerId}/hand`] = hands[playerId];
            acc[`players/${playerId}/saidUno`] = false;
            return acc;
        }, {})
    });
});

// Robar carta
document.getElementById('drawPile').addEventListener('click', async () => {
    if (!myPlayerId || gameData.status !== 'playing') return;
    if (gameData.currentTurn !== myPlayerId) return;
    
    const deck = gameData.deck || [];
    if (deck.length === 0) {
        alert('No hay más cartas en el mazo');
        return;
    }
    
    const drawnCard = deck.pop();
    const myHand = gameData.players[myPlayerId].hand || [];
    
    await update(gameRef, {
        deck: deck,
        [`players/${myPlayerId}/hand`]: [...myHand, drawnCard],
        [`players/${myPlayerId}/saidUno`]: false
    });
    
    nextTurn();
});

// Jugar carta
async function playCard(card, cardIndex) {
    if (!myPlayerId || gameData.status !== 'playing') return;
    if (gameData.currentTurn !== myPlayerId) return;
    
    const topCard = gameData.discardPile[gameData.discardPile.length - 1];
    
    if (!canPlayCard(card, topCard, gameData.currentColor)) {
        alert('No puedes jugar esta carta');
        return;
    }
    
    const myHand = [...gameData.players[myPlayerId].hand];
    myHand.splice(cardIndex, 1);
    
    let newColor = card.color;
    
    if (card.color === 'wild') {
        newColor = await chooseColor();
    }
    
    const updates = {
        discardPile: [...gameData.discardPile, card],
        currentColor: newColor,
        [`players/${myPlayerId}/hand`]: myHand,
        [`players/${myPlayerId}/saidUno`]: false
    };
    
    await update(gameRef, updates);
    
    if (myHand.length === 0) {
        endRound(myPlayerId);
        return;
    }
    
    if (card.value === 'skip') {
        nextTurn();
    } else if (card.value === 'reverse') {
        await update(gameRef, { direction: gameData.direction * -1 });
    } else if (card.value === '+2') {
        const nextPlayer = getNextPlayer();
        const nextHand = gameData.players[nextPlayer].hand || [];
        const deck = gameData.deck || [];
        const drawnCards = deck.splice(-2);
        await update(gameRef, {
            deck: deck,
            [`players/${nextPlayer}/hand`]: [...nextHand, ...drawnCards]
        });
        nextTurn();
    } else if (card.value === '+4') {
        const nextPlayer = getNextPlayer();
        const nextHand = gameData.players[nextPlayer].hand || [];
        const deck = gameData.deck || [];
        const drawnCards = deck.splice(-4);
        await update(gameRef, {
            deck: deck,
            [`players/${nextPlayer}/hand`]: [...nextHand, ...drawnCards]
        });
        nextTurn();
    }
    
    nextTurn();
}

function canPlayCard(card, topCard, currentColor) {
    if (card.color === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
}

async function chooseColor() {
    return new Promise((resolve) => {
        const modal = document.getElementById('colorPicker');
        modal.classList.remove('hidden');
        
        const buttons = modal.querySelectorAll('.color-option');
        buttons.forEach(btn => {
            btn.onclick = () => {
                modal.classList.add('hidden');
                resolve(btn.dataset.color);
            };
        });
    });
}

function getNextPlayer() {
    const players = Object.keys(gameData.players);
    const currentIndex = players.indexOf(gameData.currentTurn);
    const nextIndex = (currentIndex + gameData.direction + players.length) % players.length;
    return players[nextIndex];
}

async function nextTurn() {
    const nextPlayer = getNextPlayer();
    await update(gameRef, { currentTurn: nextPlayer });
}

async function endRound(winnerId) {
    await update(gameRef, {
        status: 'finished',
        winner: winnerId,
        'stats/rounds': (gameData.stats?.rounds || 0) + 1
    });
    
    sendResultNotification(winnerId);
    
    setTimeout(() => {
        startNewRound();
    }, 3000);
}

async function startNewRound() {
    const deck = createDeck();
    const players = Object.keys(gameData.players);
    const hands = {};
    
    players.forEach(playerId => {
        hands[playerId] = deck.splice(0, 7);
    });
    
    const firstCard = deck.pop();
    
    await update(gameRef, {
        status: 'playing',
        deck: deck,
        discardPile: [firstCard],
        currentColor: firstCard.color === 'wild' ? 'red' : firstCard.color,
        currentTurn: players[0],
        direction: 1,
        winner: null,
        ...Object.keys(hands).reduce((acc, playerId) => {
            acc[`players/${playerId}/hand`] = hands[playerId];
            acc[`players/${playerId}/saidUno`] = false;
            return acc;
        }, {})
    });
}

async function sendResultNotification(winnerId) {
    const winnerName = gameData.players[winnerId].name;
    const gameLink = window.location.href;
    
    await incrementUserLevel(winnerId, true);
    
    const messageRef = ref(database, `rooms/juegos/messages`);
    await push(messageRef, {
        userId: 'bot-juegos',
        username: '🎮 Bot de Juegos',
        text: `🎉 UNO: ${winnerName} ganó la ronda`,
        timestamp: serverTimestamp(),
        type: 'game-result',
        userAvatar: '/images/logo.svg',
        gameLink: gameLink
    });
}

// Botón UNO
document.getElementById('unoBtn').addEventListener('click', async () => {
    if (!myPlayerId) return;
    await update(gameRef, {
        [`players/${myPlayerId}/saidUno`]: true
    });
});

// Salir del juego
document.getElementById('exitBtn').addEventListener('click', async () => {
    if (confirm('¿Salir del juego?')) {
        if (myPlayerId && gameData.players && gameData.players[myPlayerId]) {
            await update(gameRef, {
                [`players/${myPlayerId}`]: null
            });
        }
        window.location.href = '../index.html#juegos';
    }
});

function updateUI() {
    const myId = currentUser.firebaseUid || currentUser.userId;
    myPlayerId = myId;
    
    // Actualizar jugadores
    const playersContainer = document.getElementById('playersContainer');
    playersContainer.innerHTML = '';
    
    if (gameData.players) {
        Object.values(gameData.players).filter(p => p).forEach(player => {
            const isActive = gameData.currentTurn === player.id;
            const slot = document.createElement('div');
            slot.className = `player-slot ${isActive ? 'active' : ''}`;
            slot.innerHTML = `
                <div class="player-avatar" style="background-image: url(${player.avatar})"></div>
                <div class="player-name">${player.name}</div>
                <div class="player-cards-count">${player.hand?.length || 0} cartas</div>
                ${player.saidUno ? '<div style="color: #ff9800;">¡UNO!</div>' : ''}
            `;
            playersContainer.appendChild(slot);
        });
    }
    
    // Actualizar mazo
    document.getElementById('drawCount').textContent = gameData.deck?.length || 0;
    
    // Actualizar pila de descarte
    const discardPile = document.getElementById('discardPile');
    if (gameData.discardPile && gameData.discardPile.length > 0) {
        const topCard = gameData.discardPile[gameData.discardPile.length - 1];
        discardPile.innerHTML = `<div class="uno-card ${topCard.color}"><div class="card-value">${topCard.value}</div></div>`;
    }
    
    // Actualizar mano del jugador
    const playerHand = document.getElementById('playerHand');
    playerHand.innerHTML = '';
    
    if (myPlayerId && gameData.players && gameData.players[myPlayerId]) {
        const myHand = gameData.players[myPlayerId].hand || [];
        myHand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = `uno-card ${card.color}`;
            cardEl.innerHTML = `<div class="card-value">${card.value}</div>`;
            
            if (gameData.status === 'playing' && gameData.currentTurn === myPlayerId) {
                const topCard = gameData.discardPile[gameData.discardPile.length - 1];
                if (canPlayCard(card, topCard, gameData.currentColor)) {
                    cardEl.onclick = () => playCard(card, index);
                } else {
                    cardEl.classList.add('disabled');
                }
            } else {
                cardEl.classList.add('disabled');
            }
            
            playerHand.appendChild(cardEl);
        });
        
        // Mostrar botón UNO si tiene 2 cartas
        if (myHand.length === 2 && !gameData.players[myPlayerId].saidUno) {
            document.getElementById('unoBtn').classList.remove('hidden');
        } else {
            document.getElementById('unoBtn').classList.add('hidden');
        }
    }
    
    // Actualizar estado
    if (gameData.status === 'waiting') {
        document.getElementById('gameStatus').textContent = 'Esperando jugadores...';
        document.getElementById('joinBtn').classList.remove('hidden');
        
        if (myPlayerId && gameData.players && gameData.players[myPlayerId]) {
            document.getElementById('joinBtn').classList.add('hidden');
            document.getElementById('startBtn').classList.remove('hidden');
        }
    } else if (gameData.status === 'playing') {
        document.getElementById('joinBtn').classList.add('hidden');
        document.getElementById('startBtn').classList.add('hidden');
        
        const currentPlayerName = gameData.players[gameData.currentTurn]?.name || '';
        const isMyTurn = gameData.currentTurn === myPlayerId;
        document.getElementById('gameStatus').textContent = isMyTurn ? '¡Tu turno!' : `Turno de ${currentPlayerName}`;
        document.getElementById('currentPlayer').textContent = `Color actual: ${gameData.currentColor}`;
    } else if (gameData.status === 'finished') {
        const winnerName = gameData.players[gameData.winner]?.name || '';
        document.getElementById('gameStatus').textContent = `🎉 ¡${winnerName} ganó!`;
    }
    
    // Actualizar stats
    document.getElementById('rounds').textContent = gameData.stats?.rounds || 0;
    
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
