import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, serverTimestamp, set, onDisconnect, query as dbQuery, limitToLast, remove, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getFirestore, doc, updateDoc, getDoc, setDoc, deleteDoc, collection, query as fsQuery, where, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Redirect to login if no user
if (!currentUser) {
    window.location.href = 'login.html';
}

// Sanitizar userId si es necesario
if (currentUser && currentUser.userId) {
    currentUser.userId = sanitizeUserId(currentUser.userId);
}

let currentRoom = 'general';

// Obtener sala desde URL
function getRoomFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/([^/]+)$/);
    return match ? match[1] : 'general';
}

// Actualizar URL sin recargar
function updateURL(roomId) {
    const newURL = roomId === 'general' ? '/index.html' : `/index.html/${roomId}`;
    window.history.pushState({ room: roomId }, '', newURL);
}

// Inicializar sala desde URL
if (window.location.pathname !== '/login.html') {
    const urlRoom = getRoomFromURL();
    if (urlRoom && urlRoom !== 'index.html') {
        currentRoom = urlRoom;
    }
}

// Mantener estado de autenticación
let authInitialized = false;
async function initializeAuth() {
    if (authInitialized || currentUser.isGuest) return;
    
    try {
        const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const auth = getAuth();
        
        onAuthStateChanged(auth, (user) => {
            if (user && currentUser.firebaseUid === user.uid) {
                console.log('Usuario autenticado:', user.uid);
            }
        });
        
        authInitialized = true;
    } catch (error) {
        console.error('Error initializing auth:', error);
    }
}

// Inicializar autenticación
initializeAuth();

// Procesar emotes y links en texto
export function processEmotes(text) {
    const emoteMap = {
        ':)': '😊', ':D': '😃', ':(': '😢', ':P': '😛',
        'xD': '😆', '<3': '❤️', 'kappa': '🐸', 'poggers': '🔥',
        'sadge': '😭', 'omegalul': '😂', 'monkas': '😰', 'pepehands': '😢',
        'catjam': '🐱', 'kekw': '🤣'
    };
    
    let processedText = text;
    Object.keys(emoteMap).forEach(emote => {
        const regex = new RegExp(emote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        processedText = processedText.replace(regex, emoteMap[emote]);
    });
    
    // Procesar links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processedText = processedText.replace(urlRegex, '<a href="$1" target="_blank" style="color: #4a9eff; text-decoration: underline;">$1</a>');
    
    return processedText;
}

// Extraer ID de video de YouTube
export function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
        /youtube\.com\/embed\/([^?\s]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Funciones para mensajes
export async function sendMessage(text, type = 'text', imageData = null, audioDuration = null) {
    console.log('Sending message:', { text, type, imageData });
    
    // Verificar si el usuario está baneado o muteado (incluye invitados)
    const userId = currentUser.firebaseUid || currentUser.userId;
    if (userId) {
        try {
            const isBanned = await checkBannedStatus(userId);
            if (isBanned) {
                throw new Error('No puedes enviar mensajes porque estás baneado');
            }
            
            const isMuted = await checkMutedStatus(userId);
            if (isMuted) {
                throw new Error('Estás muteado y no puedes enviar mensajes');
            }
        } catch (error) {
            if (error.message.includes('muteado') || error.message.includes('baneado')) {
                throw error;
            }
            console.warn('No se pudo verificar estado:', error);
        }
    }
    
    // Procesar comandos de administrador
    if (text && text.startsWith('!')) {
        const commandResult = await processAdminCommand(text);
        if (commandResult) {
            if (commandResult.success) {
                // Si es mensaje privado, solo visible para el usuario
                if (commandResult.privateMessage) {
                    // Mostrar en consola o notificación local
                    console.log('Lista privada:', commandResult.message);
                    // Crear mensaje temporal solo visible para el usuario
                    const tempMessage = document.createElement('div');
                    tempMessage.className = 'private-command-message';
                    tempMessage.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.95); border: 2px solid #ffaa00; padding: 20px; border-radius: 12px; color: #fff; font-family: monospace; white-space: pre-wrap; z-index: 9999; max-width: 90%; max-height: 70vh; overflow-y: auto;';
                    tempMessage.textContent = commandResult.message;
                    
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '×';
                    closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;';
                    closeBtn.onclick = () => tempMessage.remove();
                    tempMessage.appendChild(closeBtn);
                    
                    document.body.appendChild(tempMessage);
                    setTimeout(() => tempMessage.remove(), 30000);
                    return;
                }
                
                // Enviar mensaje de confirmación del sistema
                const systemMessageData = {
                    text: commandResult.message,
                    userId: 'system',
                    userName: 'Sistema',
                    userAvatar: 'images/logo.svg',
                    textColor: '#00ff00',
                    timestamp: serverTimestamp(),
                    type: 'system',
                    isGuest: false,
                    role: 'system',
                    firebaseUid: null
                };
                
                const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
                await push(messagesRef, systemMessageData);
                return;
            } else {
                throw new Error(commandResult.message);
            }
        }
    }
    
    const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
    
    // Validar datos antes de enviar
    const messageData = {
        text: text || '',
        userId: currentUser.userId || 'unknown',
        userName: currentUser.username || 'Usuario',
        userAvatar: currentUser.avatar || 'images/profileuser.jpg',
        textColor: currentUser.textColor || '#ffffff',
        timestamp: serverTimestamp(),
        type: type,
        isGuest: currentUser.isGuest || false,
        role: currentUser.role || 'Usuario',
        firebaseUid: currentUser.firebaseUid || null
    };
    
    // Añadir datos de imagen si es tipo imagen o emote
    if ((type === 'image' || type === 'emote') && imageData) {
        messageData.imageData = imageData;
        console.log('Added imageData to message');
    }
    
    // Añadir datos de audio
    if (type === 'audio' && imageData) {
        messageData.audioData = imageData;
        messageData.audioDuration = audioDuration || 0;
    }
    
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

// Limit messages to 50 per room
async function limitMessages() {
    const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
    const snapshot = await get(messagesRef);
    
    if (snapshot.exists()) {
        const messages = Object.keys(snapshot.val());
        if (messages.length > 50) {
            // Remove oldest messages
            const messagesToRemove = messages.slice(0, messages.length - 50);
            messagesToRemove.forEach(messageId => {
                remove(ref(database, `rooms/${currentRoom}/messages/${messageId}`));
            });
        }
    }
}

let currentMessagesListener = null;
let activeRoom = null;

export function listenToMessages(callback) {
    // Limpiar listener anterior si existe
    if (currentMessagesListener) {
        currentMessagesListener();
    }
    
    activeRoom = currentRoom;
    const messagesRef = dbQuery(ref(database, `rooms/${currentRoom}/messages`), limitToLast(50));
    currentMessagesListener = onValue(messagesRef, (snapshot) => {
        // Solo procesar si seguimos en la misma sala
        if (activeRoom !== currentRoom) return;
        
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        callback(messages);
    });
    
    return currentMessagesListener;
}

// Detectar tipo de dispositivo
function getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) return 'mobile';
    return 'desktop';
}

