import { sendMessage, listenToMessages, listenToUsers, setUserOnline, changeRoom, currentUser } from './firebase.js';

document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.querySelector('.message-input');
    const charCounter = document.querySelector('.char-counter');
    const sendIcon = document.querySelector('.send-icon');
    const roomSelector = document.querySelector('.room-selector');
    const roomsDropdown = document.querySelector('.rooms-dropdown');
    const mobileUsersIndicator = document.querySelector('.mobile-users-indicator');
    const mobileUsersDropdown = document.querySelector('.mobile-users-dropdown');
    const currentRoomName = document.querySelector('.current-room-name');
    const roomItems = document.querySelectorAll('.room-item');
    const userInfo = document.querySelector('.user-info');
    const userPanelOverlay = document.querySelector('.user-panel-overlay');
    const closePanel = document.querySelector('.close-panel');
    const panelTabs = document.querySelectorAll('.user-panel-tab');
    const configSection = document.querySelector('.config-section');
    const rulesSection = document.querySelector('.rules-section');
    const configItems = document.querySelectorAll('.config-item[data-config]');
    const colorPreviewText = document.querySelector('.color-preview-text');
    const colorInput = document.querySelector('.color-input');
    
    // Cooldowns (en milisegundos)
    const cooldowns = {
        name: 30 * 60 * 1000, // 30 minutos
        description: 30 * 60 * 1000, // 30 minutos
        password: 30 * 60 * 1000, // 30 minutos
        color: 2 * 60 * 1000 // 2 minutos
    };
    
    const lastChanges = {};

    // Toggle dropdown de salas
    roomSelector.addEventListener('click', function(e) {
        e.stopPropagation();
        roomsDropdown.classList.toggle('active');
        mobileUsersDropdown.classList.remove('active');
    });

    // Toggle dropdown de usuarios móvil
    if (mobileUsersIndicator) {
        mobileUsersIndicator.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileUsersDropdown.classList.toggle('active');
            roomsDropdown.classList.remove('active');
        });
    }

    // Manejar selección de sala
    roomItems.forEach(item => {
        item.addEventListener('click', function() {
            const roomName = this.getAttribute('data-room');
            currentRoomName.textContent = roomName;
            changeRoom(roomName);
            clearSkeletons();
            loadMessages();
            loadUsers();
            roomsDropdown.classList.remove('active');
        });
    });

    // Abrir panel de usuario
    userInfo.addEventListener('click', function(e) {
        e.stopPropagation();
        userPanelOverlay.classList.add('active');
    });

    // Cerrar panel de usuario
    closePanel.addEventListener('click', function() {
        userPanelOverlay.classList.remove('active');
    });

    userPanelOverlay.addEventListener('click', function(e) {
        if (e.target === userPanelOverlay) {
            userPanelOverlay.classList.remove('active');
        }
    });

    // Cambiar tabs del panel
    panelTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            panelTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (this.dataset.tab === 'config') {
                configSection.style.display = 'block';
                rulesSection.style.display = 'none';
            } else {
                configSection.style.display = 'none';
                rulesSection.style.display = 'block';
            }
        });
    });

    // Manejar configuraciones
    configItems.forEach(item => {
        const configType = item.dataset.config;
        const button = item.querySelector('button');
        const input = item.querySelector('.config-input, .color-picker-panel');
        const acceptBtn = item.querySelector('.accept-btn');
        const cancelBtn = item.querySelector('.cancel-btn');
        
        button.addEventListener('click', function() {
            if (canChange(configType)) {
                input.classList.add('active');
                button.style.display = 'none';
            } else {
                const timeLeft = getTimeLeft(configType);
                showNotification(`Debes esperar ${timeLeft} para cambiar esto`, 'warning');
            }
        });
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                input.classList.remove('active');
                button.style.display = 'block';
            });
        }
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', function() {
                const inputField = item.querySelector('input');
                if (inputField && inputField.value.trim()) {
                    lastChanges[configType] = Date.now();
                    
                    // Actualizar datos del usuario
                    if (configType === 'name') {
                        currentUser.username = inputField.value.trim();
                        document.querySelector('.username').textContent = currentUser.isGuest ? `${currentUser.username} (invitado)` : currentUser.username;
                    } else if (configType === 'description') {
                        currentUser.description = inputField.value.trim();
                    } else if (configType === 'color') {
                        document.querySelector('.username').style.color = inputField.value;
                    }
                    
                    // Actualizar localStorage
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    showNotification(`${getConfigName(configType)} actualizado correctamente`, 'success');
                    
                    input.classList.remove('active');
                    button.style.display = 'block';
                    inputField.value = '';
                } else {
                    showNotification('Por favor ingresa un valor válido', 'error');
                }
            });
        }
    });
    
    // Color picker preview
    if (colorInput) {
        colorInput.addEventListener('input', function() {
            colorPreviewText.style.color = this.value;
        });
    }
    
    function canChange(configType) {
        if (!lastChanges[configType]) return true;
        return Date.now() - lastChanges[configType] >= cooldowns[configType];
    }
    
    function getTimeLeft(configType) {
        const timeLeft = cooldowns[configType] - (Date.now() - lastChanges[configType]);
        const minutes = Math.ceil(timeLeft / (60 * 1000));
        return minutes > 1 ? `${minutes} minutos` : '1 minuto';
    }
    
    function getConfigName(configType) {
        const names = {
            name: 'Nombre',
            description: 'Descripción',
            password: 'Contraseña',
            color: 'Color'
        };
        return names[configType];
    }
    
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Funcionalidad "ver más" para mensajes largos
    function getCharacterLimit() {
        const width = window.innerWidth;
        if (width <= 767) return 100; // Móvil
        if (width <= 1023) return 200; // Tablet
        return 200; // Desktop
    }
    
    function initializeMessages() {
        const messages = document.querySelectorAll('.message-text');
        const charLimit = getCharacterLimit();
        
        messages.forEach(messageText => {
            const seeMore = messageText.parentElement.querySelector('.see-more');
            if (messageText.textContent.length <= charLimit) {
                if (seeMore) seeMore.classList.add('hidden');
                return;
            }
            
            if (seeMore) {
                seeMore.addEventListener('click', function() {
                    if (messageText.classList.contains('expanded')) {
                        messageText.classList.remove('expanded');
                        this.textContent = 'ver más';
                    } else {
                        messageText.classList.add('expanded');
                        this.textContent = 'ver menos';
                    }
                });
            }
        });
    }
    
    // Reinicializar al cambiar tamaño de ventana
    window.addEventListener('resize', function() {
        initializeMessages();
    });
    
    // Funciones de Firebase
    function loadMessages() {
        listenToMessages((messages) => {
            renderMessages(messages);
            initializeMessages();
        });
    }
    
    function loadUsers() {
        listenToUsers((users) => {
            renderUsers(users);
            updateUserCount(users.length);
        });
    }
    
    function renderMessages(messages) {
        const chatArea = document.querySelector('.chat-area');
        chatArea.innerHTML = '';
        
        messages.forEach(message => {
            const messageEl = createMessageElement(message);
            chatArea.appendChild(messageEl);
        });
        
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    function renderUsers(users) {
        const usersList = document.querySelector('.users-list');
        const mobileUsersDropdown = document.querySelector('.mobile-users-dropdown');
        
        // Desktop users list
        if (usersList) {
            usersList.innerHTML = '';
            users.forEach(user => {
                const userEl = createUserElement(user);
                usersList.appendChild(userEl);
            });
        }
        
        // Mobile/Tablet users dropdown
        if (mobileUsersDropdown) {
            mobileUsersDropdown.innerHTML = '';
            users.forEach(user => {
                const userEl = createMobileUserElement(user);
                mobileUsersDropdown.appendChild(userEl);
            });
        }
    }
    
    function createMessageElement(message) {
        const isOwn = message.userId === currentUser.userId;
        const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Mostrar (invitado) si es usuario invitado
        const displayName = message.isGuest ? `${message.userName} (invitado)` : message.userName;
        
        const messageEl = createElement(`
            <div class="message-container">
                <div class="message ${isOwn ? 'sent' : 'received'}">
                    <div class="message-header">
                        ${isOwn ? `
                            <span class="message-time">${time}</span>
                            <span class="message-username">${displayName}</span>
                            <img src="${message.userAvatar}" alt="User" class="message-avatar">
                        ` : `
                            <img src="${message.userAvatar}" alt="User" class="message-avatar">
                            <span class="message-username">${displayName}</span>
                            <span class="message-time">${time}</span>
                        `}
                    </div>
                    <div class="message-content">
                        <div class="message-text">${message.text}</div>
                        ${message.text.length > getCharacterLimit() ? '<span class="see-more">ver más</span>' : ''}
                    </div>
                </div>
            </div>
        `);
        
        // Añadir funcionalidad ver más
        const seeMore = messageEl.querySelector('.see-more');
        const messageText = messageEl.querySelector('.message-text');
        if (seeMore && messageText) {
            seeMore.addEventListener('click', function() {
                if (messageText.classList.contains('expanded')) {
                    messageText.classList.remove('expanded');
                    this.textContent = 'ver más';
                } else {
                    messageText.classList.add('expanded');
                    this.textContent = 'ver menos';
                }
            });
        }
        
        return messageEl;
    }
    
    function createUserElement(user) {
        const displayName = user.role === 'guest' ? `${user.name} (invitado)` : user.name;
        const userEl = createElement(`
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-avatar">
                    <img src="${user.avatar}" alt="${user.name}">
                    <span class="online-indicator"></span>
                </div>
                <span class="user-name">${displayName}</span>
            </div>
        `);
        
        userEl.addEventListener('click', () => showUserProfile(user));
        return userEl;
    }
    
    function createMobileUserElement(user) {
        const displayName = user.role === 'guest' ? `${user.name} (invitado)` : user.name;
        const userEl = createElement(`
            <div class="mobile-user-item" data-user-id="${user.id}">
                <div class="mobile-user-avatar">
                    <img src="${user.avatar}" alt="${user.name}">
                    <span class="mobile-online-indicator"></span>
                </div>
                <span class="mobile-user-name">${displayName}</span>
            </div>
        `);
        
        userEl.addEventListener('click', () => showUserProfile(user));
        return userEl;
    }
    
    function showUserProfile(user) {
        // Create user profile modal
        const modal = createElement(`
            <div class="user-profile-overlay active">
                <div class="user-profile-panel">
                    <div class="user-profile-header">
                        <h3>Perfil de Usuario</h3>
                        <img src="images/close.svg" alt="Close" class="close-profile">
                    </div>
                    <div class="user-profile-content">
                        <div class="profile-avatar">
                            <img src="${user.avatar}" alt="${user.name}">
                        </div>
                        <h4>${user.name}</h4>
                        <p class="user-role">${user.role === 'admin' ? 'Administrador' : user.role === 'moderator' ? 'Moderador' : 'Usuario'}</p>
                        <div class="profile-info">
                            <p><strong>Descripción:</strong> ${user.description || 'Sin descripción'}</p>
                            <p><strong>Cuenta creada:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'No disponible'}</p>
                            <p><strong>Última conexión:</strong> ${user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Ahora'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-profile').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    function createElement(html) {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    }
    
    function clearSkeletons() {
        document.querySelectorAll('.skeleton-message, .skeleton-user').forEach(el => el.remove());
    }
    
    function updateUserCount(count) {
        document.querySelector('.user-count').textContent = count;
        document.querySelector('.mobile-user-count').textContent = count;
    }
    
    // Actualizar nombre de usuario en header
    function updateUserHeader() {
        const usernameEl = document.querySelector('.username');
        const profileImageEl = document.querySelector('.profile-image');
        
        if (usernameEl) {
            const displayName = currentUser.isGuest ? `${currentUser.username} (invitado)` : currentUser.username;
            usernameEl.textContent = displayName;
        }
        
        if (profileImageEl && currentUser.avatar) {
            profileImageEl.src = currentUser.avatar;
        }
    }
    
    // Inicializar Firebase
    updateUserHeader();
    setUserOnline();
    loadMessages();
    loadUsers();
    
    // Limpiar skeletons después de 2 segundos
    setTimeout(clearSkeletons, 2000);
    
    // Manejar cerrar sesión
    const logoutBtn = document.querySelector('.config-item:nth-last-child(2) button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }
    
    // Manejar otras configuraciones
    const configButtons = document.querySelectorAll('.config-item:not([data-config]) button');
    configButtons.forEach((btn, index) => {
        const configItem = btn.closest('.config-item');
        const configText = configItem.querySelector('span').textContent;
        
        if (configText.includes('Cambiar fondo')) {
            btn.addEventListener('click', function() {
                showNotification('Funcionalidad de fondo próximamente', 'warning');
            });
        } else if (configText.includes('Cambiar foto')) {
            btn.addEventListener('click', function() {
                showNotification('Funcionalidad de foto próximamente', 'warning');
            });
        } else if (configText.includes('Borrar cuenta')) {
            btn.addEventListener('click', function() {
                if (confirm('¿Estás seguro de que quieres borrar tu cuenta? Esta acción no se puede deshacer.')) {
                    localStorage.removeItem('currentUser');
                    showNotification('Cuenta eliminada', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                }
            });
        }
    });
    
    // Inicializar mensajes existentes
    initializeMessages();

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', function() {
        roomsDropdown.classList.remove('active');
        if (mobileUsersDropdown) {
            mobileUsersDropdown.classList.remove('active');
        }
    });

    // Contador de caracteres
    messageInput.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCounter.textContent = `${currentLength}/250`;
        
        if (currentLength >= 250) {
            charCounter.style.color = '#ff4444';
        } else {
            charCounter.style.color = '#888';
        }
    });

    // Enviar mensaje
    function sendMessageHandler() {
        const message = messageInput.value.trim();
        if (message) {
            sendMessage(message).then(() => {
                messageInput.value = '';
                charCounter.textContent = '0/250';
                charCounter.style.color = '#888';
            }).catch(error => {
                console.error('Error enviando mensaje:', error);
                showNotification('Error al enviar mensaje', 'error');
            });
        }
    }

    sendIcon.addEventListener('click', sendMessageHandler);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessageHandler();
        }
    });
});