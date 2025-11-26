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

## Cambios importantes:

1. **Firestore - banned/muted**: `allow write: if true;` - Permite banear/mutear usuarios registrados e invitados
2. **Firestore - rooms**: `allow create/update/delete: if true;` - Permisos completos para gestión de salas públicas y privadas
3. **Firestore - polls**: Colección de encuestas con permisos de lectura pública y escritura para usuarios autenticados
4. **Realtime Database - roomAccessNotifications**: Notificaciones de acceso a salas privadas
5. **Realtime Database - roomDeleted**: Sistema de temporizador de 15 segundos antes de eliminar salas
6. **Realtime Database - roomEvents**: Eventos de entrada/salida de salas con índice por timestamp

## Notas:
- Las salas privadas funcionan con `acceptedUsers` y `pendingUsers` en Firestore
- Los invitados pueden solicitar acceso a salas privadas usando su `userId`
- El sistema verifica acceso mediante `checkPrivateRoomAccess()`
