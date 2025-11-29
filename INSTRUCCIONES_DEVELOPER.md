# Agregar Usuario Developer

## Opción 1: Desde la Consola de Firebase (RECOMENDADO)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto: **fyzar-80936**
3. Ve a **Firestore Database**
4. Haz clic en **"Iniciar colección"** o busca la colección `developers`
5. Crea un nuevo documento con:
   - **ID del documento**: `h7RgUx3nJMUXZdGh9X1gdHxGalD3`
   - **Campos**:
     ```
     isDeveloper: true (boolean)
     grantedAt: [fecha actual] (string)
     grantedBy: "system" (string)
     ```

## Opción 2: Desde el navegador

1. Abre el archivo `init-developer.html` en tu navegador
2. El script se ejecutará automáticamente
3. Verifica en la consola del navegador que se haya creado correctamente

## Verificación

Una vez agregado, el usuario con UID `h7RgUx3nJMUXZdGh9X1gdHxGalD3` tendrá:
- Tag **DEV** en el chat (color cyan)
- Badge **Desarrollador** en el perfil
- Acceso al comando `!developer`
- Permisos de administrador y moderador automáticamente
