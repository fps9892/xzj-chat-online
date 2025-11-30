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
