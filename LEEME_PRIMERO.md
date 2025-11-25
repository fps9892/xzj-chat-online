# 🚀 GUÍA RÁPIDA DE INICIO - FYZAR CHAT

## ✅ PROBLEMAS SOLUCIONADOS

1. ✓ **Archivo `admin-listener.js` faltante** - CREADO
2. ✓ **Sala General no aparecía en HTML** - AGREGADA
3. ✓ **Errores de consola por imports** - CORREGIDOS
4. ✓ **Reglas de Firebase incompletas** - ACTUALIZADAS

---

## 📁 ARCHIVOS NUEVOS CREADOS

- ✅ `admin-listener.js` - Listener para permisos de admin
- ✅ `init-general-room.html` - Página para inicializar la Sala General
- ✅ `test-console.html` - Consola de pruebas y diagnóstico
- ✅ `REGLAS_FIREBASE.md` - Reglas completas para copiar y pegar
- ✅ `SOLUCION_ERRORES.md` - Guía de solución de problemas
- ✅ `LEEME_PRIMERO.md` - Este archivo

---

## 🎯 PASOS PARA INICIAR (EN ORDEN)

### 1️⃣ CONFIGURAR FIREBASE (5 minutos)

#### A) Aplicar Reglas de Firestore
1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: **fyzar-80936**
3. Click en **Firestore Database** → **Rules**
4. Abre el archivo `REGLAS_FIREBASE.md`
5. Copia las reglas de **Firestore** (sección 1)
6. Pégalas en Firebase Console
7. Click en **Publicar**

#### B) Aplicar Reglas de Realtime Database
1. En Firebase Console, click en **Realtime Database** → **Rules**
2. Copia las reglas de **Realtime Database** del archivo `REGLAS_FIREBASE.md` (sección 2)
3. Pégalas en Firebase Console
4. Click en **Publicar**

---

### 2️⃣ INICIALIZAR LA SALA GENERAL (2 minutos)

**Opción A - Usando el archivo HTML (RECOMENDADO):**
1. Inicia un servidor local:
   ```bash
   cd /home/estudiante/Escritorio/xzj
   python3 -m http.server 8000
   ```
2. Abre en tu navegador: http://localhost:8000/init-general-room.html
3. Click en **"Inicializar Ahora"**
4. Espera el mensaje de éxito ✅

**Opción B - Usando la consola de pruebas:**
1. Abre: http://localhost:8000/test-console.html
2. Click en **"🏗️ Crear Sala General"**
3. Verifica que aparezca el mensaje de éxito

---

### 3️⃣ REGISTRAR TU CUENTA (2 minutos)

1. Abre: http://localhost:8000/login.html
2. Ve a la pestaña **"Registrarse"**
3. Completa el formulario:
   - Username (máx. 10 caracteres)
   - Email
   - Contraseña (mín. 6 caracteres)
   - Confirmar contraseña
   - Descripción (opcional)
   - Foto de perfil (opcional)
4. Click en **"Crear Cuenta"**
5. Espera a ser redirigido al chat

---

### 4️⃣ HACERTE ADMINISTRADOR (1 minuto)

