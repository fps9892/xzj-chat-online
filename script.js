import { sendMessage, listenToMessages, listenToUsers, setUserOnline, changeRoom, currentUser, currentRoom, updateUserData, changePassword, sendImage, sendAudio, setTypingStatus, listenToTyping, deleteMessage, updateUserRole, checkAdminStatus, checkModeratorStatus, grantModeratorRole, revokeModerator, pinMessage, unpinMessage, getPinnedMessages, banUser as banUserFirebase, getRooms, listenToRooms, listenToAnnouncements, showAnnouncement, listenToUserStatus, processEmotes, extractYouTubeId, checkPrivateRoomAccess, requestPrivateRoomAccess, listenToRoomAccessNotifications, database, ref, onValue, set, push, serverTimestamp } from './firebase.js';
import { AudioRecorder, formatTime, blobToBase64 } from './audio-recorder.js';
import { getUserProfile, findUserByUsername, animateMessageDeletion, initAdminListener } from './core.js';

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
    const roomsBtn = document.getElementById('roomsBtn');
    const roomsPanelOverlay = document.getElementById('roomsPanelOverlay');
    const roomsPanel = document.getElementById('roomsPanel');
    const closeRoomsPanel = document.querySelector('.close-rooms-panel');
    const roomsTabs = document.querySelectorAll('.rooms-tab');
    const publicRoomsList = document.querySelector('.rooms-list[data-section="public"]');
    const privateRoomsList = document.querySelector('.rooms-list[data-section="private"]');
    const mobileUsersIndicator = document.querySelector('.mobile-users-indicator');
    const mobileUsersDropdown = document.querySelector('.mobile-users-dropdown');
    const currentRoomName = document.querySelector('.current-room-name');
    let roomItems = document.querySelectorAll('.room-item');
    const userInfo = document.querySelector('.user-info');
    let unreadMessages = 0;
    let isPageVisible = true;
    let originalTitle = 'Sala General - FYZAR CHAT';
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



    // Toggle dropdown de usuarios móvil
    if (mobileUsersIndicator) {
        mobileUsersIndicator.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileUsersDropdown.classList.toggle('active');
        });
    }

    // Cargar salas dinámicamente con listener en tiempo real
    let roomsListener = null;
    async function loadRooms() {
        try {
            if (roomsListener) return;
            
            roomsListener = listenToRooms(async (rooms) => {
                publicRoomsList.innerHTML = '';
                privateRoomsList.innerHTML = '';
                
                const publicRooms = rooms.filter(r => r.isPrivate !== true);
                const privateRooms = rooms.filter(r => r.isPrivate === true);
                
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
                        if (room.id === currentRoom) roomElement.classList.add('active');
                        roomElement.setAttribute('data-room', room.id);
                        roomElement.textContent = room.name;
                        publicRoomsList.appendChild(roomElement);
                    }
                }
                
                // Renderizar salas privadas
                if (sortedPrivateRooms.length === 0) {
                    privateRoomsList.innerHTML = '<div class="empty-rooms">No hay salas privadas</div>';
                } else {
                    for (const room of sortedPrivateRooms) {
                        const roomElement = document.createElement('div');
                        roomElement.className = 'room-item-panel private';
                        if (room.id === currentRoom) roomElement.classList.add('active');
                        roomElement.setAttribute('data-room', room.id);
                        roomElement.innerHTML = `
                            <div class="room-item-name">
                                <span class="room-item-icon">🔒</span>
                                <span>${room.name}</span>
                            </div>
                        `;
                        privateRoomsList.appendChild(roomElement);
                    }
                }
                
                // Actualizar event listeners
                setupRoomListeners();
            });
        } catch (error) {
            console.error('Error loading rooms:', error);
        }
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
                
                const roomDisplayName = this.textContent.trim();
                currentRoomName.textContent = roomDisplayName;
                originalTitle = `${roomDisplayName} - FYZAR CHAT`;
                document.title = originalTitle;
                unreadMessages = 0;
                
                roomItems.forEach(r => r.classList.remove('active'));
                this.classList.add('active');
                
                const chatArea = document.querySelector('.chat-area');
                chatArea.innerHTML = '<div class="room-loader"><div class="loader-spinner"></div><p>Cargando sala...</p></div>';
                
                cleanupListeners();
                previousUsersList.clear();
                isInitialLoad = true;
                lastMessageCount = 0;
                
                changeRoom(roomId, false).then(() => {
                    loadMessages();
                    loadUsers();
                });
                
                roomsPanelOverlay.classList.remove('active');
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
    
    // Variable global para controlar acceso a sala privada
    let hasPrivateRoomAccess = false;
    
    // Funciones de Firebase
    async function loadMessages() {
        // Verificar acceso a sala privada
        const accessCheck = await checkPrivateRoomAccess(currentRoom);
        hasPrivateRoomAccess = accessCheck.isOwner || accessCheck.hasAccess;
        
        // Si no es sala privada, habilitar controles
        if (!accessCheck.isPrivate) {
            enableChatControls();
            listenToMessages((messages) => {
                renderMessages(messages);
                initializeMessages();
            });
            return;
        }
        
        if (hasPrivateRoomAccess) {
            // Usuario tiene acceso, cargar mensajes normalmente
            enableChatControls();
            listenToMessages((messages) => {
                renderMessages(messages);
                initializeMessages();
            });
        } else if (accessCheck.isPending) {
            // Usuario está pendiente de aprobación
            const chatArea = document.querySelector('.chat-area');
            chatArea.innerHTML = '<div class="room-loader"><div class="loader-spinner"></div><p>Solicitud pendiente de ingreso</p><small>Esperando aprobación del dueño</small></div>';
            
            // Deshabilitar controles
            disableChatControls();
        } else {
            // Usuario no tiene acceso, solicitar acceso
            const requested = await requestPrivateRoomAccess(currentRoom);
            if (requested) {
                const chatArea = document.querySelector('.chat-area');
                chatArea.innerHTML = '<div class="room-loader"><div class="loader-spinner"></div><p>Solicitud pendiente de ingreso</p><small>Esperando aprobación del dueño</small></div>';
                
                // Deshabilitar controles
                disableChatControls();
            } else {
                // No es sala privada o error, cargar normalmente
                enableChatControls();
                listenToMessages((messages) => {
                    renderMessages(messages);
                    initializeMessages();
                });
            }
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
    let previousUsersList = new Map();
    let roomEventsListener = null;
    let isInitialLoad = true;
    
    function loadUsers() {
        if (currentUsersListener) {
            currentUsersListener();
        }
        
        isInitialLoad = true;
        
        currentUsersListener = listenToUsers((users) => {
            if (!isInitialLoad) {
                users.forEach(user => {
                    if (!previousUsersList.has(user.id) && user.id !== currentUser.userId) {
                        showUserNotification(`${user.name} entró a la sala`, 'join');
                    }
                });
            }
            
            previousUsersList.clear();
            users.forEach(user => {
                previousUsersList.set(user.id, user);
            });
            
            renderUsers(users);
            isInitialLoad = false;
        });
        
        listenToRoomEvents();
    }
    
    async function listenToRoomEvents() {
        try {
            const { database, getRoomName, currentUser } = await import('./firebase.js');
            const { ref, onValue, query: dbQuery, limitToLast } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const eventsRef = dbQuery(ref(database, 'roomEvents'), limitToLast(10));
            
            roomEventsListener = onValue(eventsRef, (snapshot) => {
                snapshot.forEach(async (childSnapshot) => {
                    const event = childSnapshot.val();
                    
                    // Evento de cambio de sala (usuario se fue a otra sala)
                    if (event.type === 'room-change' && event.fromRoom === currentRoom && event.userId !== currentUser.userId) {
                        const toRoomName = await getRoomName(event.toRoom);
                        showUserNotification(`${event.username} se fue a ${toRoomName}`, 'room-change');
                    }
                    
                    // Evento de entrada a sala (usuario se unió)
                    if (event.type === 'join' && event.toRoom === currentRoom) {
                        if (event.userId === currentUser.userId) {
                            // Notificación personal de bienvenida
                            showUserNotification(`¡Bienvenido ${event.username}!`, 'welcome');
                        } else {
                            // Notificación para otros usuarios
                            showUserNotification(`${event.username} se ha unido a la sala`, 'join');
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error setting up room events listener:', error);
        }
    }
    
    function showUserNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `user-notification ${type}`;
        
        notification.innerHTML = `<img src="/images/notification.svg" class="notif-icon" alt="Notification"><span>${message}</span>`;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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
        });
        chatArea.dataset.speedListenerAdded = 'true';
    }
    
    function renderMessages(messages) {
        if (!isPageVisible && messages.length > lastMessageCount) {
            unreadMessages += (messages.length - lastMessageCount);
            document.title = `(${unreadMessages}) ${originalTitle}`;
        }
        
        lastMessageCount = messages.length;
        
        const chatArea = document.querySelector('.chat-area');
        const wasAtBottom = chatArea.scrollHeight - chatArea.scrollTop <= chatArea.clientHeight + 50;
        
        chatArea.innerHTML = '';
        
        messages.forEach((message, index) => {
            const messageEl = createMessageElement(message);
            chatArea.appendChild(messageEl);
            
            // Inicializar velocidad de audio
            if (message.type === 'audio') {
                const audioElement = document.getElementById(`audio-${message.id}`);
                if (audioElement) {
                    audioElement.playbackRate = 1;
                }
            }
            
            // Si el mensaje indica que la sala fue borrada, redirigir
            if (message.roomDeleted && message.type === 'system') {
                setTimeout(() => {
                    if (currentRoom !== 'general') {
                        showNotification('Has sido movido a la Sala General', 'warning');
                        changeRoom('general', false);
                        currentRoomName.textContent = 'Sala General';
                        loadMessages();
                        loadUsers();
                    }
                }, 2000);
            }
        });
        
        // Scroll automático solo si estaba cerca del final
        if (wasAtBottom) {
            requestAnimationFrame(() => {
                chatArea.scrollTop = chatArea.scrollHeight;
            });
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
                                `<div class="message-text copyable-text">${processEmotes(message.text)}</div>
                                ${message.text.length > getCharacterLimit() ? '<span class="see-more">ver más</span>' : ''}
                                ${(() => {
                                    const youtubeId = extractYouTubeId(message.text);
                                    return youtubeId ? `<div class="youtube-embed"><iframe width="100%" height="200" src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : '';
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
            const messageContent = messageEl.querySelector('.message-content') || messageEl.querySelector('.audio-message');
            
            if (messageContent) {
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
                    }, 1000);
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
    
    let userNumericIds = new Map();
    let currentNumericId = 1;
    
    function createUserElement(user) {
        let displayName = user.name;
        let userNumId = '';
        
        if (user.role === 'Administrador') displayName += ' (Admin)';
        else if (user.role === 'Moderador') displayName += ' (Mod)';
        
        // Asignar ID numérico fijo para admins/mods
        if ((currentUser.isAdmin || currentUser.isModerator) && !user.isGuest) {
            if (!userNumericIds.has(user.firebaseUid || user.id)) {
                userNumericIds.set(user.firebaseUid || user.id, currentNumericId++);
            }
            const numId = userNumericIds.get(user.firebaseUid || user.id);
            userNumId = `<span class="user-id">#${numId}</span>`;
        }
        
        const canModerate = (currentUser.isAdmin || currentUser.isModerator) && user.id !== currentUser.userId && !user.isGuest;
        
        const userEl = createElement(`
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-avatar">
                    <img src="${user.avatar}" alt="${user.name}">
                    <span class="online-indicator"></span>
                </div>
                <span class="user-name">${userNumId}${displayName}</span>
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
            const userProfile = await getUserProfile(user.firebaseUid || user.id, user.isGuest);
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
        let displayName = user.name;
        if (user.role === 'Administrador') displayName += ' (Admin)';
        else if (user.role === 'Moderador') displayName += ' (Mod)';
        else if (user.isGuest || user.role === 'guest') displayName += ' (invitado)';
        
        const userEl = createElement(`
            <div class="mobile-user-item" data-user-id="${user.id}">
                <div class="mobile-user-avatar">
                    <img src="${user.avatar}" alt="${user.name}" onerror="this.src='/images/profileuser.jpg'">
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
    
    async function initializeApp() {
        validateCurrentUser();
        
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
        
        setTimeout(() => {
            changeRoom(currentRoom, true);
            loadMessages();
            loadUsers();
        }, 500);
        
        setTimeout(clearSkeletons, 3000);
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
    
    // Manejar cambios de URL (botón atrás/adelante del navegador)
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.room) {
            const roomId = event.state.room;
            currentRoomName.textContent = roomId === 'general' ? 'Sala General' : roomId;
            cleanupListeners();
            changeRoom(roomId, false);
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
    if (!currentUser.isGuest && currentUser.firebaseUid) {
        listenToUserStatus((status) => {
            if (status.type === 'banned') {
                window.location.replace('banned.html');
            } else if (status.type === 'muted') {
                messageInput.disabled = true;
                messageInput.placeholder = 'Estás muteado';
                imageBtn.style.pointerEvents = 'none';
                imageBtn.style.opacity = '0.5';
                emoteBtn.style.pointerEvents = 'none';
                emoteBtn.style.opacity = '0.5';
                sendIcon.style.pointerEvents = 'none';
                sendIcon.style.opacity = '0.5';
            } else if (status.type === 'unmuted') {
                messageInput.disabled = false;
                messageInput.placeholder = 'Escribe tu mensaje...';
                imageBtn.style.pointerEvents = 'auto';
                imageBtn.style.opacity = '1';
                emoteBtn.style.pointerEvents = 'auto';
                emoteBtn.style.opacity = '1';
                sendIcon.style.pointerEvents = 'auto';
                sendIcon.style.opacity = '1';
            }
        });
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
    
    // Escuchar cuando una sala es borrada
    const roomDeletedRef = ref(database, `roomDeleted/${currentRoom}`);
    let countdownInterval = null;
    
    onValue(roomDeletedRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Si la sala fue marcada para eliminación, mostrar temporizador
            if (data.deleting && !data.deleted) {
                let countdown = data.countdown || 15;
                showNotification(`⚠️ Esta sala será eliminada en ${countdown} segundos`, 'warning');
                
                // Limpiar intervalo anterior si existe
                if (countdownInterval) clearInterval(countdownInterval);
                
                // Actualizar contador cada segundo
                countdownInterval = setInterval(() => {
                    countdown--;
                    if (countdown > 0) {
                        showNotification(`⚠️ Esta sala será eliminada en ${countdown} segundos`, 'warning');
                    } else {
                        clearInterval(countdownInterval);
                    }
                }, 1000);
            }
            
            // Si la sala fue eliminada, forzar recarga
            if (data.deleted && data.forceReload) {
                if (countdownInterval) clearInterval(countdownInterval);
                showNotification('La sala ha sido eliminada. Redirigiendo...', 'error');
                
                // Forzar recarga de página para llevar a index.html
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 500);
            }
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

    // Enviar mensaje
    function sendMessageHandler() {
        // Verificar acceso a sala privada
        if (!hasPrivateRoomAccess) {
            const accessCheck = checkPrivateRoomAccess(currentRoom);
            accessCheck.then(check => {
                if (!check.isOwner && !check.hasAccess) {
                    showNotification('No tienes acceso a esta sala privada', 'error');
                    return;
                }
            });
        }
        
        const message = messageInput.value.trim();
        if (message) {
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
    
    sendAudioBtn.addEventListener('click', async () => {
        if (!recordedAudioBlob) {
            showNotification('No hay audio para enviar', 'error');
            return;
        }
        
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        
        try {
            const audioBase64 = await blobToBase64(recordedAudioBlob);
            await sendAudio(audioBase64, duration);
            showNotification('Audio enviado', 'success');
            
            // Limpiar y cerrar panel
            closeAudioPanelFunc();
        } catch (error) {
            showNotification('Error al enviar audio', 'error');
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
            return;
        }
        
        try {
            const audioBase64 = await blobToBase64(file);
            const audio = new Audio(audioBase64);
            audio.onloadedmetadata = async () => {
                const duration = Math.floor(audio.duration);
                await sendAudio(audioBase64, duration);
                showNotification('Audio enviado', 'success');
                audioInput.value = '';
            };
        } catch (error) {
            showNotification('Error al enviar audio', 'error');
        }
    });

    sendIcon.addEventListener('click', sendMessageHandler);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessageHandler();
        }
    });
});