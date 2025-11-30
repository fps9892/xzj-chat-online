// Configuración de Firebase (reemplaza con tu configuración)
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "fyzar-80936.firebaseapp.com",
    databaseURL: "https://fyzar-80936-default-rtdb.firebaseio.com",
    projectId: "fyzar-80936",
    storageBucket: "fyzar-80936.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const firestore = firebase.firestore();

// Variables globales
let gameId = null;
let currentUser = null;
let currentRound = 0;
let timer = null;
const LETTERS = 'ABCDEFGHIJLMNOPQRSTUVWXYZ'.split('');
const MAX_PLAYERS = 8;
const ROUND_TIME = 60;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupEventListeners();
});

function initGame() {
    // Obtener o crear usuario
    currentUser = {
        id: localStorage.getItem('userId') || generateId(),
        name: localStorage.getItem('username') || prompt('Ingresa tu nombre:') || 'Jugador'
    };
    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('username', currentUser.name);
    
    // Buscar juego activo o crear uno nuevo
    gameId = 'tutifruti_' + Date.now();
    listenToGame();
}

function setupEventListeners() {
    document.getElementById('joinBtn').addEventListener('click', joinGame);
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('tutifrutiForm').addEventListener('submit', submitAnswers);
    document.getElementById('nextRoundBtn').addEventListener('click', nextRound);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
}

function joinGame() {
    const gameRef = db.ref(`games/tutifruti/${gameId}`);
    
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();
        const players = game?.players || {};
        
        if (Object.keys(players).length >= MAX_PLAYERS) {
            alert('El juego está lleno (máximo 8 jugadores)');
            return;
        }
        
        if (game?.status === 'playing') {
            alert('El juego ya comenzó');
            return;
        }
        
        gameRef.child('players').child(currentUser.id).set({
            name: currentUser.name,
            score: 0,
            totalScore: 0,
            joined: Date.now()
        });
        
        document.getElementById('joinBtn').style.display = 'none';
    });
}

function listenToGame() {
    const gameRef = db.ref(`games/tutifruti/${gameId}`);
    
    gameRef.on('value', (snapshot) => {
        const game = snapshot.val();
        
        if (!game) {
            // Crear juego nuevo
            gameRef.set({
                status: 'waiting',
                round: 0,
                createdAt: Date.now(),
                players: {}
            });
            return;
        }
        
        updatePlayersDisplay(game.players || {});
        
        const playerCount = Object.keys(game.players || {}).length;
        const startBtn = document.getElementById('startBtn');
        
        if (playerCount >= 2 && game.status === 'waiting') {
            startBtn.style.display = 'block';
        }
        
        if (game.status === 'playing') {
            document.getElementById('waitingRoom').style.display = 'none';
            document.getElementById('gameArea').style.display = 'block';
            currentRound = game.round;
            document.getElementById('roundNumber').textContent = `${currentRound}/3`;
            document.getElementById('currentLetter').textContent = game.currentLetter || '-';
            
            if (game.roundStartTime && !timer) {
                startTimer(game.roundStartTime);
            }
        }
        
        if (game.status === 'results') {
            showResults(game);
        }
        
        if (game.status === 'finished') {
            showFinalResults(game);
        }
    });
}

function updatePlayersDisplay(players) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    Object.values(players).forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.textContent = player.name;
        playersList.appendChild(card);
    });
}

function startGame() {
    const gameRef = db.ref(`games/tutifruti/${gameId}`);
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    
    gameRef.update({
        status: 'playing',
        round: 1,
        currentLetter: letter,
        roundStartTime: Date.now()
    });
}

function startTimer(startTime) {
    const timerEl = document.getElementById('timer');
    
    timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = ROUND_TIME - elapsed;
        
        if (remaining <= 0) {
            clearInterval(timer);
            timer = null;
            timerEl.textContent = '0';
            endRound();
        } else {
            timerEl.textContent = remaining;
        }
    }, 1000);
}

function submitAnswers(e) {
    e.preventDefault();
    
    const gameRef = db.ref(`games/tutifruti/${gameId}`);
    
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();
        const letter = game.currentLetter.toLowerCase();
        
        const answers = {
            nombre: document.getElementById('nombre').value.trim(),
            cosa: document.getElementById('cosa').value.trim(),
            pais: document.getElementById('pais').value.trim(),
            color: document.getElementById('color').value.trim(),
            animal: document.getElementById('animal').value.trim(),
            fruta: document.getElementById('fruta').value.trim(),
            verdura: document.getElementById('verdura').value.trim()
        };
        
        let score = 0;
        const results = {};
        
        Object.entries(answers).forEach(([field, value]) => {
            if (value && value.toLowerCase().startsWith(letter)) {
                score += 0.5;
                results[field] = { value, correct: true };
            } else {
                results[field] = { value, correct: false };
            }
        });
        
        gameRef.child('answers').child(currentRound).child(currentUser.id).set({
            answers: results,
            score: score,
            submittedAt: Date.now()
        });
        
        document.getElementById('tutifrutiForm').style.display = 'none';
        alert('¡Respuestas enviadas! Esperando a los demás jugadores...');
    });
}

