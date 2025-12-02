const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Redis Client
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('connect', () => console.log('✅ Redis conectado'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// Almacenamiento de jugadores (mantener en memoria por simplicidad)
const players = new Map();

class Game {
  constructor(gameId, rows, cols, mines, maxPlayers) {
    this.gameId = gameId;
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.maxPlayers = maxPlayers;
    this.players = [];
    this.board = this.generateBoard(rows, cols, mines);
    this.revealed = Array(rows).fill(null).map(() => Array(cols).fill(false));
    this.currentPlayerIndex = 0;
    this.gameStatus = 'waiting'; // waiting, playing, finished
    this.scores = {};
    this.moveHistory = [];
    this.startTime = null;
    this.winner = null;
  }

  generateBoard(rows, cols, mines) {
    const board = Array(rows).fill(null).map(() => Array(cols).fill(0));
    let mineCount = 0;
    while (mineCount < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (board[r][c] !== 'M') {
        board[r][c] = 'M';
        mineCount++;
      }
    }
    // Calcular números
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] !== 'M') {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === 'M') count++;
            }
          }
          board[r][c] = count;
        }
      }
    }
    return board;
  }

  addPlayer(playerId, playerName) {
    if (this.players.length < this.maxPlayers) {
      this.players.push({ id: playerId, name: playerName, joinedAt: Date.now() });
      this.scores[playerId] = 0;
      return true;
    }
    return false;
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    delete this.scores[playerId];
  }

  revealCell(row, col, playerId) {
    if (this.revealed[row][col]) return { valid: false, message: 'Celda ya revelada' };
    if (this.players.find(p => p.id === playerId)?.id !== this.getCurrentPlayer().id) {
      return { valid: false, message: 'No es tu turno' };
    }

    this.revealed[row][col] = true;
    const cell = this.board[row][col];

    if (cell === 'M') {
      this.gameStatus = 'finished';
      return { valid: true, hit: true, message: '¡Bomba!' };
    }

    this.scores[playerId]++;
    
    if (this.isWon()) {
      this.gameStatus = 'finished';
      this.winner = playerId;
      return { valid: true, hit: false, won: true, message: '¡Ganaste!' };
    }

    this.nextTurn();
    return { valid: true, hit: false, value: cell };
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  isWon() {
    const totalCells = this.rows * this.cols;
    const revealedCount = this.revealed.flat().filter(Boolean).length;
    return revealedCount === totalCells - this.mines;
  }

  getGameState() {
    return {
      gameId: this.gameId,
      board: this.board,
      revealed: this.revealed,
      players: this.players,
      currentPlayer: this.getCurrentPlayer(),
      scores: this.scores,
      status: this.gameStatus,
      winner: this.winner
    };
  }

  // Serializar para Redis
  toJSON() {
    return {
      gameId: this.gameId,
      rows: this.rows,
      cols: this.cols,
      mines: this.mines,
      maxPlayers: this.maxPlayers,
      players: this.players,
      board: this.board,
      revealed: this.revealed,
      currentPlayerIndex: this.currentPlayerIndex,
      gameStatus: this.gameStatus,
      scores: this.scores,
      moveHistory: this.moveHistory,
      startTime: this.startTime,
      winner: this.winner
    };
  }

  // Deserializar desde Redis
  static fromJSON(data) {
    const game = new Game(data.gameId, data.rows, data.cols, data.mines, data.maxPlayers);
    game.players = data.players;
    game.board = data.board;
    game.revealed = data.revealed;
    game.currentPlayerIndex = data.currentPlayerIndex;
    game.gameStatus = data.gameStatus;
    game.scores = data.scores;
    game.moveHistory = data.moveHistory;
    game.startTime = data.startTime;
    game.winner = data.winner;
    return game;
  }
}

// Funciones auxiliares Redis
async function saveGameToRedis(game) {
  const gameKey = `game:${game.gameId}`;
  await redis.set(gameKey, JSON.stringify(game.toJSON()));
  await redis.sadd('active_game_ids', game.gameId);
}

async function getGameFromRedis(gameId) {
  const gameKey = `game:${gameId}`;
  const data = await redis.get(gameKey);
  return data ? Game.fromJSON(JSON.parse(data)) : null;
}

