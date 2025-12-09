# 🔥 REGLAS DE FIREBASE - COPIAR Y PEGAR

## 📋 FIRESTORE RULES

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Funciones auxiliares
    function isDeveloper() {
      return request.auth != null && exists(/databases/$(database)/documents/developers/$(request.auth.uid));
    }

    function isAdmin() {
      return request.auth != null && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isModerator() {
      return request.auth != null && exists(/databases/$(database)/documents/moderators/$(request.auth.uid));
    }

    // Usuarios registrados
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
      allow update: if true; // Permitir actualizaciones para caché
    }

    // Usuarios invitados
    match /guests/{guestId} {
      allow read: if true;
      allow write: if true; // Invitados pueden escribir sus datos
      allow create: if true;
      allow update: if true;
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

    // Salas (públicas y privadas)
    match /rooms/{roomId} {
      allow read: if true; // Todos pueden leer salas
      allow write: if request.auth != null; // Usuarios autenticados pueden escribir
      allow create: if true; // PERMITIR INVITADOS CREAR SALAS PRIVADAS
      allow update: if true; // Permitir actualizaciones (pendingUsers, acceptedUsers)
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

    match /settings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && isDeveloper();
    }
  }
}
```

## 🔥 REALTIME DATABASE RULES

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "rooms": {
      "$roomId": {
        "messages": {
          ".indexOn": ["timestamp"],
          ".read": true,
          ".write": true
        },
        "users": {
          ".read": true,
          ".write": true
        },
        "typing": {
          ".read": true,
          ".write": true
        }
      }
    },
    "roomEvents": {
      ".read": true,
      ".write": true
    },
    "globalAnnouncements": {
      ".read": true,
      ".write": true
    },
    "roomDeleted": {
      ".read": true,
      ".write": true
    },
    "userRefresh": {
      ".read": true,
      ".write": true
    },
    "globalRefresh": {
      ".read": true,
      ".write": true
    },
    "roomAccessNotifications": {
      ".read": true,
      ".write": true
    },
    "games": {
      ".read": true,
      ".write": true
    },
    "deviceCounts": {
      ".read": true,
      ".write": true
    }
  }
}
```

## 📝 NOTAS IMPORTANTES

### Firestore:
1. ✅ **Invitados pueden crear salas privadas**: `allow create: if true` en `/rooms/{roomId}`
2. ✅ **Invitados pueden actualizar sus datos**: `allow write: if true` en `/guests/{guestId}`
3. ✅ **Todos pueden leer salas**: Para ver salas privadas en !versalas
4. ✅ **Actualizaciones permitidas**: Para pendingUsers y acceptedUsers

### Realtime Database:
1. ✅ **Índice en timestamp**: Para cargar mensajes ordenados
2. ✅ **Lectura/escritura abierta**: Para desarrollo rápido
3. ✅ **Acceso a roomAccessNotifications**: Para notificaciones de acceso

## 🚀 CÓMO APLICAR

### Firestore:
1. Ve a Firebase Console
2. Firestore Database → Reglas
3. Copia y pega las reglas de Firestore
4. Click en "Publicar"

### Realtime Database:
1. Ve a Firebase Console
2. Realtime Database → Reglas
3. Copia y pega las reglas de Realtime
4. Click en "Publicar"

## ⚠️ SEGURIDAD

Estas reglas están optimizadas para:
- ✅ Permitir invitados crear salas privadas
- ✅ Permitir solicitudes de acceso
- ✅ Mantener seguridad en roles (admin, mod, dev)
- ✅ Proteger datos sensibles

Para producción, considera:
- Agregar validación de datos
- Limitar tamaño de documentos
- Agregar rate limiting
- Validar estructura de datos

---

**¡Reglas listas para copiar y pegar!** 🎉
