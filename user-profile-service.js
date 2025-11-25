import { db } from './firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Obtener perfil completo del usuario con todos los datos relevantes
export async function getUserProfile(userId, isGuest = false) {
    try {
        let userData = null;
        let isAdmin = false;
        let isModerator = false;
        let isBanned = false;
        
        if (isGuest) {
            // Para invitados, buscar en colección guests
            const guestDoc = await getDoc(doc(db, 'guests', userId));
            if (guestDoc.exists()) {
                userData = guestDoc.data();
            }
        } else {
            // Para usuarios registrados, buscar en colección users
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                userData = userDoc.data();
                
                // Verificar si es administrador
                const adminDoc = await getDoc(doc(db, 'admins', userId));
                isAdmin = adminDoc.exists();
                
                // Verificar si es moderador
                const moderatorDoc = await getDoc(doc(db, 'moderators', userId));
                isModerator = moderatorDoc.exists();
                
                // Verificar si está baneado
                const bannedDoc = await getDoc(doc(db, 'banned', userId));
                isBanned = bannedDoc.exists();
            }
        }
        
        if (!userData) {
            return null;
        }
        
        // Determinar rol basado en permisos
        let role = 'Usuario';
        let status = 'Activo';
        
        if (isGuest) {
            role = 'Invitado';
        } else if (isBanned) {
            role = 'Usuario';
            status = 'Baneado';
        } else if (isAdmin) {
            role = 'Administrador';
        } else if (isModerator) {
            role = 'Moderador';
        }
        
        // Retornar perfil completo con datos relevantes
        return {
            id: userId,
            firebaseUid: userData.firebaseUid || userId,
            username: userData.username || 'Usuario',
            description: userData.description || 'Sin descripción',
            country: userData.country || 'No especificado',
            role: role,
            status: status,
            createdAt: userData.createdAt || 'No disponible',
            lastSeen: userData.lastSeen || userData.lastUpdated || 'No disponible',
            avatar: userData.avatar || 'images/profileuser.jpg',
            textColor: userData.textColor || '#ffffff',
            isGuest: isGuest,
            isAdmin: isAdmin,
            isModerator: isModerator,
            isBanned: isBanned
        };
        
    } catch (error) {
        console.error('Error obteniendo perfil de usuario:', error);
        return null;
    }
}

// Buscar usuario por username
export async function findUserByUsername(username) {
    try {
        // Buscar en usuarios registrados
        const usersQuery = query(collection(db, 'users'), where('username', '==', username));
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            return await getUserProfile(userDoc.id, false);
        }
        
        // Buscar en invitados
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