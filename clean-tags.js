import { db, database } from './firebase.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, onValue, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Función global para limpiar y corregir todos los tags de rango
export async function cleanAllRankTags() {
    // Obtener roles reales de Firestore
    const usersRoles = new Map();
    
    const [adminsSnapshot, moderatorsSnapshot, developersSnapshot] = await Promise.all([
        getDocs(collection(db, 'admins')),
        getDocs(collection(db, 'moderators')),
        getDocs(collection(db, 'developers'))
    ]);
    
    developersSnapshot.forEach(doc => usersRoles.set(doc.id, 'Desarrollador'));
    adminsSnapshot.forEach(doc => {
        if (!usersRoles.has(doc.id)) usersRoles.set(doc.id, 'Administrador');
    });
    moderatorsSnapshot.forEach(doc => {
        if (!usersRoles.has(doc.id)) usersRoles.set(doc.id, 'Moderador');
    });
    
    // Actualizar roles en Realtime Database
    const roomsRef = ref(database, 'rooms');
    const snapshot = await new Promise(resolve => {
        onValue(roomsRef, resolve, { onlyOnce: true });
    });
    
    if (snapshot.exists()) {
        const updates = {};
        snapshot.forEach(roomSnapshot => {
            const roomId = roomSnapshot.key;
            const usersData = roomSnapshot.child('users').val();
            
            if (usersData) {
                Object.keys(usersData).forEach(userKey => {
                    const user = usersData[userKey];
                    const firebaseUid = user.firebaseUid || userKey;
                    const correctRole = usersRoles.get(firebaseUid) || 'Usuario';
                    
                    // Actualizar rol
                    updates[`rooms/${roomId}/users/${userKey}/role`] = correctRole;
                    updates[`rooms/${roomId}/users/${userKey}/isDeveloper`] = correctRole === 'Desarrollador';
                    updates[`rooms/${roomId}/users/${userKey}/isAdmin`] = correctRole === 'Administrador';
                    updates[`rooms/${roomId}/users/${userKey}/isModerator`] = correctRole === 'Moderador';
                });
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
        }
    }
    
    // Limpiar tags visuales del DOM
    const messages = document.querySelectorAll('.message-container');
    messages.forEach(msg => {
        const header = msg.querySelector('.message-header');
        if (header) {
            header.querySelectorAll('.admin-tag, .mod-tag, .dev-tag').forEach(tag => tag.remove());
        }
    });
}
