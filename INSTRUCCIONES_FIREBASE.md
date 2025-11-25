# Instrucciones para configurar Firebase

## Problemas solucionados:
1. ✅ Error de sintaxis en firebase.js línea 315 (función de ejemplo eliminada)
2. ✅ Simplificado init-rooms.js para evitar duplicaciones
3. ✅ Creadas reglas de seguridad para Firestore y Realtime Database

## Pasos para aplicar las reglas en Firebase Console:

### 1. Reglas de Firestore Database:
1. Ve a Firebase Console: https://console.firebase.google.com/
2. Selecciona tu proyecto: **fyzar-80936**
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **Reglas**
5. Copia y pega el contenido del archivo `firestore.rules`
6. Haz clic en **Publicar**

### 2. Reglas de Realtime Database:
1. En Firebase Console, ve a **Realtime Database**
2. Haz clic en la pestaña **Reglas**
3. Copia y pega el contenido del archivo `database.rules.json`
4. Haz clic en **Publicar**

### 3. Inicializar el administrador:
1. Abre el archivo `init-admin.js` en tu navegador
2. Abre la consola del navegador (F12)
3. Verifica que aparezca: "✅ Permisos de administrador otorgados"

### 4. Inicializar la sala general:
1. Abre el archivo `init-rooms.js` en tu navegador
2. Verifica en la consola: "✅ Sala General creada exitosamente"

## Comandos disponibles para administradores:
- `!crearsala <nombre>` - Crear nueva sala (máx 10 caracteres)
- `!borrar <nombre_sala>` - Eliminar sala (excepto general)
- `!ban <userId> [razón]` - Banear usuario
- `!unban <userId>` - Desbanear usuario
- `!borrarchat` - Limpiar historial de chat

## Notas importantes:
- Las reglas permiten lectura pública pero escritura controlada
- Solo administradores pueden crear/eliminar salas
- Administradores y moderadores pueden banear usuarios
- La sala "general" no se puede eliminar
- Los invitados tienen acceso limitado
