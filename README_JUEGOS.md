# 🎮 Sistema de Juegos - FYZAR CHAT v3.9

## 🎯 Juegos Disponibles

### 1. Ta-Te-Ti (Tic-Tac-Toe) ❌⭕

**Cómo jugar:**
- 2 jugadores
- Click en "Unirse como X" o "Unirse como O" para elegir símbolo
- Turnos alternados
- Gana quien complete 3 en línea (horizontal, vertical o diagonal)
- Múltiples rondas sin recrear sala

**Controles:**
- Click en casilla vacía para marcar
- Botón "Nueva Ronda" después de cada partida

### 2. Carreras 🏎️

**Cómo jugar:**
- 2-8 jugadores
- Click en "🏎️ Unirse a la Carrera" para participar
- Cualquier jugador puede iniciar cuando hay mínimo 2
- Cuenta regresiva 3-2-1
- Acelera para avanzar hasta la meta (100%)
- Gana quien llegue primero

**Controles:**
- **Desktop:** Presiona ESPACIO para acelerar
- **Móvil/Tablet:** Toca la pantalla para acelerar

### 3. Conecta 4 🔴

**Cómo jugar:**
- 2 jugadores (Rojo vs Amarillo)
- Click en "🔴 Unirse como Rojo" o "🟡 Unirse como Amarillo"
- Turnos alternados
- Suelta fichas desde arriba en columnas
- Gana quien conecte 4 fichas en línea (horizontal, vertical o diagonal)
- Múltiples rondas

**Controles:**
- Click en columna para soltar ficha
- Botón "Nueva Ronda" después de cada partida

### 4. Damas 👑

**Cómo jugar:**
- 2 jugadores (Blancas vs Negras)
- Click en "⚪ Unirse como Blancas" o "⚫ Unirse como Negras"
- Mueve fichas en diagonal sobre casillas oscuras
- Captura fichas del oponente saltando sobre ellas
- Llega al extremo opuesto para coronar (👑 Rey)
- Gana quien capture todas las fichas del oponente

**Controles:**
- Click en ficha para seleccionar
- Click en casilla válida para mover
- Botón "Nueva Ronda" después de cada partida

## ✅ Características del Sistema

- ✅ Comando `!crearjuegos` disponible en todas las salas
- ✅ Panel con lista de juegos disponibles
- ✅ Links temporales únicos (expiran en 20 min)
- ✅ Bot envía notificaciones al chat con botón "Entrar a Jugar"
- ✅ Botón "Ver Rondas" en resultados para volver al juego
- ✅ Sistema de estadísticas en tiempo real
- ✅ Timer de 20 minutos visible
- ✅ Incremento de nivel (+1) para ganadores
- ✅ Auto-eliminación de salas después de 20 min
- ✅ Responsive (móvil, tablet, desktop)

## 📋 Configuración Necesaria

### 1. Crear Sala "juegos" en Firestore

Ir a Firebase Console → Firestore Database → Agregar documento:

```
Colección: rooms
ID del documento: juegos
Campos:
  - name: "Sala de Juegos"
  - createdBy: "system"
  - createdAt: (timestamp actual)
  - isActive: true
  - isPrivate: false
```

### 2. Actualizar Reglas de Firebase

#### Realtime Database Rules:

Agregar en la sección principal:

```json
"games": {
  ".read": true,
  ".write": true,
  "tateti": {
    "$gameId": {
      ".read": true,
      ".write": true,
      ".indexOn": ["status", "createdAt"]
    }
  }
}
```

