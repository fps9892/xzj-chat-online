# 🔥 Integración de Redis - ChatUp

## 📋 Resumen de Cambios

Se ha integrado **Redis** como capa de caché de alta velocidad para optimizar el rendimiento del sistema.

---

## 🎮 Servidor de Juegos (server.js)

### ✅ Implementado

**Puerto:** 3000

**Funcionalidad:**
- Juego multijugador de Buscaminas
- Gestión de partidas en Redis
- Serialización/deserialización de objetos Game

**Estructura Redis:**
```
game:{gameId}        → String (JSON del estado completo)
active_game_ids      → Set (IDs de partidas activas)
```

**Funciones principales:**
- `saveGameToRedis(game)` - Guarda partida completa
- `getGameFromRedis(gameId)` - Recupera y reconstruye Game
- `deleteGameFromRedis(gameId)` - Elimina partida
- `getActiveGames()` - Lista todas las partidas activas

---

## 💬 Servidor de Chat (chat-server.js)

### ✅ Implementado

**Puerto:** 3001

**Funcionalidad:**
- Proxy de caché entre frontend y Firebase
- Reduce llamadas a Firebase
- Mejora tiempos de respuesta

**Estructura Redis:**
```
room:{roomId}:messages    → String (JSON, TTL: 5min)
room:{roomId}:users       → String (JSON, TTL: 1min)
rooms:list                → String (JSON, TTL: 2min)
rooms:active              → Set (IDs de salas activas)
user:{userId}:data        → String (JSON, TTL: 10min)
user:{userId}:banned      → String (0/1, TTL: 5min)
user:{userId}:muted       → String (0/1, TTL: 5min)
```

**TTL (Time To Live):**
- Mensajes: 5 minutos
- Usuarios: 1 minuto
- Salas: 2 minutos
- Datos de usuario: 10 minutos
- Estado ban/mute: 5 minutos

---

## 🌐 Cliente de Caché (redis-cache-client.js)

### ✅ Implementado

**Uso en Frontend:**

```javascript
import cacheClient from './redis-cache-client.js';

// Obtener mensajes cacheados (si existen)
const cachedMessages = await cacheClient.getMessages('general');
if (cachedMessages) {
  renderMessages(cachedMessages);
} else {
  // Cargar desde Firebase
  const messages = await loadFromFirebase();
  await cacheClient.cacheMessages('general', messages);
}

// Obtener usuarios cacheados
const cachedUsers = await cacheClient.getUsers('general');

// Obtener salas cacheadas
const cachedRooms = await cacheClient.getRooms();

// Invalidar caché cuando hay cambios
cacheClient.invalidateRoom('general');
cacheClient.invalidateUser('userId123');
```

**API REST (fallback):**
```
GET  /api/cache/messages/:roomId
GET  /api/cache/users/:roomId
GET  /api/cache/rooms
DELETE /api/cache/clear
GET  /health
```

---

## 🚀 Cómo Ejecutar

### 1. Instalar Redis

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
Descargar desde: https://redis.io/download

### 2. Verificar Redis
```bash
redis-cli ping
# Respuesta: PONG
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Ejecutar servidores

**Opción 1: Ambos servidores**
```bash
npm run dev
```

**Opción 2: Individual**
```bash
# Servidor de juegos (puerto 3000)
npm run start:games

