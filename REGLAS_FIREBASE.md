# Reglas de Firebase para FYZAR CHAT v3.7

## Firestore Database Rules

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

    match /banned/{userId} {
      allow read: if true;
      allow write: if true;
    }

    match /bannedIPs/{ipAddress} {
      allow read: if true;
      allow write: if true;
    }

    match /muted/{userId} {
      allow read: if true;
      allow write: if true;
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

    match /polls/{pollId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }

    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Realtime Database Rules

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

## Instrucciones de Aplicación

### 1. Firestore Database Rules
1. Ve a Firebase Console → Firestore Database → Rules
2. Copia y pega las reglas de Firestore de arriba
3. Haz clic en "Publicar"

### 2. Realtime Database Rules
1. Ve a Firebase Console → Realtime Database → Rules
2. Copia y pega las reglas de Realtime Database de arriba
3. Haz clic en "Publicar"

## Características Soportadas

### Salas Privadas
- **Creación**: Comando `!crearprivada` crea sala con ID único
- **Acceso**: Solo dueño y usuarios aceptados pueden ver mensajes
- **Solicitudes**: Sistema de `pendingUsers` y `acceptedUsers` en Firestore
- **Notificaciones**: Realtime Database notifica cuando usuario es aceptado
- **Comando aceptar**: `!aceptar` muestra lista numerada de usuarios pendientes

### Sistema de Moderación
- **Baneo**: Por userId e IP, temporal o permanente
- **Muteo**: Temporal con expiración automática
- **Protección**: Administradores no pueden ser baneados/muteados
- **Invitados**: Pueden ser baneados/muteados usando su userId

### Encuestas
- **Creación**: Solo usuarios registrados
- **Votación**: 1 voto por usuario registrado
- **Eliminación**: Solo administradores
- **Expiración**: Auto-eliminación después de 30 minutos

### Notificaciones
- **Entrada/Salida**: Eventos en tiempo real sin duplicados
- **Cambio de sala**: Muestra sala destino
- **Filtro de tiempo**: Solo eventos de últimos 5 segundos

## Notas Importantes

1. **Permisos abiertos**: `banned`, `muted`, `rooms` tienen `allow write: if true` para soportar invitados
2. **Índices**: `roomEvents` indexado por `timestamp` para mejor rendimiento
3. **Salas privadas**: Verificación de acceso en cliente mediante `checkPrivateRoomAccess()`
4. **Invitados**: Usan `userId` en lugar de `firebaseUid` para todas las operaciones
