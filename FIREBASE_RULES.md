# 🔥 REGLAS DE FIREBASE - FYZAR CHAT

## Firestore Database Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

## Realtime Database Rules

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## 📋 Reglas Restrictivas (Opcional - Para Producción)

<details>
<summary>Clic para ver reglas restrictivas</summary>

### Firestore Rules (Producción)

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
    
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
      allow update: if true;
    }
    
    match /guests/{guestId} {
      allow read: if true;
      allow write: if true;
      allow create: if true;
    }
    
    match /banned/{userId} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin() || isModerator());
    }
    
    match /bannedIPs/{ipHash} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin());
    }
    
    match /muted/{userId} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin() || isModerator());
    }
    
    match /moderators/{userId} {
      allow read: if true;
      allow write: if request.auth != null && (isDeveloper() || isAdmin());
    }
    
    match /admins/{userId} {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
    }
    
    match /developers/{userId} {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
      allow create: if request.auth != null && isDeveloper();
    }
    
    match /rooms/{roomId} {
      allow read: if true;
      allow write: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && (isDeveloper() || isAdmin());
    }
    
    match /polls/{pollId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && (resource.data.createdBy == request.auth.uid || isDeveloper() || isAdmin());
    }
    
    match /settings/global {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
    }
    
    match /settings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
    }
  }
}
```

</details>