1. Una vez dentro del chat, abre la consola del navegador (F12)
2. Ejecuta este comando para obtener tu UID:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('currentUser')).firebaseUid)
   ```
3. Copia el UID que aparece
4. Abre una nueva pestaña y ve a: http://localhost:8000/test-console.html
5. Abre la consola (F12) y ejecuta (reemplaza TU_UID):
   ```javascript
   import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
   const db = getFirestore();
   await setDoc(doc(db, "admins", "TU_UID_AQUI"), {
       grantedAt: new Date().toISOString(),
       grantedBy: "system",
       isSystemAdmin: true
   });
   console.log("✅ Administrador configurado");
   ```
6. Recarga la página del chat

---

## 🎮 USAR LA APLICACIÓN

### Iniciar Sesión
- **Usuario registrado:** Login con username y contraseña
- **Invitado:** Pestaña "Invitado" → Ingresa nickname
- **Google/Facebook:** Click en los botones sociales

### Funciones Básicas
- **Enviar mensaje:** Escribe y presiona Enter o click en el icono
- **Enviar imagen:** Click en el icono de imagen 🖼️
- **Enviar emote:** Click en el icono de emote 😊
- **Cambiar sala:** Click en el selector de salas (arriba)
- **Ver perfil:** Click en cualquier nombre de usuario
- **Configuración:** Click en tu foto de perfil (arriba izquierda)

### Comandos de Administrador
(Solo si eres administrador)
- `!crearsala NombreSala` - Crear nueva sala
- `!borrar nombreSala` - Borrar sala
- `!ban userId razón` - Banear usuario
- `!unban userId` - Desbanear usuario
- `!borrarchat` - Limpiar historial de chat

---

## 🔍 VERIFICAR QUE TODO FUNCIONA

### Opción 1 - Consola de Pruebas (RECOMENDADO)
1. Abre: http://localhost:8000/test-console.html
2. Click en **"▶️ Ejecutar Todos los Tests"**
3. Verifica que todos los tests pasen ✅

### Opción 2 - Verificación Manual
Abre el chat y verifica:
- ✓ Ves la "Sala General" en el selector
- ✓ Puedes enviar mensajes
- ✓ Ves tu usuario en la lista de conectados
- ✓ No hay errores en la consola (F12)

---

## 🐛 SI ALGO NO FUNCIONA

### Error: "Permission denied"
→ Verifica que aplicaste las reglas de Firebase correctamente

### Error: "Room not found"
→ Ejecuta el paso 2 (Inicializar Sala General)

### Error: "Cannot read property of null"
→ Limpia el localStorage y vuelve a iniciar sesión:
```javascript
localStorage.clear()
```

### La app se queda en "Cargando..."
→ Abre la consola (F12) y busca errores específicos

### Más soluciones
→ Consulta el archivo `SOLUCION_ERRORES.md`

---

## 📂 ESTRUCTURA DEL PROYECTO

```
xzj/
├── 📄 index.html              # Página principal del chat
├── 📄 login.html              # Página de login/registro
├── 📄 init-general-room.html  # Inicializar Sala General (NUEVO)
├── 📄 test-console.html       # Consola de pruebas (NUEVO)
│
├── 📜 script.js               # Lógica principal del chat
├── 📜 firebase.js             # Configuración de Firebase
├── 📜 login.js                # Lógica de login/registro
├── 📜 admin-listener.js       # Listener de admin (NUEVO)
├── 📜 user-profile-service.js # Servicio de perfiles
├── 📜 init-admin.js           # Script de inicialización admin
│
├── 🎨 base.css                # Estilos base
├── 🎨 login.css               # Estilos de login
├── 🎨 emotes.css              # Estilos de emotes
├── 🎨 join-notifications.css  # Estilos de notificaciones
│
├── 📋 database.rules.json     # Reglas Realtime DB (ACTUALIZADO)
├── 📋 firestore.rules         # Reglas Firestore (ACTUALIZADO)
│
├── 📖 REGLAS_FIREBASE.md      # Reglas para copiar (NUEVO)
├── 📖 SOLUCION_ERRORES.md     # Guía de errores (NUEVO)
├── 📖 LEEME_PRIMERO.md        # Esta guía (NUEVO)
│
├── 📁 images/                 # Imágenes e iconos
│   ├── emotes/                # Emotes del chat
│   └── ...
├── 📁 fonts/                  # Fuentes personalizadas
└── 📁 resolutions/            # CSS responsive
    ├── mobile.css
    ├── tablet.css
    └── desktop.css
```

---

## 🎯 CHECKLIST RÁPIDO

Antes de usar la app, verifica:

- [ ] ✅ Servidor local corriendo (python3 -m http.server 8000)
- [ ] ✅ Reglas de Firestore aplicadas
- [ ] ✅ Reglas de Realtime Database aplicadas
- [ ] ✅ Sala General inicializada
- [ ] ✅ Usuario registrado
- [ ] ✅ (Opcional) Cuenta configurada como admin

---

## 🚀 INICIO RÁPIDO (RESUMEN)

```bash
# 1. Iniciar servidor
cd /home/estudiante/Escritorio/xzj
python3 -m http.server 8000

# 2. Abrir en navegador:
# - http://localhost:8000/init-general-room.html (inicializar)
# - http://localhost:8000/login.html (registrarse)
# - http://localhost:8000/index.html (usar el chat)

# 3. Para verificar errores:
# - http://localhost:8000/test-console.html
```

---

## 📞 RECURSOS ADICIONALES

- **Firebase Console:** https://console.firebase.google.com/
- **Proyecto:** fyzar-80936
- **Reglas completas:** Ver `REGLAS_FIREBASE.md`
- **Solución de errores:** Ver `SOLUCION_ERRORES.md`
- **Consola de pruebas:** `test-console.html`

---

## ✨ CARACTERÍSTICAS PRINCIPALES

- 💬 Chat en tiempo real
- 🏠 Múltiples salas
- 👥 Lista de usuarios conectados
- 😊 Sistema de emotes
- 🖼️ Envío de imágenes
- 👤 Perfiles de usuario personalizables
- 🔐 Sistema de roles (Admin/Moderador/Usuario/Invitado)
- 🚫 Sistema de baneo
- 📌 Mensajes fijados
- 📱 Diseño responsive (móvil/tablet/desktop)
- ⌨️ Indicador de "escribiendo..."
- 🔔 Notificaciones de entrada/salida

---

## 🎉 ¡LISTO!

Tu aplicación de chat está completamente configurada y lista para usar.

**¿Problemas?** → Consulta `SOLUCION_ERRORES.md`
**¿Dudas sobre Firebase?** → Consulta `REGLAS_FIREBASE.md`
**¿Quieres probar?** → Abre `test-console.html`

---

**Desarrollado con ❤️ usando Firebase y JavaScript vanilla**