async function deleteGameFromRedis(gameId) {
  const gameKey = `game:${gameId}`;
  await redis.del(gameKey);
  await redis.srem('active_game_ids', gameId);
}

async function getActiveGames() {
  const gameIds = await redis.smembers('active_game_ids');
  const games = [];
  for (const gameId of gameIds) {
    const game = await getGameFromRedis(gameId);
    if (game) games.push(game.getGameState());
  }
  return games;
}

// Socket.io eventos
io.on('connection', (socket) => {
  console.log('Nuevo jugador conectado:', socket.id);

  socket.on('createGame', async (data) => {
    const gameId = `game_${Date.now()}`;
    const game = new Game(gameId, data.rows || 10, data.cols || 10, data.mines || 10, data.maxPlayers || 4);
    game.addPlayer(socket.id, data.playerName);
    
    await saveGameToRedis(game);
    players.set(socket.id, { name: data.playerName, gameId });
    socket.join(gameId);
    
    io.to(gameId).emit('gameCreated', { gameId, game: game.getGameState() });
    socket.emit('notification', { type: 'success', message: `Partida ${gameId} creada` });
  });

  socket.on('joinGame', async (data) => {
    const game = await getGameFromRedis(data.gameId);
    if (!game) {
      socket.emit('notification', { type: 'error', message: 'Partida no encontrada' });
      return;
    }

    if (!game.addPlayer(socket.id, data.playerName)) {
      socket.emit('notification', { type: 'error', message: 'Partida llena' });
      return;
    }

    await saveGameToRedis(game);
    players.set(socket.id, { name: data.playerName, gameId: data.gameId });
    socket.join(data.gameId);

    io.to(data.gameId).emit('playerJoined', { 
      player: { id: socket.id, name: data.playerName },
      game: game.getGameState()
    });
    io.to(data.gameId).emit('notification', { type: 'info', message: `${data.playerName} se unió a la partida` });
  });

  socket.on('startGame', async (data) => {
    const game = await getGameFromRedis(data.gameId);
    if (game && game.players.length > 1) {
      game.gameStatus = 'playing';
      game.startTime = Date.now();
      await saveGameToRedis(game);
      io.to(data.gameId).emit('gameStarted', game.getGameState());
      io.to(data.gameId).emit('notification', { type: 'success', message: '¡Juego iniciado!' });
    }
  });

  socket.on('revealCell', async (data) => {
    const game = await getGameFromRedis(data.gameId);
    if (!game) return;

    const result = game.revealCell(data.row, data.col, socket.id);
    await saveGameToRedis(game);
    
    io.to(data.gameId).emit('cellRevealed', {
      row: data.row,
      col: data.col,
      value: game.board[data.row][data.col],
      playerId: socket.id,
      playerName: players.get(socket.id).name,
      result,
      game: game.getGameState()
    });

    if (result.hit) {
      io.to(data.gameId).emit('notification', { 
        type: 'warning', 
        message: `${players.get(socket.id).name} tocó una mina` 
      });
    } else if (result.won) {
      io.to(data.gameId).emit('notification', { 
        type: 'success', 
        message: `${players.get(socket.id).name} ¡GANÓ!` 
      });
    } else {
      io.to(data.gameId).emit('notification', { 
        type: 'info', 
        message: `Turno de ${game.getCurrentPlayer().name}` 
      });
    }
  });

  socket.on('getActiveGames', async () => {
    const games = await getActiveGames();
    socket.emit('activeGamesList', games);
  });

  socket.on('sendMessage', (data) => {
    const gameId = players.get(socket.id)?.gameId;
    if (gameId) {
      io.to(gameId).emit('messageReceived', {
        playerName: players.get(socket.id).name,
        message: data.message,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });

  socket.on('disconnect', async () => {
    const player = players.get(socket.id);
    if (player) {
      const game = await getGameFromRedis(player.gameId);
      if (game) {
        game.removePlayer(socket.id);
        io.to(player.gameId).emit('notification', { 
          type: 'warning', 
          message: `${player.name} se desconectó` 
        });
        io.to(player.gameId).emit('gameUpdated', game.getGameState());

        if (game.players.length === 0) {
          await deleteGameFromRedis(player.gameId);
        } else {
          await saveGameToRedis(game);
        }
      }
      players.delete(socket.id);
    }
    console.log('Jugador desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
