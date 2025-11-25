# 🔥 REGLAS DE FIREBASE - COPIAR Y PEGAR

## 📋 INSTRUCCIONES

### 1️⃣ FIRESTORE DATABASE RULES
**Ubicación:** Firebase Console → Firestore Database → Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función para verificar si el usuario es administrador
    function isAdmin() {
      return request.auth != null && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Función para verificar si el usuario es moderador
    function isModerator() {
      return request.auth != null && exists(/databases/$(database)/documents/moderators/$(request.auth.uid));
    }
    
    // Función para verificar si el usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Colección de administradores - Solo lectura pública, escritura para admins
    match /admins/{firebaseUid} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Colección de moderadores - Solo lectura pública, escritura para admins
    match /moderators/{firebaseUid} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Colección de usuarios baneados - Lectura pública, escritura para admins/mods
    match /banned/{firebaseUid} {
      allow read: if true;
      allow write: if isAdmin() || isModerator();
    }
    
    // Colección de usuarios - Lectura pública, escritura propia o admin
    match /users/{firebaseUid} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (request.auth.uid == firebaseUid || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Colección de invitados - Acceso completo (temporal)
    match /guests/{guestId} {
      allow read: if true;
      allow write: if true;
    }
    
    // Colección de mensajes fijados - Lectura pública, escritura para admins/mods
    match /pinnedMessages/{messageId} {
      allow read: if true;
      allow write: if isAdmin() || isModerator();
    }
    
    // Colección de salas/rooms - Lectura pública, escritura para admins
    match /rooms/{roomId} {
      allow read: if true;
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Cualquier otra colección - Acceso completo (para desarrollo)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

### 2️⃣ REALTIME DATABASE RULES
**Ubicación:** Firebase Console → Realtime Database → Rules

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
    "deviceCounts": {
      ".read": true,
      ".write": true
    },
    "roomEvents": {
      ".read": true,
      ".write": true,
      "$eventId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

---

## 🚀 PASOS PARA APLICAR LAS REGLAS

### Para Firestore Database:
1. Ve a Firebase Console: https://console.firebase.google.com/
2. Selecciona tu proyecto: **fyzar-80936**
3. En el menú lateral, haz clic en **Firestore Database**
4. Ve a la pestaña **Rules** (Reglas)
5. **BORRA TODO** el contenido actual
6. **COPIA Y PEGA** las reglas de Firestore de arriba
7. Haz clic en **Publicar** (Publish)

### Para Realtime Database:
1. En el menú lateral, haz clic en **Realtime Database**
2. Ve a la pestaña **Rules** (Reglas)
3. **BORRA TODO** el contenido actual
4. **COPIA Y PEGA** las reglas de Realtime Database de arriba
5. Haz clic en **Publicar** (Publish)

---

## ⚙️ INICIALIZAR LA BASE DE DATOS

### Opción 1: Usar el archivo HTML
1. Abre en tu navegador: `init-general-room.html`
2. Haz clic en "Inicializar Ahora"
3. Espera a que aparezca el mensaje de éxito

### Opción 2: Ejecutar script manualmente
1. Abre la consola del navegador (F12)
2. Ve a la pestaña Console
3. Ejecuta el siguiente código:

```javascript
// Copiar y pegar en la consola del navegador
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyDavetvIrVymmoiIpRxUigCd5hljMtsr0c",
    authDomain: "fyzar-80936.firebaseapp.com",
    databaseURL: "https://fyzar-80936-default-rtdb.firebaseio.com",
    projectId: "fyzar-80936",
    storageBucket: "fyzar-80936.firebasestorage.app",
    messagingSenderId: "718553577005",
    appId: "1:718553577005:web:74b5b9e790232edf6e2aa4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const database = getDatabase(app);

// Crear Sala General
await setDoc(doc(db, "rooms", "general"), {
    name: "Sala General",
    createdBy: "system",
    createdAt: new Date().toISOString(),
    isActive: true,
    isDefault: true
});

await set(ref(database, 'rooms/general'), {
    name: "Sala General",
    createdBy: "system",
    createdAt: new Date().toISOString()
});

console.log("✅ Sala General creada exitosamente");
```

---

## 🔐 CONFIGURAR TU ADMINISTRADOR

Para hacer que tu cuenta sea administrador:

1. Inicia sesión en tu aplicación
2. Abre la consola del navegador (F12)
3. Ejecuta: `console.log(JSON.parse(localStorage.getItem('currentUser')).firebaseUid)`
4. Copia el UID que aparece
5. Reemplaza el UID en `init-admin.js` línea 19
6. Abre `init-admin.js` en el navegador como módulo

O usa este código en la consola (reemplaza TU_UID):

```javascript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDavetvIrVymmoiIpRxUigCd5hljMtsr0c",
    authDomain: "fyzar-80936.firebaseapp.com",
    projectId: "fyzar-80936",
    storageBucket: "fyzar-80936.firebasestorage.app",
    messagingSenderId: "718553577005",
    appId: "1:718553577005:web:74b5b9e790232edf6e2aa4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Reemplaza "TU_UID_AQUI" con tu UID real
await setDoc(doc(db, "admins", "TU_UID_AQUI"), {
    grantedAt: new Date().toISOString(),
    grantedBy: "system",
    isSystemAdmin: true
});

console.log("✅ Administrador configurado");
```

---

## ✅ VERIFICACIÓN

Después de aplicar las reglas, verifica que todo funcione:

1. ✓ Puedes iniciar sesión
2. ✓ Puedes ver la "Sala General"
3. ✓ Puedes enviar mensajes
4. ✓ Puedes ver usuarios conectados
5. ✓ No hay errores en la consola

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Permission denied"
- Verifica que las reglas estén publicadas correctamente
- Asegúrate de que la Sala General existe en Firestore

### Error: "Room not found"
- Ejecuta el script de inicialización de la Sala General
- Verifica en Firebase Console que existe la colección "rooms"

### Error: "User not authenticated"
- Cierra sesión y vuelve a iniciar sesión
- Limpia el localStorage: `localStorage.clear()`

---

## 📞 COMANDOS DE ADMINISTRADOR

Una vez que seas administrador, puedes usar estos comandos en el chat:

- `!crearsala NombreSala` - Crear nueva sala
- `!borrar nombreSala` - Borrar sala
- `!ban userId razón` - Banear usuario
- `!unban userId` - Desbanear usuario
- `!borrarchat` - Limpiar historial de chat

---

**¡Listo! Tu aplicación de chat debería funcionar perfectamente ahora.** 🎉
