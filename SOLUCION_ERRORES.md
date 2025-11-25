# 🔧 SOLUCIÓN DE ERRORES - GUÍA COMPLETA

## 🚨 ERRORES COMUNES Y SOLUCIONES

### ❌ Error: "Failed to load module script"
**Causa:** Archivo JavaScript no encontrado o ruta incorrecta

**Solución:**
1. Verifica que todos los archivos existan:
   - `firebase.js` ✓
   - `script.js` ✓
   - `login.js` ✓
   - `admin-listener.js` ✓ (NUEVO - ya creado)
   - `user-profile-service.js` ✓

2. Abre la consola del navegador (F12) y verifica la ruta exacta del error

---

### ❌ Error: "Permission denied" en Firebase
**Causa:** Las reglas de Firebase no están configuradas correctamente

**Solución:**
1. Ve a Firebase Console
2. Aplica las reglas de `REGLAS_FIREBASE.md`
3. Asegúrate de hacer clic en **Publicar**

---

### ❌ Error: "Room not found" o sala vacía
**Causa:** La Sala General no existe en Firebase

**Solución:**
1. Abre `init-general-room.html` en tu navegador
2. Haz clic en "Inicializar Ahora"
3. Espera el mensaje de éxito
4. Recarga la aplicación

---

### ❌ Error: "Cannot read property 'userId' of null"
**Causa:** No hay usuario en localStorage

**Solución:**
1. Cierra sesión completamente
2. Limpia el localStorage:
   ```javascript
   localStorage.clear()
   ```
3. Vuelve a iniciar sesión desde `login.html`

---

