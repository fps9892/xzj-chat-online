# 🚀 FYZAR CHAT v3.9.3

## 📋 Descripción
Chat en tiempo real con Firebase, sistema de moderación avanzado, juegos multijugador, sistema de niveles y panel de desarrollador.

## ✨ Características Principales

### 🎮 Sistema de Juegos
- Ta-Te-Ti (2 jugadores)
- Conecta 4 (2 jugadores)
- UNO (2-8 jugadores)
- Sistema de niveles unificado (+0.25 por victoria)

### 👥 Sistema de Roles
- **Desarrollador** (DEV) - Acceso total + panel administrativo
- **Administrador** (ADMIN) - Gestión completa del chat
- **Moderador** (MOD) - Moderación de usuarios
- **Usuario** - Acceso estándar
- **Invitado** - Acceso temporal

### 🛡️ Moderación
- Baneo temporal/permanente
- Muteo con temporizador
- Sistema de reportes
- Panel de moderación

### 🎨 Características Adicionales
- Salas públicas y privadas
- Encuestas en tiempo real
- Mensajes de voz
- Emotes y GIFs
- Sistema de menciones (@usuario)
- Animaciones especiales (Navidad, Año Nuevo)
- Perfiles personalizables
- Sistema de niveles

## 🔧 Configuración de Firebase

### Realtime Database Rules

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": "auth != null",
        "messages": {
          "$messageId": {
            ".write": "auth != null || data.child('userId').val() == newData.child('userId').val()"
          }
        },
        "users": {
          "$userId": {
            ".write": "auth != null && ($userId == auth.uid || root.child('rooms').child($roomId).child('users').child(auth.uid).child('status').val() == 'online')"
          }
        }
      }
    },
    "announcements": {
      ".read": true,
      ".write": "auth != null"
    },
    "roomEvents": {
      ".read": true,
      ".write": "auth != null"
    },
    "roomDeleted": {
      ".read": true,
      ".write": "auth != null"
    },
    "typing": {
      "$roomId": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "privateRoomAccess": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "roomAccessNotifications": {
      "$userId": {
        ".read": "auth != null && $userId == auth.uid",
        ".write": "auth != null"
      }
    },
    "games": {
      "$gameId": {
        ".read": true,
        ".write": "auth != null"
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
    
    // Usuarios
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Invitados
    match /guests/{guestId} {
      allow read: if true;
      allow write: if true;
      allow create: if true;
    }
    
    // Usuarios baneados
    match /banned/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Administrador' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Moderador' ||
         get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true);
    }
    
    // IPs baneadas
    match /bannedIPs/{ipHash} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Administrador' ||
         get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true);
    }
    
    // Usuarios muteados
    match /muted/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Administrador' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Moderador' ||
         get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true);
    }
    
    // Moderadores
    match /moderators/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Administrador' ||
         get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true);
    }
    
    // Salas
    match /rooms/{roomId} {
      allow read: if true;
      allow write: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Administrador' ||
         get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true);
    }
    
    // Encuestas
    match /polls/{pollId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Administrador' ||
         get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true);
    }
    
    // Desarrolladores
    match /developers/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true;
    }
    
    // Configuración global
    match /settings/global {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/developers/$(request.auth.uid)).data.isDeveloper == true;
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.resource.size < 5 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 📦 Estructura del Proyecto

```
xzj/
├── index.html              # Página principal
├── login.html              # Página de login
├── banned.html             # Página de baneo
├── base.css                # Estilos base
├── script.js               # Lógica principal
├── firebase.js             # Configuración Firebase
├── developer-panel.js      # Panel de desarrollador
├── christmas-animation.js  # Animaciones especiales
├── emote-manager.js        # Gestión de emotes
├── polls.js                # Sistema de encuestas
├── games-panel.js          # Panel de juegos
├── resolutions/
│   ├── mobile.css          # Estilos mobile
│   ├── tablet.css          # Estilos tablet
│   └── desktop.css         # Estilos desktop
└── images/                 # Recursos gráficos
```

## 🎯 Comandos Disponibles

### Todos los Usuarios
- `!crearprivada` - Crear sala privada
- `!aceptar` - Ver solicitudes de acceso
- `!aceptar <número>` - Aceptar usuario

### Moderadores
- `!crearsala <nombre>` - Crear sala pública
- `!ban` - Ver usuarios conectados
- `!ban <número> [razón]` - Banear usuario
- `!mute` - Ver usuarios conectados
- `!mute <número> [minutos]` - Mutear usuario
- `!unmute` - Ver usuarios muteados
- `!unmute <número>` - Desmutear usuario
- `!anuncio <mensaje>` - Enviar anuncio global

### Administradores
- `!versalas` - Panel de gestión de salas
- `!borrar <nombre>` - Eliminar sala
- `!unban` - Ver usuarios baneados
- `!unban <número>` - Desbanear usuario
- `!borrarchat` - Limpiar historial

### Desarrolladores
- `!developer` - Abrir panel de desarrollador
- Todos los comandos anteriores
- Acceso a configuración global
- Ver IPs de usuarios

## 🚀 Instalación

1. Clonar el repositorio
2. Configurar Firebase en `firebase.js`
3. Aplicar las reglas de Firebase
4. Desplegar en hosting

## 📝 Notas

- Versión: 3.9.3
- Proyecto: fyzar-80936
- Estado: ✅ Producción
- Última actualización: Sistema de desarrolladores + Reorganización UI

## 🔐 Seguridad

- Autenticación Firebase
- Validación de roles
- Sistema anti-spam
- Protección contra XSS
- Rate limiting
- IP tracking (solo developers)

## 📱 Compatibilidad

- ✅ Chrome/Edge (Recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile (iOS/Android)
- ✅ Tablet

## 🎨 Paleta de Colores

- Principal: `#c97a6f`
- Secundario: `#d4a59a`
- Fondo: `#2a1a1a`
- Texto: `#f5e6e3`
- Developer: `#00d4ff`
- Admin: `#ff0000`
- Moderador: `#ffaa00`

---

**Desarrollado con ❤️ para la comunidad FYZAR**