// Funciones para usuarios conectados
export function setUserOnline() {
    const sanitizedUserId = sanitizeUserId(currentUser.userId);
    const userRef = ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}`);
    const userStatusRef = ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}/status`);
    const deviceType = getDeviceType();
    
    // Asegurar que todos los campos requeridos tengan valores válidos
    const userData = {
        name: currentUser.username || 'Usuario',
        avatar: currentUser.avatar || 'images/profileuser.jpg',
        status: 'online',
        lastSeen: serverTimestamp(),
        role: currentUser.role || 'user',
        textColor: currentUser.textColor || '#ffffff',
        description: currentUser.description || 'Sin descripción',
        isGuest: currentUser.isGuest || false,
        createdAt: currentUser.createdAt || new Date().toISOString(),
        deviceType: deviceType,
        firebaseUid: currentUser.firebaseUid || null
    };
    
    // Verificar que no hay valores undefined
    Object.keys(userData).forEach(key => {
        if (userData[key] === undefined || userData[key] === null) {
            console.warn(`Campo ${key} es undefined, usando valor por defecto`);
            if (key === 'name') userData[key] = 'Usuario';
            else if (key === 'avatar') userData[key] = 'images/profileuser.jpg';
            else if (key === 'textColor') userData[key] = '#ffffff';
            else if (key === 'description') userData[key] = 'Sin descripción';
            else if (key === 'role') userData[key] = 'user';
            else userData[key] = '';
        }
    });
    
    set(userRef, userData);
    
    // Actualizar contador de dispositivos
    updateDeviceCount(deviceType, 1);
    
    if (currentUser.isGuest) {
        onDisconnect(userRef).remove();
    } else {
        onDisconnect(userStatusRef).set('offline');
    }
}

// Actualizar contador de dispositivos
function updateDeviceCount(deviceType, increment) {
    const deviceCountRef = ref(database, `deviceCounts/${deviceType}`);
    set(deviceCountRef, serverTimestamp()); // Trigger para contar
}

// Escuchar contadores de dispositivos globales
export function listenToDeviceCounts(callback) {
    const allUsersRef = ref(database, 'rooms');
    return onValue(allUsersRef, (snapshot) => {
        const globalCounts = { desktop: 0, mobile: 0, tablet: 0 };
        
        snapshot.forEach((roomSnapshot) => {
            const usersData = roomSnapshot.child('users').val();
            if (usersData) {
                Object.values(usersData).forEach(userData => {
                    if (userData.status === 'online') {
                        const deviceType = userData.deviceType || 'desktop';
                        globalCounts[deviceType]++;
                    }
                });
            }
        });
        
        callback(globalCounts);
    });
}

let previousUsers = new Map(); // Cambiar a Map para almacenar datos del usuario
let roomUserListeners = new Map(); // Para manejar listeners por sala

export function listenToUsers(callback) {
    const usersRef = ref(database, `rooms/${currentRoom}/users`);
    
    // Limpiar listener anterior si existe
    if (roomUserListeners.has(currentRoom)) {
        roomUserListeners.get(currentRoom)();
    }
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
        const users = [];
        const currentUsers = new Map();
        const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
        
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData.status === 'online') {
                const userId = childSnapshot.key;
                currentUsers.set(userId, userData);
                
                // Contar dispositivos
                const deviceType = userData.deviceType || 'desktop';
                deviceCounts[deviceType]++;
                
                // Actualizar rol basado en datos existentes
                let userRole = userData.role || 'Usuario';
                if (userData.isGuest) {
                    userRole = 'guest';
                }
                
                users.push({
                    id: userId,
                    ...userData,
                    role: userRole,
                    firebaseUid: userData.firebaseUid || null
                });
                
                // Notificar si es un nuevo usuario (solo si no es el primer carga)
                if (!previousUsers.has(userId) && previousUsers.size > 0) {
                    showJoinNotification(userData.name || 'Usuario');
                }
            }
        });
        
        // Detectar usuarios que se fueron y enviar notificación
        if (previousUsers.size > 0) {
            previousUsers.forEach((userData, userId) => {
                if (!currentUsers.has(userId)) {
                    showLeaveNotification(userData.name || 'Usuario');
                }
            });
        }
        
        previousUsers = currentUsers;
        callback(users, deviceCounts);
    });
    
    // Guardar el listener para poder limpiarlo después
    roomUserListeners.set(currentRoom, unsubscribe);
    
    return unsubscribe;
}