function endRound() {
    const gameRef = db.ref(`games/tutifruti/${gameId}`);
    
    gameRef.update({
        status: 'results'
    });
}

function showResults(game) {
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('resultsArea').style.display = 'block';
    
    const answers = game.answers?.[currentRound] || {};
    const players = game.players || {};
    
    // Calcular puntuaciones
    const scores = [];
    Object.entries(answers).forEach(([userId, data]) => {
        scores.push({
            userId,
            name: players[userId]?.name || 'Desconocido',
            score: data.score,
            answers: data.answers
        });
    });
    
    scores.sort((a, b) => b.score - a.score);
    
    // Mostrar ganador
    if (scores.length > 0) {
        document.getElementById('winnerAnnouncement').textContent = 
            `🏆 Ganador de la ronda: ${scores[0].name} con ${scores[0].score} puntos`;
    }
    
    // Tabla de resultados
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Posición</th>
                <th>Jugador</th>
                <th>Puntos</th>
            </tr>
        </thead>
        <tbody>
            ${scores.map((s, i) => `
                <tr class="position-${i + 1}">
                    <td>${i + 1}°</td>
                    <td>${s.name}</td>
                    <td>${s.score}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    document.getElementById('resultsTable').innerHTML = '';
    document.getElementById('resultsTable').appendChild(table);
    
    // Actualizar puntuaciones totales
    scores.forEach(s => {
        const playerRef = db.ref(`games/tutifruti/${gameId}/players/${s.userId}`);
        playerRef.once('value', (snapshot) => {
            const player = snapshot.val();
            playerRef.update({
                totalScore: (player.totalScore || 0) + s.score
            });
        });
    });
}

function nextRound() {
    const gameRef = db.ref(`games/tutifruti/${gameId}`);
    
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();
        const nextRoundNum = game.round + 1;
        
        if (nextRoundNum > 3) {
            finishGame();
            return;
        }
        
        const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        
        gameRef.update({
            status: 'playing',
            round: nextRoundNum,
            currentLetter: letter,
            roundStartTime: Date.now()
        });
        
        document.getElementById('resultsArea').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('tutifrutiForm').style.display = 'grid';
        document.getElementById('tutifrutiForm').reset();
    });
}

function finishGame() {
    const gameRef = db.ref(`games/tutifruti/${gameId}`);
    
    gameRef.update({
        status: 'finished'
    });
}

function showFinalResults(game) {
    document.getElementById('resultsArea').style.display = 'none';
    document.getElementById('finalResults').style.display = 'block';
    
    const players = game.players || {};
    const finalScores = [];
    
    Object.entries(players).forEach(([userId, player]) => {
        finalScores.push({
            userId,
            name: player.name,
            totalScore: player.totalScore || 0
        });
    });
    
    finalScores.sort((a, b) => b.totalScore - a.totalScore);
    
    // Mostrar campeón
    if (finalScores.length > 0) {
        const winner = finalScores[0];
        document.getElementById('champion').textContent = 
            `🏆 CAMPEÓN: ${winner.name} con ${winner.totalScore} puntos totales`;
        
        // Actualizar estadísticas del ganador (+3 niveles)
        updateWinnerStats(winner.userId);
    }
    
    // Tabla final
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Posición</th>
                <th>Jugador</th>
                <th>Puntos Totales</th>
            </tr>
        </thead>
        <tbody>
            ${finalScores.map((s, i) => `
                <tr class="position-${i + 1}">
                    <td>${i + 1}°</td>
                    <td>${s.name}</td>
                    <td>${s.totalScore}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    document.getElementById('finalTable').innerHTML = '';
    document.getElementById('finalTable').appendChild(table);
}

function updateWinnerStats(userId) {
    // Buscar en usuarios autenticados
    firestore.collection('users').doc(userId).get().then(doc => {
        if (doc.exists) {
            const currentLevel = doc.data().level || 0;
            firestore.collection('users').doc(userId).update({
                level: currentLevel + 3,
                wins: firebase.firestore.FieldValue.increment(1)
            });
        }
    }).catch(() => {
        // Si no existe en users, buscar en guests
        firestore.collection('guests').doc(userId).get().then(doc => {
            if (doc.exists) {
                const currentLevel = doc.data().level || 0;
                firestore.collection('guests').doc(userId).update({
                    level: currentLevel + 3,
                    wins: firebase.firestore.FieldValue.increment(1)
                });
            }
        });
    });
}

function restartGame() {
    location.reload();
}

function generateId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}
