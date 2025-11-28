import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, update, push, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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

// Función para incrementar nivel del usuario (+0.25 por victoria)
async function incrementUserLevel(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const currentLevel = userDoc.data().level || 1;
            await updateDoc(userRef, {
                level: currentLevel + 0.25
            });
        } else {
            await setDoc(userRef, {
                level: 1,
                userId: userId
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error incrementando nivel:', error);
    }
}

if (!gameId || !currentUser) {
    alert('Sesión inválida');
    window.location.href = '../index.html#juegos';
}

document.getElementById('roomId').textContent = `Sala: ${gameId.substring(0, 8)}`;

const gameRef = ref(database, `games/carreras/${gameId}`);
let gameData = null;
let myPosition = 0;
let raceStarted = false;
let raceFinished = false;
let myFinishTime = null;

let hasJoined = false;

onValue(gameRef, (snapshot) => {
    if (!snapshot.exists()) {
        alert('El juego ha finalizado');
        window.location.href = '../index.html#juegos';
        return;
    }
    
    gameData = snapshot.val();
    const myId = currentUser.firebaseUid || currentUser.userId;
    hasJoined = gameData.players && gameData.players[myId];
    updateUI();
});

async function joinRace() {
    const myId = currentUser.firebaseUid || currentUser.userId;
    const players = gameData.players || {};
    
    if (Object.keys(players).length >= 8) {
        alert('La carrera está llena (máximo 8 jugadores)');
        return;
    }
    
    await update(ref(database, `games/carreras/${gameId}/players/${myId}`), {
        id: myId,
        name: currentUser.username,
        avatar: currentUser.avatar,
        position: 0,
        finished: false,
        finishTime: null
    });
    
    hasJoined = true;
}

document.getElementById('joinBtn').addEventListener('click', joinRace);

function updateUI() {
    const players = gameData.players || {};
    const playerCount = Object.keys(players).length;
    
    document.getElementById('playerCount').textContent = `👥 ${playerCount}/8`;
    
    if (gameData.status === 'waiting') {
        document.getElementById('waitingRoom').style.display = 'block';
        document.getElementById('raceArea').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
        
        const joinBtn = document.getElementById('joinBtn');
        joinBtn.style.display = hasJoined ? 'none' : 'block';
        
        const playersWaiting = document.getElementById('playersWaiting');
        playersWaiting.innerHTML = '';
        
        Object.values(players).forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.innerHTML = `
                <div class="player-avatar" style="background-image: url(${player.avatar})"></div>
                <div class="player-name">${player.name}</div>
            `;
            playersWaiting.appendChild(card);
        });
        
        const startBtn = document.getElementById('startBtn');
        startBtn.disabled = playerCount < 2 || !hasJoined;
        
        if (!startBtn.dataset.listenerAdded) {
            startBtn.addEventListener('click', startRace);
            startBtn.dataset.listenerAdded = 'true';
        }
    } else if (gameData.status === 'countdown' || gameData.status === 'racing') {
        document.getElementById('waitingRoom').style.display = 'none';
        document.getElementById('raceArea').style.display = 'block';
        document.getElementById('resultsScreen').style.display = 'none';
        
        if (gameData.status === 'countdown') {
            document.getElementById('countdown').textContent = gameData.countdown || '';
        } else {
            document.getElementById('countdown').textContent = '';
            if (!raceStarted) {
                raceStarted = true;
                setupControls();
            }
        }
        
        renderRace();
    } else if (gameData.status === 'finished') {
        document.getElementById('waitingRoom').style.display = 'none';
        document.getElementById('raceArea').style.display = 'none';
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

async function startRace() {
    await update(gameRef, { status: 'countdown', countdown: 3 });
    
    setTimeout(async () => {
        await update(gameRef, { countdown: 2 });
        setTimeout(async () => {
            await update(gameRef, { countdown: 1 });
            setTimeout(async () => {
                await update(gameRef, { status: 'racing', countdown: null, startTime: Date.now() });
            }, 1000);
        }, 1000);
    }, 1000);
}

function renderRace() {
    const raceTrack = document.getElementById('raceTrack');
    const players = gameData.players || {};
    const playerCount = Object.keys(players).length;
    const laneHeight = 400 / playerCount;
    
    raceTrack.innerHTML = '';
    
    Object.values(players).forEach((player, index) => {
        let racer = document.getElementById(`racer-${player.id}`);
        if (!racer) {
            racer = document.createElement('div');
            racer.id = `racer-${player.id}`;
            racer.className = 'racer';
            racer.style.backgroundImage = `url(${player.avatar})`;
            racer.style.top = `${index * laneHeight + laneHeight / 2 - 30}px`;
            racer.innerHTML = `<div class="racer-name">${player.name}</div>`;
            raceTrack.appendChild(racer);
        }
        
        const trackWidth = raceTrack.offsetWidth - 80;
        const progress = Math.min(player.position / 100, 1);
        racer.style.left = `${progress * trackWidth}px`;
        
        if (player.finished) {
            racer.innerHTML = `<div class="racer-name">${player.name}</div>🏁`;
        }
    });
}

function setupControls() {
    const myId = currentUser.firebaseUid || currentUser.userId;
    
    const accelerate = async () => {
        if (raceFinished) return;
        
        myPosition += Math.random() * 3 + 1;
        
        if (myPosition >= 100 && !raceFinished) {
            raceFinished = true;
            myFinishTime = Date.now() - gameData.startTime;
            
            await update(ref(database, `games/carreras/${gameId}/players/${myId}`), {
                position: 100,
                finished: true,
                finishTime: myFinishTime
            });
            
            checkAllFinished();
        } else {
            await update(ref(database, `games/carreras/${gameId}/players/${myId}/position`), myPosition);
        }
    };
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            accelerate();
        }
    });
    
    document.addEventListener('touchstart', (e) => {
        e.preventDefault();
        accelerate();
    });
    
    document.addEventListener('click', accelerate);
}

