import { db, database, currentUser } from './firebase.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Función profesional para limpiar y corregir todos los tags de rango
export async function cleanAllRankTags() {
    console.log('🔄 Iniciando limpieza completa de tags desde Firestore...');
    
    // 1. Obtener roles reales desde Firestore (fuente de verdad)
    const usersRoles = new Map();
    const usersData = new Map();
    
    const [adminsSnapshot, moderatorsSnapshot, developersSnapshot] = await Promise.all([
        getDocs(collection(db, 'admins')),
        getDocs(collection(db, 'moderators')),
        getDocs(collection(db, 'developers'))
    ]);
    
    // Prioridad: Developer > Admin > Moderator
    developersSnapshot.forEach(doc => {
        usersRoles.set(doc.id, {
            role: 'Desarrollador',
            isDeveloper: true,
            isAdmin: true,
            isModerator: true
        });
    });
    
    adminsSnapshot.forEach(doc => {
        if (!usersRoles.has(doc.id)) {
            usersRoles.set(doc.id, {
                role: 'Administrador',
                isDeveloper: false,
                isAdmin: true,
                isModerator: false
            });
        }
    });
    
    moderatorsSnapshot.forEach(doc => {
        if (!usersRoles.has(doc.id)) {
            usersRoles.set(doc.id, {
                role: 'Moderador',
                isDeveloper: false,
                isAdmin: false,
                isModerator: true
            });
        }
    });
    
    console.log(`✅ Roles cargados desde Firestore: ${usersRoles.size} usuarios con roles`);
    
    // 2. Actualizar Realtime Database completamente
    const roomsRef = ref(database, 'rooms');
    const snapshot = await get(roomsRef);
    
    if (snapshot.exists()) {
        const updates = {};
        let updatedCount = 0;
        
        snapshot.forEach(roomSnapshot => {
            const roomId = roomSnapshot.key;
            const usersInRoom = roomSnapshot.child('users').val();
            
            if (usersInRoom) {
                Object.keys(usersInRoom).forEach(userKey => {
                    const user = usersInRoom[userKey];
                    const firebaseUid = user.firebaseUid || userKey;
                    
                    // Obtener rol correcto desde Firestore
                    const roleData = usersRoles.get(firebaseUid);
                    
                    if (roleData) {
                        // Usuario con rol especial
                        updates[`rooms/${roomId}/users/${userKey}/role`] = roleData.role;
                        updates[`rooms/${roomId}/users/${userKey}/isDeveloper`] = roleData.isDeveloper;
                        updates[`rooms/${roomId}/users/${userKey}/isAdmin`] = roleData.isAdmin;
                        updates[`rooms/${roomId}/users/${userKey}/isModerator`] = roleData.isModerator;
                        updatedCount++;
                    } else {
                        // Usuario normal - limpiar cualquier rol incorrecto
                        updates[`rooms/${roomId}/users/${userKey}/role`] = 'Usuario';
                        updates[`rooms/${roomId}/users/${userKey}/isDeveloper`] = false;
                        updates[`rooms/${roomId}/users/${userKey}/isAdmin`] = false;
                        updates[`rooms/${roomId}/users/${userKey}/isModerator`] = false;
                        updatedCount++;
                    }
                });
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
            console.log(`✅ Actualizado Realtime Database: ${updatedCount} usuarios en todas las salas`);
        }
    }
    
    // 3. Actualizar localStorage del usuario actual
    if (currentUser && currentUser.firebaseUid) {
        const roleData = usersRoles.get(currentUser.firebaseUid);
        
        if (roleData) {
            currentUser.role = roleData.role;
            currentUser.isDeveloper = roleData.isDeveloper;
            currentUser.isAdmin = roleData.isAdmin;
            currentUser.isModerator = roleData.isModerator;
        } else {
            currentUser.role = 'Usuario';
            currentUser.isDeveloper = false;
            currentUser.isAdmin = false;
            currentUser.isModerator = false;
        }
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log(`✅ LocalStorage actualizado para usuario actual: ${currentUser.role}`);
    }
    
    // 4. Forzar recarga completa de la página para limpiar caché del DOM
    console.log('🔄 Recargando página para aplicar cambios...');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}
