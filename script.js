import { sendMessage, listenToMessages, listenToUsers, setUserOnline, changeRoom, currentUser, currentRoom, updateUserData, changePassword, sendImage, sendAudio, setTypingStatus, listenToTyping, deleteMessage, updateUserRole, checkAdminStatus, checkModeratorStatus, grantModeratorRole, revokeModerator, pinMessage, unpinMessage, getPinnedMessages, banUser as banUserFirebase, muteUser, getRooms, listenToRooms, listenToAnnouncements, showAnnouncement, listenToUserStatus, processEmotes, extractYouTubeId, checkPrivateRoomAccess, requestPrivateRoomAccess, listenToRoomAccessNotifications, listenToRefreshCommand, database, ref, onValue, set, push, serverTimestamp, db } from './firebase.js';
import { AudioRecorder, formatTime, blobToBase64 } from './audio-recorder.js';
import { getUserProfile, findUserByUsername, animateMessageDeletion, initAdminListener } from './core.js';
import { setupMessageOptions, replyingTo, clearReply } from './message-options.js';
import { showBanPanel, showUnbanPanel, showMutePanel, showUnmutePanel } from './moderation-panels.js';
import { showGamesPanel } from './games-panel.js';
import { NotificationManager } from './notifications.js';

let notificationManager = new NotificationManager(currentRoom);

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
            loadingProgress += Math.random() * 25 + 15;
            
            if (loadingProgress >= 100) {
                loadingProgress = 100;
                clearInterval(interval);
                
                // Ocultar pantalla de carga después de completar
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 300);
                }, 200);
            }
            
            progressBar.style.width = loadingProgress + '%';
        }, 80);
    }
    
    // Cambiar texto cada 300ms
    const textInterval = setInterval(() => {
        updateLoadingText();
        if (currentTextIndex >= loadingTexts.length) {
            clearInterval(textInterval);
        }
    }, 300);
    
    // Iniciar simulación de carga
    setTimeout(() => {
        simulateLoading();
    }, 200);
    

    const messageInput = document.querySelector('.message-input');
    const charCounter = document.querySelector('.char-counter');
    const sendIcon = document.querySelector('.send-icon');
    const roomsBtn = document.getElementById('roomsBtn');
    const roomsPanelOverlay = document.getElementById('roomsPanelOverlay');
    const roomsPanel = document.getElementById('roomsPanel'); // No se usa directamente, pero se mantiene por si acaso
    const closeRoomsPanel = document.querySelector('.close-rooms-panel');
    const roomsTabs = document.querySelectorAll('.rooms-tab');
    const publicRoomsList = document.querySelector('.rooms-list[data-section="public"]');
    const privateRoomsList = document.querySelector('.rooms-list[data-section="private"]');
    const mobileUsersIndicator = document.querySelector('.mobile-users-indicator');
    const mobileUsersDropdown = document.querySelector('.mobile-users-dropdown');
    const currentRoomName = document.querySelector('.current-room-name');
    const userInfo = document.querySelector('.user-info');
    let unreadMessages = 0;
    let isPageVisible = true;
    let originalTitle = 'Sala General - ChatUp';
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
    const micBtn = document.querySelector('.mic-btn');
    const audioPanel = document.getElementById('audioPanel');
    const audioVisualizer = document.getElementById('audioVisualizer');
    const audioTimer = document.getElementById('audioTimer');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const deleteAudioBtn = document.getElementById('deleteAudioBtn');
    const sendAudioBtn = document.getElementById('sendAudioBtn');
    const uploadAudioBtn = document.getElementById('uploadAudioBtn');
    const closeAudioPanel = document.getElementById('closeAudioPanel');
    const audioPanelOverlay = document.getElementById('audioPanelOverlay');
    const recIndicator = document.querySelector('.rec-indicator');
    const audioInput = document.querySelector('.audio-input');
    
    let audioRecorder = new AudioRecorder();
    let isRecording = false;
    let timerInterval = null;
    let recordedAudioBlob = null;
    let recordingStartTime = null;
    const emoteBtn = document.querySelector('.emote-btn');
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



    // Toggle dropdown de usuarios móvil
    if (mobileUsersIndicator) {
        mobileUsersIndicator.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileUsersDropdown.classList.toggle('active');
        });
    }

    // Cargar salas dinámicamente con listener en tiempo real
    let roomsListener = null;
    let roomUserCountListeners = new Map();
    
    async function loadRooms() {
        try {
            if (roomsListener) return;
            
            roomsListener = listenToRooms(async (rooms) => {
                publicRoomsList.innerHTML = '';
                privateRoomsList.innerHTML = '';
                
                const publicRooms = rooms.filter(r => r.isPrivate !== true && !r.name.startsWith('Privada'));
                const privateRooms = rooms.filter(r => r.isPrivate === true || r.name.startsWith('Privada'));
                
                const generalRoom = publicRooms.find(r => r.id === 'general');
                const otherPublicRooms = publicRooms.filter(r => r.id !== 'general').sort((a, b) => {
                    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                });
                const sortedPublicRooms = generalRoom ? [generalRoom, ...otherPublicRooms] : otherPublicRooms;
                
                const sortedPrivateRooms = privateRooms.sort((a, b) => {
                    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                });
                
                // Renderizar salas públicas
                if (sortedPublicRooms.length === 0) {
                    publicRoomsList.innerHTML = '<div class="empty-rooms">No hay salas públicas</div>';
                } else {
                    for (const room of sortedPublicRooms) {
                        const roomElement = document.createElement('div');
                        roomElement.className = 'room-item-panel';
                        const currentHash = window.location.hash.substring(1);
                        if (room.id === currentHash) roomElement.classList.add('active');
                        roomElement.setAttribute('data-room', room.id);
                        roomElement.innerHTML = `
                            <span class="room-name">${room.name}</span>
                            <span class="room-user-count" data-room-id="${room.id}">0</span>
                        `;
                        publicRoomsList.appendChild(roomElement);
                        setupRoomUserCountListener(room.id);
                    }
                }
                
                // Renderizar salas privadas
                if (sortedPrivateRooms.length === 0) {
                    privateRoomsList.innerHTML = '<div class="empty-rooms">No hay salas privadas</div>';
                } else {
                    for (const room of sortedPrivateRooms) {
                        const roomElement = document.createElement('div');
                        roomElement.className = 'room-item-panel private';
                        const currentHash = window.location.hash.substring(1);
                        if (room.id === currentHash) roomElement.classList.add('active');
                        roomElement.setAttribute('data-room', room.id);
                        
                        // Obtener nombre real del creador (registrado o invitado)
                        let creatorName = 'Usuario';
                        if (room.createdByName) {
                            creatorName = room.createdByName;
                        } else if (room.createdBy) {
                            // Intentar obtener el nombre del usuario registrado
                            getUserProfile(room.createdBy, false).then(profile => {
                                if (profile && profile.username) {
                                    const creatorEl = roomElement.querySelector('.room-creator');
                                    if (creatorEl) creatorEl.textContent = `Por: ${profile.username}`;
                                }
                            }).catch(() => {
                                // Si falla, intentar obtener de invitados
                                getUserProfile(room.createdBy, true).then(profile => {
                                    if (profile && profile.username) {
                                        const creatorEl = roomElement.querySelector('.room-creator');
                                        if (creatorEl) creatorEl.textContent = `Por: ${profile.username}`;
                                    }
                                }).catch(() => {});
                            });
                        }
                        
                        roomElement.innerHTML = `
                            <div class="room-info-container">
                                <div class="room-item-name">
                                    <span class="room-item-icon">🔒</span>
                                    <span>${room.name}</span>
                                </div>
                                <small class="room-creator">Por: ${creatorName}</small>
                            </div>
                            <span class="room-user-count" data-room-id="${room.id}">0</span>
                        `;
                        privateRoomsList.appendChild(roomElement);
                        setupRoomUserCountListener(room.id);
                    }
                }
                
                // Actualizar event listeners
                setupRoomListeners();
            });
        } catch (error) {
            console.error('Error loading rooms:', error);
        }
    }
    
    function setupRoomUserCountListener(roomId) {
        if (roomUserCountListeners.has(roomId)) return;
        
        const usersRef = ref(database, `rooms/${roomId}/users`);
        const unsubscribe = onValue(usersRef, (snapshot) => {
            let count = 0;
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const userData = childSnapshot.val();
                    if (userData.status === 'online') count++;
                });
            }
            
            const countElements = document.querySelectorAll(`.room-user-count[data-room-id="${roomId}"]`);
            countElements.forEach(el => {
                el.textContent = count;
            });
        });
        
        roomUserCountListeners.set(roomId, unsubscribe);
    }
    
    function setupRoomListeners() {
        const roomItems = document.querySelectorAll('.room-item-panel');
        roomItems.forEach(item => {
            item.addEventListener('click', function() {
                const roomId = this.getAttribute('data-room');
                
                if (roomId === currentRoom) {
                    roomsPanelOverlay.classList.remove('active');
                    return;
                }
                
                window.location.hash = roomId;
            });
        });
    }
    
    // Event listeners para panel de salas
    roomsBtn.addEventListener('click', () => {
        roomsPanelOverlay.classList.add('active');
    });
    
    closeRoomsPanel.addEventListener('click', () => {
        roomsPanelOverlay.classList.remove('active');
    });
    
    roomsPanelOverlay.addEventListener('click', (e) => {
        if (e.target === roomsPanelOverlay) {
            roomsPanelOverlay.classList.remove('active');
        }
    });
    
    // Tabs de salas públicas/privadas
    roomsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            
            roomsTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (tabType === 'public') {
                publicRoomsList.classList.add('active');
                privateRoomsList.classList.remove('active');
            } else {
                publicRoomsList.classList.remove('active');
                privateRoomsList.classList.add('active');
            }
        });
    });

    // Abrir panel de usuario (ahora abre el perfil)
    userInfo.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        const loader = createElement(`<div class="profile-loader-overlay"><div class="loader-spinner"></div></div>`);
        document.body.appendChild(loader);
        
        const userProfile = await getUserProfile(currentUser.firebaseUid || currentUser.userId, currentUser.isGuest);
        loader.remove();
        showUserProfile(userProfile || currentUser);
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
            
            const commandsSection = document.querySelector('.commands-section');
            
            if (this.dataset.tab === 'config') {
                configSection.style.display = 'block';
                if (commandsSection) commandsSection.style.display = 'none';
                rulesSection.style.display = 'none';
            } else if (this.dataset.tab === 'commands') {
                configSection.style.display = 'none';
                if (commandsSection) commandsSection.style.display = 'block';
                rulesSection.style.display = 'none';
            } else {
                configSection.style.display = 'none';
                if (commandsSection) commandsSection.style.display = 'none';
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
        
        if (button) {
            button.addEventListener('click', function() {
                if (canChange(configType)) {
                    if (input) input.classList.add('active');
                    button.style.display = 'none';
                } else {
                    const timeLeft = getTimeLeft(configType);
                    showNotification(`Debes esperar ${timeLeft} para cambiar esto`, 'warning');
                }
            });
        }
        
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
                                const img = new Image();
                                const reader = new FileReader();
                                reader.onload = async (e) => {
                                    img.onload = async () => {
                                        const canvas = document.createElement('canvas');
                                        let width = img.width;
                                        let height = img.height;
                                        const maxSize = 800;
                                        
                                        if (width > height && width > maxSize) {
                                            height = (height * maxSize) / width;
                                            width = maxSize;
                                        } else if (height > maxSize) {
                                            width = (width * maxSize) / height;
                                            height = maxSize;
                                        }
                                        
                                        canvas.width = width;
                                        canvas.height = height;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(img, 0, 0, width, height);
                                        
                                        const mimeType = file.type || 'image/jpeg';
                                        const quality = (file.type === 'image/png' || file.type === 'image/gif') ? 1.0 : 0.7;
                                        updates.avatar = canvas.toDataURL(mimeType, quality);
                                        const profileImg = document.querySelector('.profile-image');
                                        if (profileImg) profileImg.src = updates.avatar;
                                        
                                        const success = await updateUserData(updates);
                                        if (success) {
                                            showNotification('Foto de perfil actualizada correctamente', 'success');
                                        } else {
                                            showNotification('Error al actualizar', 'error');
                                        }
                                        
                                        input.classList.remove('active');
                                        button.style.display = 'block';
                                    };
                                    img.src = e.target.result;
                                };
                                reader.readAsDataURL(file);
                                return;
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
                            const { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                            const auth = getAuth();
                            
                            if (!auth.currentUser) {
                                showNotification('Debes iniciar sesión nuevamente', 'error');
                                return;
                            }
                            
                            // Pedir contraseña actual para reautenticar
                            const currentPassword = prompt('Por seguridad, ingresa tu contraseña actual:');
                            if (!currentPassword) {
                                showNotification('Cambio de contraseña cancelado', 'warning');
                                return;
                            }
                            
                            // Reautenticar usuario
                            const credential = EmailAuthProvider.credential(
                                auth.currentUser.email,
                                currentPassword
                            );
                            
                            await reauthenticateWithCredential(auth.currentUser, credential);
                            
                            // Cambiar contraseña
                            await updatePassword(auth.currentUser, newPassword);
                            
                            showNotification('Contraseña actualizada correctamente', 'success');
                            input.classList.remove('active');
                            button.style.display = 'block';
                            inputField.value = '';
                            return;
                        } catch (error) {
                            if (error.code === 'auth/wrong-password') {
                                showNotification('Contraseña actual incorrecta', 'error');
                            } else if (error.code === 'auth/requires-recent-login') {
                                showNotification('Debes iniciar sesión nuevamente', 'error');
                            } else {
                                showNotification('Error al cambiar contraseña: ' + error.message, 'error');
                            }
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
            if (file.size > 3 * 1024 * 1024) { // 3MB
                reject(new Error('La imagen debe ser menor a 3MB'));
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
        if (width <= 767) return 150; // Móvil
        if (width <= 1023) return 250; // Tablet
        return 300; // Desktop
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
    
    // Variable global para controlar acceso a sala privada
    let hasPrivateRoomAccess = false;
    let isLoadingMessages = false;
    let messagesCache = {};
    let firstLoad = true;
    
    // Funciones de Firebase
    async function loadMessages() {
        if (isLoadingMessages) return;
        isLoadingMessages = true;
        
        const chatArea = document.querySelector('.chat-area');
        
        // Mostrar caché inmediatamente si existe
        if (messagesCache[currentRoom] && messagesCache[currentRoom].length > 0) {
            renderMessages(messagesCache[currentRoom]);
            initializeMessages();
            isLoadingMessages = false;
        } else {
            chatArea.innerHTML = '<div class="chat-loader"></div>';
            setTimeout(() => {
                const loader = chatArea.querySelector('.chat-loader');
                if (loader) loader.remove();
            }, 1000);
        }
        
        // Verificar acceso a sala privada (en paralelo)
        const accessCheck = await checkPrivateRoomAccess(currentRoom);
        
        // Si no es sala privada, cargar normalmente
        if (!accessCheck.isPrivate) {
            hasPrivateRoomAccess = true;
            enableChatControls();
            listenToMessages((messages, isInitial) => {
                if (isLoadingMessages) isLoadingMessages = false;
                
                if (isInitial) {
                    messagesCache[currentRoom] = messages;
                    renderMessages(messages, true);
                    if (firstLoad) {
                        initializeMessages();
                        firstLoad = false;
                    }
                } else {
                    renderMessages(messages, false);
                }
            });
            return;
        }
        
        // Es sala privada - verificar permisos
        if (accessCheck.isOwner || accessCheck.hasAccess) {
            hasPrivateRoomAccess = true;
            enableChatControls();
            listenToMessages((messages, isInitial) => {
                isLoadingMessages = false;
                
                if (isInitial) {
                    messagesCache[currentRoom] = messages;
                    renderMessages(messages, true);
                    if (firstLoad) {
                        initializeMessages();
                        firstLoad = false;
                    }
                } else {
                    renderMessages(messages, false);
                }
            });
        } else if (accessCheck.isPending) {
            hasPrivateRoomAccess = false;
            isLoadingMessages = false;
            chatArea.innerHTML = '<div class="room-loader"><p>Solicitud pendiente</p></div>';
            disableChatControls();
        } else {
            hasPrivateRoomAccess = false;
            await requestPrivateRoomAccess(currentRoom);
            isLoadingMessages = false;
            chatArea.innerHTML = '<div class="room-loader"><p>Solicitud enviada</p></div>';
            disableChatControls();
        }
    }
    
    // Deshabilitar controles de chat
    function disableChatControls() {
        messageInput.disabled = true;
        messageInput.placeholder = 'Esperando acceso a sala privada...';
        sendIcon.style.pointerEvents = 'none';
        sendIcon.style.opacity = '0.5';
        imageBtn.style.pointerEvents = 'none';
        imageBtn.style.opacity = '0.5';
        micBtn.style.pointerEvents = 'none';
        micBtn.style.opacity = '0.5';
        emoteBtn.style.pointerEvents = 'none';
        emoteBtn.style.opacity = '0.5';
    }
    
    // Habilitar controles de chat
    function enableChatControls() {
        messageInput.disabled = false;
        messageInput.placeholder = 'Escribe tu mensaje...';
        sendIcon.style.pointerEvents = 'auto';
        sendIcon.style.opacity = '1';
        imageBtn.style.pointerEvents = 'auto';
        imageBtn.style.opacity = '1';
        micBtn.style.pointerEvents = 'auto';
        micBtn.style.opacity = '1';
        emoteBtn.style.pointerEvents = 'auto';
        emoteBtn.style.opacity = '1';
    }
    
    let currentUsersListener = null;
    let currentTypingListener = null;
    let roomEventsListener = null;
    let processedEvents = new Set();
    let previousUsersList = new Map();
    let isFirstLoad = true;
    
    function loadUsers() {
        if (currentUsersListener) {
            currentUsersListener();
        }
        
        currentUsersListener = listenToUsers((users) => {
            const currentUsersList = new Map();
            
            users.forEach(user => {
                currentUsersList.set(user.id, { name: user.name, firebaseUid: user.firebaseUid, isGuest: user.isGuest });
                
                // Solo mostrar notificación si no es la primera carga y el usuario no estaba antes
                if (!isFirstLoad && !previousUsersList.has(user.id) && user.id !== currentUser.userId) {
                    notificationManager.userJoined(user.name, user.firebaseUid || user.id);
                }
            });
            
            // Detectar usuarios que salieron
            if (!isFirstLoad) {
                previousUsersList.forEach((userData, userId) => {
                    if (!currentUsersList.has(userId) && userId !== currentUser.userId) {
                        notificationManager.userLeft(userData.name, null, userData.firebaseUid || userId);
                    }
                });
            }
            
            previousUsersList = currentUsersList;
            isFirstLoad = false;
            renderUsers(users);
        });
        
        listenToRoomEvents();
    }

    
    async function listenToRoomEvents() {
        try {
            const { database, currentUser } = await import('./firebase.js');
            const { ref, onValue, query: dbQuery, limitToLast } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const eventsRef = dbQuery(ref(database, 'roomEvents'), limitToLast(10));
            
            roomEventsListener = onValue(eventsRef, (snapshot) => {
                snapshot.forEach(async (childSnapshot) => {
                    const event = childSnapshot.val();
                    const eventId = childSnapshot.key;
                    
                    if (processedEvents.has(eventId)) return;
                    processedEvents.add(eventId);
                    
                    const eventTime = event.timestamp || 0;
                    const now = Date.now();
                    if (now - eventTime > 5000) return;
                    
                    if (event.type === 'room-change' && event.fromRoom === currentRoom && event.userId !== currentUser.userId) {
                        notificationManager.userLeft(event.username, event.toRoom, event.userId);
                    }
                });
            });
        } catch (error) {
            console.error('Error setting up room events listener:', error);
        }
    }

    
    let lastMessageCount = 0;
    
    // Event delegation para botones de velocidad (solo una vez)
    const chatArea = document.querySelector('.chat-area');
    if (chatArea && !chatArea.dataset.speedListenerAdded) {
        chatArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('speed-btn')) {
                const audioId = e.target.dataset.audio;
                const speed = parseFloat(e.target.dataset.speed);
                const audioElement = document.getElementById(audioId);
                
                if (audioElement) {
                    audioElement.playbackRate = speed;
                    
                    // Actualizar botones activos
                    const speedBtns = e.target.parentElement.querySelectorAll('.speed-btn');
                    speedBtns.forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                }
            }
            
            // Click en avatar de mensaje
            if (e.target.classList.contains('clickable-avatar')) {
                const messageContainer = e.target.closest('.message-container');
                if (messageContainer) {
                    const messageId = messageContainer.dataset.messageId;
                    const messages = document.querySelectorAll('.message-container');
                    for (const msg of messages) {
                        if (msg.dataset.messageId === messageId) {
                            const usernameEl = msg.querySelector('.clickable-username');
                            if (usernameEl) {
                                usernameEl.click();
                                break;
                            }
                        }
                    }
                }
            }
        });
        chatArea.dataset.speedListenerAdded = 'true';
    }
    
    function renderMessages(messages, isInitialLoad = true) {
        const chatArea = document.querySelector('.chat-area');
        const wasAtBottom = chatArea.scrollHeight - chatArea.scrollTop <= chatArea.clientHeight + 50;
        
        if (isInitialLoad) {
            chatArea.innerHTML = '';
            lastMessageCount = messages.length;
            
            const sortedMessages = messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            
            sortedMessages.forEach((message) => {
                const messageEl = createMessageElement(message);
                chatArea.appendChild(messageEl);
                
                if (message.type === 'audio') {
                    const audioElement = document.getElementById(`audio-${message.id}`);
                    if (audioElement) audioElement.playbackRate = 1;
                }
            });
            
            requestAnimationFrame(() => {
                chatArea.scrollTop = chatArea.scrollHeight;
            });
        } else {
            messages.forEach((message) => {
                if (chatArea.querySelector(`[data-message-id="${message.id}"]`)) return;
                
                const messageEl = createMessageElement(message);
                chatArea.appendChild(messageEl);
                
                if (message.type === 'audio') {
                    const audioElement = document.getElementById(`audio-${message.id}`);
                    if (audioElement) audioElement.playbackRate = 1;
                }
                
                lastMessageCount++;
                if (!isPageVisible) {
                    unreadMessages++;
                    document.title = `(${unreadMessages}) ${originalTitle}`;
                }
            });
            
            if (wasAtBottom) {
                requestAnimationFrame(() => {
                    chatArea.scrollTop = chatArea.scrollHeight;
                });
            }
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
        const isReplyToMe = message.replyTo && message.replyTo.userId === currentUser.userId;
        const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Manejar mensajes del sistema
        if (message.type === 'system') {
            const systemEl = createElement(`
                <div class="message-container system-message" data-message-id="${message.id}">
                    <div class="message system">
                        <div class="message-content" style="color: ${message.textColor || '#00ff00'};">
                            <div class="message-text">${message.typewriterEffect ? '' : message.text}</div>
                        </div>
                    </div>
                </div>
            `);
            
            // Aplicar efecto de tipeo si está habilitado
            if (message.typewriterEffect) {
                const textEl = systemEl.querySelector('.message-text');
                const text = message.text;
                let i = 0;
                const typeInterval = setInterval(() => {
                    if (i < text.length) {
                        textEl.textContent += text.charAt(i);
                        i++;
                    } else {
                        clearInterval(typeInterval);
                    }
                }, 50); // Aumentamos la velocidad para una mejor experiencia
            }
            
            // Manejar cuenta regresiva
            if (message.countdown) {
                const textEl = systemEl.querySelector('.message-text');
                let countdown = message.countdown;
                
                const updateCountdown = () => {
                    textEl.textContent = `⚠️ El historial del chat será eliminado en ${countdown} segundos.`;
                };
                
                updateCountdown();
                
                const intervalId = setInterval(() => {
                    countdown--;
                    if (countdown >= 0) {
                        updateCountdown();
                    } else {
                        clearInterval(intervalId);
                    }
                }, 1000);

                // Limpiar el intervalo si el mensaje es eliminado del DOM
                const observer = new MutationObserver((mutations) => {
                    if (!document.body.contains(systemEl)) {
                        clearInterval(intervalId);
                        observer.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
            
            return systemEl;
        }
        
        // Manejar notificaciones de sistema (entrada/salida)
        if (message.type === 'system-notification') {
            const notifEl = createElement(`
                <div class="message-container system-notification" data-message-id="${message.id}">
                    <div class="message system-notif">
                        <div class="message-text">${message.text}</div>
                    </div>
                </div>
            `);
            
            if (message.notificationUserId) {
                const textEl = notifEl.querySelector('.message-text');
                textEl.style.cursor = 'pointer';
                textEl.addEventListener('click', async () => {
                    const userProfile = await getUserProfile(message.notificationUserId, false);
                    if (userProfile) {
                        showUserProfile(userProfile);
                    }
                });
            }
            
            return notifEl;
        }
        
        // Manejar mensajes de juegos
        if (message.type === 'game' && message.gameLink) {
            const createdAt = message.timestamp || Date.now();
            const expiresAt = createdAt + (20 * 60 * 1000);
            const isExpired = Date.now() > expiresAt;
            
            const gameEl = createElement(`
                <div class="message-container game-message" data-message-id="${message.id}" data-expires="${expiresAt}">
                    <div class="message system">
                        <div class="message-content">
                            <div class="message-text">${message.text}</div>
                            <button class="game-join-btn ${isExpired ? 'expired' : ''}" data-game-link="${message.gameLink}" ${isExpired ? 'disabled' : ''}>${isExpired ? '⏱️ Juego Finalizado' : '🎮 Entrar a Jugar'}</button>
                        </div>
                    </div>
                </div>
            `);
            
            const btn = gameEl.querySelector('.game-join-btn');
            if (!isExpired) {
                btn.addEventListener('click', () => {
                    window.open(message.gameLink, '_blank');
                });
                
                const timeUntilExpiry = expiresAt - Date.now();
                if (timeUntilExpiry > 0) {
                    setTimeout(() => {
                        btn.textContent = '⏱️ Juego Finalizado';
                        btn.classList.add('expired');
                        btn.disabled = true;
                    }, timeUntilExpiry);
                }
            }
            
            return gameEl;
        }
        
        // Manejar resultados de juegos
        if (message.type === 'game-result') {
            const resultEl = createElement(`
                <div class="message-container game-result-message" data-message-id="${message.id}">
                    <div class="message system">
                        <div class="message-content">
                            <div class="message-text">${message.text}</div>
                            ${message.gameLink ? `<button class="game-view-btn" data-game-link="${message.gameLink}">👁️ Ver Rondas</button>` : ''}
                        </div>
                    </div>
                </div>
            `);
            
            if (message.gameLink) {
                resultEl.querySelector('.game-view-btn').addEventListener('click', () => {
                    window.open(message.gameLink, '_blank');
                });
            }
            
            return resultEl;
        }
        
        // Mostrar rol del usuario
        let displayName = message.userName;
        let roleTag = '';
        
        if (message.isGuest) {
            displayName += ' (invitado)';
        } else if (message.isDeveloper || message.role === 'Desarrollador') {
            roleTag = '<span class="dev-tag">DEV</span>';
        } else if (message.isAdmin || message.role === 'Administrador') {
            roleTag = '<span class="admin-tag">ADMIN</span>';
        } else if (message.isModerator || message.role === 'Moderador') {
            roleTag = '<span class="mod-tag">MOD</span>';
        }
        
        const replyLabel = message.replyTo && message.replyTo.text ? (isOwn ? 'Respondiste a' : 'Respondió a') : '';
        const replyPreview = message.replyTo && message.replyTo.text ? `
            <div class="reply-preview">
                <img src="/images/reply.svg" class="reply-icon" />
                <div class="reply-content">
                    <span class="reply-label">${replyLabel}</span>
                    <span class="reply-username">${message.replyTo.userName || 'Usuario'}</span>
                    <span class="reply-text">${message.replyTo.text.substring(0, 50)}${message.replyTo.text.length > 50 ? '...' : ''}</span>
                </div>
            </div>
        ` : '';
        
        const messageEl = message.type === 'emote' ? 
            createElement(`
                <div class="message-container" data-message-id="${message.id}">
                    <div class="message ${isOwn ? 'sent' : 'received'}">
                        <div class="message-header">
                            ${isOwn ? `
                                <span class="message-time">${time}</span>
                                <span class="message-username clickable-username" data-user-id="${message.userId}" style="color: ${message.textColor || currentUser.textColor || '#ffffff'}">${displayName}</span>
                                ${roleTag}
                                <img src="${message.userAvatar}" alt="User" class="message-avatar clickable-avatar" data-user-id="${message.userId}" style="cursor: pointer;">
                            ` : `
                                <img src="${message.userAvatar}" alt="User" class="message-avatar clickable-avatar" data-user-id="${message.userId}" style="cursor: pointer;">
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
                                <img src="${message.userAvatar}" alt="User" class="message-avatar clickable-avatar" data-user-id="${message.userId}" style="cursor: pointer;">
                            ` : `
                                <img src="${message.userAvatar}" alt="User" class="message-avatar clickable-avatar" data-user-id="${message.userId}" style="cursor: pointer;">
                                <span class="message-username clickable-username" data-user-id="${message.userId}" style="color: ${message.textColor || '#ffffff'}">${displayName}</span>
                                ${roleTag}
                                <span class="message-time">${time}</span>
                            `}
                        </div>
                        ${message.type === 'audio' ? 
                            `<div class="audio-message">
                                <div class="audio-player-container">
                                    <audio controls class="audio-player" id="audio-${message.id}" src="${message.audioData}"></audio>
                                </div>
                                <div class="audio-speed">
                                    <span>Velocidad:</span>
                                    <button class="speed-btn" data-speed="0.5" data-audio="audio-${message.id}">0.5x</button>
                                    <button class="speed-btn active" data-speed="1" data-audio="audio-${message.id}">1x</button>
                                    <button class="speed-btn" data-speed="1.5" data-audio="audio-${message.id}">1.5x</button>
                                    <button class="speed-btn" data-speed="2" data-audio="audio-${message.id}">2x</button>
                                </div>
                                <span class="audio-duration">🎤 ${formatTime(message.audioDuration || 0)}</span>
                            </div>` :
                        `<div class="message-content">
                            ${message.type === 'image' ? 
                                `<img src="${message.imageData}" alt="Imagen" class="message-image" onclick="showImageModal('${message.imageData}')" />` :
                                `${message.text ? '<button class="message-options-btn">⋮</button>' : ''}${replyPreview}${(() => {
                                    const youtubeId = extractYouTubeId(message.text);
                                    if (youtubeId) {
                                        return `<div class="youtube-embed"><iframe width="100%" height="200" src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
                                    } else {
                                        return `<div class="message-text copyable-text">${processEmotes(message.text)}</div>${message.text && message.text.length > getCharacterLimit() ? '<span class="see-more">ver más</span>' : ''}`;
                                    }
                                })()}`
                            }
                        </div>`
                        }
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
        

        
        // Configurar menú de opciones
        if (message.type !== 'audio' && message.type !== 'image' && message.type !== 'emote') {
            setupMessageOptions(messageEl, message, currentUser, sendMessage, deleteMessage, showNotification);
        }
        
        const clickableUsername = messageEl.querySelector('.clickable-username');
        if (clickableUsername) {
            clickableUsername.addEventListener('click', async () => {
                const userId = clickableUsername.dataset.userId;
                
                const loader = createElement(`<div class="profile-loader-overlay"><div class="loader-spinner"></div></div>`);
                document.body.appendChild(loader);
                
                const userProfile = await getUserProfile(message.firebaseUid || userId, message.isGuest);
                loader.remove();
                
                if (userProfile) {
                    showUserProfile(userProfile);
                } else {
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
    
    let userNumericIds = new Map();
    let currentNumericId = 1;
    let guestNumericIds = new Map();
    let currentGuestId = 1000;
    
    function createUserElement(user) {
        let displayName = user.name;
        let userNumId = '';
        let roleTag = '';
        
        if (user.isDeveloper || user.role === 'Desarrollador') {
            roleTag = '<span class="dev-tag">DEV</span>';
        } else if (user.isAdmin || user.role === 'Administrador') {
            roleTag = '<span class="admin-tag">ADMIN</span>';
        } else if (user.isModerator || user.role === 'Moderador') {
            roleTag = '<span class="mod-tag">MOD</span>';
        }
        
        // Asignar ID numérico para admins/mods
        if (currentUser.isAdmin || currentUser.isModerator) {
            if (user.isGuest) {
                // ID de 4 dígitos para invitados
                if (!guestNumericIds.has(user.firebaseUid || user.id)) {
                    guestNumericIds.set(user.firebaseUid || user.id, currentGuestId++);
                }
                const guestId = guestNumericIds.get(user.firebaseUid || user.id);
                userNumId = `<span class="user-id guest-id">#${guestId}</span>`;
            } else {
                // ID corto para usuarios registrados
                if (!userNumericIds.has(user.firebaseUid || user.id)) {
                    userNumericIds.set(user.firebaseUid || user.id, currentNumericId++);
                }
                const numId = userNumericIds.get(user.firebaseUid || user.id);
                userNumId = `<span class="user-id">#${numId}</span>`;
            }
        }
        
        const canModerate = (currentUser.isAdmin || currentUser.isModerator) && user.id !== currentUser.userId && !user.isGuest;
        
        const userEl = createElement(`
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-avatar">
                    <img src="${user.avatar}" alt="${user.name}">
                    <span class="online-indicator"></span>
                </div>
                <span class="user-name">${userNumId}${displayName}${roleTag}</span>
                ${canModerate ? `
                    <div class="user-actions">
                        ${currentUser.isAdmin ? `<button class="mod-btn" data-action="mod" data-user-id="${user.firebaseUid || user.id}">Mod</button>` : ''}
                        <button class="mute-btn" data-action="mute" data-user-id="${user.firebaseUid || user.id}">Mute</button>
                        <button class="ban-btn" data-action="ban" data-user-id="${user.firebaseUid || user.id}">Ban</button>
                    </div>
                ` : ''}
            </div>
        `);
        
        // Click en nombre para ver perfil
        userEl.querySelector('.user-name').addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const loader = createElement(`<div class="profile-loader-overlay"><div class="loader-spinner"></div></div>`);
            document.body.appendChild(loader);
            
            const userProfile = await getUserProfile(user.firebaseUid || user.id, user.isGuest);
            loader.remove();
            showUserProfile(userProfile || user);
        });
        
        // Botones de moderación
        if (canModerate) {
            userEl.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const targetUserId = btn.dataset.userId;
                    
                    if (action === 'ban') {
                        const reason = prompt('Razón del baneo:', 'Violación de reglas');
                        if (reason !== null) {
                            try {
                                const { banUser } = await import('./firebase.js');
                                await banUser(targetUserId, reason);
                                showNotification('Usuario baneado exitosamente', 'success');
                            } catch (error) {
                                showNotification(error.message, 'error');
                            }
                        }
                    } else if (action === 'mute') {
                        try {
                            const { muteUser } = await import('./firebase.js');
                            await muteUser(targetUserId, 5 * 60 * 1000); // 5 minutos
                            showNotification('Usuario muteado por 5 minutos', 'success');
                        } catch (error) {
                            showNotification(error.message, 'error');
                        }
                    } else if (action === 'mod') {
                        try {
                            const { checkModeratorStatus, grantModeratorRole, revokeModerator } = await import('./firebase.js');
                            const isMod = await checkModeratorStatus(targetUserId);
                            if (isMod) {
                                await revokeModerator(targetUserId);
                                showNotification('Permisos de moderador revocados', 'success');
                            } else {
                                await grantModeratorRole(targetUserId);
                                showNotification('Permisos de moderador otorgados', 'success');
                            }
                        } catch (error) {
                            showNotification(error.message, 'error');
                        }
                    }
                });
            });
        }
        
        return userEl;
    }
    
    function createMobileUserElement(user) {
        let roleTag = '';
        if (user.isDeveloper || user.role === 'Desarrollador') {
            roleTag = '<span class="dev-tag">DEV</span>';
        } else if (user.isAdmin || user.role === 'Administrador') {
            roleTag = '<span class="admin-tag">ADMIN</span>';
        } else if (user.isModerator || user.role === 'Moderador') {
            roleTag = '<span class="mod-tag">MOD</span>';
        }
        
        const userEl = createElement(`
            <div class="mobile-user-item" data-user-id="${user.id}">
                <div class="mobile-user-avatar">
                    <img src="${user.avatar}" alt="${user.name}" onerror="this.src='/images/profileuser.svg'">
                    <span class="mobile-online-indicator"></span>
                </div>
                <span class="mobile-user-name">${user.name}${roleTag}</span>
            </div>
        `);
        
        userEl.addEventListener('click', async () => {
            const loader = createElement(`<div class="profile-loader-overlay"><div class="loader-spinner"></div></div>`);
            document.body.appendChild(loader);
            
            const userProfile = await getUserProfile(user.firebaseUid || user.id, user.isGuest);
            loader.remove();
            showUserProfile(userProfile || user);
            mobileUsersDropdown.classList.remove('active');
        });
        return userEl;
    }
    
    function showUserProfile(user) {
        const isOnline = user.status === 'online';
        const userColor = user.textColor || '#ffffff';
        const countryFlag = user.country || '';
        const fullUid = user.firebaseUid || user.id || 'N/A';
        const hasCountry = countryFlag && countryFlag !== 'No especificado' && countryFlag !== '🌎';
        const isOwnProfile = (user.firebaseUid || user.id) === (currentUser.firebaseUid || currentUser.userId);
        
        const modal = createElement(`
            <div class="user-profile-overlay active">
                <div class="user-profile-panel">
                    <div class="user-profile-header">
                        ${isOwnProfile ? '<button class="config-panel-btn" id="openConfigPanel"><img src="/images/config.svg" alt="Config" /></button>' : ''}
                        <img src="images/close.svg" alt="Close" class="close-profile">
                    </div>
                    <div class="user-profile-content">
                        <div class="profile-avatar">
                            <div class="profile-country-badge">
                                ${hasCountry ? `<span class="profile-country-flag">${countryFlag}</span>` : `<img src="/images/planeta.svg" class="profile-country-icon" alt="Planeta" />`}
                            </div>
                            <img src="${user.avatar}" alt="${user.username || user.name}">
                        </div>
                        <div class="profile-username" style="color: ${userColor};">${user.username || user.name}</div>
                        <div class="profile-role-tag">
                            <span class="profile-role-badge ${user.role === 'Desarrollador' ? 'developer' : user.role === 'Administrador' ? 'admin' : user.role === 'Moderador' ? 'mod' : 'user'}">${user.role || 'Usuario'}</span>
                        </div>
                        ${user.description ? `<div class="profile-user-description">${user.description}</div>` : ''}
                        
                        <div class="profile-tabs">
                            <button class="profile-tab active" data-section="info">Info</button>
                            <button class="profile-tab" data-section="stats">Stats</button>
                        </div>
                        
                        <div class="profile-sections">
                            <div class="profile-section active" data-section="info">
                                <div class="profile-info-row">
                                    <div class="profile-info-half">
                                        <span class="profile-info-value">
                                            <img src="/images/time.svg" class="profile-info-icon" alt="Time" style="margin: 0;" />
                                            ${user.createdAt ? getTimeAgo(user.createdAt) : 'Reciente'}
                                        </span>
                                    </div>
                                    <div class="profile-info-half">
                                        <button class="copy-uid-btn" data-uid="${fullUid}">Copiar ID</button>
                                    </div>
                                </div>
                                <div class="profile-field-label">Última conexión</div>
                                <div class="profile-info-item" style="justify-content: center;">
                                    <span class="profile-info-value">${isOnline ? 'Conectado ahora' : (user.lastSeen ? getTimeAgo(user.lastSeen) : 'Desconocido')}</span>
                                </div>
                                ${isOwnProfile ? '<button class="profile-edit-btn" id="logoutBtn">Cerrar Sesión</button>' : ''}
                            </div>
                            
                            <div class="profile-section" data-section="stats">
                                <div class="profile-stats-grid">
                                    <div class="stat-item level-stat">
                                        <div class="level-circle">
                                            <svg width="50" height="50">
                                                <circle class="level-circle-bg" cx="25" cy="25" r="22"></circle>
                                                <circle class="level-circle-progress" cx="25" cy="25" r="22" 
                                                    stroke-dasharray="${2 * Math.PI * 22}" 
                                                    stroke-dashoffset="${2 * Math.PI * 22 * (1 - ((user.level || 1) % 1))}"></circle>
                                            </svg>
                                            <div class="level-number">
                                                <span class="level-value">${Math.floor(user.level || 1)}</span>
                                                <span class="level-text">Nivel</span>
                                            </div>
                                        </div>
                                        <span class="stat-label">Nivel</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value">${user.wins || 0}</span>
                                        <span class="stat-label">Victorias</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value">${user.losses || 0}</span>
                                        <span class="stat-label">Derrotas</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value">${user.draws || 0}</span>
                                        <span class="stat-label">Empates</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);
        
        // Efecto de tipeo en username (sin cursor, más lento)
        const usernameEl = modal.querySelector('.profile-username');
        if (usernameEl) {
            const text = usernameEl.textContent;
            usernameEl.textContent = '';
            let i = 0;
            const typeInterval = setInterval(() => {
                if (i < text.length) {
                    usernameEl.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(typeInterval);
                }
            }, 150);
        }
        
        // Botón de configuración
        const configBtn = modal.querySelector('#openConfigPanel');
        if (configBtn) {
            configBtn.addEventListener('click', () => {
                modal.remove();
                userPanelOverlay.classList.add('active');
            });
        }
        
        // Botón cerrar sesión
        const logoutBtn = modal.querySelector('#logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    if (!currentUser.isGuest) {
                        const { getAuth, signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                        const auth = getAuth();
                        await signOut(auth);
                    }
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                } finally {
                    localStorage.removeItem('currentUser');
                    window.location.href = 'login.html';
                }
            });
        }
        
        // Copy UID functionality
        const copyBtn = modal.querySelector('.copy-uid-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const uid = copyBtn.dataset.uid;
                navigator.clipboard.writeText(uid).then(() => {
                    copyBtn.textContent = '✔';
                    setTimeout(() => {
                        copyBtn.textContent = '📋';
                    }, 1500);
                });
            });
        }
        
        // Tabs functionality
        modal.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.dataset.section;
                modal.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.profile-section').forEach(s => s.classList.remove('active'));
                tab.classList.add('active');
                modal.querySelector(`.profile-section[data-section="${section}"]`).classList.add('active');
            });
        });
        
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
        
        if (diffYears > 0) return `Hace ${diffYears} año${diffYears > 1 ? 's' : ''}`;
        if (diffMonths > 0) return `Hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
        if (diffDays > 0) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        if (diffHours > 0) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffMins > 0) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        return 'Hace menos de un minuto';
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
        if (!currentUser.avatar) currentUser.avatar = 'images/profileuser.svg';
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
        if (currentTypingListener) {
            currentTypingListener();
            currentTypingListener = null;
        }
    }
    
    async function initializeApp() {
        validateCurrentUser();
        
        let hash = window.location.hash.substring(1);
        if (!hash) {
            hash = 'general';
            window.location.hash = 'general';
        }
        
        notificationManager = new NotificationManager(hash);
        
        const roomDisplayName = hash === 'general' ? 'Sala General' : hash;
        currentRoomName.textContent = roomDisplayName;
        originalTitle = `${roomDisplayName} - ChatUp`;
        document.title = originalTitle;
        
        // Cargar fondo guardado
        const savedBackground = localStorage.getItem('chatBackground');
        if (savedBackground) {
            document.querySelector('.chat-area').style.backgroundImage = `url(${savedBackground})`;
            document.querySelector('.chat-area').style.backgroundSize = 'cover';
            document.querySelector('.chat-area').style.backgroundPosition = 'center';
            document.querySelector('.chat-area').style.backgroundAttachment = 'fixed';
        }
        
        // Verificar baneo ANTES de cualquier otra cosa
        try {
            const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            
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
            const db = getFirestore(app);
            
            if (!currentUser.isGuest && currentUser.firebaseUid) {
                const bannedDoc = await getDoc(doc(db, 'banned', currentUser.firebaseUid));
                if (bannedDoc.exists()) {
                    window.location.replace('banned.html');
                    return;
                }
                
                if (currentUser.ip) {
                    const bannedIPDoc = await getDoc(doc(db, 'bannedIPs', currentUser.ip.replace(/\./g, '_')));
                    if (bannedIPDoc.exists()) {
                        window.location.replace('banned.html');
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking ban status:', error);
        }
        
        await updateUserRole();
        updateUserHeader();
        updateAdminUI();
        updateGuestUI();
        initAdminListener();
        
        const roomHash = window.location.hash.substring(1) || 'general';
        changeRoom(roomHash, true);
        loadMessages();
        loadUsers();
        setupRoomDeletedListener();
        
        setTimeout(clearSkeletons, 1000);
    }
    
    function updateGuestUI() {
        if (currentUser.isGuest) {
            const passwordItem = document.querySelector('.config-item[data-config="password"]');
            const deleteAccountItem = document.querySelector('.config-item.danger');
            if (passwordItem) passwordItem.style.display = 'none';
            if (deleteAccountItem) deleteAccountItem.style.display = 'none';
        }
    }
    
    // Limpiar listeners al cerrar la ventana
    window.addEventListener('beforeunload', cleanupListeners);
    
    // Manejar cambios de URL (botón atrás/adelante del navegador y cambios de hash)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (hash && hash !== currentRoom) {
            const roomId = hash;
            const roomDisplayName = roomId === 'general' ? 'Sala General' : roomId;
            
            currentRoomName.textContent = roomDisplayName;
            originalTitle = `${roomDisplayName} - ChatUp`;
            document.title = originalTitle;
            unreadMessages = 0;
            
            document.querySelectorAll('.room-item-panel').forEach(r => {
                if (r.getAttribute('data-room') === roomId) {
                    r.classList.add('active');
                } else {
                    r.classList.remove('active');
                }
            });
            
            const chatArea = document.querySelector('.chat-area');
            if (!messagesCache[roomId] || messagesCache[roomId].length === 0) {
                chatArea.innerHTML = '<div class="chat-loader"></div>';
                setTimeout(() => {
                    const loader = chatArea.querySelector('.chat-loader');
                    if (loader) loader.remove();
                }, 1000);
            } else {
                chatArea.innerHTML = '';
            }
            
            cleanupListeners();
            processedEvents.clear();
            lastMessageCount = 0;
            isLoadingMessages = false;
            isFirstLoad = true;
            previousUsersList.clear();
            
            if (notificationManager) {
                notificationManager.updateRoom(roomId);
            }
            
            changeRoom(roomId, false).then(() => {
                loadMessages();
                loadUsers();
                startTypingListener();
                setupRoomDeletedListener();
            });
            
            roomsPanelOverlay.classList.remove('active');
        }
    });
    
    // Detectar cuando el usuario sale de la página
    window.addEventListener('beforeunload', () => {
        // Firebase ya maneja la desconexión automáticamente con onDisconnect
    });
    
    // Detectar cuando el usuario vuelve a la página (cambio de visibilidad)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isPageVisible = false;
        } else {
            isPageVisible = true;
            unreadMessages = 0;
            document.title = originalTitle;
            setUserOnline();
        }
    });
    
    // Escuchar anuncios globales
    listenToAnnouncements((message) => {
        showAnnouncement(message);
    });
    
    // Escuchar cambios en estado de baneo/mute
    const userIdToCheck = currentUser.firebaseUid || currentUser.userId;
    let muteTimerInterval = null;
    let muteTimerPanel = null;
    
    if (userIdToCheck) {
        listenToUserStatus((status) => {
            if (status.type === 'banned') {
                window.location.replace('banned.html');
            }
        });
        
        // Listener en tiempo real para muteo
        (async () => {
            const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const mutedDocRef = doc(db, 'muted', userIdToCheck);
            
            onSnapshot(mutedDocRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const mutedUntil = data.mutedUntil;
                    
                    if (!mutedUntil || isNaN(mutedUntil)) {
                        console.error('mutedUntil inválido:', mutedUntil);
                        return;
                    }
                    
                    messageInput.disabled = true;
                    messageInput.placeholder = 'Estás muteado';
                    imageBtn.style.pointerEvents = 'none';
                    imageBtn.style.opacity = '0.5';
                    emoteBtn.style.pointerEvents = 'none';
                    emoteBtn.style.opacity = '0.5';
                    micBtn.style.pointerEvents = 'none';
                    micBtn.style.opacity = '0.5';
                    const pollsBtn = document.querySelector('.polls-btn');
                    if (pollsBtn) {
                        pollsBtn.style.pointerEvents = 'none';
                        pollsBtn.style.opacity = '0.5';
                    }
                    sendIcon.style.pointerEvents = 'none';
                    sendIcon.style.opacity = '0.5';
                    
                    if (muteTimerInterval) clearInterval(muteTimerInterval);
                    if (muteTimerPanel) muteTimerPanel.remove();
                    
                    const remaining = mutedUntil - Date.now();
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    
                    muteTimerPanel = createElement(`
                        <div class="mute-timer-panel">
                            <img src="/images/mute.svg" alt="Muted" class="mute-timer-icon" />
                            <span class="mute-timer-text">Muteado - Tiempo restante: <strong class="mute-timer-countdown">${minutes}m ${seconds}s</strong></span>
                        </div>
                    `);
                    
                    document.body.appendChild(muteTimerPanel);
                    
                    muteTimerInterval = setInterval(async () => {
                        const timeLeft = mutedUntil - Date.now();
                        if (timeLeft <= 0 || isNaN(timeLeft)) {
                            clearInterval(muteTimerInterval);
                            if (muteTimerPanel) muteTimerPanel.remove();
                            
                            try {
                                const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                                await deleteDoc(mutedDocRef);
                                
                                const messageRef = push(ref(database, 'rooms/' + currentRoom + '/messages'));
                                await set(messageRef, {
                                    text: currentUser.username + ' ha sido desmuteado automáticamente',
                                    type: 'system',
                                    timestamp: Date.now(),
                                    id: messageRef.key
                                });
                            } catch (error) {
                                console.error('Error al desmutear:', error);
                            }
                        } else {
                            const mins = Math.floor(timeLeft / 60000);
                            const secs = Math.floor((timeLeft % 60000) / 1000);
                            const countdown = muteTimerPanel.querySelector('.mute-timer-countdown');
                            if (countdown) {
                                countdown.textContent = mins + 'm ' + secs + 's';
                            }
                        }
                    }, 1000);
                } else {
                    if (muteTimerInterval) clearInterval(muteTimerInterval);
                    if (muteTimerPanel) muteTimerPanel.remove();
                    messageInput.disabled = false;
                    messageInput.placeholder = 'Escribe tu mensaje...';
                    imageBtn.style.pointerEvents = 'auto';
                    imageBtn.style.opacity = '1';
                    emoteBtn.style.pointerEvents = 'auto';
                    emoteBtn.style.opacity = '1';
                    micBtn.style.pointerEvents = 'auto';
                    micBtn.style.opacity = '1';
                    const pollsBtn = document.querySelector('.polls-btn');
                    if (pollsBtn) {
                        pollsBtn.style.pointerEvents = 'auto';
                        pollsBtn.style.opacity = '1';
                    }
                                       sendIcon.style.pointerEvents = 'auto';
                    sendIcon.style.opacity = '1';
                }
            });
        })();
    }
    
    // Escuchar notificaciones de acceso a salas privadas
    listenToRoomAccessNotifications((data) => {
        if (data.accepted && data.roomId === currentRoom) {
            // Recargar mensajes cuando el usuario es aceptado
            hasPrivateRoomAccess = true;
            enableChatControls();
            loadMessages();
            showNotification('Has sido aceptado en la sala privada', 'success');
        }
    });
    
    // Escuchar comando de refresh
    listenToRefreshCommand((data) => {
        console.log('Refresh command received:', data);
        showNotification('🔄 Un desarrollador está reiniciando tu sesión...', 'warning');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
    });
    
    // Escuchar cuando una sala es borrada
    let roomDeletedListener = null;
    let countdownInterval = null;
    
    function setupRoomDeletedListener() {
        if (roomDeletedListener) roomDeletedListener();
        
        const currentHash = window.location.hash.substring(1);
        if (!currentHash) return;
        
        const roomDeletedRef = ref(database, `roomDeleted/${currentHash}`);
        roomDeletedListener = onValue(roomDeletedRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                if (data.deleting && !data.deleted) {
                    let countdown = data.countdown || 15;
                    showNotification(`⚠️ Esta sala será eliminada en ${countdown} segundos`, 'warning');
                    
                    if (countdownInterval) clearInterval(countdownInterval);
                    
                    countdownInterval = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            showNotification(`⚠️ Esta sala será eliminada en ${countdown} segundos`, 'warning');
                        } else {
                            clearInterval(countdownInterval);
                        }
                    }, 1000);
                }
                
                if (data.deleted) {
                    if (countdownInterval) clearInterval(countdownInterval);
                    if (roomDeletedListener) roomDeletedListener();
                    showNotification('La sala ha sido eliminada. Redirigiendo...', 'error');
                    setTimeout(() => {
                        window.location.hash = 'general';
                    }, 500);
                }
            }
        });
    }
    
    setupRoomDeletedListener();
    
    // Esperar a que termine la carga para inicializar
    setTimeout(() => {
        initializeApp();
        // Cargar salas con un pequeño delay para asegurar que Firebase esté listo
        setTimeout(loadRooms, 300);
    }, 1500);
    
    // Manejar cerrar sesión
    const logoutBtn = document.querySelector('.config-item:nth-last-child(2) button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                if (!currentUser.isGuest) {
                    const { getAuth, signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                    const auth = getAuth();
                    await signOut(auth);
                }
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            } finally {
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        });
    }
    
    // Manejar configuración de fondo
    const bgConfigItem = document.querySelector('.config-item[data-config="background"]');
    if (bgConfigItem) {
        const bgButton = bgConfigItem.querySelector('button:not(.bg-upload-btn):not(.bg-remove-btn):not(.cancel-btn)');
        const bgInput = bgConfigItem.querySelector('.config-input');
        const bgUploadBtn = bgConfigItem.querySelector('.bg-upload-btn');
        const bgRemoveBtn = bgConfigItem.querySelector('.bg-remove-btn');
        const bgCancelBtn = bgConfigItem.querySelector('.cancel-btn');
        
        bgButton.addEventListener('click', function() {
            bgInput.classList.add('active');
            bgButton.style.display = 'none';
        });
        
        bgCancelBtn.addEventListener('click', function() {
            bgInput.classList.remove('active');
            bgButton.style.display = 'block';
        });
        
        bgUploadBtn.addEventListener('click', function() {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            fileInput.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                        showNotification('La imagen debe ser menor a 2MB', 'error');
                        fileInput.remove();
                        return;
                    }
                    
                    try {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            const bgImage = event.target.result;
                            document.querySelector('.chat-area').style.backgroundImage = `url(${bgImage})`;
                            document.querySelector('.chat-area').style.backgroundSize = 'cover';
                            document.querySelector('.chat-area').style.backgroundPosition = 'center';
                            document.querySelector('.chat-area').style.backgroundAttachment = 'fixed';
                            
                            localStorage.setItem('chatBackground', bgImage);
                            showNotification('Fondo actualizado correctamente', 'success');
                            bgInput.classList.remove('active');
                            bgButton.style.display = 'block';
                        };
                        reader.readAsDataURL(file);
                    } catch (error) {
                        showNotification('Error al cargar imagen', 'error');
                    }
                }
                fileInput.remove();
            });
            
            fileInput.click();
        });
        
        bgRemoveBtn.addEventListener('click', function() {
            document.querySelector('.chat-area').style.backgroundImage = 'none';
            localStorage.removeItem('chatBackground');
            showNotification('Fondo eliminado correctamente', 'success');
            bgInput.classList.remove('active');
            bgButton.style.display = 'block';
        });
    }
    
    // Manejar otras configuraciones
    const configButtons = document.querySelectorAll('.config-item:not([data-config]) button');
    configButtons.forEach((btn, index) => {
        const configItem = btn.closest('.config-item');
        const configText = configItem.querySelector('span').textContent;
        
        if (configText.includes('Borrar cuenta')) {
            btn.addEventListener('click', async function() {
                if (confirm('¿Estás seguro de que quieres borrar tu cuenta? Esta acción no se puede deshacer.')) {
                    try {
                        if (!currentUser.isGuest && currentUser.firebaseUid) {
                            const { getAuth, deleteUser } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                            const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                            const { db } = await import('./firebase.js');
                            const auth = getAuth();
                            
                            await deleteDoc(doc(db, 'users', currentUser.firebaseUid));
                            if (auth.currentUser) await deleteUser(auth.currentUser);
                        }
                        localStorage.removeItem('currentUser');
                        showNotification('Cuenta eliminada', 'success');
                        setTimeout(() => window.location.href = 'login.html', 1000);
                    } catch (error) {
                        console.error('Error al borrar cuenta:', error);
                        localStorage.removeItem('currentUser');
                        window.location.href = 'login.html';
                    }
                }
            });
        }
    });
    
    // Mostrar imagen en modal
    window.showImageModal = function(imageSrc) {
        const modal = createElement(`
            <div class="image-modal-overlay active">
                <div class="image-modal">
                    <div class="image-modal-header">
                        <div class="image-modal-controls">
                            <button class="modal-control-btn" id="zoomInBtn" title="Acercar"><img src="/images/zoom-in.svg" alt="+"></button>
                            <button class="modal-control-btn" id="zoomOutBtn" title="Alejar"><img src="/images/zoom-out.svg" alt="-"></button>
                            <button class="modal-control-btn" id="resetZoomBtn" title="Restablecer"><img src="/images/zoom-reset.svg" alt="⟲"></button>
                            <button class="modal-control-btn" id="downloadBtn" title="Descargar"><img src="/images/download.svg" alt="↓"></button>
                            <button class="modal-control-btn" id="copyLinkBtn" title="Copiar enlace"><img src="/images/copy.svg" alt="📋"></button>
                        </div>
                        <button class="close-modal">×</button>
                    </div>
                    <div class="image-content-area">
                        <img src="${imageSrc}" alt="Imagen" class="modal-image" />
                    </div>
                </div>
            </div>
        `);
        
        document.body.appendChild(modal);

        const image = modal.querySelector('.modal-image');
        let scale = 1;
        let panning = false;
        let pointX = 0, pointY = 0;
        let start = { x: 0, y: 0 };

        function setTransform() {
            image.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
        }

        image.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (scale > 1) {
                start = { x: e.clientX - pointX, y: e.clientY - pointY };
                panning = true;
                image.style.cursor = 'grabbing';
            }
        });

        image.addEventListener('mouseup', () => {
            panning = false;
            image.style.cursor = 'grab';
        });

        image.addEventListener('mousemove', (e) => {
            if (!panning) return;
            pointX = (e.clientX - start.x);
            pointY = (e.clientY - start.y);
            setTransform();
        });

        modal.querySelector('.image-content-area').addEventListener('wheel', (e) => {
            e.preventDefault();
            const xs = (e.clientX - pointX) / scale;
            const ys = (e.clientY - pointY) / scale;
            const delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);

            (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);
            scale = Math.min(Math.max(1, scale), 10);

            pointX = e.clientX - xs * scale;
            pointY = e.clientY - ys * scale;

            image.style.cursor = scale > 1 ? 'grab' : 'default';
            setTransform();
        });

        modal.querySelector('#zoomInBtn').addEventListener('click', () => {
            scale = Math.min(scale * 1.2, 10);
            setTransform();
        });

        modal.querySelector('#zoomOutBtn').addEventListener('click', () => {
            scale = Math.max(scale / 1.2, 1);
            if (scale === 1) { pointX = 0; pointY = 0; }
            setTransform();
        });

        modal.querySelector('#resetZoomBtn').addEventListener('click', () => {
            scale = 1; pointX = 0; pointY = 0;
            setTransform();
        });

        modal.querySelector('#downloadBtn').addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = imageSrc;
            a.download = 'imagen_chatup.png';
            a.click();
        });

        modal.querySelector('#copyLinkBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(imageSrc).then(() => showNotification('Enlace copiado', 'success'));
        });

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    };

    // Inicializar mensajes existentes
    initializeMessages();

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', function() {
        if (mobileUsersDropdown) {
            mobileUsersDropdown.classList.remove('active');
        }
    });

    // Contador de caracteres y indicador de escritura
    let typingTimeout;
    let typingRefreshInterval;
    
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
            
            // Timeout de 1 segundo
            typingTimeout = setTimeout(() => {
                setTypingStatus(false);
            }, 1000);
        } else {
            setTypingStatus(false);
        }
    });
    
    // Escuchar usuarios escribiendo
    function startTypingListener() {
        if (currentTypingListener) {
            currentTypingListener();
        }
        currentTypingListener = listenToTyping((typingUsers) => {
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
    }
    
    startTypingListener();

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
                if (!file.type.startsWith('image/')) {
                    showNotification('Por favor selecciona una imagen válida', 'error');
                    e.target.value = '';
                    return;
                }
                
                imageBtn.style.opacity = '0.5';
                imageBtn.style.pointerEvents = 'none';
                
                try {
                    showNotification('Enviando imagen...', 'warning');
                    await sendImage(file);
                    showNotification('Imagen enviada correctamente', 'success');
                } catch (error) {
                    showNotification(error.message, 'error');
                } finally {
                    e.target.value = '';
                    imageBtn.style.opacity = '1';
                    imageBtn.style.pointerEvents = 'auto';
                }
            }
        });
    }
    
    // Botón de emotes - Manejado por emote-manager.js
    // emoteBtn.addEventListener('click', (e) => {
    //     e.stopPropagation();
    //     emotePanel.classList.toggle('active');
    // });
    
    // Seleccionar emote - Manejado por emote-manager.js
    // function setupEmoteListeners() {
    //     const emoteItems = document.querySelectorAll('.emote-item');
    //     emoteItems.forEach(item => {
    //         item.addEventListener('click', () => {
    //             console.log('Emote clicked:', item.src);
    //             const emoteSrc = item.src;
    //             sendMessage(currentUser.username || 'Usuario', 'emote', emoteSrc).then(() => {
    //                 console.log('Emote sent successfully');
    //             }).catch(error => {
    //                 console.error('Error sending emote:', error);
    //                 showNotification('Error al enviar emote', 'error');
    //             });
    //             emotePanel.classList.remove('active');
    //         });
    //     });
    // }
    
    // setupEmoteListeners();
    
    // Cerrar panel de emotes - Manejado por emote-manager.js
    // document.addEventListener('click', (e) => {
    //     if (!emoteBtn.contains(e.target) && !emotePanel.contains(e.target)) {
    //         emotePanel.classList.remove('active');
    //     }
    // });

    // Funciones para paneles de moderación
    async function showBanPanel() {
        const existingPanel = document.querySelector('.moderation-panel');
        if (existingPanel) existingPanel.remove();
        
        const usersRef = ref(database, `rooms/${currentRoom}/users`);
        const snapshot = await new Promise(resolve => {
            onValue(usersRef, resolve, { onlyOnce: true });
        });
        
        const users = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const userData = child.val();
                const userKey = child.key;
                if (userData.status === 'online' && userKey !== currentUser.userId) {
                    if (userData.role !== 'Administrador') {
                        userData.userId = userKey;
                        userData.name = userData.name || 'Usuario';
                        users.push(userData);
                    }
                }
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
                            if (!guestNumericIds.has(user.firebaseUid || user.userId)) {
                                guestNumericIds.set(user.firebaseUid || user.userId, currentGuestId++);
                            }
                            userId = '#' + guestNumericIds.get(user.firebaseUid || user.userId);
                        } else {
                            userId = '#' + (index + 1);
                        }
                        const guestLabel = user.isGuest ? ' (invitado)' : '';
                        return '<div class="moderation-user-item">' +
                            '<div class="moderation-user-info">' +
                                '<img src="' + user.avatar + '" class="moderation-user-avatar" alt="' + user.name + '" />' +
                                '<span class="moderation-user-name">' + userId + ' ' + user.name + guestLabel + '</span>' +
                            '</div>' +
                            '<button class="moderation-action-btn ban-action-btn" data-user-id="' + (user.firebaseUid || user.userId) + '" data-username="' + user.name + '" data-is-guest="' + user.isGuest + '">' +
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
                        
                        const bannedRef = ref(database, `rooms/${currentRoom}/users/${userId}`);
                        await set(bannedRef, null);
                    } catch (error) {
                        showNotification(error.message, 'error');
                    }
                }
            });
        });
    }
    
    async function showUnbanPanel() {
        const existingPanel = document.querySelector('.moderation-panel');
        if (existingPanel) existingPanel.remove();
        
        const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { db } = await import('./firebase.js');
        
        const bannedSnapshot = await getDocs(collection(db, 'banned'));
        const bannedUsers = [];
        
        for (const doc of bannedSnapshot.docs) {
            const data = doc.data();
            bannedUsers.push({
                userId: doc.id,
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
                    ${bannedUsers.length === 0 ? '<div class="empty-rooms">No hay usuarios baneados</div>' : bannedUsers.map((user, index) => `
                        <div class="moderation-user-item">
                            <div class="moderation-user-info">
                                <span class="moderation-user-name">${index + 1}. ${user.username}</span>
                            </div>
                            <button class="moderation-action-btn unban-action-btn" data-user-id="${user.userId}" data-username="${user.username}">
                                <img src="/images/unban.svg" alt="Unban" />
                                Desbanear
                            </button>
                        </div>
                    `).join('')}
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
                        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                        const { db } = await import('./firebase.js');
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
    
    async function showMutePanel() {
        const existingPanel = document.querySelector('.moderation-panel');
        if (existingPanel) existingPanel.remove();
        
        const usersRef = ref(database, `rooms/${currentRoom}/users`);
        const snapshot = await new Promise(resolve => {
            onValue(usersRef, resolve, { onlyOnce: true });
        });
        
        const users = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const userData = child.val();
                const userKey = child.key;
                if (userData.status === 'online' && userKey !== currentUser.userId) {
                    if (userData.role !== 'Administrador') {
                        userData.userId = userKey;
                        userData.name = userData.name || 'Usuario';
                        users.push(userData);
                    }
                }
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
                            if (!guestNumericIds.has(user.firebaseUid || user.userId)) {
                                guestNumericIds.set(user.firebaseUid || user.userId, currentGuestId++);
                            }
                            userId = '#' + guestNumericIds.get(user.firebaseUid || user.userId);
                        } else {
                            userId = '#' + (index + 1);
                        }
                        const guestLabel = user.isGuest ? ' (invitado)' : '';
                        return '<div class="moderation-user-item">' +
                            '<div class="moderation-user-info">' +
                                '<img src="' + user.avatar + '" class="moderation-user-avatar" alt="' + user.name + '" />' +
                                '<span class="moderation-user-name">' + userId + ' ' + user.name + guestLabel + '</span>' +
                            '</div>' +
                            '<button class="moderation-action-btn mute-action-btn" data-user-id="' + (user.firebaseUid || user.userId) + '" data-username="' + user.name + '" data-is-guest="' + user.isGuest + '">' +
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
                        const { muteUser } = await import('./firebase.js');
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
    
    async function showUnmutePanel() {
        const existingPanel = document.querySelector('.moderation-panel');
        if (existingPanel) existingPanel.remove();
        
        const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { db } = await import('./firebase.js');
        
        const mutedSnapshot = await getDocs(collection(db, 'muted'));
        const mutedUsers = [];
        
        for (const doc of mutedSnapshot.docs) {
            const data = doc.data();
            mutedUsers.push({
                userId: doc.id,
                username: data.username || data.name || 'Usuario',
                mutedUntil: data.mutedUntil
            });
        }
        
        const panel = createElement(`
            <div class="moderation-panel mute-panel">
                <div class="moderation-panel-header">
                    <img src="/images/unmute.svg" class="moderation-panel-icon" alt="Unmute" />
                    <span class="moderation-panel-title">Desmutear Usuarios</span>
                    <button class="close-moderation-panel">×</button>
                </div>
                <div class="moderation-list">
                    ${mutedUsers.length === 0 ? '<div class="empty-rooms">No hay usuarios muteados</div>' : mutedUsers.map((user, index) => `
                        <div class="moderation-user-item">
                            <div class="moderation-user-info">
                                <span class="moderation-user-name">${index + 1}. ${user.username}</span>
                            </div>
                            <button class="moderation-action-btn unmute-action-btn" data-user-id="${user.userId}" data-username="${user.username}">
                                <img src="/images/unmute.svg" alt="Unmute" />
                                Desmutear
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
        
        document.body.appendChild(panel);
        
        panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
        
        panel.querySelectorAll('.unmute-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.userId;
                const username = btn.dataset.username;
                if (confirm(`¿Desmutear a ${username}?`)) {
                    try {
                        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                        const { db } = await import('./firebase.js');
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

    // Enviar mensaje
    let isSendingMessage = false;
    
    function unlockSendButton() {
        isSendingMessage = false;
        sendIcon.style.opacity = '1';
        sendIcon.style.pointerEvents = 'auto';
    }
    
    function sendMessageHandler() {
        const message = messageInput.value.trim();
        if (!message) return;
        if (isSendingMessage) return;
        
        const commandList = document.querySelector('.private-command-message');
        if (commandList) commandList.remove();
        
        const roomsManagementPanel = document.querySelector('.rooms-management-panel');
        if (roomsManagementPanel) roomsManagementPanel.remove();
        
        const moderationPanel = document.querySelector('.moderation-panel');
        if (moderationPanel) moderationPanel.remove();
        
        // Detectar comandos de moderación (case insensitive)
        const lowerMessage = message.toLowerCase();
        if (lowerMessage === '!ban' && (currentUser.isAdmin || currentUser.isModerator)) {
            showBanPanel(database, currentRoom, currentUser, banUserFirebase, showNotification, db);
            messageInput.value = '';
            return;
        }
        if (lowerMessage === '!unban' && (currentUser.isAdmin || currentUser.isModerator)) {
            showUnbanPanel(database, currentRoom, showNotification, db);
            messageInput.value = '';
            return;
        }
        if (lowerMessage === '!mute' && (currentUser.isAdmin || currentUser.isModerator)) {
            showMutePanel(database, currentRoom, currentUser, muteUser, showNotification, db);
            messageInput.value = '';
            return;
        }
        if (lowerMessage === '!unmute' && (currentUser.isAdmin || currentUser.isModerator)) {
            showUnmutePanel(database, currentRoom, showNotification, db);
            messageInput.value = '';
            return;
        }
        if (lowerMessage === '!crearjuegos') {
            showGamesPanel();
            messageInput.value = '';
            return;
        }
        if (lowerMessage === '!developer' && currentUser.isDeveloper) {
            showDeveloperPanel();
            messageInput.value = '';
            return;
        }
        if (lowerMessage === '!aceptar') {
            // Manejar comando !aceptar localmente
            (async () => {
                try {
                    const { getPendingUsers } = await import('./firebase.js');
                    const pendingUsers = await getPendingUsers(currentRoom);
                    if (pendingUsers.length === 0) {
                        showNotification('No hay usuarios pendientes', 'info');
                    } else {
                        showAcceptPanel(pendingUsers);
                    }
                } catch (error) {
                    showNotification(error.message || 'Error al obtener usuarios pendientes', 'error');
                }
            })();
            messageInput.value = '';
            return;
        }
        
        isSendingMessage = true;
        sendIcon.style.opacity = '0.5';
        sendIcon.style.pointerEvents = 'none';
        
        // Limpiar input INMEDIATAMENTE para mejor UX
        const messageCopy = message;
        messageInput.value = '';
        charCounter.textContent = '0/250';
        charCounter.classList.remove('warning', 'danger');
        setTypingStatus(false);
        clearTimeout(typingTimeout);
        
        // Timeout de seguridad para desbloquear después de 2 segundos
        const safetyTimeout = setTimeout(() => {
            unlockSendButton();
        }, 2000);
        
        sendMessage(messageCopy, 'text', null, null, replyingTo)
            .then((result) => {
                clearTimeout(safetyTimeout);
                clearReply();
                
                if (result && result.doNotSendSystemMessage) {
                    unlockSendButton();
                    return;
                }

                if (result && result.showDeleteNotification) {
                    showNotification(`⏳ La sala "${result.roomName}" será eliminada`, 'success');
                    unlockSendButton();
                    return;
                }
                
                if (result && result.showRoomsPanel) {
                    showRoomsManagementPanel(result.rooms);
                    unlockSendButton();
                    return;
                }
                
                if (result && result.showGamesPanel) {
                    showGamesPanel();
                    unlockSendButton();
                    return;
                }
                
                if (result && result.showRefreshPanel) {
                    showRefreshPanel(result.users);
                    unlockSendButton();
                    return;
                }
                
                if (result && result.showForcebanPanel) {
                    showForcebanPanel(result.users);
                    unlockSendButton();
                    return;
                }
                
                if (result && result.roomChanged) {
                    setTimeout(() => {
                        loadMessages();
                        loadUsers();
                    }, 500);
                }
                
                unlockSendButton();
            })
            .catch(error => {
                clearTimeout(safetyTimeout);
                console.error('Error enviando mensaje:', error);
                showNotification(error.message || 'Error al enviar mensaje', 'error');
                unlockSendButton();
            })
            .finally(() => {
                clearTimeout(safetyTimeout);
                // Desbloquear inmediatamente
                unlockSendButton();
            });
    }
    
    function showRoomsManagementPanel(rooms) {
        const panel = createElement(`
            <div class="rooms-management-panel">
                <div class="rooms-management-header">
                    <h3>Gestionar Salas</h3>
                    <button class="close-rooms-management">×</button>
                </div>
                <div class="rooms-management-list">
                    ${rooms.map(room => `
                        <div class="room-management-item" data-room-id="${room.id}">
                            <div class="room-info">
                                <span class="room-type-icon">${room.isPrivate ? 'P' : 'G'}</span>
                                <span class="room-management-name">${room.name}</span>
                            </div>
                            <div class="room-actions">
                                <div class="room-user-count-container">
                                    <img src="/images/users-connected.svg" class="room-user-icon" alt="Users" />
                                    <span class="room-user-count-badge" data-room-id="${room.id}">0</span>
                                </div>
                                <button class="delete-room-btn" data-room-id="${room.id}" data-room-name="${room.name}">
                                    <img src="/images/trash.svg" alt="Delete" />
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
        
        document.body.appendChild(panel);
        
        // Setup user count listeners
        const userCountListeners = new Map();
        rooms.forEach(room => {
            const usersRef = ref(database, `rooms/${room.id}/users`);
            const unsubscribe = onValue(usersRef, (snapshot) => {
                let count = 0;
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const userData = childSnapshot.val();
                        if (userData.status === 'online') count++;
                    });
                }
                const badge = panel.querySelector(`.room-user-count-badge[data-room-id="${room.id}"]`);
                if (badge) badge.textContent = count;
            });
            userCountListeners.set(room.id, unsubscribe);
        });
        
        panel.querySelector('.close-rooms-management').addEventListener('click', () => {
            userCountListeners.forEach(unsubscribe => unsubscribe());
            panel.remove();
        });
        
        panel.querySelectorAll('.delete-room-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const roomId = btn.dataset.roomId;
                const roomName = btn.dataset.roomName;
                
                if (confirm(`¿Estás seguro de eliminar la sala "${roomName}"?`)) {
                    try {
                        const { deleteRoom } = await import('./firebase.js');
                        
                        btn.innerHTML = '<span class="delete-countdown">15</span>';
                        btn.disabled = true;
                        btn.style.pointerEvents = 'none';
                        
                        let countdown = 15;
                        const countdownInterval = setInterval(() => {
                            countdown--;
                            const countdownEl = btn.querySelector('.delete-countdown');
                            if (countdownEl) {
                                countdownEl.textContent = countdown;
                            }
                            if (countdown <= 0) {
                                clearInterval(countdownInterval);
                                const roomItem = btn.closest('.room-management-item');
                                if (roomItem) {
                                    roomItem.style.animation = 'fadeOut 0.3s ease';
                                    setTimeout(() => {
                                        roomItem.remove();
                                        if (panel.querySelectorAll('.room-management-item').length === 0) {
                                            userCountListeners.forEach(unsubscribe => unsubscribe());
                                            panel.remove();
                                        }
                                    }, 300);
                                }
                            }
                        }, 1000);
                        
                        await deleteRoom(roomId);
                    } catch (error) {
                        showNotification(error.message, 'error');
                        btn.innerHTML = '<img src="/images/trash.svg" alt="Delete" />';
                        btn.disabled = false;
                        btn.style.pointerEvents = 'auto';
                    }
                }
            });
        });
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

    // Audio recording
    micBtn.addEventListener('click', () => {
        audioPanel.classList.add('active');
        audioPanelOverlay.classList.add('active');
        audioTimer.textContent = '00:00';
        recordedAudioBlob = null;
        recIndicator.classList.remove('recording');
    });
    
    // Cerrar panel de audio
    const closeAudioPanelFunc = () => {
        if (isRecording) {
            audioRecorder.cancelRecording();
            isRecording = false;
            clearInterval(timerInterval);
        }
        audioPanel.classList.remove('active');
        audioPanelOverlay.classList.remove('active');
        audioTimer.textContent = '00:00';
        recordedAudioBlob = null;
        recIndicator.classList.remove('recording');
        playBtn.classList.remove('recording');
    };
    
    closeAudioPanel.addEventListener('click', closeAudioPanelFunc);
    audioPanelOverlay.addEventListener('click', closeAudioPanelFunc);
    
    playBtn.addEventListener('click', async () => {
        if (!isRecording) {
            const started = await audioRecorder.startRecording(audioVisualizer);
            if (started) {
                isRecording = true;
                recordingStartTime = Date.now();
                playBtn.classList.add('recording');
                recIndicator.classList.add('recording');
                
                timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                    audioTimer.textContent = formatTime(elapsed);
                }, 100);
            } else {
                showNotification('No se pudo acceder al micrófono', 'error');
            }
        }
    });
    
    stopBtn.addEventListener('click', async () => {
        if (isRecording) {
            clearInterval(timerInterval);
            recordedAudioBlob = await audioRecorder.stopRecording();
            isRecording = false;
            playBtn.classList.remove('recording');
            recIndicator.classList.remove('recording');
            
            if (recordedAudioBlob) {
                showNotification('Audio listo para enviar', 'success');
            }
        }
    });
    
    deleteAudioBtn.addEventListener('click', () => {
        if (isRecording) {
            audioRecorder.cancelRecording();
            clearInterval(timerInterval);
            isRecording = false;
            playBtn.classList.remove('recording');
            recIndicator.classList.remove('recording');
        }
        audioTimer.textContent = '00:00';
        recordedAudioBlob = null;
        showNotification('Audio eliminado', 'info');
    });
    
    let isSendingAudio = false;
    
    sendAudioBtn.addEventListener('click', async () => {
        if (!recordedAudioBlob) {
            showNotification('No hay audio para enviar', 'error');
            return;
        }
        
        if (isSendingAudio) return;
        
        isSendingAudio = true;
        sendAudioBtn.disabled = true;
        sendAudioBtn.style.opacity = '0.5';
        
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        
        try {
            const audioBase64 = await blobToBase64(recordedAudioBlob);
            await sendAudio(audioBase64, duration);
            showNotification('Audio enviado', 'success');
            closeAudioPanelFunc();
        } catch (error) {
            showNotification('Error al enviar audio', 'error');
        } finally {
            isSendingAudio = false;
            sendAudioBtn.disabled = false;
            sendAudioBtn.style.opacity = '1';
            setTimeout(() => {
                isSendingAudio = false;
                sendAudioBtn.disabled = false;
                sendAudioBtn.style.opacity = '1';
            }, 100);
        }
    });
    
    uploadAudioBtn.addEventListener('click', () => {
        audioInput.click();
    });
    
    audioInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 10 * 1024 * 1024) {
            showNotification('El audio debe ser menor a 10MB', 'error');
            e.target.value = '';
            return;
        }
        
        uploadAudioBtn.disabled = true;
        uploadAudioBtn.style.opacity = '0.5';
        
        try {
            const audioBase64 = await blobToBase64(file);
            const audio = new Audio(audioBase64);
            audio.onloadedmetadata = async () => {
                const duration = Math.floor(audio.duration);
                await sendAudio(audioBase64, duration);
                showNotification('Audio enviado', 'success');
            };
        } catch (error) {
            showNotification('Error al enviar audio', 'error');
        } finally {
            e.target.value = '';
            uploadAudioBtn.disabled = false;
            uploadAudioBtn.style.opacity = '1';
        }
    });

    sendIcon.addEventListener('click', sendMessageHandler);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessageHandler();
        }
    });



    function updateRoomUserCounts() {
        const rooms = [
            { id: "general", type: "public" },
            { id: "privada1", type: "private" }
            // Agregar más salas según sea necesario
        ];

        rooms.forEach(room => {
            const userCountElement = document.querySelector(`.room-user-count[data-room-id="${room.id}"]`);
            if (userCountElement) {
                // Simulación de conteo de usuarios activos (reemplazar con datos reales)
                const activeUsers = Math.floor(Math.random() * 50);
                userCountElement.textContent = `(${activeUsers})`;
            }
        });
    }

    // Llamar a la función periódicamente para mantener los datos actualizados
    setInterval(updateRoomUserCounts, 5000);
});

