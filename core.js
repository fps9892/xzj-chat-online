// ============================================
// CORE.JS - Archivo unificado de utilidades
// ============================================

// scrollToBottom.js
export function scrollToBottom(chatAreaId) {
    const chatArea = document.getElementById(chatAreaId);
    if (chatArea) {
        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: 'smooth'
        });
    }
}

export function observeChatArea(chatAreaId) {
    const chatArea = document.getElementById(chatAreaId);
    if (chatArea) {
        const observer = new MutationObserver(() => {
            const isUserAtBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 10;
            if (isUserAtBottom) scrollToBottom(chatAreaId);
        });
        observer.observe(chatArea, { childList: true });
    }
}

// chat-enhancements.js
export function animateMessageDeletion(messageElement, callback) {
    if (callback) callback();
    messageElement.remove();
}

// user-profile-service.js
import { db } from './firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export async function getUserProfile(userId, isGuest = false) {
    try {
        let userData = null;
        let isAdmin = false;
        let isModerator = false;
        let isBanned = false;
        let isDeveloper = false;
        
        if (isGuest) {
            const guestDoc = await getDoc(doc(db, 'guests', userId));
            if (guestDoc.exists()) userData = guestDoc.data();
        } else {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                userData = userDoc.data();
                const developerDoc = await getDoc(doc(db, 'developers', userId));
                isDeveloper = developerDoc.exists();
                const adminDoc = await getDoc(doc(db, 'admins', userId));
                isAdmin = adminDoc.exists();
                const moderatorDoc = await getDoc(doc(db, 'moderators', userId));
                isModerator = moderatorDoc.exists();
                const bannedDoc = await getDoc(doc(db, 'banned', userId));
                isBanned = bannedDoc.exists();
            }
        }
        
        if (!userData) return null;
        
        let role = 'Usuario';
        let status = 'Activo';
        
        if (isGuest) role = 'Invitado';
        else if (isBanned) { role = 'Usuario'; status = 'Baneado'; }
        else if (isDeveloper) role = 'Desarrollador';
        else if (isAdmin) role = 'Administrador';
        else if (isModerator) role = 'Moderador';
        
        return {
            id: userId,
            firebaseUid: userData.firebaseUid || userId,
            username: userData.username || 'Usuario',
            description: userData.description || 'Sin descripción',
            country: userData.country || 'No especificado',
            role, status,
            createdAt: userData.createdAt || 'No disponible',
            lastSeen: userData.lastSeen || userData.lastUpdated || 'No disponible',
            avatar: userData.avatar || 'images/profileuser.svg',
            textColor: userData.textColor || '#ffffff',
            messageCount: userData.messageCount || 0,
            level: userData.level || 1,
            wins: userData.wins || 0,
            losses: userData.losses || 0,
            draws: userData.draws || 0,
            isGuest, isAdmin, isModerator, isBanned, isDeveloper
        };
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        return null;
    }
}

export async function findUserByUsername(username) {
    try {
        const usersQuery = query(collection(db, 'users'), where('username', '==', username));
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            return await getUserProfile(userDoc.id, false);
        }
        
        const guestsQuery = query(collection(db, 'guests'), where('username', '==', username));
        const guestsSnapshot = await getDocs(guestsQuery);
        
        if (!guestsSnapshot.empty) {
            const guestDoc = guestsSnapshot.docs[0];
            return await getUserProfile(guestDoc.id, true);
        }
        
        return null;
    } catch (error) {
        console.error('Error buscando usuario:', error);
        return null;
    }
}

// admin-listener.js
import { currentUser } from './firebase.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export function initAdminListener() {
    if (currentUser && !currentUser.isGuest && currentUser.firebaseUid) {
        const adminDocRef = doc(db, 'admins', currentUser.firebaseUid);
        
        onSnapshot(adminDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                currentUser.isAdmin = true;
                currentUser.role = 'Administrador';
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                const adminOnlyElements = document.querySelectorAll('.admin-only');
                adminOnlyElements.forEach(element => {
                    element.style.display = 'flex';
                });
            }
        });
    }
}
