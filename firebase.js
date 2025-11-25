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

// Procesar emotes en texto
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
    
    return processedText;
}

// Funciones para mensajes
export async function sendMessage(text, type = 'text', imageData = null) {
    console.log('Sending message:', { text, type, imageData });
    
    // Verificar si el usuario está baneado (solo para usuarios registrados)
    if (!currentUser.isGuest && currentUser.firebaseUid) {
        try {
            const isBanned = await checkBannedStatus(currentUser.firebaseUid);
            if (isBanned) {
                throw new Error('No puedes enviar mensajes porque estás baneado');
            }
        } catch (error) {
            console.warn('No se pudo verificar estado de baneo:', error);
            // Continuar para invitados
        }
    }
    
    // Procesar comandos de administrador
    if (text && text.startsWith('!')) {
        const commandResult = await processAdminCommand(text);
        if (commandResult) {
            if (commandResult.success) {
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

export function listenToMessages(callback) {
    const messagesRef = dbQuery(ref(database, `rooms/${currentRoom}/messages`), limitToLast(50));
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
        deviceType: deviceType
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
                    role: userRole
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

// Función para enviar notificación de usuario que se une como mensaje del sistema
async function showJoinNotification(username) {
    try {
        const systemMessageData = {
            text: `👋 ${username} se unió a la sala`,
            userId: 'system',
            userName: 'Sistema',
            userAvatar: 'images/logo.svg',
            textColor: '#00ff88',
            timestamp: serverTimestamp(),
            type: 'system',
            isGuest: false,
            role: 'system',
            firebaseUid: null
        };
        
        const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
        await push(messagesRef, systemMessageData);
    } catch (error) {
        console.error('Error sending join notification:', error);
    }
}

// Función para enviar notificación de usuario que se va como mensaje del sistema
async function showLeaveNotification(username) {
    try {
        const systemMessageData = {
            text: `👋 ${username} se fue a otra sala`,
            userId: 'system',
            userName: 'Sistema',
            userAvatar: 'images/logo.svg',
            textColor: '#ff8800',
            timestamp: serverTimestamp(),
            type: 'system',
            isGuest: false,
            role: 'system',
            firebaseUid: null
        };
        
        const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
        await push(messagesRef, systemMessageData);
    } catch (error) {
        console.error('Error sending leave notification:', error);
    }
}

export function changeRoom(roomName) {
    // Limpiar estado del usuario en la sala anterior
    if (currentRoom && currentRoom !== roomName) {
        const sanitizedUserId = sanitizeUserId(currentUser.userId);
        const oldUserRef = ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}`);
        
        if (currentUser.isGuest) {
            // Para invitados, eliminar completamente
            remove(oldUserRef);
        } else {
            // Para usuarios registrados, marcar como offline
            set(ref(database, `rooms/${currentRoom}/users/${sanitizedUserId}/status`), 'offline');
        }
    }
    
    currentRoom = roomName;
    previousUsers.clear(); // Limpiar usuarios previos al cambiar sala
    
    // Limpiar listeners de la sala anterior
    roomUserListeners.forEach((unsubscribe, room) => {
        if (room !== roomName) {
            unsubscribe();
            roomUserListeners.delete(room);
        }
    });
    
    // Actualizar URL
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

export function listenToTyping(callback) {
    const typingRef = ref(database, `rooms/${currentRoom}/typing`);
    return onValue(typingRef, (snapshot) => {
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

// Verificar si el usuario está baneado
export async function checkBannedStatus(userId) {
    if (!userId || currentUser.isGuest) return false;
    
    try {
        const bannedDoc = await getDoc(doc(db, 'banned', userId));
        return bannedDoc.exists();
    } catch (error) {
        console.error('Error checking banned status:', error);
        return false;
    }
}

// Crear sala nueva (solo administradores)
export async function createRoom(roomName) {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden crear salas');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    if (!isAdmin) {
        throw new Error('Solo administradores pueden crear salas');
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

// Banear usuario (solo administradores y moderadores)
export async function banUser(userId, reason = 'Violación de reglas') {
    if (!currentUser.firebaseUid || currentUser.isGuest) {
        throw new Error('Solo usuarios registrados pueden banear');
    }
    
    const isAdmin = await checkAdminStatus(currentUser.firebaseUid);
    const isModerator = await checkModeratorStatus(currentUser.firebaseUid);
    
    if (!isAdmin && !isModerator) {
        throw new Error('Solo administradores y moderadores pueden banear usuarios');
    }
    
    try {
        await setDoc(doc(db, 'banned', userId), {
            bannedBy: currentUser.firebaseUid,
            reason: reason,
            bannedAt: new Date().toISOString()
        });
        
        return true;
    } catch (error) {
        console.error('Error banning user:', error);
        throw error;
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

// Procesar comandos de administrador
export async function processAdminCommand(message) {
    if (!message.startsWith('!')) return false;
    
    const parts = message.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    try {
        switch (command) {
            case '!crearsala':
                if (args.length === 0) {
                    throw new Error('Uso: !crearsala <nombre>');
                }
                const roomName = args.join(' ');
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
                    throw new Error('Uso: !ban <userId> [razón]');
                }
                const userToBan = args[0];
                const banReason = args.slice(1).join(' ') || 'Violación de reglas';
                await banUser(userToBan, banReason);
                return { success: true, message: `Usuario ${userToBan} baneado` };
                
            case '!unban':
                if (args.length === 0) {
                    throw new Error('Uso: !unban <userId>');
                }
                const userToUnban = args[0];
                await unbanUser(userToUnban);
                return { success: true, message: `Usuario ${userToUnban} desbaneado` };
                
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

export { currentUser, currentRoom, database, db };