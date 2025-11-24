import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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
const database = getDatabase(app);

document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.login-tab');
    const forms = document.querySelectorAll('.login-form');
    
    // Sistema de notificaciones
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

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab + '-form').classList.add('active');
        });
    });

    // Generate unique user ID
    function generateUserId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < 15; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Check username availability
    async function isUsernameAvailable(username) {
        const usersRef = ref(database, 'usernames');
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
            const usernames = Object.values(snapshot.val());
            return !usernames.includes(username);
        }
        return true;
    }



    // Login (solo modo invitado)
    document.getElementById('login-submit').addEventListener('click', async function() {
        showNotification('Usa el modo invitado para acceder al chat', 'warning');
    });

    // Register (solo modo invitado)
    document.getElementById('register-submit').addEventListener('click', async function() {
        showNotification('Usa el modo invitado para acceder al chat', 'warning');
    });

    // Guest login
    document.getElementById('guest-submit').addEventListener('click', async function() {
        const nickname = document.getElementById('guest-nickname').value.trim();

        if (!nickname) {
            showNotification('Por favor ingresa un nickname', 'error');
            return;
        }

        if (nickname.length > 10) {
            showNotification('El nickname no puede tener más de 10 caracteres', 'error');
            return;
        }

        try {
            if (!(await isUsernameAvailable(nickname))) {
                showNotification('El nickname ya está en uso', 'error');
                return;
            }

            const userId = generateUserId();
            const guestUser = {
                userId: userId,
                username: nickname,
                avatar: 'images/profileuser.jpg',
                description: 'Usuario invitado',
                role: 'guest',
                isGuest: true,
                createdAt: new Date(),
                lastSeen: new Date()
            };

            // Guardar username para evitar duplicados
            await set(ref(database, `usernames/${userId}`), nickname);
            
            localStorage.setItem('currentUser', JSON.stringify(guestUser));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error al entrar como invitado: ' + error.message, 'error');
        }
    });

    // Social login (deshabilitado)
    document.getElementById('google-login').addEventListener('click', function() {
        showNotification('Usa el modo invitado para acceder al chat', 'warning');
    });

    document.getElementById('facebook-login').addEventListener('click', function() {
        showNotification('Usa el modo invitado para acceder al chat', 'warning');
    });
});