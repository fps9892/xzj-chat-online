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

// Event Listeners
joinBtn.addEventListener('click', () => {
  joinModal.style.display = 'flex';
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
  if (gameState.currentPlayer) {
    startGame();
  }
});

// Funciones del juego
function joinGame(username) {
  const playerId = Date.now().toString();
  gameState.currentPlayer = playerId;
  gameState.players[playerId] = {
    name: username,
    score: 0
  };
  
  updatePlayersList();
  startBtn.disabled = false;
  joinBtn.textContent = 'Jugando';
  joinBtn.disabled = true;
}

function startGame() {
  gameState.gameStarted = true;
  gameState.gameOver = false;
  gameState.board = generateBoard();
  gameState.revealed = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
  gameState.flagged = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
  
  // Resetear scores
  Object.keys(gameState.players).forEach(id => {
    gameState.players[id].score = 0;
  });
  
  welcomeScreen.style.display = 'none';
  finishScreen.style.display = 'none';
  gameBoard.style.display = 'grid';
  gameBoard.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 40px)`;
  
  renderBoard();
  updatePlayersList();
  updateStats();
}

function generateBoard() {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  
  // Colocar minas
  let minesPlaced = 0;
  while (minesPlaced < MINES_COUNT) {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    
    if (board[row][col] !== -1) {
      board[row][col] = -1;
      minesPlaced++;
      
      // Incrementar números alrededor
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

function handleCellClick(row, col) {
  if (!gameState.gameStarted || gameState.gameOver) return;
  if (gameState.revealed[row][col] || gameState.flagged[row][col]) return;
  
  const value = gameState.board[row][col];
  
  if (value === -1) {
    // Mina encontrada - fin del juego
    gameState.gameOver = true;
    revealAll();
    endGame(false);
  } else {
    // Revelar celda
    revealCell(row, col);
    
    // Dar puntos
    if (gameState.currentPlayer) {
      gameState.players[gameState.currentPlayer].score += value === 0 ? 1 : value;
    }
    
    // Verificar victoria
    if (checkWin()) {
      gameState.gameOver = true;
      endGame(true);
    }
    
    renderBoard();
    updatePlayersList();
    updateStats();
  }
}

function handleRightClick(row, col) {
  if (!gameState.gameStarted || gameState.gameOver) return;
  if (gameState.revealed[row][col]) return;
  
  gameState.flagged[row][col] = !gameState.flagged[row][col];
  renderBoard();
  updateStats();
}

function revealCell(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
  if (gameState.revealed[row][col]) return;
  
  gameState.revealed[row][col] = true;
  
  // Si es 0, revelar celdas adyacentes
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

function endGame(won) {
  gameBoard.style.display = 'none';
  finishScreen.style.display = 'block';
  
  const winnerText = document.getElementById('winnerText');
  const finalScores = document.getElementById('finalScores');
  
  if (won) {
    winnerText.textContent = '🎉 ¡Victoria!';
  } else {
    winnerText.textContent = '💥 ¡Mina explotada!';
  }
  
  // Mostrar puntuaciones finales
  const sortedPlayers = Object.entries(gameState.players)
    .sort((a, b) => b[1].score - a[1].score);
  
  finalScores.innerHTML = sortedPlayers.map(([id, player], index) => `
    <div class="score-item ${index === 0 ? 'winner' : ''}">
      <span>${index + 1}. ${player.name}</span>
      <span>${player.score} puntos</span>
    </div>
  `).join('');
  
  // Mostrar tablero revelado
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
  
  // Reiniciar después de 5 segundos
  setTimeout(() => {
    if (gameState.currentPlayer) {
      startGame();
    }
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

// Inicializar estadísticas
updateStats();