// Notificación flotante para conexión (no se usa, se maneja en script.js)
function showJoinNotification(username) {
    // Desactivado - se maneja en script.js
}

// Notificación flotante para desconexión (no se usa, se maneja en script.js)
function showLeaveNotification(username) {
    // Desactivado - se maneja en script.js
}

// Mostrar notificación flotante temporal
function showFloatingNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `floating-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export function changeRoom(roomName, isInitialJoin = false) {
    // Limpiar estado del usuario en la sala anterior
    if (currentRoom && currentRoom !== roomName) {
        const sanitizedUserId = sanitizeUserId(currentUser.userId);
        const oldUserRef = ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}`);
        
        // Registrar evento de cambio de sala
        const roomEventRef = ref(database, 'roomEvents');
        push(roomEventRef, {
            userId: currentUser.userId,
            username: currentUser.username,
            fromRoom: currentRoom,
            toRoom: roomName,
            timestamp: serverTimestamp(),
            type: 'room-change'
        });
        
        if (currentUser.isGuest) {
            remove(oldUserRef);
        } else {
            set(ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}/status`), 'offline');
        }
    } else if (isInitialJoin) {
        // Primera entrada al chat - registrar como join
        const roomEventRef = ref(database, 'roomEvents');
        push(roomEventRef, {
            userId: currentUser.userId,
            username: currentUser.username,
            toRoom: roomName,
            timestamp: serverTimestamp(),
            type: 'join'
        });
    }
    
    currentRoom = roomName;
    previousUsers.clear();
    
    roomUserListeners.forEach((unsubscribe, room) => {
        if (room !== roomName) {
            unsubscribe();
            roomUserListeners.delete(room);
        }
    });
    
    updateURL(roomName);
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
        
        // Agregar timestamp de última actualización
        cleanUpdates.lastUpdated = new Date().toISOString();
        
        if (Object.keys(cleanUpdates).length === 1) { // Solo lastUpdated
            console.warn('No hay actualizaciones válidas para procesar');
            return false;
        }
        
        if (currentUser.isGuest) {
            // Para usuarios invitados, usar colección guests
            try {
                await setDoc(doc(db, 'guests', currentUser.userId), {
                    ...cleanUpdates,
                    userId: currentUser.userId,
                    isGuest: true,
                    createdAt: currentUser.createdAt || new Date().toISOString()
                }, { merge: true });
            } catch (error) {
                console.warn('No se pudo actualizar Firestore para invitado:', error);
                // Continuar sin error para invitados
            }
        } else {
            // Para usuarios registrados, usar firebaseUid como ID de documento
            const userDocRef = doc(db, 'users', currentUser.firebaseUid);
            await setDoc(userDocRef, {
                ...cleanUpdates,
                firebaseUid: currentUser.firebaseUid,
                isGuest: false,
                createdAt: currentUser.createdAt || new Date().toISOString()
            }, { merge: true });
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

// Enviar imagen
export async function sendImage(file) {
    if (!file) throw new Error('No se seleccionó archivo');
    if (file.size > 5 * 1024 * 1024) throw new Error('La imagen debe ser menor a 5MB');
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            sendMessage('', 'image', reader.result)
                .then(resolve)
                .catch(reject);
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

// Enviar audio
export async function sendAudio(audioData, duration) {
    if (!audioData) throw new Error('No hay audio para enviar');
    return sendMessage('', 'audio', audioData, duration);
}

// Funciones de typing status
export function setTypingStatus(isTyping) {
    const sanitizedUserId = sanitizeUserId(currentUser.userId);
    const typingRef = ref(database, `rooms/${currentRoom}/typing/${sanitizedUserId}`);
    
    if (isTyping) {
        set(typingRef, {
            userName: currentUser.username || 'Usuario',
            timestamp: serverTimestamp()
        });
    } else {
        remove(typingRef);
    }
}

let currentTypingListener = null;

export function listenToTyping(callback) {
    // Limpiar listener anterior si existe
    if (currentTypingListener) {
        currentTypingListener();
    }
    
    const typingRef = ref(database, `rooms/${currentRoom}/typing`);
    currentTypingListener = onValue(typingRef, (snapshot) => {
        const typingUsers = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const userId = childSnapshot.key;
            // No mostrar si es el usuario actual
            if (userId !== sanitizeUserId(currentUser.userId)) {
                typingUsers.push(data.userName);
            }
        });
        callback(typingUsers);
    });
    
    return currentTypingListener;
}

// Función para cambiar contraseña
export async function changePassword(newPassword) {
    if (currentUser.isGuest) {
        throw new Error('Los usuarios invitados no pueden cambiar contraseña');
    }
    
    try {
        const { getAuth, updatePassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const auth = getAuth();
        
        if (auth.currentUser) {
            await updatePassword(auth.currentUser, newPassword);
            return true;
        } else {
            throw new Error('Usuario no autenticado');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
}

// Función para eliminar mensaje (mejorada con permisos)
export async function deleteMessage(messageId, messageData = null) {
    try {
        // Verificar permisos
        if (currentUser.firebaseUid && !currentUser.isGuest) {
            const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
            const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
            const isOwner = messageData && messageData.firebaseUid === currentUser.firebaseUid;
            
            if (!isAdmin && !isModerator && !isOwner) {
                throw new Error('No tienes permisos para eliminar este mensaje');
            }
        }
        
        const messageRef = ref(database, `rooms/${currentRoom}/messages/${messageId}`);
        await remove(messageRef);
        return true;
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
}

// Verificar si el usuario es administrador
export async function checkAdminStatus(userId) {
    if (!userId || currentUser.isGuest) return false;
    
    try {
        const adminDoc = await getDoc(doc(db, 'admins', userId));
        return adminDoc.exists();
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Verificar si el usuario es moderador
export async function checkModeratorStatus(userId) {
    if (!userId || currentUser.isGuest) return false;
    
    try {
        const moderatorDoc = await getDoc(doc(db, 'moderators', userId));
        return moderatorDoc.exists();
    } catch (error) {
        console.error('Error checking moderator status:', error);
        return false;
    }
}

// Verificar si el usuario está baneado (por ID o IP)
export async function checkBannedStatus(userId, userIP = null) {
    if (!userId) return false;
    
    try {
        // Verificar baneo por ID
        const bannedDoc = await getDoc(doc(db, 'banned', userId));
        if (bannedDoc.exists()) {
            const banData = bannedDoc.data();
            
            if (banData.expiresAt) {
                const expiresAt = new Date(banData.expiresAt);
                if (expiresAt < new Date()) {
                    await deleteDoc(doc(db, 'banned', userId));
                    if (banData.ip && banData.ip !== 'unknown') {
                        await deleteDoc(doc(db, 'bannedIPs', banData.ip.replace(/\./g, '_')));
                    }
                    return false;
                }
            }
            
            return banData;
        }
        
        // Verificar baneo por IP
        if (userIP) {
            const ipDoc = await getDoc(doc(db, 'bannedIPs', userIP.replace(/\./g, '_')));
            if (ipDoc.exists()) {
                const banData = ipDoc.data();
                
                if (banData.expiresAt) {
                    const expiresAt = new Date(banData.expiresAt);
                    if (expiresAt < new Date()) {
                        await deleteDoc(doc(db, 'bannedIPs', userIP.replace(/\./g, '_')));
                        return false;
                    }
                }
                
                return banData;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error checking banned status:', error);
        return false;
    }
}

// Obtener nombre de sala por ID
export async function getRoomName(roomId) {
    try {
        const roomDoc = await getDoc(doc(db, 'rooms', roomId));
        if (roomDoc.exists()) {
            return roomDoc.data().name;
        }
        return roomId === 'general' ? 'Sala General' : roomId;
    } catch (error) {
        return roomId;
    }
}

// Crear sala nueva (administradores y moderadores)
export async function createRoom(roomName) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden crear salas');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isModerator) {
        throw new Error('Solo administradores y moderadores pueden crear salas');
    }
    
    if (roomName.length > 10) {
        throw new Error('El nombre de la sala no puede tener más de 10 caracteres');
    }
    
    try {
        const roomId = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
        await setDoc(doc(db, 'rooms', roomId), {
            name: roomName,
            createdBy: currentUser.firebaseUid,
            createdAt: new Date().toISOString(),
            isActive: true
        });
        
        // Crear estructura inicial en Realtime Database
        const roomRef = ref(database, `rooms/${roomId}`);
        await set(roomRef, {
            name: roomName,
            createdBy: currentUser.firebaseUid,
            createdAt: serverTimestamp()
        });
        
        return roomId;
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
}

// Borrar sala (solo administradores)
export async function deleteRoom(roomName) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden borrar salas');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    if (!isAdmin) {
        throw new Error('Solo administradores pueden borrar salas');
    }
    
    try {
        const roomId = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // No permitir borrar la sala general
        if (roomId === 'general') {
            throw new Error('No se puede borrar la sala general');
        }
        
        // Notificar a usuarios en la sala antes de borrar
        const usersRef = ref(database, `rooms/${roomId}/users`);
        const usersSnapshot = await get(usersRef);
        
        if (usersSnapshot.exists()) {
            // Enviar mensaje de sistema a la sala antes de borrar
            const systemMessageData = {
                text: '⚠️ Esta sala ha sido eliminada. Serás redirigido a la Sala General.',
                userId: 'system',
                userName: 'Sistema',
                userAvatar: 'images/logo.svg',
                textColor: '#ff4444',
                timestamp: serverTimestamp(),
                type: 'system',
                isGuest: false,
                role: 'system',
                firebaseUid: null,
                roomDeleted: true
            };
            
            const messagesRef = ref(database, `rooms/${roomId}/messages`);
            await push(messagesRef, systemMessageData);
        }
        
        // Esperar un momento para que los usuarios vean el mensaje
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Borrar de Firestore
        await deleteDoc(doc(db, 'rooms', roomId));
        
        // Borrar de Realtime Database
        const roomRef = ref(database, `rooms/${roomId}`);
        await remove(roomRef);
        
        return true;
    } catch (error) {
        console.error('Error deleting room:', error);
        throw error;
    }
}

// Obtener IP del usuario
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

// Banear usuario por ID y IP (incluye invitados)
export async function banUser(userId, reason = 'Violación de reglas', duration = null) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden banear');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isModerator) {
        throw new Error('Solo administradores y moderadores pueden banear usuarios');
    }
    
    try {
        let userIP = 'unknown';
        
        // Intentar obtener IP de usuarios registrados
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            userIP = userDoc.data().ip || 'unknown';
        } else {
            // Intentar obtener IP de invitados
            const guestDoc = await getDoc(doc(db, 'guests', userId));
            if (guestDoc.exists()) {
                userIP = guestDoc.data().ip || 'unknown';
            }
        }
        
        const banData = {
            bannedBy: currentUser.firebaseUid,
            bannedByName: currentUser.username,
            reason: reason,
            bannedAt: new Date().toISOString(),
            ip: userIP
        };
        
        if (duration) {
            banData.expiresAt = new Date(Date.now() + duration).toISOString();
        }
        
        // Banear por userId (funciona para registrados e invitados)
        await setDoc(doc(db, 'banned', userId), banData);
        
        // Banear por IP
        if (userIP !== 'unknown') {
            await setDoc(doc(db, 'bannedIPs', userIP.replace(/\./g, '_')), {
                ...banData,
                userId: userId
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error banning user:', error);
        throw error;
    }
}

// Mutear usuario temporalmente (incluye invitados)
export async function muteUser(userId, duration = 5 * 60 * 1000) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden mutear');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isModerator) {
        throw new Error('Solo administradores y moderadores pueden mutear usuarios');
    }
    
    try {
        // Funciona tanto para usuarios registrados como invitados
        await setDoc(doc(db, 'muted', userId), {
            mutedBy: currentUser.firebaseUid,
            mutedByName: currentUser.username,
            mutedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + duration).toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error muting user:', error);
        throw error;
    }
}

// Verificar si usuario está muteado
export async function checkMutedStatus(userId) {
    if (!userId) return false;
    
    try {
        const mutedDoc = await getDoc(doc(db, 'muted', userId));
        if (!mutedDoc.exists()) return false;
        
        const muteData = mutedDoc.data();
        const expiresAt = new Date(muteData.expiresAt);
        
        if (expiresAt < new Date()) {
            await deleteDoc(doc(db, 'muted', userId));
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking muted status:', error);
        return false;
    }
}

// Obtener lista de usuarios muteados (incluye invitados)
export async function getMutedUsersList() {
    try {
        const mutedSnapshot = await getDocs(collection(db, 'muted'));
        const mutedUsers = [];
        let index = 1;
        
        for (const docSnapshot of mutedSnapshot.docs) {
            const muteData = docSnapshot.data();
            const userId = docSnapshot.id;
            
            // Verificar si aún está muteado
            const expiresAt = new Date(muteData.expiresAt);
            if (expiresAt < new Date()) continue;
            
            let username = 'Usuario desconocido';
            let isGuest = false;
            
            try {
                // Intentar obtener de usuarios registrados
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    username = userDoc.data().username || 'Usuario';
                } else {
                    // Intentar obtener de invitados
                    const guestDoc = await getDoc(doc(db, 'guests', userId));
                    if (guestDoc.exists()) {
                        username = guestDoc.data().username || 'Invitado';
                        isGuest = true;
                    }
                }
            } catch (error) {
                console.error('Error getting username:', error);
            }
            
            mutedUsers.push({
                numId: index++,
                firebaseUid: userId,
                username: isGuest ? `${username} (invitado)` : username
            });
        }
        
        return mutedUsers;
    } catch (error) {
        console.error('Error getting muted users:', error);
        return [];
    }
}

// Desmutear usuario
export async function unmuteUser(userId) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden desmutear');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isMod = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isMod) {
        throw new Error('Solo administradores y moderadores pueden desmutear');
    }
    
    try {
        await deleteDoc(doc(db, 'muted', userId));
        return true;
    } catch (error) {
        console.error('Error unmuting user:', error);
        throw error;
    }
}

// Obtener lista de usuarios baneados (incluye invitados)
export async function getBannedUsersList() {
    try {
        const bannedSnapshot = await getDocs(collection(db, 'banned'));
        const bannedUsers = [];
        let index = 1;
        
        for (const docSnapshot of bannedSnapshot.docs) {
            const banData = docSnapshot.data();
            const userId = docSnapshot.id;
            
            let username = 'Usuario desconocido';
            let isGuest = false;
            
            try {
                // Intentar obtener de usuarios registrados
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    username = userDoc.data().username || 'Usuario';
                } else {
                    // Intentar obtener de invitados
                    const guestDoc = await getDoc(doc(db, 'guests', userId));
                    if (guestDoc.exists()) {
                        username = guestDoc.data().username || 'Invitado';
                        isGuest = true;
                    }
                }
            } catch (error) {
                console.error('Error getting username:', error);
            }
            
            bannedUsers.push({
                numId: index++,
                firebaseUid: userId,
                username: isGuest ? `${username} (invitado)` : username,
                reason: banData.reason || 'No especificada',
                bannedAt: banData.bannedAt
            });
        }
        
        return bannedUsers;
    } catch (error) {
        console.error('Error getting banned users:', error);
        return [];
    }
}

// Desbanear usuario (solo administradores)
export async function unbanUser(userId) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden desbanear');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    if (!isAdmin) {
        throw new Error('Solo administradores pueden desbanear usuarios');
    }
    
    try {
        // Obtener datos del baneo para eliminar IP
        const bannedDoc = await getDoc(doc(db, 'banned', userId));
        if (bannedDoc.exists()) {
            const banData = bannedDoc.data();
            if (banData.ip && banData.ip !== 'unknown') {
                await deleteDoc(doc(db, 'bannedIPs', banData.ip.replace(/\./g, '_')));
            }
        }
        
        await deleteDoc(doc(db, 'banned', userId));
        return true;
    } catch (error) {
        console.error('Error unbanning user:', error);
        throw error;
    }
}

// Dar permisos de moderador (solo administradores)
export async function grantModeratorRole(userId) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden otorgar permisos');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    if (!isAdmin) {
        throw new Error('Solo administradores pueden otorgar permisos de moderador');
    }
    
    try {
        // Verificar si el documento del usuario existe
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            throw new Error(`El usuario con UID ${userId} no existe`);
        }

        // Agregar el usuario a la colección `moderators`
        await setDoc(doc(db, 'moderators', userId), {
            grantedBy: currentUser.firebaseUid,
            grantedAt: new Date().toISOString()
        });
        
        // Actualizar rol en el documento del usuario
        await updateDoc(userDocRef, {
            role: 'Moderador'
        });
        
        return true;
    } catch (error) {
        console.error('Error granting moderator role:', error);
        throw error;
    }
}

// Quitar permisos de moderador (solo administradores)
export async function revokeModerator(userId) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden revocar permisos');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    if (!isAdmin) {
        throw new Error('Solo administradores pueden revocar permisos de moderador');
    }
    
    try {
        // Eliminar el usuario de la colección `moderators`
        await deleteDoc(doc(db, 'moderators', userId));
        
        // Actualizar rol en el documento del usuario
        await updateDoc(doc(db, 'users', userId), {
            role: 'Usuario'
        });
        
        return true;
    } catch (error) {
        console.error('Error revoking moderator role:', error);
        throw error;
    }
}

// Fijar mensaje (solo administradores y moderadores)
export async function pinMessage(messageId, messageData) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden fijar mensajes');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isModerator) {
        throw new Error('Solo administradores y moderadores pueden fijar mensajes');
    }
    
    try {
        await setDoc(doc(db, 'pinnedMessages', messageId), {
            ...messageData,
            pinnedBy: currentUser.firebaseUid,
            pinnedAt: new Date().toISOString(),
            room: currentRoom
        });
        
        return true;
    } catch (error) {
        console.error('Error pinning message:', error);
        throw error;
    }
}

// Desfijar mensaje (solo administradores y moderadores)
export async function unpinMessage(messageId) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden desfijar mensajes');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isModerator) {
        throw new Error('Solo administradores y moderadores pueden desfijar mensajes');
    }
    
    try {
        await deleteDoc(doc(db, 'pinnedMessages', messageId));
        return true;
    } catch (error) {
        console.error('Error unpinning message:', error);
        throw error;
    }
}

// Obtener mensajes fijados
export async function getPinnedMessages(roomName = currentRoom) {
    try {
        const q = fsQuery(collection(db, 'pinnedMessages'), where('room', '==', roomName));
        const querySnapshot = await getDocs(q);
        const pinnedMessages = [];
        
        querySnapshot.forEach((doc) => {
            pinnedMessages.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return pinnedMessages;
    } catch (error) {
        console.error('Error getting pinned messages:', error);
        return [];
    }
}

// Obtener lista de usuarios conectados con ID numérico (incluye invitados)
export async function getConnectedUsersList() {
    try {
        const usersRef = ref(database, `rooms/${currentRoom}/users`);
        const snapshot = await get(usersRef);
        const users = [];
        
        if (snapshot.exists()) {
            let index = 1;
            snapshot.forEach((childSnapshot) => {
                const userData = childSnapshot.val();
                if (userData.status === 'online') {
                    users.push({
                        numId: index++,
                        userId: childSnapshot.key,
                        username: userData.name,
                        firebaseUid: userData.firebaseUid || childSnapshot.key,
                        isGuest: userData.isGuest || false
                    });
                }
            });
        }
        
        return users;
    } catch (error) {
        console.error('Error getting users list:', error);
        return [];
    }
}

// Procesar comandos de administrador
export async function processAdminCommand(message) {
    if (!message.startsWith('!')) return false;
    
    const parts = message.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Verificar permisos para comandos de moderación
    const needsModPermission = ['!ban', '!mute', '!unban', '!unmute'].includes(command);
    if (needsModPermission) {
        const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
        const isMod = await checkModeratorStatus(currentUser.firebaseUid);
        if (!isAdmin && !isMod) {
            return false;
        }
    }
    
    try {
        switch (command) {
            case '!anuncio':
                const isAdminAnuncio = await checkAdminStatus(currentUser.firebaseUid);
                const isModAnuncio = await checkModeratorStatus(currentUser.firebaseUid);
                if (!isAdminAnuncio && !isModAnuncio) {
                    throw new Error('Solo administradores y moderadores pueden enviar anuncios');
                }
                if (args.length === 0) {
                    throw new Error('Uso: !anuncio <mensaje>');
                }
                const announcement = args.join(' ');
                await sendAnnouncement(announcement);
                return { success: true, message: 'Anuncio enviado a todas las salas' };
                
            case '!crearsala':
                if (args.length === 0) {
                    throw new Error('Uso: !crearsala <nombre>');
                }
                const roomName = args.join(' ');
                const isAdminSala = await checkAdminStatus(currentUser.firebaseUid);
                const isModSala = await checkModeratorStatus(currentUser.firebaseUid);
                if (!isAdminSala && !isModSala) {
                    throw new Error('Solo administradores y moderadores pueden crear salas');
                }
                await createRoom(roomName);
                return { success: true, message: `Sala "${roomName}" creada exitosamente` };
                
            case '!borrar':
                if (args.length === 0) {
                    throw new Error('Uso: !borrar <nombre_sala>');
                }
                const roomToDelete = args.join(' ');
                await deleteRoom(roomToDelete);
                return { success: true, message: `Sala "${roomToDelete}" eliminada exitosamente` };
                
            case '!ban':
                if (args.length === 0) {
                    const users = await getConnectedUsersList();
                    if (users.length === 0) {
                        return { success: true, message: 'No hay usuarios disponibles para banear', privateMessage: true };
                    }
                    let userList = '📋 Lista de usuarios:\n';
                    users.forEach(u => {
                        userList += `${u.numId}. ${u.username}\n`;
                    });
                    userList += '\nUso: !ban <número> [razón]';
                    return { success: true, message: userList, privateMessage: true };
                }
                
                const banNumId = parseInt(args[0]);
                if (isNaN(banNumId)) {
                    throw new Error('ID de usuario inválido');
                }
                
                const users = await getConnectedUsersList();
                const targetUser = users.find(u => u.numId === banNumId);
                
                if (!targetUser) {
                    throw new Error('Usuario no encontrado');
                }
                

                
                const banReason = args.slice(1).join(' ') || 'Violación de reglas';
                await banUser(targetUser.firebaseUid, banReason);
                return { success: true, message: `Usuario ${targetUser.username} baneado` };
                
            case '!mute':
                if (args.length === 0) {
                    const users = await getConnectedUsersList();
                    if (users.length === 0) {
                        return { success: true, message: 'No hay usuarios disponibles para mutear', privateMessage: true };
                    }
                    let userList = '📋 Lista de usuarios:\n';
                    users.forEach(u => {
                        userList += `${u.numId}. ${u.username}\n`;
                    });
                    userList += '\nUso: !mute <número> [minutos]';
                    return { success: true, message: userList, privateMessage: true };
                }
                
                const muteNumId = parseInt(args[0]);
                if (isNaN(muteNumId)) {
                    throw new Error('ID de usuario inválido');
                }
                
                const muteUsers = await getConnectedUsersList();
                const targetMuteUser = muteUsers.find(u => u.numId === muteNumId);
                
                if (!targetMuteUser) {
                    throw new Error('Usuario no encontrado');
                }
                

                
                const muteDuration = parseInt(args[1]) || 5;
                await muteUser(targetMuteUser.firebaseUid, muteDuration * 60 * 1000);
                return { success: true, message: `Usuario ${targetMuteUser.username} muteado por ${muteDuration} minutos` };
                
            case '!unmute':
                if (args.length === 0) {
                    const mutedUsers = await getMutedUsersList();
                    if (mutedUsers.length === 0) {
                        return { success: true, message: 'No hay usuarios muteados', privateMessage: true };
                    }
                    let muteList = '📋 Usuarios muteados:\n';
                    mutedUsers.forEach(u => {
                        muteList += `${u.numId}. ${u.username}\n`;
                    });
                    muteList += '\nUso: !unmute <número>';
                    return { success: true, message: muteList, privateMessage: true };
                }
                
                const unmuteNumId = parseInt(args[0]);
                if (isNaN(unmuteNumId)) {
                    throw new Error('ID de usuario inválido');
                }
                
                const mutedUsers = await getMutedUsersList();
                const targetUnmuteUser = mutedUsers.find(u => u.numId === unmuteNumId);
                
                if (!targetUnmuteUser) {
                    throw new Error('Usuario no encontrado en lista de muteados');
                }
                
                await unmuteUser(targetUnmuteUser.firebaseUid);
                return { success: true, message: `Usuario ${targetUnmuteUser.username} desmuteado` };
                
            case '!unban':
                if (args.length === 0) {
                    const bannedUsers = await getBannedUsersList();
                    if (bannedUsers.length === 0) {
                        return { success: true, message: 'No hay usuarios baneados', privateMessage: true };
                    }
                    let userList = '📋 Usuarios baneados:\n';
                    bannedUsers.forEach(u => {
                        userList += `${u.numId}. ${u.username} - ${u.reason}\n`;
                    });
                    userList += '\nUso: !unban <número>';
                    return { success: true, message: userList, privateMessage: true };
                }
                
                const unbanNumId = parseInt(args[0]);
                if (isNaN(unbanNumId)) {
                    throw new Error('ID de usuario inválido');
                }
                
                const bannedUsers = await getBannedUsersList();
                const targetUnbanUser = bannedUsers.find(u => u.numId === unbanNumId);
                
                if (!targetUnbanUser) {
                    throw new Error('Usuario no encontrado en lista de baneados');
                }
                
                await unbanUser(targetUnbanUser.firebaseUid);
                return { success: true, message: `Usuario ${targetUnbanUser.username} desbaneado` };
                
            case '!borrarchat':
                await clearRoomMessages();
                return { success: true, message: 'Historial de chat eliminado' };
                
            default:
                return false;
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Enviar anuncio a todas las salas
async function sendAnnouncement(message) {
    try {
        const announcementRef = ref(database, 'globalAnnouncements');
        await push(announcementRef, {
            message: message,
            timestamp: serverTimestamp(),
            sentBy: currentUser.firebaseUid || currentUser.userId
        });
    } catch (error) {
        console.error('Error sending announcement:', error);
        throw error;
    }
}

// Escuchar anuncios globales
export function listenToAnnouncements(callback) {
    const announcementsRef = ref(database, 'globalAnnouncements');
    return onValue(announcementsRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const announcement = childSnapshot.val();
            callback(announcement.message);
            // Eliminar el anuncio después de mostrarlo
            remove(ref(database, `globalAnnouncements/${childSnapshot.key}`));
        });
    });
}

// Mostrar anuncio en centro de pantalla
export function showAnnouncement(message) {
    const announcement = document.createElement('div');
    announcement.className = 'announcement-overlay';
    announcement.innerHTML = `
        <div class="announcement-box">
            <div class="announcement-text">${message}</div>
        </div>
    `;
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.classList.add('show'), 100);
    
    setTimeout(() => {
        announcement.classList.remove('show');
        setTimeout(() => announcement.remove(), 500);
    }, 5000);
}

// Actualizar rol del usuario y obtener datos de Firestore
export async function updateUserRole() {
    if (currentUser.isGuest) {
        // Para invitados, asegurar que tengan rol de guest
        currentUser.role = 'guest';
        currentUser.isAdmin = false;
        currentUser.isModerator = false;
        currentUser.isBanned = false;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        return;
    }
    
    if (currentUser.firebaseUid) {
        try {
            const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
            const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
            const isBanned = await checkBannedStatus(currentUser.firebaseUid);
            
            if (isBanned) {
                currentUser.role = 'banned';
                currentUser.isBanned = true;
            } else if (isAdmin) {
                currentUser.role = 'Administrador';
                currentUser.isAdmin = true;
            } else if (isModerator) {
                currentUser.role = 'Moderador';
                currentUser.isModerator = true;
            } else {
                currentUser.role = 'Usuario';
            }
            
            // Obtener createdAt desde Firestore
            try {
                const userDoc = await getDoc(doc(db, 'users', currentUser.firebaseUid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.createdAt) {
                        currentUser.createdAt = userData.createdAt;
                    }
                }
            } catch (error) {
                console.error('Error getting user data:', error);
            }
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } catch (error) {
            console.error('Error updating user role:', error);
        }
    }
}

// Borrar todos los mensajes de la sala actual (solo administradores)
export async function clearRoomMessages() {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden borrar el chat');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isModerator) {
        throw new Error('Solo administradores y moderadores pueden borrar el chat');
    }
    
    try {
        const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
        await remove(messagesRef);
        return true;
    } catch (error) {
        console.error('Error clearing room messages:', error);
        throw error;
    }
}

// Obtener todas las salas disponibles con conteo de usuarios
export async function getRooms() {
    try {
        const roomsSnapshot = await getDocs(collection(db, 'rooms'));
        const rooms = [];
        
        roomsSnapshot.forEach((doc) => {
            const roomData = doc.data();
            if (roomData.isActive !== false) {
                rooms.push({
                    id: doc.id,
                    name: roomData.name,
                    createdBy: roomData.createdBy,
                    createdAt: roomData.createdAt
                });
            }
        });
        
        // Asegurar que la sala general siempre esté presente
        const hasGeneral = rooms.some(room => room.id === 'general');
        if (!hasGeneral) {
            rooms.unshift({
                id: 'general',
                name: 'Sala General',
                createdBy: 'system',
                createdAt: new Date().toISOString()
            });
        }
        
        // Obtener conteo de usuarios para cada sala
        for (const room of rooms) {
            try {
                const usersRef = ref(database, `rooms/${room.id}/users`);
                const snapshot = await get(usersRef);
                let userCount = 0;
                
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        if (userData.status === 'online') {
                            userCount++;
                        }
                    });
                }
                
                room.userCount = userCount;
            } catch (error) {
                room.userCount = 0;
            }
        }
        
        return rooms;
    } catch (error) {
        console.error('Error getting rooms:', error);
        return [{
            id: 'general',
            name: 'Sala General',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            userCount: 0
        }];
    }
}

// Escuchar cambios en salas en tiempo real
export function listenToRooms(callback) {
    const roomsRef = collection(db, 'rooms');
    return onSnapshot(roomsRef, (snapshot) => {
        const rooms = [];
        snapshot.forEach((doc) => {
            const roomData = doc.data();
            if (roomData.isActive !== false) {
                rooms.push({
                    id: doc.id,
                    name: roomData.name,
                    createdBy: roomData.createdBy,
                    createdAt: roomData.createdAt
                });
            }
        });
        callback(rooms);
    });
}

// Escuchar cambios en estado de baneo/mute del usuario actual (incluye invitados)
export function listenToUserStatus(callback) {
    const userId = currentUser.firebaseUid || currentUser.userId;
    if (!userId) return;
    
    const bannedRef = doc(db, 'banned', userId);
    const mutedRef = doc(db, 'muted', userId);
    
    const unsubscribeBanned = onSnapshot(bannedRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ type: 'banned', data: snapshot.data() });
        }
    });
    
    const unsubscribeMuted = onSnapshot(mutedRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ type: 'muted', data: snapshot.data() });
        } else {
            callback({ type: 'unmuted' });
        }
    });
    
    return () => {
        unsubscribeBanned();
        unsubscribeMuted();
    };
}

// Obtener conteo de usuarios para una sala específica
export async function getUserCountForRoom(roomId) {
    try {
        const usersRef = ref(database, `rooms/${roomId}/users`);
        const snapshot = await get(usersRef);
        let count = 0;
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const userData = childSnapshot.val();
                if (userData.status === 'online') {
                    count++;
                }
            });
        }
        
        return count;
    } catch (error) {
        console.error(`Error getting user count for room ${roomId}:`, error);
        return 0;
    }
}

export { currentUser, currentRoom, database, db };