# Servidor de chat cache (puerto 3001)
npm run start:chat
```

---

## 📊 Beneficios de Redis

### ⚡ Rendimiento
- **Velocidad:** Redis es 10-100x más rápido que consultas a Firebase
- **Latencia:** < 1ms para operaciones en memoria
- **Throughput:** Maneja 100,000+ ops/segundo

### 💾 Reducción de Costos
- **Firebase:** Menos lecturas = menos facturación
- **Bandwidth:** Datos cacheados no consumen ancho de banda
- **Escalabilidad:** Soporta más usuarios sin aumentar costos

### 🔄 Disponibilidad
- **Offline-first:** Datos disponibles aunque Firebase falle
- **Resiliencia:** Caché persiste entre reinicios
- **Fallback:** Si Redis falla, usa Firebase directamente

### 🎯 Casos de Uso Optimizados

1. **Mensajes recientes:** Carga instantánea desde caché
2. **Lista de usuarios:** Actualización cada 1 minuto vs tiempo real
3. **Salas públicas:** Listado cacheado, actualización cada 2 minutos
4. **Perfiles de usuario:** 10 minutos de caché reduce lecturas repetidas
5. **Estado de moderación:** Verificación rápida sin consultar Firestore

---

## 📈 Métricas Esperadas

### Sin Redis (Firebase directo)
- Carga de mensajes: 200-500ms
- Lista de usuarios: 100-300ms
- Lista de salas: 150-400ms
- Total por carga de sala: ~800ms

### Con Redis (cacheado)
- Carga de mensajes: 5-20ms (95% más rápido)
- Lista de usuarios: 3-10ms (97% más rápido)
- Lista de salas: 5-15ms (96% más rápido)
- Total por carga de sala: ~30ms (96% más rápido)

### Reducción de Lecturas Firebase
- Mensajes: -80% (caché 5min)
- Usuarios: -98% (caché 1min)
- Salas: -95% (caché 2min)
- **Ahorro estimado:** 85-90% en lecturas totales

---

## 🔧 Configuración Avanzada

### Ajustar TTL
Editar `chat-server.js`:
```javascript
const TTL = {
  MESSAGES: 600,      // 10 minutos
  USERS: 30,          // 30 segundos
  ROOMS: 300,         // 5 minutos
  USER_DATA: 1800,    // 30 minutos
  BAN_STATUS: 600     // 10 minutos
};
```

### Monitoreo Redis
```bash
# Ver estadísticas en tiempo real
redis-cli --stat

# Ver todas las claves
redis-cli KEYS "*"

# Ver memoria usada
redis-cli INFO memory

# Limpiar toda la caché
redis-cli FLUSHDB
```

### Persistencia Redis
Editar `/etc/redis/redis.conf`:
```
# Guardar cada 60 segundos si hay 1+ cambios
save 60 1

# Habilitar AOF (Append Only File)
appendonly yes
```

---

## 🐛 Troubleshooting

### Redis no conecta
```bash
# Verificar que Redis esté corriendo
sudo systemctl status redis

# Ver logs
sudo journalctl -u redis -f

# Reiniciar Redis
sudo systemctl restart redis
```

### Puerto ocupado
```bash
# Cambiar puerto en chat-server.js
const PORT = process.env.CHAT_PORT || 3002;

# Cambiar puerto en redis-cache-client.js
const cacheClient = new RedisCacheClient('http://localhost:3002');
```

### Caché desactualizado
```bash
# Limpiar caché manualmente
curl -X DELETE http://localhost:3001/api/cache/clear
```

---

## 📝 Próximos Pasos

### Integración en Firebase.js
Modificar `firebase.js` para usar caché:

```javascript
import cacheClient from './redis-cache-client.js';

export async function listenToMessages(callback) {
  const roomId = currentRoom;
  
  // Intentar cargar desde caché primero
  const cached = await cacheClient.getMessages(roomId);
  if (cached) {
    callback(cached);
  }
  
  // Luego escuchar cambios en tiempo real
  const messagesRef = dbQuery(ref(database, `rooms/${roomId}/messages`));
  return onValue(messagesRef, async (snapshot) => {
    const messages = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });
    
    // Actualizar caché
    await cacheClient.cacheMessages(roomId, messages);
    callback(messages);
  });
}
```

### Cluster Redis (Producción)
Para alta disponibilidad:
```javascript
const redis = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 }
]);
```

---

## 📚 Recursos

- [Redis Documentation](https://redis.io/docs/)
- [ioredis GitHub](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Firebase + Redis Architecture](https://firebase.google.com/docs/database/usage/optimize)

---

**Versión:** 3.9.4  
**Última actualización:** 2024
