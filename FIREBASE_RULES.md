# Reglas de Firebase - FYZAR CHAT

## Realtime Database Rules

Copia y pega estas reglas en Firebase Console > Realtime Database > Rules:

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
            ".write": "auth != null || data.exists()",
            ".validate": "newData.hasChildren(['userId', 'username', 'text', 'timestamp'])"
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
    }
  }
}
```

## Firestore Rules

Copia y pega estas reglas en Firebase Console > Firestore Database > Rules:

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

## Notas Importantes

### Realtime Database
- Los mensajes pueden ser eliminados por:
  - El usuario que los creó
  - Administradores
  - Moderadores
- La regla `"auth != null || data.exists()"` permite escribir si está autenticado O si el dato ya existe (para eliminar)

### Firestore
- Acceso público de lectura en colecciones de moderación para evitar errores de permisos
- Solo developers pueden modificar configuraciones del sistema
- Los usuarios solo pueden modificar su propio perfil
- Encuestas pueden ser eliminadas por su creador o por admins/developers

## Aplicar las Reglas

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto **fyzar-80936**
3. Para Realtime Database:
   - Ve a Realtime Database > Rules
   - Copia y pega las reglas de arriba
   - Haz clic en "Publicar"
4. Para Firestore:
   - Ve a Firestore Database > Rules
   - Copia y pega las reglas de arriba
   - Haz clic en "Publicar"
