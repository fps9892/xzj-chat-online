import { sendMessage, listenToMessages, listenToUsers, setUserOnline, changeRoom, currentUser, updateUserData, changePassword, sendImage, setTypingStatus, listenToTyping, deleteMessage, updateUserRole, checkAdminStatus, checkModeratorStatus, grantModeratorRole, revokeModerator, pinMessage, unpinMessage, getPinnedMessages, banUser as banUserFirebase, getRooms, listenToRooms } from './firebase.js';
import { getUserProfile, findUserByUsername } from './user-profile-service.js';
import { markAsNewMessage, showNewMessagesIndicator, createParticleBurst, animateMessageDeletion } from './chat-enhancements.js';
import './admin-listener.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elementos de la pantalla de carga
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.querySelector('.progress-bar');
    const loadingText = document.querySelector('.loading-text');
    
    // Textos de carga
    const loadingTexts = [
        'Inicializando...',
        'Conectando...',
        'Cargando datos...',
        'Preparando interfaz...',
        'Casi listo...'
    ];
    
    let currentTextIndex = 0;
    let loadingProgress = 0;
    
    // Función para actualizar el texto de carga
    function updateLoadingText() {
        if (currentTextIndex < loadingTexts.length) {
            loadingText.textContent = loadingTexts[currentTextIndex];
            currentTextIndex++;
        }
    }
    
    // Función para simular progreso de carga
    function simulateLoading() {
        const interval = setInterval(() => {
            loadingProgress += Math.random() * 15 + 5;
            
            if (loadingProgress >= 100) {
                loadingProgress = 100;
                clearInterval(interval);
                
                // Ocultar pantalla de carga después de completar
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }, 800);
            }
            
            progressBar.style.width = loadingProgress + '%';
        }, 200);
    }
    
    // Cambiar texto cada 800ms
    const textInterval = setInterval(() => {
        updateLoadingText();
        if (currentTextIndex >= loadingTexts.length) {
            clearInterval(textInterval);
        }
    }, 800);
    
    // Iniciar simulación de carga
    setTimeout(() => {
        simulateLoading();
    }, 1000);
    
    // Efectos adicionales de carga
    function addLoadingEffects() {
        const logo = document.querySelector('.loading-logo');
        const loader = document.querySelector('.neon-loader');
        
        // Efecto de rotación aleatoria del logo
        setInterval(() => {
            const randomRotation = Math.random() * 10 - 5; // -5 a 5 grados
            logo.style.transform = `rotate(${randomRotation}deg)`;
        }, 2000);
        
        // Cambio de velocidad del loader
        let speed = 1.2;
        setInterval(() => {
            speed = Math.random() * 0.8 + 0.8; // 0.8 a 1.6 segundos
            loader.style.animationDuration = speed + 's';
        }, 3000);
    }
    
    addLoadingEffects();
    const messageInput = document.querySelector('.message-input');
    const charCounter = document.querySelector('.char-counter');
    const sendIcon = document.querySelector('.send-icon');
    const roomSelector = document.querySelector('.room-selector');
    const roomsDropdown = document.querySelector('.rooms-dropdown');
    const mobileUsersIndicator = document.querySelector('.mobile-users-indicator');
    const mobileUsersDropdown = document.querySelector('.mobile-users-dropdown');
    const currentRoomName = document.querySelector('.current-room-name');
    let roomItems = document.querySelectorAll('.room-item');
    const userInfo = document.querySelector('.user-info');
    const userPanelOverlay = document.querySelector('.user-panel-overlay');
    const closePanel = document.querySelector('.close-panel');
    const panelTabs = document.querySelectorAll('.user-panel-tab');
    const configSection = document.querySelector('.config-section');
    const rulesSection = document.querySelector('.rules-section');
    const configItems = document.querySelectorAll('.config-item[data-config]');
    const colorPreviewText = document.querySelector('.color-preview-text');
    const colorInput = document.querySelector('.color-input');
    const imageBtn = document.querySelector('.image-btn');
    const imageInput = document.querySelector('.image-input');
    const emoteBtn = document.querySelector('.emote-btn');
    const emotePanel = document.querySelector('.emote-panel');
    const emoteItems = document.querySelectorAll('.emote-item');
    const typingIndicator = document.querySelector('.typing-indicator');
    
    // Cooldowns (en milisegundos)
    const cooldowns = {
        name: 30 * 60 * 1000, // 30 minutos
        description: 30 * 60 * 1000, // 30 minutos
        password: 30 * 60 * 1000, // 30 minutos
        color: 2 * 60 * 1000, // 2 minutos
        country: 30 * 60 * 1000 // 30 minutos
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

    // Cargar salas dinámicamente con listener en tiempo real
    let roomsListener = null;
    async function loadRooms() {
        try {
            // Si ya hay un listener, no crear otro
            if (roomsListener) return;
            
            roomsListener = listenToRooms(async (rooms) => {
                roomsDropdown.innerHTML = '';
                
                // Asegurar que la sala general esté primero
                const generalRoom = rooms.find(r => r.id === 'general');
                if (generalRoom) {
                    rooms = [generalRoom, ...rooms.filter(r => r.id !== 'general')];
                }
                
                // Obtener conteo de usuarios para cada sala
                for (const room of rooms) {
                    const roomElement = document.createElement('div');
                    roomElement.className = 'room-item';
                    if (room.id === currentRoom) {
                        roomElement.classList.add('active');
                    }
                    roomElement.setAttribute('data-room', room.id);
                    roomElement.innerHTML = `${room.name} <span class="room-users">(${room.userCount || 0})</span>`;
                    roomsDropdown.appendChild(roomElement);
                }
                
                // Actualizar event listeners
                setupRoomListeners();
            });
        } catch (error) {
            console.error('Error loading rooms:', error);
        }
    }
    
    // Configurar event listeners para salas
    function setupRoomListeners() {
        const roomItems = document.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.addEventListener('click', function() {
                const roomId = this.getAttribute('data-room');
                const roomDisplayName = this.textContent.split(' (')[0]; // Remover contador de usuarios del nombre
                currentRoomName.textContent = roomDisplayName;
                
                // Remover clase active de todos los items
                roomItems.forEach(r => r.classList.remove('active'));
                // Agregar clase active al item seleccionado
                this.classList.add('active');
                
                // Limpiar listeners antes de cambiar sala
                cleanupListeners();
                
                // Cambiar sala y recargar datos
                changeRoom(roomId);
                clearSkeletons();
                
                // Pequeño delay para asegurar que el cambio de sala se procese
                setTimeout(() => {
                    loadMessages();
                    loadUsers();
                }, 100);
                
                roomsDropdown.classList.remove('active');
            });
        });
    }

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
            acceptBtn.addEventListener('click', async function() {
                const inputField = item.querySelector('input');
                if (inputField && inputField.value.trim()) {
                    lastChanges[configType] = Date.now();
                    
                    let updates = {};
                    
                    if (configType === 'name') {
                        updates.username = inputField.value.trim();
                        document.querySelector('.username').textContent = updates.username;
                    } else if (configType === 'description') {
                        updates.description = inputField.value.trim();
                    } else if (configType === 'country') {
                        updates.country = inputField.value.trim();
                    } else if (configType === 'color') {
                        updates.textColor = inputField.value;
                        document.querySelector('.username').style.color = inputField.value;
                    } else if (configType === 'photo') {
                        const file = inputField.files[0];
                        if (file) {
                            try {
                                updates.avatar = await fileToBase64(file);
                                document.querySelector('.profile-image').src = updates.avatar;
                            } catch (error) {
                                showNotification(error.message, 'error');
                                return;
                            }
                        }
                    } else if (configType === 'password') {
                        if (currentUser.isGuest) {
                            showNotification('Los usuarios invitados no pueden cambiar contraseña', 'error');
                            return;
                        }
                        
                        const newPassword = inputField.value.trim();
                        if (newPassword.length < 6) {
                            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
                            return;
                        }
                        
                        try {
                            await changePassword(newPassword);
                            showNotification('Contraseña actualizada correctamente', 'success');
                            input.classList.remove('active');
                            button.style.display = 'block';
                            inputField.value = '';
                            return;
                        } catch (error) {
                            showNotification('Error al cambiar contraseña: ' + error.message, 'error');
                            return;
                        }
                    } else if (configType === 'grant-admin') {
                        if (!currentUser.isAdmin) {
                            showNotification('Solo administradores pueden otorgar roles', 'error');
                            return;
                        }
                        
                        const targetUsername = inputField.value.trim();
                        if (!targetUsername) {
                            showNotification('Ingresa un nombre de usuario válido', 'error');
                            return;
                        }
                        
                        try {
                            const targetUser = await findUserByUsername(targetUsername);
                            if (!targetUser) {
                                showNotification('Usuario no encontrado', 'error');
                                return;
                            }
                            
                            if (targetUser.isGuest) {
                                showNotification('No se puede otorgar rol a usuarios invitados', 'error');
                                return;
                            }
                            
                            await grantModeratorRole(targetUser.firebaseUid);
                            showNotification('Rol de moderador otorgado correctamente', 'success');
                            input.classList.remove('active');
                            button.style.display = 'block';
                            inputField.value = '';
                            return;
                        } catch (error) {
                            showNotification('Error al otorgar rol: ' + error.message, 'error');
                            return;
                        }
                    }
                    
                    const success = await updateUserData(updates);
                    
                    if (success) {
                        showNotification(`${getConfigName(configType)} actualizado correctamente`, 'success');
                    } else {
                        showNotification('Error al actualizar', 'error');
                    }
                    
                    input.classList.remove('active');
                    button.style.display = 'block';
                    if (inputField.type !== 'file') inputField.value = '';
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
            color: 'Color',
            photo: 'Foto de perfil',
            country: 'País'
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
    
    // Convertir imagen a base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (file.size > 1024 * 1024) { // 1MB
                reject(new Error('La imagen debe ser menor a 1MB'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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
    
    let currentUsersListener = null;
    let previousUsersList = new Map();
    
    function loadUsers() {
        // Limpiar listener anterior si existe
        if (currentUsersListener) {
            currentUsersListener();
        }
        
        // Crear nuevo listener para la sala actual
        currentUsersListener = listenToUsers((users) => {
            // Detectar usuarios que se conectaron
            users.forEach(user => {
                if (!previousUsersList.has(user.id) && previousUsersList.size > 0) {
                    // Usuario se conectó
                    if (user.id !== currentUser.userId) {
                        showNotification(`${user.name} se conectó`, 'info');
                    }
                }
            });
            
            // Detectar usuarios que se desconectaron
            previousUsersList.forEach((userData, userId) => {
                const stillConnected = users.find(u => u.id === userId);
                if (!stillConnected && userId !== currentUser.userId) {
                    showNotification(`${userData.name} se desconectó`, 'info');
                }
            });
            
            // Actualizar lista de usuarios previos
            previousUsersList.clear();
            users.forEach(user => {
                previousUsersList.set(user.id, user);
            });
            
            renderUsers(users);
        });
    }
    
    let lastMessageCount = 0;
    
    function renderMessages(messages) {
        const chatArea = document.querySelector('.chat-area');
        const isNearBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 100;
        
        chatArea.innerHTML = '';
        
        messages.forEach((message, index) => {
            const messageEl = createMessageElement(message);
            chatArea.appendChild(messageEl);
            
            // Marcar mensajes nuevos
            if (index >= lastMessageCount && lastMessageCount > 0) {
                markAsNewMessage(messageEl);
                if (!isNearBottom) {
                    showNewMessagesIndicator();
                }
            }
            
            // Si el mensaje indica que la sala fue borrada, redirigir
            if (message.roomDeleted && message.type === 'system') {
                setTimeout(() => {
                    if (currentRoom !== 'general') {
                        showNotification('Has sido movido a la Sala General', 'warning');
                        changeRoom('general');
                        currentRoomName.textContent = 'Sala General';
                        loadMessages();
                        loadUsers();
                    }
                }, 2000);
            }
        });
        
        lastMessageCount = messages.length;
        
        // Solo hacer scroll si estaba cerca del final
        if (isNearBottom) {
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    }
    
    function renderUsers(users) {
        const usersList = document.querySelector('.users-list');
        const mobileUsersDropdown = document.querySelector('.mobile-users-dropdown');
        
        // Limpiar skeletons si existen
        document.querySelectorAll('.skeleton-user').forEach(el => el.remove());
        
        // Desktop users list
        if (usersList) {
            usersList.innerHTML = '';
            users.forEach(user => {
                const userEl = createUserElement(user);
                usersList.appendChild(userEl);
            });
        }
        
        // Mobile/Tablet users dropdown - actualizar completamente
        if (mobileUsersDropdown) {
            mobileUsersDropdown.innerHTML = '';
            users.forEach(user => {
                const userEl = createMobileUserElement(user);
                mobileUsersDropdown.appendChild(userEl);
            });
        }
        
        // Actualizar contador en el header móvil
        updateUserCount(users.length);
    }
    
    function createMessageElement(message) {
        const isOwn = message.userId === currentUser.userId;
        const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Manejar mensajes del sistema
        if (message.type === 'system') {
            return createElement(`
                <div class="message-container system-message" data-message-id="${message.id}">
                    <div class="message system">
                        <div class="message-content">
                            <div class="message-text">${message.text}</div>
                        </div>
                    </div>
                </div>
            `);
        }
        
        // Mostrar rol del usuario
        let displayName = message.userName;
        let roleTag = '';
        
        if (message.isGuest) {
            displayName += ' (invitado)';
        } else if (message.role === 'Administrador') {
            roleTag = '<span class="admin-tag">ADMIN</span>';
        } else if (message.role === 'Moderador') {
            roleTag = '<span class="mod-tag">MOD</span>';
        }
        
        const messageEl = message.type === 'emote' ? 
            createElement(`
                <div class="message-container" data-message-id="${message.id}">
                    <div class="message ${isOwn ? 'sent' : 'received'}">
                        <div class="message-header">
                            ${isOwn ? `
                                <span class="message-time">${time}</span>
                                <span class="message-username clickable-username" data-user-id="${message.userId}" style="color: ${message.textColor || currentUser.textColor || '#ffffff'}">${displayName}</span>
                                ${roleTag}
                                <img src="${message.userAvatar}" alt="User" class="message-avatar">
                            ` : `
                                <img src="${message.userAvatar}" alt="User" class="message-avatar">
                                <span class="message-username clickable-username" data-user-id="${message.userId}" style="color: ${message.textColor || '#ffffff'}">${displayName}</span>
                                ${roleTag}
                                <span class="message-time">${time}</span>
                            `}
                        </div>
                        <div class="message-content emote-content">
                            <img src="${message.imageData}" alt="Emote" class="standalone-emote" />
                        </div>
                    </div>
                </div>
            `) :
            createElement(`
                <div class="message-container" data-message-id="${message.id}">
                    <div class="message ${isOwn ? 'sent' : 'received'}">
                        <div class="message-header">
                            ${isOwn ? `
                                <span class="message-time">${time}</span>
                                <span class="message-username clickable-username" data-user-id="${message.userId}" style="color: ${message.textColor || currentUser.textColor || '#ffffff'}">${displayName}</span>
                                ${roleTag}
                                <img src="${message.userAvatar}" alt="User" class="message-avatar">
                            ` : `
                                <img src="${message.userAvatar}" alt="User" class="message-avatar">
                                <span class="message-username clickable-username" data-user-id="${message.userId}" style="color: ${message.textColor || '#ffffff'}">${displayName}</span>
                                ${roleTag}
                                <span class="message-time">${time}</span>
                            `}
                        </div>
                        <div class="message-content">
                            ${message.type === 'image' ? 
                                `<img src="${message.imageData}" alt="Imagen" class="message-image" onclick="showImageModal('${message.imageData}')" />` :
                                `<div class="message-text copyable-text">${message.text}</div>
                                ${message.text.length > getCharacterLimit() ? '<span class="see-more">ver más</span>' : ''}`
                            }
                        </div>
                    </div>
                </div>
            `);
        
        // Añadir funcionalidad ver más
        const seeMore = messageEl.querySelector('.see-more');
        const messageText = messageEl.querySelector('.message-text');
        if (seeMore && messageText && message.text.length > getCharacterLimit()) {
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
        
        // Añadir funcionalidad de copiar mensaje (mantener presionado)
        const copyableText = messageEl.querySelector('.copyable-text');
        if (copyableText) {
            let pressTimer;
            
            const startPress = () => {
                pressTimer = setTimeout(() => {
                    navigator.clipboard.writeText(copyableText.textContent).then(() => {
                        showNotification('Mensaje copiado', 'success');
                    }).catch(() => {
                        showNotification('Error al copiar mensaje', 'error');
                    });
                }, 500);
            };
            
            const endPress = () => {
                clearTimeout(pressTimer);
            };
            
            // Para dispositivos táctiles
            copyableText.addEventListener('touchstart', startPress);
            copyableText.addEventListener('touchend', endPress);
            copyableText.addEventListener('touchcancel', endPress);
            
            // Para mouse
            copyableText.addEventListener('mousedown', startPress);
            copyableText.addEventListener('mouseup', endPress);
            copyableText.addEventListener('mouseleave', endPress);
        }
        
        // Añadir funcionalidad de borrar mensaje (solo para el propietario)
        if (isOwn) {
            const messageContent = messageEl.querySelector('.message-content');
            let pressTimer;
            
            const startDeletePress = () => {
                pressTimer = setTimeout(() => {
                    if (confirm('¿Estás seguro de que quieres borrar este mensaje?')) {
                        deleteMessage(message.id).then(success => {
                            if (success) {
                                showNotification('Mensaje eliminado', 'success');
                            } else {
                                showNotification('Error al eliminar mensaje', 'error');
                            }
                        });
                    }
                }, 1000); // 1 segundo para borrar
            };
            
            const endDeletePress = () => {
                clearTimeout(pressTimer);
            };
            
            // Para dispositivos táctiles
            messageContent.addEventListener('touchstart', startDeletePress);
            messageContent.addEventListener('touchend', endDeletePress);
            messageContent.addEventListener('touchcancel', endDeletePress);
            
            // Para mouse (click derecho)
            messageContent.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm('¿Estás seguro de que quieres borrar este mensaje?')) {
                    deleteMessage(message.id).then(success => {
                        if (success) {
                            showNotification('Mensaje eliminado', 'success');
                        } else {
                            showNotification('Error al eliminar mensaje', 'error');
                        }
                    });
                }
            });
        }
        
        // Añadir funcionalidad de click en nickname
        const clickableUsername = messageEl.querySelector('.clickable-username');
        if (clickableUsername) {
            clickableUsername.addEventListener('click', async () => {
                const userId = clickableUsername.dataset.userId;
                // Obtener perfil completo del usuario
                const userProfile = await getUserProfile(message.firebaseUid || userId, message.isGuest);
                if (userProfile) {
                    showUserProfile(userProfile);
                } else {
                    // Fallback con datos del mensaje
                    const userData = {
                        id: userId,
                        username: message.userName,
                        avatar: message.userAvatar,
                        role: message.isGuest ? 'Invitado' : 'Usuario',
                        description: 'Usuario del chat',
                        textColor: message.textColor,
                        firebaseUid: message.firebaseUid,
                        isGuest: message.isGuest
                    };
                    showUserProfile(userData);
                }
            });
        }
        
        return messageEl;
    }
    
    function createUserElement(user) {
        let displayName = user.name;
        if (user.role === 'Administrador') displayName += ' (Admin)';
        else if (user.role === 'Moderador') displayName += ' (Mod)';
        
        const userEl = createElement(`
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-avatar">
                    <img src="${user.avatar}" alt="${user.name}">
                    <span class="online-indicator"></span>
                </div>
                <span class="user-name">${displayName}</span>
                ${(currentUser.isAdmin || currentUser.isModerator) && user.id !== currentUser.userId ? `
                    <div class="user-actions">
                        ${currentUser.isAdmin ? `<button class="mod-btn" onclick="toggleModerator('${user.id}')">Mod</button>` : ''}
                        <button class="ban-btn" onclick="banUser('${user.id}')">Ban</button>
                    </div>
                ` : ''}
            </div>
        `);
        
        userEl.addEventListener('click', async () => {
            const userProfile = await getUserProfile(user.firebaseUid || user.id, user.isGuest);
            showUserProfile(userProfile || user);
        });
        return userEl;
    }
    
    function createMobileUserElement(user) {
        let displayName = user.name;
        if (user.role === 'Administrador') displayName += ' (Admin)';
        else if (user.role === 'Moderador') displayName += ' (Mod)';
        else if (user.isGuest || user.role === 'guest') displayName += ' (invitado)';
        
        const userEl = createElement(`
            <div class="mobile-user-item" data-user-id="${user.id}">
                <div class="mobile-user-avatar">
                    <img src="${user.avatar}" alt="${user.name}" onerror="this.src='images/profileuser.jpg'">
                    <span class="mobile-online-indicator"></span>
                </div>
                <span class="mobile-user-name">${displayName}</span>
            </div>
        `);
        
        userEl.addEventListener('click', async () => {
            const userProfile = await getUserProfile(user.firebaseUid || user.id, user.isGuest);
            showUserProfile(userProfile || user);
            // Cerrar dropdown después de hacer click
            mobileUsersDropdown.classList.remove('active');
        });
        return userEl;
    }
    
    function showUserProfile(user) {
        const modal = createElement(`
            <div class="user-profile-overlay active">
                <div class="user-profile-panel">
                    <div class="user-profile-header">
                        <h3>Perfil de Usuario</h3>
                        <img src="images/close.svg" alt="Close" class="close-profile">
                    </div>
                    <div class="user-profile-content">
                        <div class="profile-avatar">
                            <img src="${user.avatar}" alt="${user.username || user.name}">
                        </div>
                        <h4>${user.username || user.name}</h4>
                        <p class="user-role">${user.role}</p>
                        <div class="profile-info">
                            <p><strong>Descripción:</strong> ${user.description || 'Sin descripción'}</p>
                            <p><strong>País:</strong> ${user.country || 'No especificado'}</p>
                            <p><strong>Rol:</strong> ${user.role}</p>
                            <p><strong>Estado:</strong> ${user.status || (user.status === 'online' ? 'En línea' : 'Desconectado')}</p>
                            <p><strong>Cuenta creada:</strong> ${user.createdAt ? getTimeAgo(user.createdAt) : 'No disponible'}</p>
                            <p><strong>Última conexión:</strong> ${user.lastSeen ? new Date(user.lastSeen).toLocaleString('es-ES') : 'Ahora'}</p>
                            <p><strong>ID de la cuenta:</strong> ${user.firebaseUid || user.id || 'No disponible'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
        modal.querySelector('.close-profile').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    function createElement(html) {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    }
    
    // Calcular tiempo transcurrido
    function getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffYears > 0) return `${diffYears} año${diffYears > 1 ? 's' : ''}`;
        if (diffMonths > 0) return `${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
        if (diffDays > 0) return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
        if (diffHours > 0) return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffMins > 0) return `${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        return 'menos de un minuto';
    }
    
    function clearSkeletons() {
        document.querySelectorAll('.skeleton-message, .skeleton-user').forEach(el => el.remove());
    }
    
    function updateUserCount(count) {
        const userCountEl = document.querySelector('.user-count');
        const mobileUserCountEl = document.querySelector('.mobile-user-count');
        const roomUserCountEl = document.querySelector('.room-user-count');
        
        if (userCountEl) {
            userCountEl.textContent = count;
        }
        if (mobileUserCountEl) {
            mobileUserCountEl.textContent = count;
        }
        if (roomUserCountEl) {
            roomUserCountEl.textContent = `(${count} usuario${count !== 1 ? 's' : ''})`;
        }
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
    
    // Validar usuario antes de inicializar
    function validateCurrentUser() {
        if (!currentUser.textColor) currentUser.textColor = '#ffffff';
        if (!currentUser.description) currentUser.description = 'Sin descripción';
        if (!currentUser.avatar) currentUser.avatar = 'images/profileuser.jpg';
        if (!currentUser.role) currentUser.role = currentUser.isGuest ? 'guest' : 'Usuario';
        if (!currentUser.status) currentUser.status = 'online';
        if (!currentUser.createdAt) currentUser.createdAt = new Date().toISOString();
        if (!currentUser.lastUpdated) currentUser.lastUpdated = new Date().toISOString();
        if (!currentUser.country) currentUser.country = 'No especificado';
        
        // Para usuarios no invitados, asegurar que firebaseUid sea el ID principal
        if (!currentUser.isGuest && currentUser.firebaseUid) {
            // Actualizar datos en Firestore con toda la información
            updateUserData({
                username: currentUser.username,
                avatar: currentUser.avatar,
                textColor: currentUser.textColor,
                description: currentUser.description,
                role: currentUser.role,
                status: currentUser.status,
                country: currentUser.country || 'No especificado'
            });
        }
        
        // Actualizar localStorage con datos corregidos
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    // Actualizar UI según permisos de administrador
    function updateAdminUI() {
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        const isAdmin = currentUser.isAdmin || currentUser.role === 'Administrador';
        
        adminOnlyElements.forEach(element => {
            element.style.display = isAdmin ? 'flex' : 'none';
        });
    }
    
    // Limpiar listeners al cambiar de sala
    function cleanupListeners() {
        if (currentUsersListener) {
            currentUsersListener();
            currentUsersListener = null;
        }
    }
    
    // Inicializar Firebase después de la carga
    async function initializeApp() {
        validateCurrentUser();
        await updateUserRole(); // Verificar rol de administrador
        updateUserHeader();
        updateAdminUI(); // Mostrar/ocultar opciones de admin
        
        // Inicializar con delay para evitar problemas de carga
        setTimeout(() => {
            setUserOnline();
            loadMessages();
            loadUsers();
        }, 500);
        
        // Limpiar skeletons después de 3 segundos
        setTimeout(clearSkeletons, 3000);
    }
    
    // Limpiar listeners al cerrar la ventana
    window.addEventListener('beforeunload', cleanupListeners);
    
    // Manejar cambios de URL (botón atrás/adelante del navegador)
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.room) {
            const roomId = event.state.room;
            currentRoomName.textContent = roomId === 'general' ? 'Sala General' : roomId;
            cleanupListeners();
            changeRoom(roomId);
            setTimeout(() => {
                loadMessages();
                loadUsers();
            }, 100);
        }
    });
    
    // Detectar cuando el usuario sale de la página
    window.addEventListener('beforeunload', () => {
        // Firebase ya maneja la desconexión automáticamente con onDisconnect
    });
    
    // Detectar cuando el usuario vuelve a la página (cambio de visibilidad)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Usuario salió de la página (cambió de pestaña, minimizó, etc.)
            console.log('Usuario salió de la página');
        } else {
            // Usuario volvió a la página
            console.log('Usuario volvió a la página');
            setUserOnline(); // Asegurar que el estado sea online
        }
    });
    
    // Esperar a que termine la carga para inicializar
    setTimeout(() => {
        initializeApp();
        // Cargar salas con un pequeño delay para asegurar que Firebase esté listo
        setTimeout(loadRooms, 1000);
    }, 4500);
    
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
    
    // Mostrar imagen en modal
    window.showImageModal = function(imageSrc) {
        const modal = createElement(`
            <div class="image-modal-overlay active">
                <div class="image-modal">
                    <img src="${imageSrc}" alt="Imagen" class="modal-image" />
                    <button class="close-modal">×</button>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    };

    // Inicializar mensajes existentes
    initializeMessages();

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', function() {
        roomsDropdown.classList.remove('active');
        if (mobileUsersDropdown) {
            mobileUsersDropdown.classList.remove('active');
        }
    });

    // Contador de caracteres y indicador de escritura
    let typingTimeout;
    messageInput.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCounter.textContent = `${currentLength}/250`;
        
        if (currentLength >= 250) {
            charCounter.style.color = '#ff4444';
        } else {
            charCounter.style.color = '#888';
        }
        
        // Estado de escritura compartido
        if (currentLength > 0) {
            setTypingStatus(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                setTypingStatus(false);
            }, 2000);
        } else {
            setTypingStatus(false);
        }
    });
    
    // Escuchar usuarios escribiendo
    listenToTyping((typingUsers) => {
        const sidebarTypingIndicator = document.querySelector('.sidebar-typing-indicator');
        
        if (typingUsers.length > 0) {
            let message;
            if (typingUsers.length === 1) {
                message = `${typingUsers[0]} está escribiendo...`;
            } else if (typingUsers.length === 2) {
                message = `${typingUsers[0]} y ${typingUsers[1]} están escribiendo...`;
            } else {
                message = `${typingUsers[0]}, ${typingUsers[1]} y ${typingUsers.length - 2} más están escribiendo...`;
            }
            typingIndicator.textContent = message;
            typingIndicator.style.display = 'block';
            
            // Mostrar también en sidebar
            if (sidebarTypingIndicator) {
                sidebarTypingIndicator.textContent = message;
                sidebarTypingIndicator.style.display = 'block';
            }
        } else {
            typingIndicator.style.display = 'none';
            if (sidebarTypingIndicator) {
                sidebarTypingIndicator.style.display = 'none';
            }
        }
    });

    // Botón de imagen
    if (imageBtn && imageInput) {
        imageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            imageInput.click();
        });
        
        // Subir imagen
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validar tipo de archivo
                if (!file.type.startsWith('image/')) {
                    showNotification('Por favor selecciona una imagen válida', 'error');
                    e.target.value = '';
                    return;
                }
                
                try {
                    showNotification('Enviando imagen...', 'warning');
                    await sendImage(file);
                    showNotification('Imagen enviada correctamente', 'success');
                    e.target.value = '';
                } catch (error) {
                    showNotification(error.message, 'error');
                    e.target.value = '';
                }
            }
        });
    }
    
    // Botón de emotes
    emoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emotePanel.classList.toggle('active');
    });
    
    // Seleccionar emote
    function setupEmoteListeners() {
        const emoteItems = document.querySelectorAll('.emote-item');
        emoteItems.forEach(item => {
            item.addEventListener('click', () => {
                console.log('Emote clicked:', item.src);
                const emoteSrc = item.src;
                // Enviar emote con el nickname del usuario
                sendMessage(currentUser.username || 'Usuario', 'emote', emoteSrc).then(() => {
                    console.log('Emote sent successfully');
                }).catch(error => {
                    console.error('Error sending emote:', error);
                    showNotification('Error al enviar emote', 'error');
                });
                emotePanel.classList.remove('active');
            });
        });
    }
    
    setupEmoteListeners();
    
    // Cerrar panel de emotes al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!emoteBtn.contains(e.target) && !emotePanel.contains(e.target)) {
            emotePanel.classList.remove('active');
        }
    });

    // Enviar mensaje
    function sendMessageHandler() {
        const message = messageInput.value.trim();
        if (message) {
            // Efecto de partículas al enviar
            const sendBtn = document.querySelector('.send-icon');
            if (sendBtn) {
                createParticleBurst(sendBtn);
            }
            
            sendMessage(message).then(() => {
                messageInput.value = '';
                charCounter.textContent = '0/250';
                charCounter.classList.remove('warning', 'danger');
            }).catch(error => {
                console.error('Error enviando mensaje:', error);
                showNotification(error.message || 'Error al enviar mensaje', 'error');
            });
        }
    }
    
    // Funciones globales para botones de moderación
    window.toggleModerator = async function(userId) {
        try {
            const isMod = await checkModeratorStatus(userId);
            if (isMod) {
                await revokeModerator(userId);
                showNotification('Permisos de moderador revocados', 'success');
            } else {
                await grantModeratorRole(userId);
                showNotification('Permisos de moderador otorgados', 'success');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    window.banUser = async function(userId) {
        const reason = prompt('Razón del baneo (opcional):') || 'Violación de reglas';
        try {
            await banUserFirebase(userId, reason);
            showNotification('Usuario baneado', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    // Función para fijar/desfijar mensajes
    window.togglePinMessage = async function(messageId, messageData) {
        try {
            const pinnedMessages = await getPinnedMessages();
            const isPinned = pinnedMessages.some(msg => msg.id === messageId);
            
            if (isPinned) {
                await unpinMessage(messageId);
                showNotification('Mensaje desfijado', 'success');
            } else {
                await pinMessage(messageId, messageData);
                showNotification('Mensaje fijado', 'success');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    sendIcon.addEventListener('click', sendMessageHandler);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessageHandler();
        }
    });
});