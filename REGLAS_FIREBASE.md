# 🔥 Reglas de Firebase - FYZAR CHAT v3.8.1

## 🆕 Cambios en v3.8.1

### Paneles de Moderación Mejorados:
- `!ban` - Panel visual con iconos SVG para banear usuarios de todas las salas
- `!unban` - Panel visual con icono SVG para desbanear usuarios
- `!mute` - Panel visual con iconos SVG para mutear usuarios de todas las salas
- `!unmute` - Panel visual con icono SVG y temporizador en tiempo real
- Todos los comandos son case-insensitive (!BAN, !ban, !Ban funcionan igual)
- Los paneles muestran usuarios de TODAS las salas (públicas y privadas)

### Sistema de Desmuteo Automático:
- Temporizador visual en panel de unmute (actualización cada segundo)
- Usuario muteado ve tiempo restante en placeholder del input
- Desmuteo automático cuando expira el tiempo
- Mensaje del sistema notifica el desmuteo automático
- Controles se habilitan automáticamente

### IDs de Usuario:
- Usuarios registrados: IDs cortos (#1, #2, #3...)
- Usuarios invitados: IDs de 4 dígitos (#1000, #1001, #1002...)
- Color diferenciado: invitados en cyan, registrados en naranja

## 🆕 Comandos v3.8

### Para Administradores y Moderadores:
- `!versalas` - Muestra panel visual para gestionar y eliminar salas
- `!borrar <nombre>` - Elimina sala con temporizador de 15 segundos

## 📋 Firestore Database Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isModerator() {
      return request.auth != null && exists(/databases/$(database)/documents/moderators/$(request.auth.uid));
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    match /admins/{firebaseUid} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /moderators/{firebaseUid} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /banned/{firebaseUid} {
      allow read: if true;
      allow write: if isAdmin() || isModerator();
    }

    match /bannedIPs/{ipAddress} {
      allow read: if true;
      allow write: if isAdmin() || isModerator();
    }

    match /muted/{firebaseUid} {
      allow read: if true;
      allow write: if isAdmin() || isModerator();
    }

    match /users/{firebaseUid} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (request.auth.uid == firebaseUid || isAdmin());
      allow delete: if isAdmin();
    }

    match /guests/{guestId} {
      allow read: if true;
      allow write: if true;
    }

    match /pinnedMessages/{messageId} {
      allow read: if true;
      allow write: if isAdmin() || isModerator();
    }

    match /rooms/{roomId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if true;
    }

    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 📋 Realtime Database Rules

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

## 🚀 Instrucciones de Aplicación

### Firestore Database
1. Ve a Firebase Console → Firestore Database → Rules
2. Copia y pega las reglas de Firestore
3. Haz clic en "Publicar"

### Realtime Database
1. Ve a Firebase Console → Realtime Database → Rules
2. Copia y pega las reglas de Realtime Database
3. Haz clic en "Publicar"

## ✅ Verificación

Después de aplicar las reglas, verifica que:
- ✅ Los usuarios pueden leer y escribir en salas
- ✅ Los administradores pueden banear/mutear
- ✅ Los moderadores tienen permisos correctos
- ✅ Las notificaciones de sala funcionan
- ✅ El sistema de routing con hash funciona correctamente

## 📝 Notas Importantes

- Las reglas permiten lectura/escritura completa en `rooms` para soportar el sistema de routing con hash
- Los usuarios no autenticados son redirigidos automáticamente por `auth-check.js`
- Cada sala tiene su URL específica: `index.html#general`, `index.html#privada1`, etc.
- Al recargar la página, el usuario permanece en la misma sala gracias al hash en la URL
- Colección `muted` almacena `mutedUntil` (timestamp) para desmuteo automático
- Colección `banned` almacena información de usuarios baneados con razón y timestamp
- Colección `bannedIPs` almacena IPs baneadas para bloquear invitados

## 🔧 Colecciones de Firestore

### `muted/{userId}`
```javascript
{
  username: string,
  mutedUntil: number (timestamp),
  mutedAt: number (timestamp),
  reason: string (opcional)
}
```

### `banned/{userId}`
```javascript
{
  username: string,
  reason: string,
  bannedAt: number (timestamp),
  bannedUntil: number (timestamp) o null (permanente)
}
```

### `bannedIPs/{ipAddress}`
```javascript
{
  userId: string,
  username: string,
  reason: string,
  bannedAt: number (timestamp)
}
```
