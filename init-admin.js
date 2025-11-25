// Script para inicializar el administrador específico
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Función para inicializar el administrador específico
async function initializeSpecificAdmin() {
    const adminUid = "wv8Z7GkeBpVpIcyC7QYx2Fp3Bx72";
    
    try {
        // Crear documento de administrador
        await setDoc(doc(db, "admins", adminUid), {
            grantedAt: new Date().toISOString(),
            grantedBy: "system",
            isSystemAdmin: true,
            permissions: {
                createRooms: true,
                deleteRooms: true,
                banUsers: true,
                unbanUsers: true,
                grantModerator: true,
                revokeModerator: true,
                deleteMessages: true,
                pinMessages: true
            }
        });
        
        console.log(`✅ Permisos de administrador otorgados a ${adminUid}`);
        
        // Crear sala general si no existe
        await setDoc(doc(db, "rooms", "general"), {
            name: "Sala General",
            createdBy: "system",
            createdAt: new Date().toISOString(),
            isActive: true,
            isDefault: true
        });
        
        console.log("✅ Sala general inicializada");
        
    } catch (error) {
        console.error("❌ Error inicializando administrador:", error);
    }
}

// Ejecutar inicialización
initializeSpecificAdmin();