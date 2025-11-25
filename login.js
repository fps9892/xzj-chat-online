import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentCaptcha = '';
let currentCaptchaGuest = '';

document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.login-tab');
    const forms = document.querySelectorAll('.login-form');
    
    // Efecto de escritura en el título
    const titleElement = document.querySelector('.login-title');
    const phrases = [
        'FYZAR CHAT',
        'Conecta ya.',
        'Salas online.',
        'Chatea libre.',
        'Tu espacio.'
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function typeWriter() {
        const currentPhrase = phrases[phraseIndex];
        let displayText = '';
        
        if (isDeleting) {
            displayText = currentPhrase.substring(0, charIndex - 1);
        } else {
            displayText = currentPhrase.substring(0, charIndex + 1);
        }
        
        titleElement.innerHTML = displayText + '<span class="typewriter-cursor"></span>';
        
        let typingSpeed = 150;
        if (isDeleting) {
            typingSpeed = 75;
        }
        
        if (!isDeleting && charIndex === currentPhrase.length) {
            typingSpeed = phraseIndex === 0 ? 3000 : 1500;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typingSpeed = 500;
        }
        
        if (isDeleting) {
            charIndex--;
        } else {
            charIndex++;
        }
        
        setTimeout(typeWriter, typingSpeed);
    }
    
    typeWriter();
    
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

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            const form = document.getElementById(this.dataset.tab + '-form');
            form.classList.add('active');
            if (this.dataset.tab === 'register') generateCaptcha();
            if (this.dataset.tab === 'guest') generateCaptchaGuest();
        });
    });

    function generateUserId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 15; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result.replace(/[^a-zA-Z0-9_-]/g, '');
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (file.size > 1024 * 1024) {
                reject(new Error('La imagen debe ser menor a 1MB'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // CAPTCHA
    function generateCaptcha() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        currentCaptcha = '';
        for (let i = 0; i < 6; i++) {
            currentCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('captcha-text').textContent = currentCaptcha;
    }

    function generateCaptchaGuest() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        currentCaptchaGuest = '';
        for (let i = 0; i < 6; i++) {
            currentCaptchaGuest += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('captcha-text-guest').textContent = currentCaptchaGuest;
    }

    document.getElementById('captcha-refresh')?.addEventListener('click', generateCaptcha);
    document.getElementById('captcha-refresh-guest')?.addEventListener('click', generateCaptchaGuest);

    // Password strength
    const passwordInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm');
    const strengthBar = document.querySelector('.strength-bar');
    const passwordCounter = document.querySelector('.password-counter');
    const matchIcon = document.querySelector('.password-match-icon');

    passwordInput?.addEventListener('input', function() {
        const password = this.value;
        const length = password.length;
        passwordCounter.textContent = `${length}/6`;

        if (length === 0) {
            strengthBar.className = 'strength-bar';
        } else if (length < 6) {
            strengthBar.className = 'strength-bar weak';
        } else if (length < 10) {
            const hasNumber = /\d/.test(password);
            const hasSpecial = /[!@#$%^&*]/.test(password);
            strengthBar.className = hasNumber || hasSpecial ? 'strength-bar medium' : 'strength-bar weak';
        } else {
            const hasNumber = /\d/.test(password);
            const hasSpecial = /[!@#$%^&*]/.test(password);
            const hasUpper = /[A-Z]/.test(password);
            strengthBar.className = (hasNumber && hasSpecial && hasUpper) ? 'strength-bar strong' : 'strength-bar medium';
        }
        checkPasswordMatch();
    });

    confirmInput?.addEventListener('input', checkPasswordMatch);

    function checkPasswordMatch() {
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (confirm.length === 0) {
            matchIcon.className = 'password-match-icon';
        } else if (password === confirm && password.length >= 6) {
            matchIcon.className = 'password-match-icon show';
            matchIcon.textContent = '✓';
        } else {
            matchIcon.className = 'password-match-icon error';
            matchIcon.textContent = '✗';
        }
    }

    // Username preview
    const usernameInput = document.getElementById('reg-username');
    const usernamePreview = document.getElementById('username-preview');

    usernameInput?.addEventListener('input', function() {
        const username = this.value.trim();
        usernamePreview.textContent = username || 'Usuario';
    });

    // Avatar preview
    const avatarInput = document.getElementById('reg-avatar');
    const avatarPreviewImg = document.getElementById('avatar-preview-img');

    avatarInput?.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                avatarPreviewImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Welcome animation
    function showWelcome() {
        const overlay = document.createElement('div');
        overlay.className = 'welcome-overlay';
        overlay.innerHTML = `
            <div class="welcome-content">
                <h1>¡Bienvenido a FYZAR CHAT!</h1>
                <p>Disfruta de múltiples salas</p>
                <p>Personaliza tu perfil</p>
                <p>Conecta con otros usuarios</p>
            </div>
        `;
        document.body.appendChild(overlay);

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = ['#00ff00', '#00ffff', '#ff00ff'][Math.floor(Math.random() * 3)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            overlay.appendChild(confetti);
        }

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 500);
        }, 3000);
    }

    // Obtener IP del usuario
    async function getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // Login
    document.getElementById('login-submit').addEventListener('click', async function() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            const q = query(collection(db, 'users'), where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                showNotification('Usuario no encontrado', 'error');
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            const userIP = await getUserIP();
            
            // Verificar baneo por ID
            const bannedDoc = await getDoc(doc(db, 'banned', userData.firebaseUid));
            if (bannedDoc.exists()) {
                localStorage.setItem('currentUser', JSON.stringify(userData));
                window.location.href = 'banned.html';
                return;
            }
            
            // Verificar baneo por IP
            const bannedIPDoc = await getDoc(doc(db, 'bannedIPs', userIP.replace(/\./g, '_')));
            if (bannedIPDoc.exists()) {
                localStorage.setItem('currentUser', JSON.stringify(userData));
                window.location.href = 'banned.html';
                return;
            }
            
            const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
            userData.firebaseUid = userCredential.user.uid;
            userData.ip = userIP;
            
            // Actualizar IP en Firestore
            await setDoc(doc(db, 'users', userData.firebaseUid), { ip: userIP }, { merge: true });
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Credenciales incorrectas', 'error');
        }
    });

    // Register
    document.getElementById('register-submit').addEventListener('click', async function() {
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim() || `${generateUserId()}@fyzar.temp`;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;
        const description = document.getElementById('reg-description').value.trim();
        const country = document.getElementById('reg-country').value;
        const avatarFile = document.getElementById('reg-avatar').files[0];
        const captchaInput = document.getElementById('captcha-input').value.trim();

        if (!username || !password || !confirmPassword) {
            showNotification('Por favor completa los campos obligatorios', 'error');
            return;
        }

        if (captchaInput.toUpperCase() !== currentCaptcha.toUpperCase()) {
            showNotification('Código CAPTCHA incorrecto', 'error');
            generateCaptcha();
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            const userIP = await getUserIP();
            
            // Verificar si la IP está baneada
            const bannedIPDoc = await getDoc(doc(db, 'bannedIPs', userIP.replace(/\./g, '_')));
            if (bannedIPDoc.exists()) {
                showNotification('Tu IP está baneada. No puedes crear cuentas', 'error');
                return;
            }
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            let avatarUrl = 'images/profileuser.jpg';

            if (avatarFile) {
                try {
                    avatarUrl = await fileToBase64(avatarFile);
                } catch (error) {
                    showNotification(error.message, 'error');
                    return;
                }
            }

            const userId = generateUserId();
            const now = new Date();
            const userData = {
                userId: userId,
                username: username,
                email: email,
                avatar: avatarUrl,
                description: description || 'Nuevo usuario',
                country: country || 'No especificado',
                createdAt: now.toISOString(),
                lastSeen: now.toISOString(),
                role: 'user',
                isGuest: false,
                textColor: '#ffffff',
                background: 'default',
                firebaseUid: userCredential.user.uid,
                ip: userIP
            };
            
            await setDoc(doc(db, 'users', userCredential.user.uid), userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            showNotification('Cuenta creada exitosamente', 'success');
            showWelcome();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3500);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                showNotification('El email ya está registrado', 'error');
            } else {
                showNotification('Error al crear cuenta: ' + error.message, 'error');
            }
        }
    });

    // Guest login
    document.getElementById('guest-submit').addEventListener('click', async function() {
        const nickname = document.getElementById('guest-nickname').value.trim();
        const captchaInput = document.getElementById('captcha-input-guest').value.trim();

        if (!nickname) {
            showNotification('Por favor ingresa un nickname', 'error');
            return;
        }

        if (captchaInput.toUpperCase() !== currentCaptchaGuest.toUpperCase()) {
            showNotification('Código CAPTCHA incorrecto', 'error');
            generateCaptchaGuest();
            return;
        }

        try {
            const userIP = await getUserIP();
            
            // Verificar si la IP está baneada
            const bannedIPDoc = await getDoc(doc(db, 'bannedIPs', userIP.replace(/\./g, '_')));
            if (bannedIPDoc.exists()) {
                showNotification('Tu IP está baneada. No puedes acceder', 'error');
                return;
            }
            
            const userId = 'guest_' + generateUserId();
            
            // Verificar si el userId está baneado
            const bannedDoc = await getDoc(doc(db, 'banned', userId));
            if (bannedDoc.exists()) {
                const now = new Date();
                const guestUser = {
                    userId: userId,
                    username: nickname,
                    avatar: 'images/profileuser.jpg',
                    description: 'Usuario invitado',
                    role: 'guest',
                    isGuest: true,
                    textColor: '#ffffff',
                    status: 'online',
                    createdAt: now.toISOString(),
                    lastSeen: now.toISOString(),
                    ip: userIP
                };
                localStorage.setItem('currentUser', JSON.stringify(guestUser));
                window.location.href = 'banned.html';
                return;
            }
            
            const now = new Date();
            const guestUser = {
                userId: userId,
                username: nickname,
                avatar: 'images/profileuser.jpg',
                description: 'Usuario invitado',
                role: 'guest',
                isGuest: true,
                textColor: '#ffffff',
                status: 'online',
                createdAt: now.toISOString(),
                lastSeen: now.toISOString(),
                ip: userIP
            };

            await setDoc(doc(db, 'guests', userId), guestUser);
            localStorage.setItem('currentUser', JSON.stringify(guestUser));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error al entrar como invitado: ' + error.message, 'error');
        }
    });

    // Google login
    document.getElementById('google-login').addEventListener('click', async function() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const userIP = await getUserIP();
            
            // Verificar baneo por ID
            const bannedDoc = await getDoc(doc(db, 'banned', user.uid));
            if (bannedDoc.exists()) {
                window.location.href = 'banned.html';
                return;
            }
            
            // Verificar baneo por IP
            const bannedIPDoc = await getDoc(doc(db, 'bannedIPs', userIP.replace(/\./g, '_')));
            if (bannedIPDoc.exists()) {
                window.location.href = 'banned.html';
                return;
            }
            
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            let userData;
            if (!userDoc.exists()) {
                const userId = generateUserId();
                const username = user.displayName ? user.displayName.substring(0, 10) : 'GoogleUser';
                
                const now = new Date();
                userData = {
                    userId: userId,
                    username: username,
                    email: user.email,
                    avatar: user.photoURL || 'images/profileuser.jpg',
                    description: 'Usuario de Google',
                    createdAt: now.toISOString(),
                    lastSeen: now.toISOString(),
                    role: 'user',
                    isGuest: false,
                    textColor: '#ffffff',
                    background: 'default',
                    firebaseUid: user.uid,
                    ip: userIP
                };
                
                await setDoc(doc(db, 'users', user.uid), userData);
            } else {
                userData = userDoc.data();
                userData.ip = userIP;
                await setDoc(doc(db, 'users', user.uid), { ip: userIP }, { merge: true });
            }
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error con Google: ' + error.message, 'error');
        }
    });

    // Initialize
    generateCaptcha();
    generateCaptchaGuest();
});
