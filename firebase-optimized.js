// ============================================
// OPTIMIZACIONES CRÍTICAS PARA VELOCIDAD
// ============================================

// 1. CACHÉ DE USUARIOS Y PERFILES
const userCache = new Map();
const profileCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// 2. CACHÉ DE ROLES (evita múltiples consultas a Firestore)
const roleCache = new Map();

// 3. BATCH DE CONSULTAS
let pendingUserQueries = [];
let queryTimeout = null;

// Función para obtener usuario con caché
export async function getCachedUser(userId) {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    
    // Si no está en caché, agregarlo a batch
    return new Promise((resolve) => {
        pendingUserQueries.push({ userId, resolve });
        
        if (!queryTimeout) {
            queryTimeout = setTimeout(async () => {
                const queries = [...pendingUserQueries];
                pendingUserQueries = [];
                queryTimeout = null;
                
                // Ejecutar todas las consultas en paralelo
                const results = await Promise.all(
                    queries.map(async ({ userId }) => {
                        try {
                            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                            const { db } = await import('./firebase.js');
                            
                            const userDoc = await getDoc(doc(db, 'users', userId));
                            if (userDoc.exists()) {
                                const data = userDoc.data();
                                userCache.set(userId, { data, timestamp: Date.now() });
                                return data;
                            }
                            
                            const guestDoc = await getDoc(doc(db, 'guests', userId));
                            if (guestDoc.exists()) {
                                const data = guestDoc.data();
                                userCache.set(userId, { data, timestamp: Date.now() });
                                return data;
                            }
                            
                            return null;
                        } catch (error) {
                            return null;
                        }
                    })
                );
                
                queries.forEach(({ resolve }, index) => {
                    resolve(results[index]);
                });
            }, 50); // Esperar 50ms para agrupar consultas
        }
    });
}

// Función para obtener rol con caché
export async function getCachedRole(userId) {
    const cached = roleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    
    try {
        const { checkDeveloperStatus, checkAdminStatus, checkModeratorStatus } = await import('./firebase.js');
        
        const [isDev, isAdmin, isMod] = await Promise.all([
            checkDeveloperStatus(userId),
            checkAdminStatus(userId),
            checkModeratorStatus(userId)
        ]);
        
        const role = {
            isDeveloper: isDev,
            isAdmin: isAdmin,
            isModerator: isMod,
            roleName: isDev ? 'Desarrollador' : isAdmin ? 'Administrador' : isMod ? 'Moderador' : 'Usuario'
        };
        
        roleCache.set(userId, { data: role, timestamp: Date.now() });
        return role;
    } catch (error) {
        return { isDeveloper: false, isAdmin: false, isModerator: false, roleName: 'Usuario' };
    }
}

// Función para pre-cargar usuarios de una sala
export async function preloadRoomUsers(roomId) {
    try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        const { database } = await import('./firebase.js');
        
        const usersRef = ref(database, `rooms/${roomId}/users`);
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
            const userIds = [];
            snapshot.forEach((child) => {
                const userData = child.val();
                if (userData.firebaseUid) {
                    userIds.push(userData.firebaseUid);
                }
            });
            
            // Pre-cargar todos los usuarios en paralelo
            await Promise.all(userIds.map(id => getCachedUser(id)));
        }
    } catch (error) {
        console.error('Error preloading users:', error);
    }
}

// Limpiar caché periódicamente
setInterval(() => {
    const now = Date.now();
    
    for (const [key, value] of userCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            userCache.delete(key);
        }
    }
    
    for (const [key, value] of roleCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            roleCache.delete(key);
        }
    }
    
    for (const [key, value] of profileCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            profileCache.delete(key);
        }
    }
}, 60000); // Cada minuto

// Función para invalidar caché de un usuario específico
export function invalidateUserCache(userId) {
    userCache.delete(userId);
    roleCache.delete(userId);
    profileCache.delete(userId);
}

// Función para limpiar todo el caché
export function clearAllCache() {
    userCache.clear();
    roleCache.clear();
    profileCache.clear();
}
