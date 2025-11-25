import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Función para crear una sala
async function createRoom(roomId, roomName) {
    try {
        const roomRef = doc(db, "rooms", roomId);
        const roomDoc = await getDoc(roomRef);
        
        if (!roomDoc.exists()) {
            await setDoc(roomRef, {
                name: roomName,
                createdBy: "system",
                createdAt: new Date().toISOString(),
                isActive: true,
                isDefault: true
            });
            console.log(`✅ ${roomName} creada exitosamente`);
        } else {
            console.log(`ℹ️ ${roomName} ya existe`);
        }
    } catch (error) {
        console.error("❌ Error creando la sala:", error);
    }
}

// Ejecutar inicialización
createRoom("general", "Sala General");