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

// Función para inicializar la sala general
async function initializeGeneralRoom() {
    try {
        const generalRoomRef = doc(db, "rooms", "general");
        const generalRoomDoc = await getDoc(generalRoomRef);
        
        if (!generalRoomDoc.exists()) {
            await setDoc(generalRoomRef, {
                name: "Sala General",
                createdBy: "system",
                createdAt: new Date().toISOString(),
                isActive: true
            });
            console.log("Sala General creada exitosamente");
        } else {
            console.log("Sala General ya existe");
        }
    } catch (error) {
        console.error("Error inicializando sala general:", error);
    }
}

// Ejecutar inicialización
initializeGeneralRoom();