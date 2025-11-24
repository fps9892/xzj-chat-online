import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, serverTimestamp, set, onDisconnect, query, limitToLast, remove, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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

// Usuario actual desde localStorage
const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
    userId: 'guest_' + Math.random().toString(36).substr(2, 9),
    username: 'guest',
    avatar: 'images/profileuser.jpg'
};

// Redirect to login if no user
if (!localStorage.getItem('currentUser')) {
    window.location.href = 'login.html';
}

let currentRoom = 'room1';

// Funciones para mensajes
export function sendMessage(text) {
    const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
    return push(messagesRef, {
        text: text,
        userId: currentUser.userId,
        userName: currentUser.username,
        userAvatar: currentUser.avatar,
        timestamp: serverTimestamp(),
        type: 'text',
        isGuest: currentUser.isGuest || false
    }).then(() => {
        // Limit messages to 5 per room
        limitMessages();
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
    const userRef = ref(database, `rooms/${currentRoom}/users/${currentUser.userId}`);
    const userStatusRef = ref(database, `rooms/${currentRoom}/users/${currentUser.userId}/status`);
    
    set(userRef, {
        name: currentUser.username,
        avatar: currentUser.avatar,
        status: 'online',
        lastSeen: serverTimestamp(),
        role: currentUser.role || 'user'
    });
    
    onDisconnect(userStatusRef).set('offline');
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

export { currentUser, currentRoom };