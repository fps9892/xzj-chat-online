# 🚀 CHATUP CHAT

## 📋 Descripción

Chat en tiempo real con Firebase, sistema de moderación, juegos multijugador y sistema de niveles.

## 🔥 Reglas de Firebase

### Realtime Database Rules

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Nota**: Las reglas están configuradas en modo abierto para desarrollo. Para producción, considera restringir el acceso.

### Firestore Rules

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

**Nota**: Las reglas están configuradas en modo abierto para desarrollo. Para producción, consulta `FIREBASE_RULES.md` para reglas restrictivas.

<details>
<summary>📋 Reglas de Producción (Clic para expandir)</summary>

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
- `!refresh` - Panel para refrescar usuarios (individual o todos)
- `!forceban` - Panel de expulsión forzada (elimina de todas las salas + baneo + refresh)
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
