# 🔥 Reglas de Firebase - FYZAR CHAT v3.9

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

    match /banned/{firebaseUid} {
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
      allow update: if true;
      allow delete: if isAdmin();
    }
    
    match /userStats/{firebaseUid} {
      allow read: if true;
      allow write: if isAuthenticated() && (request.auth.uid == firebaseUid || isAdmin());
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

    match /roomPresence/{roomId} {
      allow read: if true;
      allow write: if true;
    }

    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Notas Importantes

- **users**: `allow update: if true` permite que los juegos incrementen el nivel sin autenticación
- **games**: Incluye tateti, carreras, conecta4 y damas
- **level**: Campo inicializado en 1 para nuevos usuarios