async function checkAllFinished() {
    const players = gameData.players || {};
    const allFinished = Object.values(players).every(p => p.finished);
    
    if (allFinished) {
        await update(gameRef, { status: 'finished' });
        await sendResultsToChat();
    }
}

async function sendResultsToChat() {
    const players = Object.values(gameData.players || {});
    const sorted = players.sort((a, b) => a.finishTime - b.finishTime);
    const winner = sorted[0];
    
    if (winner) {
        await incrementUserLevel(winner.id);
    }
    
    const gameLink = window.location.href;
    const resultText = `🏁 Carrera: ${winner.name} ganó la carrera`;
    
    const messageRef = push(ref(database, 'rooms/juegos/messages'));
    await set(messageRef, {
        userId: 'bot-juegos',
        username: '🤖 Bot de Juegos',
        text: resultText,
        timestamp: Date.now(),
        type: 'game-result',
        userAvatar: '/images/logo.svg',
        gameLink: gameLink
    });
}

function showResults() {
    const players = Object.values(gameData.players || {});
    const sorted = players.sort((a, b) => a.finishTime - b.finishTime);
    
    const podium = document.getElementById('podium');
    podium.innerHTML = '';
    
    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['first', 'second', 'third'];
    
    sorted.slice(0, 3).forEach((player, index) => {
        const place = document.createElement('div');
        place.className = `podium-place ${classes[index]}`;
        place.innerHTML = `
            <div class="podium-medal">${medals[index]}</div>
            <div class="podium-avatar" style="background-image: url(${player.avatar})"></div>
            <div class="podium-name">${player.name}</div>
            <div class="podium-time">${(player.finishTime / 1000).toFixed(2)}s</div>
        `;
        podium.appendChild(place);
    });
}

document.getElementById('exitBtn').addEventListener('click', () => {
    window.location.href = '../index.html#juegos';
});
