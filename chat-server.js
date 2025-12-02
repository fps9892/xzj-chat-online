const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Redis Client
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('connect', () => console.log('✅ Redis conectado (Chat Cache)'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// TTL por defecto (en segundos)
const TTL = {
  MESSAGES: 300,      // 5 minutos
  USERS: 60,          // 1 minuto
  ROOMS: 120,         // 2 minutos
  USER_DATA: 600,     // 10 minutos
  BAN_STATUS: 300     // 5 minutos
};

// ==================== FUNCIONES DE CACHÉ ====================

// Mensajes por sala
async function cacheRoomMessages(roomId, messages) {
  const key = `room:${roomId}:messages`;
  await redis.setex(key, TTL.MESSAGES, JSON.stringify(messages));
}

async function getCachedRoomMessages(roomId) {
  const key = `room:${roomId}:messages`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Usuarios conectados por sala
async function cacheRoomUsers(roomId, users) {
  const key = `room:${roomId}:users`;
  await redis.setex(key, TTL.USERS, JSON.stringify(users));
}

async function getCachedRoomUsers(roomId) {
  const key = `room:${roomId}:users`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Lista de salas
async function cacheRoomsList(rooms) {
  await redis.setex('rooms:list', TTL.ROOMS, JSON.stringify(rooms));
  // Mantener SET de IDs de salas activas
  const roomIds = rooms.map(r => r.id);
  await redis.del('rooms:active');
  if (roomIds.length > 0) {
    await redis.sadd('rooms:active', ...roomIds);
  }
}

async function getCachedRoomsList() {
  const data = await redis.get('rooms:list');
  return data ? JSON.parse(data) : null;
}

async function getActiveRoomIds() {
  return await redis.smembers('rooms:active');
}

// Datos de usuario
async function cacheUserData(userId, userData) {
  const key = `user:${userId}:data`;
  await redis.setex(key, TTL.USER_DATA, JSON.stringify(userData));
}

async function getCachedUserData(userId) {
  const key = `user:${userId}:data`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Estado de ban
async function cacheBanStatus(userId, isBanned) {
  const key = `user:${userId}:banned`;
  await redis.setex(key, TTL.BAN_STATUS, isBanned ? '1' : '0');
}

async function getCachedBanStatus(userId) {
  const key = `user:${userId}:banned`;
  const data = await redis.get(key);
  return data === '1';
}

// Estado de mute
async function cacheMuteStatus(userId, isMuted) {
  const key = `user:${userId}:muted`;
  await redis.setex(key, TTL.BAN_STATUS, isMuted ? '1' : '0');
}

async function getCachedMuteStatus(userId) {
  const key = `user:${userId}:muted`;
  const data = await redis.get(key);
  return data === '1';
}

// Invalidar caché
async function invalidateRoomCache(roomId) {
  await redis.del(`room:${roomId}:messages`, `room:${roomId}:users`);
}

async function invalidateUserCache(userId) {
  await redis.del(`user:${userId}:data`, `user:${userId}:banned`, `user:${userId}:muted`);
}

// ==================== SOCKET.IO EVENTOS ====================

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Cachear mensajes de sala
  socket.on('cache:messages', async (data) => {
    const { roomId, messages } = data;
    await cacheRoomMessages(roomId, messages);
    socket.emit('cache:messages:success', { roomId });
  });

  // Obtener mensajes cacheados
  socket.on('get:messages', async (data) => {
    const { roomId } = data;
    const cached = await getCachedRoomMessages(roomId);
    socket.emit('messages:cached', { roomId, messages: cached, fromCache: !!cached });
  });

  // Cachear usuarios de sala
  socket.on('cache:users', async (data) => {
    const { roomId, users } = data;
    await cacheRoomUsers(roomId, users);
    socket.emit('cache:users:success', { roomId });
  });

  // Obtener usuarios cacheados
  socket.on('get:users', async (data) => {
    const { roomId } = data;
    const cached = await getCachedRoomUsers(roomId);
    socket.emit('users:cached', { roomId, users: cached, fromCache: !!cached });
  });

  // Cachear lista de salas
  socket.on('cache:rooms', async (data) => {
    const { rooms } = data;
    await cacheRoomsList(rooms);
    socket.emit('cache:rooms:success');
  });

  // Obtener salas cacheadas
  socket.on('get:rooms', async () => {
    const cached = await getCachedRoomsList();
    socket.emit('rooms:cached', { rooms: cached, fromCache: !!cached });
  });

  // Cachear datos de usuario
  socket.on('cache:user', async (data) => {
    const { userId, userData } = data;
    await cacheUserData(userId, userData);
    socket.emit('cache:user:success', { userId });
  });

  // Obtener datos de usuario cacheados
  socket.on('get:user', async (data) => {
    const { userId } = data;
    const cached = await getCachedUserData(userId);
    socket.emit('user:cached', { userId, userData: cached, fromCache: !!cached });
  });

  // Invalidar caché de sala
  socket.on('invalidate:room', async (data) => {
    const { roomId } = data;
    await invalidateRoomCache(roomId);
    io.emit('cache:invalidated', { type: 'room', roomId });
  });

  // Invalidar caché de usuario
  socket.on('invalidate:user', async (data) => {
    const { userId } = data;
    await invalidateUserCache(userId);
    io.emit('cache:invalidated', { type: 'user', userId });
  });

  // Estadísticas de caché
  socket.on('get:stats', async () => {
    const info = await redis.info('stats');
    const dbsize = await redis.dbsize();
    socket.emit('cache:stats', { info, keys: dbsize });
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// ==================== API REST ====================

// Endpoint para obtener mensajes cacheados
app.get('/api/cache/messages/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const cached = await getCachedRoomMessages(roomId);
  res.json({ roomId, messages: cached, fromCache: !!cached });
});

// Endpoint para obtener usuarios cacheados
app.get('/api/cache/users/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const cached = await getCachedRoomUsers(roomId);
  res.json({ roomId, users: cached, fromCache: !!cached });
});

// Endpoint para obtener salas cacheadas
app.get('/api/cache/rooms', async (req, res) => {
  const cached = await getCachedRoomsList();
  res.json({ rooms: cached, fromCache: !!cached });
});

// Endpoint para limpiar caché
app.delete('/api/cache/clear', async (req, res) => {
  await redis.flushdb();
  res.json({ success: true, message: 'Caché limpiado' });
});

// Endpoint de salud
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', redis: 'disconnected' });
  }
});

const PORT = process.env.CHAT_PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Chat Cache Server en puerto ${PORT}`));
