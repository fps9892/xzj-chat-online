# 🚀 FYZAR CHAT

## 📋 Descripción
Chat en tiempo real con Firebase, sistema de moderación, juegos multijugador y sistema de niveles.

## 🔥 Reglas de Firebase

### Realtime Database Rules

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "messages": {
          "$messageId": {
            ".read": true,
            ".write": true
          }
        },
        "users": {
          "$userId": {
            ".read": true,
            ".write": true
          }
        }
      }
    },
    "announcements": {
      ".read": true,
      ".write": true
    },
    "globalAnnouncements": {
      ".read": true,
      ".write": true
    },
    "roomEvents": {
      ".read": true,
      ".write": true
    },
    "roomDeleted": {
      ".read": true,
      ".write": true
    },
    "typing": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    },
    "deviceCounts": {
      ".read": true,
      ".write": true
    },
    "privateRoomAccess": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    },
    "roomAccessNotifications": {
      "$userId": {
        ".read": true,
        ".write": true
      }
    },
    "games": {
      "$gameType": {
        "$gameId": {
          ".read": true,
          ".write": true
        }
      }
    },
    "userRefresh": {
      "$userId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isDeveloper() {
      return request.auth != null && exists(/databases/$(database)/documents/developers/$(request.auth.uid));
    }
    
    function isAdmin() {
      return request.auth != null && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    function isModerator() {
      return request.auth != null && exists(/databases/$(database)/documents/moderators/$(request.auth.uid));
    }
    
    // Usuarios
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
      allow update: if true;
    }
    
    // Invitados
    match /guests/{guestId} {
      allow read: if true;
      allow write: if true;
      allow create: if true;
    }
    
    // Usuarios baneados
    match /banned/{userId} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin() || isModerator());
    }
    
    // IPs baneadas
    match /bannedIPs/{ipHash} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin());
    }
    
    // Usuarios muteados
    match /muted/{userId} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin() || isModerator());
    }
    
    // Moderadores
    match /moderators/{userId} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin());
    }
    
    // Administradores
    match /admins/{userId} {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
    }
    
    // Desarrolladores
    match /developers/{userId} {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
      allow create: if request.auth != null && isDeveloper();
    }
    
    // Salas
    match /rooms/{roomId} {
      allow read: if true;
      allow write: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && (isDeveloper() || isAdmin());
    }
    
    // Encuestas
    match /polls/{pollId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && (resource.data.createdBy == request.auth.uid || isDeveloper() || isAdmin());
    }
    
    // Configuración global
    match /settings/global {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
    }
    
    // Configuración de desarrollador
    match /settings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
    }
  }
}
```

## 🎮 Juegos Disponibles

- **Ta-Te-Ti** (2 jugadores) - El ganador juega primero en la siguiente ronda
- **Conecta 4** (2 jugadores)
- **Ajedrez** (2 jugadores) - Juego de estrategia clásico

## 👥 Sistema de Roles

- **Desarrollador** (DEV) - Acceso total + panel administrativo
- **Administrador** (ADMIN) - Gestión completa del chat
- **Moderador** (MOD) - Moderación de usuarios
- **Usuario** - Acceso estándar
- **Invitado** - Acceso temporal

## 📊 Sistema de Estadísticas

Cada usuario tiene:
- **Nivel**: Incrementa con victorias en juegos (+0.25 por victoria). El nivel se muestra con un loader circular que indica el progreso decimal (0.00-0.99) y el número entero en el centro
- **Victorias**: Total de juegos ganados
- **Derrotas**: Total de juegos perdidos
- **Empates**: Total de juegos empatados

## 🎯 Comandos

### Todos los Usuarios
- `!crearprivada` - Crear sala privada
- `!aceptar` - Ver solicitudes de acceso
- `!crearjuegos` - Panel de juegos

### Moderadores
- `!crearsala <nombre>` - Crear sala pública
- `!ban` - Panel de baneo
- `!mute` - Panel de muteo
- `!unmute` - Panel de desmuteo
- `!anuncio <mensaje>` - Anuncio global

### Administradores
- `!versalas` - Gestión de salas
- `!borrar <nombre>` - Eliminar sala
- `!unban` - Panel de desbaneo
- `!borrarchat` - Limpiar historial

### Desarrolladores
- `!developer` - Panel de configuración del sistema (habilitar/deshabilitar funciones)
- `!refresh <número>` - Refrescar página de un usuario específico
- `!forceban <número> [razón]` - Expulsar forzosamente usuario fantasma (elimina de todas las salas + baneo + refresh)
- Todos los comandos anteriores

## 🔐 Configuración de Desarrollador

Para agregar un desarrollador:
1. Ir a Firestore
2. Crear colección `developers`
3. Crear documento con el UID del usuario
4. Agregar campo: `{ "isDeveloper": true }`

## 📱 Compatibilidad

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile (iOS/Android)
- ✅ Tablet

---

**Versión**: 3.9.4  
**Proyecto**: fyzar-80936
