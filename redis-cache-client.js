// Cliente de caché Redis para el chat
// Conecta con chat-server.js para cachear datos de Firebase

class RedisCacheClient {
  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
  }

  // Conectar al servidor de caché
  async connect() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO no disponible, caché deshabilitado');
      return false;
    }

    try {
      this.socket = io(this.serverUrl);
      
      this.socket.on('connect', () => {
        this.connected = true;
        console.log('✅ Conectado al servidor de caché Redis');
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        console.log('❌ Desconectado del servidor de caché');
      });

      return true;
    } catch (error) {
      console.error('Error conectando al caché:', error);
      return false;
    }
  }

  // ==================== MENSAJES ====================

  async cacheMessages(roomId, messages) {
    if (!this.connected) return false;
    
    return new Promise((resolve) => {
      this.socket.emit('cache:messages', { roomId, messages });
      this.socket.once('cache:messages:success', () => resolve(true));
      setTimeout(() => resolve(false), 5000);
    });
  }

  async getMessages(roomId) {
    if (!this.connected) return null;

    return new Promise((resolve) => {
      this.socket.emit('get:messages', { roomId });
      this.socket.once('messages:cached', (data) => {
        resolve(data.fromCache ? data.messages : null);
      });
      setTimeout(() => resolve(null), 5000);
    });
  }

  // ==================== USUARIOS ====================

  async cacheUsers(roomId, users) {
    if (!this.connected) return false;

    return new Promise((resolve) => {
      this.socket.emit('cache:users', { roomId, users });
      this.socket.once('cache:users:success', () => resolve(true));
      setTimeout(() => resolve(false), 5000);
    });
  }

  async getUsers(roomId) {
    if (!this.connected) return null;

    return new Promise((resolve) => {
      this.socket.emit('get:users', { roomId });
      this.socket.once('users:cached', (data) => {
        resolve(data.fromCache ? data.users : null);
      });
      setTimeout(() => resolve(null), 5000);
    });
  }

  // ==================== SALAS ====================

  async cacheRooms(rooms) {
    if (!this.connected) return false;

    return new Promise((resolve) => {
      this.socket.emit('cache:rooms', { rooms });
      this.socket.once('cache:rooms:success', () => resolve(true));
      setTimeout(() => resolve(false), 5000);
    });
  }

  async getRooms() {
    if (!this.connected) return null;

    return new Promise((resolve) => {
      this.socket.emit('get:rooms');
      this.socket.once('rooms:cached', (data) => {
        resolve(data.fromCache ? data.rooms : null);
      });
      setTimeout(() => resolve(null), 5000);
    });
  }

  // ==================== DATOS DE USUARIO ====================

  async cacheUserData(userId, userData) {
    if (!this.connected) return false;

    return new Promise((resolve) => {
      this.socket.emit('cache:user', { userId, userData });
      this.socket.once('cache:user:success', () => resolve(true));
      setTimeout(() => resolve(false), 5000);
    });
  }

  async getUserData(userId) {
    if (!this.connected) return null;

    return new Promise((resolve) => {
      this.socket.emit('get:user', { userId });
      this.socket.once('user:cached', (data) => {
        resolve(data.fromCache ? data.userData : null);
      });
      setTimeout(() => resolve(null), 5000);
    });
  }

  // ==================== INVALIDACIÓN ====================

  invalidateRoom(roomId) {
    if (!this.connected) return;
    this.socket.emit('invalidate:room', { roomId });
  }

  invalidateUser(userId) {
    if (!this.connected) return;
    this.socket.emit('invalidate:user', { userId });
  }

  // ==================== ESTADÍSTICAS ====================

  async getStats() {
    if (!this.connected) return null;

    return new Promise((resolve) => {
      this.socket.emit('get:stats');
      this.socket.once('cache:stats', (data) => resolve(data));
      setTimeout(() => resolve(null), 5000);
    });
  }

  // ==================== API REST (fallback) ====================

  async getMessagesHTTP(roomId) {
    try {
      const response = await fetch(`${this.serverUrl}/api/cache/messages/${roomId}`);
      const data = await response.json();
      return data.fromCache ? data.messages : null;
    } catch (error) {
      console.error('Error obteniendo mensajes del caché:', error);
      return null;
    }
  }

  async getUsersHTTP(roomId) {
    try {
      const response = await fetch(`${this.serverUrl}/api/cache/users/${roomId}`);
      const data = await response.json();
      return data.fromCache ? data.users : null;
    } catch (error) {
      console.error('Error obteniendo usuarios del caché:', error);
      return null;
    }
  }

  async getRoomsHTTP() {
    try {
      const response = await fetch(`${this.serverUrl}/api/cache/rooms`);
      const data = await response.json();
      return data.fromCache ? data.rooms : null;
    } catch (error) {
      console.error('Error obteniendo salas del caché:', error);
      return null;
    }
  }
}

// Exportar instancia global
const cacheClient = new RedisCacheClient();

// Auto-conectar si está en el navegador
if (typeof window !== 'undefined') {
  cacheClient.connect().catch(err => console.warn('Caché no disponible:', err));
}

export default cacheClient;
