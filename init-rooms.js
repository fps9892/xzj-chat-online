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

// Función para verificar si una sala ya existe
async function checkIfRoomExists(roomName) {
    try {
        const roomRef = doc(db, "rooms", roomName);
        const roomDoc = await getDoc(roomRef);
        return roomDoc.exists();
    } catch (error) {
        console.error("Error verificando si la sala existe:", error);
        return false;
    }
}

// Función para crear una sala
async function createRoom(roomName) {
    try {
        const roomRef = doc(db, "rooms", roomName);
        await setDoc(roomRef, {
            name: roomName,
            createdBy: "system",
            createdAt: new Date().toISOString(),
            isActive: true
        });
        console.log(`${roomName} creada exitosamente`);
    } catch (error) {
        console.error("Error creando la sala:", error);
    }
}

// Función para inicializar la sala general
async function initializeGeneralRoom() {
    try {
        const roomName = "Sala General";
        const roomExists = await checkIfRoomExists(roomName);

        if (!roomExists) {
            await createRoom(roomName);
        } else {
            console.log(`${roomName} ya existe`);
        }
    } catch (error) {
        console.error("Error inicializando sala general:", error);
    }
}

// Ejecutar inicialización
initializeGeneralRoom();