function showDeveloperPanel() {
    const existingPanel = document.querySelector('.developer-panel-overlay');
    if (existingPanel) existingPanel.remove();

    const overlay = document.createElement('div');
    overlay.className = 'developer-panel-overlay';
    overlay.innerHTML = `
        <div class="developer-panel">
            <div class="developer-panel-header">
                <h2>Panel de Desarrollador</h2>
                <button class="close-developer-panel">×</button>
            </div>
            <div class="developer-panel-content">
                <div class="dev-setting">
                    <span>Inicio de sesión como invitado</span>
                    <label class="dev-toggle">
                        <input type="checkbox" id="guestLoginToggle" checked>
                        <span class="dev-slider"></span>
                    </label>
                </div>
                <div class="dev-setting">
                    <span>Registro de nuevos usuarios</span>
                    <label class="dev-toggle">
                        <input type="checkbox" id="registerToggle" checked>
                        <span class="dev-slider"></span>
                    </label>
                </div>
                <div class="dev-setting">
                    <span>Creación de salas privadas</span>
                    <label class="dev-toggle">
                        <input type="checkbox" id="privateRoomsToggle" checked>
                        <span class="dev-slider"></span>
                    </label>
                </div>
                <div class="dev-setting">
                    <span>Sistema de juegos</span>
                    <label class="dev-toggle">
                        <input type="checkbox" id="gamesToggle" checked>
                        <span class="dev-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.close-developer-panel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js').then(({ getFirestore, doc, getDoc, setDoc }) => {
        const db = getFirestore();
        const settingsRef = doc(db, 'settings', 'global');

        getDoc(settingsRef).then(docSnap => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                document.getElementById('guestLoginToggle').checked = settings.guestLoginEnabled !== false;
                document.getElementById('registerToggle').checked = settings.registerEnabled !== false;
                document.getElementById('privateRoomsToggle').checked = settings.privateRoomsEnabled !== false;
                document.getElementById('gamesToggle').checked = settings.gamesEnabled !== false;
            }
        });

        ['guestLoginToggle', 'registerToggle', 'privateRoomsToggle', 'gamesToggle'].forEach(id => {
            document.getElementById(id).addEventListener('change', async (e) => {
                const field = id.replace('Toggle', 'Enabled');
                await setDoc(settingsRef, { [field]: e.target.checked }, { merge: true });
                showNotification(`Configuración actualizada`, 'success');
            });
        });
    });
}


// Panel de Refresh
function showRefreshPanel(users) {
    const existingPanel = document.querySelector('.moderation-panel');
    if (existingPanel) existingPanel.remove();
    
    const panel = document.createElement('div');
    panel.className = 'moderation-panel refresh-panel';
    panel.innerHTML = `
        <div class="moderation-panel-header">
            <img src="/images/refresh.svg" class="moderation-panel-icon" alt="Refresh" />
            <span class="moderation-panel-title">🔄 Refrescar Usuarios</span>
            <button class="close-moderation-panel">×</button>
        </div>
        <div class="moderation-global-action">
            <button class="global-refresh-btn">
                <img src="/images/refresh.svg" alt="Refresh All" />
                Refrescar Todos
            </button>
        </div>
        <div class="moderation-list">
            ${users.map((user, index) => {
                const guestLabel = user.isGuest ? ' <span class="guest-badge">INVITADO</span>' : '';
                return `
                    <div class="moderation-user-item">
                        <div class="moderation-user-info">
                            <span class="user-number">#${index + 1}</span>
                            <span class="moderation-user-name">${user.username}${guestLabel}</span>
                        </div>
                        <button class="moderation-action-btn refresh-action-btn" data-user-id="${user.firebaseUid}" data-username="${user.username}">
                            <img src="/images/refresh.svg" alt="Refresh" />
                            Refrescar
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
    
    panel.querySelector('.global-refresh-btn').addEventListener('click', async () => {
        showNotification('Función de refresh deshabilitada temporalmente', 'warning');
    });
    
    panel.querySelectorAll('.refresh-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            
            btn.disabled = true;
            btn.innerHTML = '<span class="refresh-loading">⏳</span>';
            
            try {
                const { refreshUserPage } = await import('./firebase.js');
                await refreshUserPage(userId);
                btn.innerHTML = '<span class="refresh-success">✓</span>';
                showNotification(`🔄 Refrescando página de ${username}...`, 'success');
                setTimeout(() => panel.remove(), 1500);
            } catch (error) {
                showNotification(error.message, 'error');
                btn.innerHTML = '<img src="/images/refresh.svg" alt="Refresh" />Refrescar';
                btn.disabled = false;
            }
        });
    });
}

// Panel de Aceptar usuarios en sala privada
function showAcceptPanel(pendingUsers) {
    const existingPanel = document.querySelector('.moderation-panel');
    if (existingPanel) existingPanel.remove();
    
    const panel = document.createElement('div');
    panel.className = 'moderation-panel accept-panel';
    panel.innerHTML = `
        <div class="moderation-panel-header">
            <img src="/images/users-connected.svg" class="moderation-panel-icon" alt="Accept" />
            <span class="moderation-panel-title">📬 Solicitudes de Acceso</span>
            <button class="close-moderation-panel">×</button>
        </div>
        <div class="moderation-list">
            ${pendingUsers.map(user => {
                return `
                    <div class="moderation-user-item">
                        <div class="moderation-user-info">
                            <span class="moderation-user-name">${user.username}</span>
                        </div>
                        <button class="moderation-action-btn accept-action-btn" data-user-id="${user.userId}" data-username="${user.username}">
                            <span>✓</span>
                            Aceptar
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
    
    panel.querySelectorAll('.accept-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            
            btn.disabled = true;
            btn.innerHTML = '<span class="accept-loading">⏳</span>';
            
            try {
                const { acceptUserToPrivateRoom } = await import('./firebase.js');
                await acceptUserToPrivateRoom(currentRoom, userId);
                btn.innerHTML = '<span class="accept-success">✓</span>';
                showNotification(`${username} aceptado en la sala`, 'success');
                setTimeout(() => {
                    btn.closest('.moderation-user-item').style.animation = 'fadeOut 0.3s ease';
                    setTimeout(() => {
                        btn.closest('.moderation-user-item').remove();
                        if (panel.querySelectorAll('.moderation-user-item').length === 0) {
                            panel.remove();
                        }
                    }, 300);
                }, 500);
            } catch (error) {
                showNotification(error.message, 'error');
                btn.innerHTML = '<span>✓</span>Aceptar';
                btn.disabled = false;
            }
        });
    });
}

// Panel de Forceban
function showForcebanPanel(users) {
    const existingPanel = document.querySelector('.moderation-panel');
    if (existingPanel) existingPanel.remove();
    
    const panel = document.createElement('div');
    panel.className = 'moderation-panel forceban-panel';
    panel.innerHTML = `
        <div class="moderation-panel-header">
            <img src="/images/ban.svg" class="moderation-panel-icon" alt="Forceban" />
            <span class="moderation-panel-title">⚠️ Expulsión Forzada</span>
            <button class="close-moderation-panel">×</button>
        </div>
        <div class="moderation-list">
            ${users.map((user, index) => {
                const guestLabel = user.isGuest ? ' (invitado)' : '';
                return `
                    <div class="moderation-user-item">
                        <div class="moderation-user-info">
                            <span class="moderation-user-name">#${index + 1} ${user.username}${guestLabel}</span>
                        </div>
                        <button class="moderation-action-btn forceban-action-btn" data-user-id="${user.firebaseUid}" data-username="${user.username}">
                            <img src="/images/ban.svg" alt="Forceban" />
                            Expulsar
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-moderation-panel').addEventListener('click', () => panel.remove());
    
    panel.querySelectorAll('.forceban-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;
            const reason = prompt(`Razón de expulsión forzada para ${username}:`, 'Expulsión forzada');
            if (reason !== null) {
                try {
                    const { forceBanUser } = await import('./firebase.js');
                    await forceBanUser(userId, reason);
                    showNotification(`${username} expulsado forzosamente`, 'success');
                    panel.remove();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
}
