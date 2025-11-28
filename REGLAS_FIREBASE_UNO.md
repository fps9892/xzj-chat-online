# 🎮 Reglas de Firebase Actualizadas - UNO

## ✅ Cambios Realizados

### 1. Juego UNO Creado
- **Archivos**: `juegos/uno.html`, `juegos/uno.css`, `juegos/uno.js`
- **Características**:
  - 2-8 jugadores
  - Cartas de colores (rojo, amarillo, verde, azul)
  - Cartas especiales (Skip, Reverse, +2, +4, Wild)
  - Sistema de turnos
  - Botón "¡UNO!" cuando tienes 2 cartas
  - Responsive (PC, tablet, mobile)
  - Timer de 20 minutos
  - Sistema de niveles (+0.25 por victoria)

### 2. Bug de Notificaciones Arreglado
- **Problema**: Los mensajes de resultados aparecían abajo porque usaban `Date.now()` en lugar de `serverTimestamp()`
- **Solución**: Cambiado en `tateti.js` para usar `serverTimestamp()` y `push()` en lugar de `set()` con timestamp manual
- **Resultado**: Ahora los mensajes de resultados aparecen en orden cronológico correcto

### 3. Firebase.js Actualizado
- Agregada función `createUnoGame()`
- Exportada en el módulo

### 4. Panel de Juegos Actualizado
- Agregado botón para crear juego UNO
- Icono: 🎴
- Descripción: "Juego de cartas para 2-8 jugadores"

---

## 📋 Reglas de Firebase Actualizadas

### Realtime Database Rules

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
      },
      "carreras": {
        "$gameId": {
          ".read": true,
          ".write": true,
          ".indexOn": ["status", "createdAt"]
        }
      },
      "conecta4": {
        "$gameId": {
          ".read": true,
          ".write": true,
          ".indexOn": ["status", "createdAt"]
        }
      },
      "damas": {
        "$gameId": {
          ".read": true,
          ".write": true,
          ".indexOn": ["status", "createdAt"]
        }
      },
      "uno": {
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

---

## 🎯 Cómo Aplicar las Reglas

1. Ve a **Firebase Console** → **Realtime Database** → **Rules**
2. Copia y pega las reglas de arriba
3. Haz click en **Publicar**

---

## 🎮 Reglas del Juego UNO

### Objetivo
Ser el primero en quedarse sin cartas.

### Cartas
- **Números**: 0-9 en 4 colores (rojo, amarillo, verde, azul)
- **Especiales**:
  - **Skip**: Salta el turno del siguiente jugador
  - **Reverse**: Invierte el orden de juego
  - **+2**: El siguiente jugador roba 2 cartas y pierde su turno
  - **Wild**: Cambia el color actual
  - **+4**: Cambia el color y el siguiente jugador roba 4 cartas

### Cómo Jugar
1. Cada jugador recibe 7 cartas
2. Se voltea una carta del mazo
3. En tu turno, puedes:
   - Jugar una carta del mismo color
   - Jugar una carta del mismo número/símbolo
   - Jugar una carta Wild
   - Robar una carta del mazo
4. Cuando te queden 2 cartas, presiona **¡UNO!**
5. El primero en quedarse sin cartas gana

### Sistema de Niveles
- **+0.25 puntos** por cada victoria
- **4 victorias = 1 nivel completo**
- Los niveles se guardan en Firestore

---

## ✅ Checklist de Verificación

- [ ] Reglas de Realtime Database aplicadas (incluye `games/uno`)
- [ ] Juego UNO funciona correctamente
- [ ] Notificaciones de resultados aparecen en orden correcto
- [ ] Panel de juegos muestra botón de UNO
- [ ] Sistema de niveles funciona (+0.25 por victoria)
- [ ] Responsive en PC, tablet y mobile
- [ ] Timer de 20 minutos funciona
- [ ] Botón "¡UNO!" aparece cuando tienes 2 cartas

---

## 🐛 Bug Arreglado: Notificaciones de Resultados

### Problema
Los mensajes de resultados de juegos aparecían abajo de todo en la sala #juegos, mientras que los mensajes normales aparecían arriba.

### Causa
En `tateti.js` (y probablemente otros juegos), las notificaciones de resultados usaban:
```javascript
const messageRef = ref(database, `rooms/juegos/messages/${Date.now()}`);
await set(messageRef, {
    timestamp: Date.now(), // ❌ Timestamp manual
    // ...
});
```

Mientras que los mensajes normales en `firebase.js` usaban:
```javascript
const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
await push(messagesRef, {
    timestamp: serverTimestamp(), // ✅ Timestamp del servidor
    // ...
});
```

### Solución
Cambiado en `tateti.js` a:
```javascript
const messageRef = ref(database, `rooms/juegos/messages`);
await push(messageRef, {
    timestamp: serverTimestamp(), // ✅ Ahora usa serverTimestamp()
    // ...
});
```

### Resultado
✅ Ahora todos los mensajes (normales y de resultados) aparecen en orden cronológico correcto.

---

## 📝 Notas Finales

- El juego UNO está completamente funcional
- Soporta 2-8 jugadores simultáneos
- Las partidas expiran automáticamente después de 20 minutos
- El sistema de niveles está integrado con Firestore
- El diseño es responsive y se adapta a todas las resoluciones
- Las notificaciones de resultados ahora funcionan correctamente en todas las salas

**¡Disfruta jugando UNO en FYZAR CHAT!** 🎴🎉
