// Gestión de Rangos para Desarrolladores
import { db, database } from './firebase.js';
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, onValue, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

function createElement(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
}

// Mostrar panel para DAR rango
export async function showGiveRankPanel(showNotification) {
    const existingPanel = document.querySelector('.rank-panel');
    if (existingPanel) existingPanel.remove();
    
    // Obtener todos los usuarios registrados (no invitados)
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Verificar roles actuales
        const isAdmin = (await getDoc(doc(db, 'admins', userId))).exists();
        const isModerator = (await getDoc(doc(db, 'moderators', userId))).exists();
        const isDeveloper = (await getDoc(doc(db, 'developers', userId))).exists();
        
        users.push({
            userId,
            username: userData.username || 'Usuario',
            avatar: userData.avatar || '/images/profileuser.svg',
            currentRole: isDeveloper ? 'Desarrollador' : isAdmin ? 'Administrador' : isModerator ? 'Moderador' : 'Usuario',
            isAdmin,
            isModerator,
            isDeveloper
        });
    }
    
    const panel = createElement(`
        <div class="rank-panel">
            <div class="rank-panel-header">
                <span class="rank-panel-title">
                    <img src="/images/profileuseradd.svg" class="rank-panel-icon" alt="Give Rank" />
                    Otorgar Rango
                </span>
                <button class="close-rank-panel">×</button>
            </div>
            <div class="rank-list">
                ${users.length === 0 ? '<div class="empty-rank-list">No hay usuarios disponibles</div>' : users.map(user => `
                    <div class="rank-user-item" data-user-id="${user.userId}">
                        <div class="rank-user-info">
                            <img src="${user.avatar}" class="rank-user-avatar" alt="${user.username}" />
                            <span class="rank-user-name">
                                ${user.username}
                                ${user.isDeveloper ? '<span class="dev-tag">DEV</span>' : user.isAdmin ? '<span class="admin-tag">ADMIN</span>' : user.isModerator ? '<span class="mod-tag">MOD</span>' : ''}
                            </span>
                        </div>
                        <select class="rank-select" data-user-id="${user.userId}">
                            <option value="">Seleccionar rango</option>
                            <option value="moderator" ${user.isModerator ? 'disabled' : ''}>Moderador</option>
                            <option value="admin" ${user.isAdmin ? 'disabled' : ''}>Administrador</option>
                        </select>
                        <button class="rank-action-btn" data-user-id="${user.userId}" data-username="${user.username}">
                            ✓ Otorgar
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `);
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-rank-panel').addEventListener('click', () => panel.remove());
    
    // Manejar botones de otorgar
    panel.querySelectorAll('.rank-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            const selectEl = panel.querySelector(`.rank-select[data-user-id="${userId}"]`);
            const rankType = selectEl.value;
            
            if (!rankType) {
                showNotification('Selecciona un rango primero', 'warning');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '⏳';
            
            try {
                if (rankType === 'moderator') {
                    await setDoc(doc(db, 'moderators', userId), { isModerator: true });
                    await updateUserRoleInRealtime(userId, 'Moderador');
                    showNotification(`${username} ahora es Moderador`, 'success');
                } else if (rankType === 'admin') {
                    await setDoc(doc(db, 'admins', userId), { isAdmin: true });
                    await updateUserRoleInRealtime(userId, 'Administrador');
                    showNotification(`${username} ahora es Administrador`, 'success');
                }
                
                setTimeout(() => panel.remove(), 1000);
            } catch (error) {
                showNotification('Error al otorgar rango: ' + error.message, 'error');
                btn.disabled = false;
                btn.textContent = '✓ Otorgar';
            }
        });
    });
}

// Mostrar panel para QUITAR rango
export async function showRemoveRankPanel(showNotification) {
    const existingPanel = document.querySelector('.rank-panel');
    if (existingPanel) existingPanel.remove();
    
    // Obtener usuarios con rangos
    const adminsSnapshot = await getDocs(collection(db, 'admins'));
    const moderatorsSnapshot = await getDocs(collection(db, 'moderators'));
    
    const rankedUsers = [];
    
    // Procesar admins
    for (const adminDoc of adminsSnapshot.docs) {
        const userId = adminDoc.id;
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            rankedUsers.push({
                userId,
                username: userData.username || 'Usuario',
                avatar: userData.avatar || '/images/profileuser.svg',
                role: 'admin',
                roleLabel: 'Administrador'
            });
        }
    }
    
    // Procesar moderadores
    for (const modDoc of moderatorsSnapshot.docs) {
        const userId = modDoc.id;
        // Verificar que no sea admin
        if (!rankedUsers.find(u => u.userId === userId)) {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                rankedUsers.push({
                    userId,
                    username: userData.username || 'Usuario',
                    avatar: userData.avatar || '/images/profileuser.svg',
                    role: 'moderator',
                    roleLabel: 'Moderador'
                });
            }
        }
    }
    
    const panel = createElement(`
        <div class="rank-panel">
            <div class="rank-panel-header">
                <span class="rank-panel-title">
                    <img src="/images/trash.svg" class="rank-panel-icon" alt="Remove Rank" />
                    Quitar Rango
                </span>
                <button class="close-rank-panel">×</button>
            </div>
            <div class="rank-list">
                ${rankedUsers.length === 0 ? '<div class="empty-rank-list">No hay usuarios con rangos</div>' : rankedUsers.map(user => `
                    <div class="rank-user-item" data-user-id="${user.userId}">
                        <div class="rank-user-info">
                            <img src="${user.avatar}" class="rank-user-avatar" alt="${user.username}" />
                            <span class="rank-user-name">
                                ${user.username}
                                ${user.role === 'admin' ? '<span class="admin-tag">ADMIN</span>' : '<span class="mod-tag">MOD</span>'}
                            </span>
                        </div>
                        <button class="rank-action-btn" data-user-id="${user.userId}" data-username="${user.username}" data-role="${user.role}" data-role-label="${user.roleLabel}">
                            ✕ Quitar ${user.roleLabel}
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `);
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-rank-panel').addEventListener('click', () => panel.remove());
    
    // Manejar botones de quitar
    panel.querySelectorAll('.rank-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            const role = btn.dataset.role;
            const roleLabel = btn.dataset.roleLabel;
            
            if (!confirm(`¿Quitar rango de ${roleLabel} a ${username}?`)) return;
            
            btn.disabled = true;
            btn.textContent = '⏳';
            
            try {
                if (role === 'admin') {
                    await deleteDoc(doc(db, 'admins', userId));
                } else if (role === 'moderator') {
                    await deleteDoc(doc(db, 'moderators', userId));
                }
                
                await updateUserRoleInRealtime(userId, 'Usuario');
                showNotification(`Rango de ${roleLabel} removido de ${username}`, 'success');
                
                setTimeout(() => {
                    btn.closest('.rank-user-item').style.animation = 'fadeOut 0.3s ease';
                    setTimeout(() => {
                        btn.closest('.rank-user-item').remove();
                        if (panel.querySelectorAll('.rank-user-item').length === 0) {
                            panel.remove();
                        }
                    }, 300);
                }, 500);
            } catch (error) {
                showNotification('Error al quitar rango: ' + error.message, 'error');
                btn.disabled = false;
                btn.textContent = `✕ Quitar ${roleLabel}`;
            }
        });
    });
}

// Actualizar rol del usuario en todas las salas en tiempo real
async function updateUserRoleInRealtime(userId, newRole) {
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
                    if (user.firebaseUid === userId || userKey === userId) {
                        updates[`rooms/${roomId}/users/${userKey}/role`] = newRole;
                        
                        // Actualizar flags de rol
                        if (newRole === 'Administrador') {
                            updates[`rooms/${roomId}/users/${userKey}/isAdmin`] = true;
                            updates[`rooms/${roomId}/users/${userKey}/isModerator`] = false;
                        } else if (newRole === 'Moderador') {
                            updates[`rooms/${roomId}/users/${userKey}/isAdmin`] = false;
                            updates[`rooms/${roomId}/users/${userKey}/isModerator`] = true;
                        } else {
                            updates[`rooms/${roomId}/users/${userKey}/isAdmin`] = false;
                            updates[`rooms/${roomId}/users/${userKey}/isModerator`] = false;
                        }
                    }
                });
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
        }
    }
}