**Reglas completas de Realtime Database:**

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true,
      "$roomId": {
        ".read": true,
        ".write": true,
        "messages": {
          ".indexOn": ["timestamp"],
          "$messageId": {
            ".read": true,
            ".write": true
          }
        },
        "users": {
          ".indexOn": ["status", "lastSeen"],
          "$userId": {
            ".read": true,
            ".write": true
          }
        },
        "typing": {
          "$userId": {
            ".read": true,
            ".write": true
          }
        }
      }
    },
    "games": {
      ".read": true,
      ".write": true,
      "tateti": {
        "$gameId": {
          ".read": true,
          ".write": true,
          ".indexOn": ["status", "createdAt"]
        }
      }
    },
    "globalAnnouncements": {
      ".read": true,
      ".write": true,
      "$announcementId": {
        ".read": true,
        ".write": true
      }
    },
    "deviceCounts": {
      ".read": true,
      ".write": true
    },
    "roomEvents": {
      ".read": true,
      ".write": true,
      ".indexOn": ["timestamp"],
      "$eventId": {
        ".read": true,
        ".write": true
      }
    },
    "roomAccessNotifications": {
      ".read": true,
      ".write": true,
      "$userId": {
        ".read": true,
        ".write": true
      }
    },
    "roomDeleted": {
      ".read": true,
      ".write": true,
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## 🎯 Cómo Usar

### Para Usuarios:

1. Ir a cualquier sala publica ej: `index.html#general`
2. Escribir comando: `!crearjuegos`
3. Se abre panel con juegos disponibles
4. Click en "Crear Sala" del Ta-Te-Ti
5. Se envía mensaje al chat con link del juego
6. Click en el link para abrir el juego en nueva pestaña
7. Click en "Unirse como X" o "Unirse como O"
8. Esperar a que entre otro jugador
9. ¡Jugar!

### Flujo del Juego:

1. **Creación**: Usuario crea sala con `!crearjuegos`
2. **Link Temporal**: Se genera link único válido por 20 min
3. **Mensaje Bot**: Bot envía link al chat
4. **Unión**: Jugadores hacen click en "Unirse como X" o "Unirse como O"
5. **Espera**: Juego espera a que ambos jugadores se unan
6. **Inicio**: Cuando hay 2 jugadores, comienza el juego
7. **Jugar**: Turnos alternados X y O
8. **Resultado**: Muestra ganador o empate con animación
9. **Nueva Ronda**: Botón para jugar otra ronda
10. **Estadísticas**: Contador de rondas, victorias y empates
11. **Expiración**: Sala se elimina automáticamente después de 20 min



## 🔧 Detalles Técnicos

### Estructura de Datos en Firebase:

```javascript
games/tateti/{gameId}:
  - id: string
  - createdBy: string (userId)
  - createdByName: string
  - createdAt: timestamp
  - expiresAt: timestamp (createdAt + 20 min)
  - status: 'waiting' | 'playing' | 'finished'
  - player1: { id, name, avatar } | null
  - player2: { id, name, avatar } | null
  - board: array[9] de strings ('', 'X', 'O')
  - currentTurn: 'X' | 'O' | null
  - winner: 'X' | 'O' | 'draw' | null
  - stats: {
      rounds: number,
      winsX: number,
      winsO: number,
      draws: number
    }
```

### URLs de Juegos:

- Formato: `/juegos/tateti.html?id={gameId}`
- Ejemplo: `/juegos/tateti.html?id=abc123xyz789`
- Cada sala tiene un ID único generado aleatoriamente

### Auto-eliminación:

- Timeout de 20 minutos desde la creación
- Se ejecuta automáticamente en el servidor
- Los jugadores son notificados cuando expira

## 📝 Notas Importantes

1. **Comando**: `!crearjuegos` disponible en todas las salas
2. **Unión**: Los jugadores deben hacer click en "Unirse como X" o "Unirse como O"
3. **Salas de Juego**: Las salas se eliminan automáticamente después de 20 minutos
4. **Persistencia**: Los jugadores pueden salir y volver a entrar manteniendo su símbolo
5. **Múltiples Rondas**: Se pueden jugar varias rondas sin crear nueva sala
6. **Estadísticas**: Se mantienen durante toda la sesión de juego
7. **Turnos**: El jugador X siempre comienza
8. **Ganador**: Se resalta la línea ganadora con animación

## ✅ Checklist de Verificación

- [ ] Sala "juegos" creada en Firestore
- [ ] Reglas de Firebase actualizadas
- [ ] Comando `!crearjuegos` funciona en sala #juegos
- [ ] Panel de juegos se abre correctamente
- [ ] Link de Ta-Te-Ti se genera y envía al chat
- [ ] Juego funciona con 2 jugadores
- [ ] Estadísticas se actualizan correctamente
- [ ] Timer de 20 minutos visible
- [ ] Auto-eliminación funciona después de 20 min

## 🚀 Próximas Mejoras

- [ ] Más juegos (dados, cartas, etc.)
- [ ] Sistema de ranking
- [ ] Historial de partidas
- [ ] Invitaciones directas a usuarios
- [ ] Chat dentro del juego
- [ ] Sonidos y efectos visuales
- [ ] Modo espectador

---

**Versión**: 3.9  
**Estado**: ✅ Listo para producción  
**Calidad**: ⭐⭐⭐⭐⭐
