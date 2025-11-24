import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, serverTimestamp, set, onDisconnect, query, limitToLast, remove, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getFirestore, doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const database = getDatabase(app);
const db = getFirestore(app);

// Limpiar userId para evitar caracteres no permitidos
function sanitizeUserId(userId) {
    return userId.replace(/[^a-zA-Z0-9_-]/g, '');
}

// Usuario actual desde localStorage
const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
    userId: sanitizeUserId('guest_' + Math.random().toString(36).substr(2, 9)),
    username: 'guest',
    avatar: 'images/profileuser.jpg',
    textColor: '#ffffff',
    description: 'Usuario invitado',
    status: 'online',
    role: 'guest',
    isGuest: true
};

// Redirect to login if no user
if (!localStorage.getItem('currentUser')) {
    window.location.href = 'login.html';
}

let currentRoom = 'room1';

// Funciones para mensajes
export function sendMessage(text) {
    const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
    
    // Validar datos antes de enviar
    const messageData = {
        text: text || '',
        userId: currentUser.userId || 'unknown',
        userName: currentUser.username || 'Usuario',
        userAvatar: currentUser.avatar || 'images/profileuser.jpg',
        textColor: currentUser.textColor || '#ffffff',
        timestamp: serverTimestamp(),
        type: 'text',
        isGuest: currentUser.isGuest || false
    };
    
    // Verificar que no hay valores undefined
    Object.keys(messageData).forEach(key => {
        if (messageData[key] === undefined || messageData[key] === null) {
            console.warn(`Campo de mensaje ${key} es undefined`);
            messageData[key] = key === 'text' ? '' : 'default';
        }
    });
    
    return push(messagesRef, messageData).then(() => {
        // Limit messages to 5 per room
        limitMessages();
    }).catch(error => {
        console.error('Error enviando mensaje:', error);
        throw error;
    });
}

// Limit messages to 5 per room
async function limitMessages() {
    const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
    const snapshot = await get(messagesRef);
    
    if (snapshot.exists()) {
        const messages = Object.keys(snapshot.val());
        if (messages.length > 5) {
            // Remove oldest messages
            const messagesToRemove = messages.slice(0, messages.length - 5);
            messagesToRemove.forEach(messageId => {
                remove(ref(database, `rooms/${currentRoom}/messages/${messageId}`));
            });
        }
    }
}

export function listenToMessages(callback) {
    const messagesRef = query(ref(database, `rooms/${currentRoom}/messages`), limitToLast(5));
    return onValue(messagesRef, (snapshot) => {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        callback(messages);
    });
}

// Funciones para usuarios conectados
export function setUserOnline() {
    const sanitizedUserId = sanitizeUserId(currentUser.userId);
    const userRef = ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}`);
    const userStatusRef = ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}/status`);
    
    // Asegurar que todos los campos requeridos tengan valores válidos
    const userData = {
        name: currentUser.username || 'Usuario',
        avatar: currentUser.avatar || 'images/profileuser.jpg',
        status: 'online',
        lastSeen: serverTimestamp(),
        role: currentUser.role || 'user',
        textColor: currentUser.textColor || '#ffffff',
        description: currentUser.description || 'Sin descripción'
    };
    
    // Verificar que no hay valores undefined
    Object.keys(userData).forEach(key => {
        if (userData[key] === undefined || userData[key] === null) {
            console.warn(`Campo ${key} es undefined, usando valor por defecto`);
            switch(key) {
                case 'name': userData[key] = 'Usuario'; break;
                case 'avatar': userData[key] = 'images/profileuser.jpg'; break;
                case 'textColor': userData[key] = '#ffffff'; break;
                case 'description': userData[key] = 'Sin descripción'; break;
                case 'role': userData[key] = 'user'; break;
                default: userData[key] = '';
            }
        }
    });
    
    set(userRef, userData);
    
    if (currentUser.isGuest) {
        onDisconnect(userRef).remove();
    } else {
        onDisconnect(userStatusRef).set('offline');
    }
}

export function listenToUsers(callback) {
    const usersRef = ref(database, `rooms/${currentRoom}/users`);
    return onValue(usersRef, (snapshot) => {
        const users = [];
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData.status === 'online') {
                users.push({
                    id: childSnapshot.key,
                    ...userData
                });
            }
        });
        callback(users);
    });
}

export function changeRoom(roomName) {
    currentRoom = roomName;
    setUserOnline();
}

// Actualizar datos de usuario en Firestore
export async function updateUserData(updates) {
    try {
        // Filtrar valores undefined/null de las actualizaciones
        const cleanUpdates = {};
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && updates[key] !== null) {
                cleanUpdates[key] = updates[key];
            }
        });
        
        if (Object.keys(cleanUpdates).length === 0) {
            console.warn('No hay actualizaciones válidas para procesar');
            return false;
        }
        
        if (currentUser.isGuest) {
            await updateDoc(doc(db, 'guests', currentUser.userId), cleanUpdates);
        } else {
            // Buscar documento por userId
            const userDoc = await getDoc(doc(db, 'users', currentUser.firebaseUid || currentUser.userId));
            if (userDoc.exists()) {
                await updateDoc(doc(db, 'users', userDoc.id), cleanUpdates);
            }
        }
        
        // Actualizar localStorage
        Object.assign(currentUser, cleanUpdates);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Actualizar estado en tiempo real
        setUserOnline();
        
        return true;
    } catch (error) {
        console.error('Error updating user data:', error);
        return false;
    }
}

export { currentUser, currentRoom };