### ❌ Error: CORS o "Cross-Origin"
**Causa:** Intentando abrir archivos directamente (file://)

**Solución:**
Debes usar un servidor local. Opciones:

**Opción 1 - Python:**
```bash
cd /home/estudiante/Escritorio/xzj
python3 -m http.server 8000
```
Luego abre: http://localhost:8000

**Opción 2 - Node.js:**
```bash
npx http-server -p 8000
```

**Opción 3 - PHP:**
```bash
php -S localhost:8000
```

**Opción 4 - VS Code:**
Instala la extensión "Live Server" y haz clic derecho → "Open with Live Server"

---

### ❌ Error: "Firebase: Error (auth/user-not-found)"
**Causa:** Usuario no existe o credenciales incorrectas

**Solución:**
1. Verifica que el usuario esté registrado
2. Si olvidaste la contraseña, regístrate de nuevo
3. Para invitados, usa la pestaña "Invitado"

---

### ❌ Error: "Uncaught TypeError: Cannot read properties of undefined"
**Causa:** Variable no inicializada o datos faltantes

**Solución:**
1. Abre la consola (F12)
2. Busca la línea exacta del error
3. Verifica que `currentUser` tenga todos los campos:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('currentUser')))
   ```

---

### ❌ La aplicación se queda en "Cargando..."
**Causa:** Firebase no se conecta o hay error en la inicialización

**Solución:**
1. Verifica tu conexión a internet
2. Abre la consola (F12) y busca errores
3. Verifica que las credenciales de Firebase sean correctas en `firebase.js`
4. Asegúrate de que la Sala General existe

---

### ❌ No se ven los mensajes o usuarios
**Causa:** Listeners no se están ejecutando correctamente

**Solución:**
1. Verifica en Firebase Console → Realtime Database que exista:
   - `rooms/general/messages`
   - `rooms/general/users`
2. Recarga la página (Ctrl + F5)
3. Limpia caché del navegador

---

### ❌ Error: "admin-listener.js not found"
**Causa:** Archivo faltante (YA SOLUCIONADO)

**Solución:**
El archivo `admin-listener.js` ya fue creado. Si aún tienes el error:
1. Verifica que el archivo existe en la carpeta
2. Recarga la página con Ctrl + F5

---

## 🔍 VERIFICACIÓN PASO A PASO

### 1. Verificar estructura de archivos
Asegúrate de tener todos estos archivos:

```
xzj/
├── index.html ✓
├── login.html ✓
├── script.js ✓
├── login.js ✓
├── firebase.js ✓
├── admin-listener.js ✓ (NUEVO)
├── user-profile-service.js ✓
├── init-admin.js ✓
├── init-general-room.html ✓ (NUEVO)
├── database.rules.json ✓
├── firestore.rules ✓
├── base.css ✓
├── login.css ✓
├── emotes.css ✓
├── join-notifications.css ✓
├── images/ ✓
├── fonts/ ✓
└── resolutions/ ✓
```

### 2. Verificar Firebase Console

**Firestore Database debe tener:**
- Colección `rooms` con documento `general`
- Colección `admins` con tu UID
- Colección `users` (se crea al registrarse)

**Realtime Database debe tener:**
- `rooms/general/` con estructura básica

### 3. Verificar consola del navegador

Abre la consola (F12) y busca:
- ✅ Sin errores rojos
- ✅ "Usuario autenticado" (si no eres invitado)
- ✅ Mensajes de Firebase conectándose

---

## 🎯 CHECKLIST DE INICIALIZACIÓN

Sigue estos pasos en orden:

- [ ] 1. Aplicar reglas de Firestore (desde `REGLAS_FIREBASE.md`)
- [ ] 2. Aplicar reglas de Realtime Database (desde `REGLAS_FIREBASE.md`)
- [ ] 3. Abrir `init-general-room.html` e inicializar
- [ ] 4. Registrar un usuario en `login.html`
- [ ] 5. Obtener tu UID de Firebase
- [ ] 6. Configurar tu cuenta como administrador
- [ ] 7. Iniciar sesión y probar el chat

---

## 🐛 DEBUGGING AVANZADO

### Ver estado actual del usuario:
```javascript
console.log('Usuario actual:', JSON.parse(localStorage.getItem('currentUser')))
```

### Ver mensajes en Firebase:
```javascript
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
const db = getDatabase();
const messages = await get(ref(db, 'rooms/general/messages'));
console.log('Mensajes:', messages.val());
```

### Ver usuarios conectados:
```javascript
const users = await get(ref(db, 'rooms/general/users'));
console.log('Usuarios:', users.val());
```

### Limpiar todo y empezar de nuevo:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 📞 COMANDOS ÚTILES EN CONSOLA

### Verificar conexión a Firebase:
```javascript
console.log('Firebase conectado:', firebase.apps.length > 0)
```

### Ver todas las salas disponibles:
```javascript
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
const db = getFirestore();
const rooms = await getDocs(collection(db, 'rooms'));
rooms.forEach(doc => console.log(doc.id, doc.data()));
```

### Forzar recarga de usuarios:
```javascript
location.reload()
```

---

## ✅ VERIFICACIÓN FINAL

Si todo está bien, deberías ver:

1. ✓ Pantalla de login sin errores
2. ✓ Puedes registrarte o entrar como invitado
3. ✓ Ves la "Sala General" en el selector de salas
4. ✓ Puedes enviar mensajes
5. ✓ Ves tu usuario en la lista de conectados
6. ✓ No hay errores en la consola (F12)

---

## 🆘 ÚLTIMO RECURSO

Si nada funciona:

1. **Borra todo y clona de nuevo:**
   ```bash
   rm -rf /home/estudiante/Escritorio/xzj
   # Vuelve a descargar o clonar el proyecto
   ```

2. **Verifica las credenciales de Firebase:**
   - Asegúrate de que el `firebaseConfig` en todos los archivos sea correcto
   - Verifica que el proyecto en Firebase Console sea el correcto

3. **Crea un nuevo proyecto de Firebase:**
   - Ve a Firebase Console
   - Crea un nuevo proyecto
   - Actualiza las credenciales en todos los archivos

---

**¡Con esta guía deberías poder solucionar cualquier error!** 🎉

Si encuentras un error que no está aquí, anótalo y busca en la consola del navegador (F12) para más detalles.
