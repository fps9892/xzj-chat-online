// Funciones de paneles de moderación
import { ref, onValue, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getDocs, collection, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let guestNumericIds = new Map();
let currentGuestId = 1000;

function createElement(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
}

export async function showBanPanel(database, currentRoom, currentUser, banUserFirebase, showNotification, db) {
    const existingPanel = document.querySelector('.moderation-panel');
    if (existingPanel) existingPanel.remove();
    
    const roomsRef = ref(database, 'rooms');
    const roomsSnapshot = await new Promise(resolve => {
        onValue(roomsRef, resolve, { onlyOnce: true });
    });
    
    const users = [];
    const seenUsers = new Set();
    
    if (roomsSnapshot.exists()) {
        roomsSnapshot.forEach(roomChild => {
            const usersData = roomChild.child('users');
            usersData.forEach(child => {
                const userData = child.val();
                const userKey = child.key;
                if (userData.status === 'online' && userKey !== currentUser.userId && !seenUsers.has(userKey)) {
                    if (userData.role !== 'Administrador') {
                        seenUsers.add(userKey);
                        users.push({
                            userId: userKey,
                            firebaseUid: userData.firebaseUid || userKey,
                            name: userData.name || 'Usuario',
                            avatar: userData.avatar || 'images/profileuser.svg',
                            isGuest: userData.isGuest || false
                        });
                    }
                }
            });
        });
    }
    
    const panel = createElement(`
        <div class="moderation-panel ban-panel">
            <div class="moderation-panel-header">
                <img src="/images/ban.svg" class="moderation-panel-icon" alt="Ban" />
                <span class="moderation-panel-title">Banear Usuarios</span>
                <button class="close-moderation-panel">×</button>
            </div>
            <div class="moderation-list">
                ${users.map((user, index) => {
                    let userId = '';
                    if (user.isGuest) {
                        if (!guestNumericIds.has(user.firebaseUid)) {
                            guestNumericIds.set(user.firebaseUid, currentGuestId++);
                        }
                        userId = '#' + guestNumericIds.get(user.firebaseUid);
                    } else {
                        userId = '#' + (index + 1);
                    }
                    const guestLabel = user.isGuest ? ' (invitado)' : '';
                    return '<div class="moderation-user-item">' +
                        '<div class="moderation-user-info">' +
                            '<img src="' + user.avatar + '" class="moderation-user-avatar" alt="' + user.name + '" />' +
                            '<span class="moderation-user-name">' + userId + ' ' + user.name + guestLabel + '</span>' +
                        '</div>' +
                        '<button class="moderation-action-btn ban-action-btn" data-user-id="' + user.firebaseUid + '" data-username="' + user.name + '" data-is-guest="' + user.isGuest + '">' +
                            '<img src="/images/ban.svg" alt="Ban" />' +
                            'Banear' +
                        '</button>' +
                    '</div>';
                }).join('')}
            </div>
        </div>
    `);
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
    
    panel.querySelectorAll('.ban-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            const reason = prompt(`Razón del baneo para ${username}:`, 'Violación de reglas');
            if (reason !== null) {
                try {
                    await banUserFirebase(userId, reason);
                    
                    const messageRef = push(ref(database, `rooms/${currentRoom}/messages`));
                    await set(messageRef, {
                        text: `${username} ha sido baneado. Razón: ${reason}`,
                        type: 'system',
                        timestamp: Date.now(),
                        id: messageRef.key
                    });
                    
                    showNotification(`${username} ha sido baneado`, 'success');
                    panel.remove();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
}

export async function showUnbanPanel(database, currentRoom, showNotification, db) {
    const existingPanel = document.querySelector('.moderation-panel');
    if (existingPanel) existingPanel.remove();
    
    const bannedSnapshot = await getDocs(collection(db, 'banned'));
    const bannedUsers = [];
    
    for (const docSnap of bannedSnapshot.docs) {
        const data = docSnap.data();
        bannedUsers.push({
            userId: docSnap.id,
            username: data.username || data.name || 'Usuario',
            reason: data.reason || 'Sin razón',
            bannedAt: data.bannedAt
        });
    }
    
    const panel = createElement(`
        <div class="moderation-panel ban-panel">
            <div class="moderation-panel-header">
                <img src="/images/unban.svg" class="moderation-panel-icon" alt="Unban" />
                <span class="moderation-panel-title">Desbanear Usuarios</span>
                <button class="close-moderation-panel">×</button>
            </div>
            <div class="moderation-list">
                ${bannedUsers.length === 0 ? '<div class="empty-rooms">No hay usuarios baneados</div>' : bannedUsers.map((user, index) => 
                    '<div class="moderation-user-item">' +
                        '<div class="moderation-user-info">' +
                            '<span class="moderation-user-name">' + (index + 1) + '. ' + user.username + '</span>' +
                        '</div>' +
                        '<button class="moderation-action-btn unban-action-btn" data-user-id="' + user.userId + '" data-username="' + user.username + '">' +
                            '<img src="/images/unban.svg" alt="Unban" />' +
                            'Desbanear' +
                        '</button>' +
                    '</div>'
                ).join('')}
            </div>
        </div>
    `);
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
    
    panel.querySelectorAll('.unban-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            if (confirm(`¿Desbanear a ${username}?`)) {
                try {
                    await deleteDoc(doc(db, 'banned', userId));
                    
                    const messageRef = push(ref(database, `rooms/${currentRoom}/messages`));
                    await set(messageRef, {
                        text: `${username} ha sido desbaneado`,
                        type: 'system',
                        timestamp: Date.now(),
                        id: messageRef.key
                    });
                    
                    showNotification(`${username} ha sido desbaneado`, 'success');
                    panel.remove();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
}

export async function showMutePanel(database, currentRoom, currentUser, muteUser, showNotification, db) {
    const existingPanel = document.querySelector('.moderation-panel');
    if (existingPanel) existingPanel.remove();
    
    const roomsRef = ref(database, 'rooms');
    const roomsSnapshot = await new Promise(resolve => {
        onValue(roomsRef, resolve, { onlyOnce: true });
    });
    
    const mutedSnapshot = await getDocs(collection(db, 'muted'));
    const mutedUserIds = new Set();
    mutedSnapshot.forEach(doc => {
        mutedUserIds.add(doc.id);
    });
    
    const users = [];
    const seenUsers = new Set();
    
    if (roomsSnapshot.exists()) {
        roomsSnapshot.forEach(roomChild => {
            const usersData = roomChild.child('users');
            usersData.forEach(child => {
                const userData = child.val();
                const userKey = child.key;
                const userFirebaseUid = userData.firebaseUid || userKey;
                if (userData.status === 'online' && userKey !== currentUser.userId && !seenUsers.has(userKey) && !mutedUserIds.has(userFirebaseUid)) {
                    if (userData.role !== 'Administrador') {
                        seenUsers.add(userKey);
                        users.push({
                            userId: userKey,
                            firebaseUid: userFirebaseUid,
                            name: userData.name || 'Usuario',
                            avatar: userData.avatar || 'images/profileuser.svg',
                            isGuest: userData.isGuest || false
                        });
                    }
                }
            });
        });
    }
    
    const panel = createElement(`
        <div class="moderation-panel mute-panel">
            <div class="moderation-panel-header">
                <img src="/images/mute.svg" class="moderation-panel-icon" alt="Mute" />
                <span class="moderation-panel-title">Mutear Usuarios</span>
                <button class="close-moderation-panel">×</button>
            </div>
            <div class="moderation-list">
                ${users.map((user, index) => {
                    let userId = '';
                    if (user.isGuest) {
                        if (!guestNumericIds.has(user.firebaseUid)) {
                            guestNumericIds.set(user.firebaseUid, currentGuestId++);
                        }
                        userId = '#' + guestNumericIds.get(user.firebaseUid);
                    } else {
                        userId = '#' + (index + 1);
                    }
                    const guestLabel = user.isGuest ? ' (invitado)' : '';
                    return '<div class="moderation-user-item">' +
                        '<div class="moderation-user-info">' +
                            '<img src="' + user.avatar + '" class="moderation-user-avatar" alt="' + user.name + '" />' +
                            '<span class="moderation-user-name">' + userId + ' ' + user.name + guestLabel + '</span>' +
                        '</div>' +
                        '<button class="moderation-action-btn mute-action-btn" data-user-id="' + user.firebaseUid + '" data-username="' + user.name + '" data-is-guest="' + user.isGuest + '">' +
                            '<img src="/images/mute.svg" alt="Mute" />' +
                            'Mutear' +
                        '</button>' +
                    '</div>';
                }).join('')}
            </div>
        </div>
    `);
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
    
    panel.querySelectorAll('.mute-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            const minutes = prompt(`Minutos de muteo para ${username}:`, '5');
            if (minutes !== null) {
                try {
                    await muteUser(userId, parseInt(minutes) * 60 * 1000);
                    
                    const messageRef = push(ref(database, `rooms/${currentRoom}/messages`));
                    await set(messageRef, {
                        text: `${username} ha sido muteado por ${minutes} minutos`,
                        type: 'system',
                        timestamp: Date.now(),
                        id: messageRef.key
                    });
                    
                    showNotification(`${username} ha sido muteado por ${minutes} minutos`, 'success');
                    panel.remove();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
}

export async function showUnmutePanel(database, currentRoom, showNotification, db) {
    const existingPanel = document.querySelector('.moderation-panel');
    if (existingPanel) existingPanel.remove();
    
    const mutedSnapshot = await getDocs(collection(db, 'muted'));
    const mutedUsers = [];
    
    for (const docSnap of mutedSnapshot.docs) {
        const data = docSnap.data();
        const remaining = data.mutedUntil - Date.now();
        if (remaining > 0) {
            mutedUsers.push({
                userId: docSnap.id,
                username: data.username || data.name || 'Usuario',
                mutedUntil: data.mutedUntil,
                remaining: remaining
            });
        } else {
            await deleteDoc(doc(db, 'muted', docSnap.id));
        }
    }
    
    const panel = createElement(`
        <div class="moderation-panel mute-panel">
            <div class="moderation-panel-header">
                <img src="/images/unmute.svg" class="moderation-panel-icon" alt="Unmute" />
                <span class="moderation-panel-title">Desmutear Usuarios</span>
                <button class="close-moderation-panel">×</button>
            </div>
            <div class="moderation-list">
                ${mutedUsers.length === 0 ? '<div class="empty-rooms">No hay usuarios muteados</div>' : mutedUsers.map((user, index) => {
                    const minutes = Math.ceil(user.remaining / 60000);
                    const seconds = Math.ceil((user.remaining % 60000) / 1000);
                    return '<div class="moderation-user-item">' +
                        '<div class="moderation-user-info">' +
                            '<span class="moderation-user-name">' + (index + 1) + '. ' + user.username + '</span>' +
                            '<span class="mute-timer" data-until="' + user.mutedUntil + '" data-user-id="' + user.userId + '" style="color:#ff9800;font-size:12px;margin-left:10px;">' + minutes + 'm ' + seconds + 's</span>' +
                        '</div>' +
                        '<button class="moderation-action-btn unmute-action-btn" data-user-id="' + user.userId + '" data-username="' + user.username + '">' +
                            '<img src="/images/unmute.svg" alt="Unmute" />' +
                            'Desmutear' +
                        '</button>' +
                    '</div>';
                }).join('')}
            </div>
        </div>
    `);
    
    document.body.appendChild(panel);
    
    const timerInterval = setInterval(() => {
        const timers = panel.querySelectorAll('.mute-timer');
        timers.forEach(async timer => {
            const until = parseInt(timer.dataset.until);
            const userId = timer.dataset.userId;
            const remaining = until - Date.now();
            
            if (remaining <= 0) {
                await deleteDoc(doc(db, 'muted', userId));
                const messageRef = push(ref(database, `rooms/${currentRoom}/messages`));
                await set(messageRef, {
                    text: timer.closest('.moderation-user-item').querySelector('.moderation-user-name').textContent.split('. ')[1] + ' ha sido desmuteado automáticamente',
                    type: 'system',
                    timestamp: Date.now(),
                    id: messageRef.key
                });
                timer.closest('.moderation-user-item').remove();
                if (panel.querySelectorAll('.moderation-user-item').length === 0) {
                    panel.querySelector('.moderation-list').innerHTML = '<div class="empty-rooms">No hay usuarios muteados</div>';
                }
            } else {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.ceil((remaining % 60000) / 1000);
                timer.textContent = minutes + 'm ' + seconds + 's';
            }
        });
    }, 1000);
    
    panel.addEventListener('remove', () => clearInterval(timerInterval));
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
    
    panel.querySelectorAll('.unmute-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            if (confirm(`¿Desmutear a ${username}?`)) {
                try {
                    await deleteDoc(doc(db, 'muted', userId));
                    
                    const messageRef = push(ref(database, `rooms/${currentRoom}/messages`));
                    await set(messageRef, {
                        text: `${username} ha sido desmuteado`,
                        type: 'system',
                        timestamp: Date.now(),
                        id: messageRef.key
                    });
                    
                    showNotification(`${username} ha sido desmuteado`, 'success');
                    panel.remove();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
}


