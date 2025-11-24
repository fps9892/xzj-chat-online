import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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
const storage = getStorage(app);
const database = getDatabase(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

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
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 15; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result.replace(/[^a-zA-Z0-9_-]/g, '');
    }

    // Check username availability
    async function isUsernameAvailable(username) {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
    }

    // Upload avatar
    async function uploadAvatar(file, userId) {
        const avatarRef = storageRef(storage, `avatars/${userId}`);
        await uploadBytes(avatarRef, file);
        return await getDownloadURL(avatarRef);
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
            // Find user by username
            const q = query(collection(db, 'users'), where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                showNotification('Usuario no encontrado', 'error');
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            await signInWithEmailAndPassword(auth, userData.email, password);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Credenciales incorrectas', 'error');
        }
    });

    // Register
    document.getElementById('register-submit').addEventListener('click', async function() {
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;
        const description = document.getElementById('reg-description').value.trim();
        const avatarFile = document.getElementById('reg-avatar').files[0];

        if (!username || !email || !password || !confirmPassword) {
            showNotification('Por favor completa todos los campos obligatorios', 'error');
            return;
        }

        if (username.length > 10) {
            showNotification('El nombre de usuario no puede tener más de 10 caracteres', 'error');
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            let avatarUrl = 'images/profileuser.jpg';

            if (avatarFile) {
                avatarUrl = await uploadAvatar(avatarFile, userCredential.user.uid);
            }

            const userId = generateUserId();
            const userData = {
                userId: userId,
                username: username,
                email: email,
                avatar: avatarUrl,
                description: description || 'Usuario registrado',
                createdAt: new Date(),
                lastSeen: new Date(),
                role: 'user', // Default role
                isGuest: false,
                textColor: '#ffffff',
                background: 'default'
            };
            
            await setDoc(doc(db, 'users', userCredential.user.uid), userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            showNotification('Cuenta creada exitosamente', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                showNotification('El email ya está registrado', 'error');
            } else if (error.code === 'auth/weak-password') {
                showNotification('La contraseña es muy débil', 'error');
            } else {
                showNotification('Error al crear cuenta: ' + error.message, 'error');
            }
        }
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
                textColor: '#ffffff',
                status: 'online',
                createdAt: new Date(),
                lastSeen: new Date()
            };

            // Guardar en Firestore para usuarios invitados también
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
            
            // Check if user exists
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            let userData;
            if (!userDoc.exists()) {
                // Create new user
                const userId = generateUserId();
                const username = user.displayName ? user.displayName.substring(0, 10) : 'GoogleUser';
                
                userData = {
                    userId: userId,
                    username: username,
                    email: user.email,
                    avatar: user.photoURL || 'images/profileuser.jpg',
                    description: 'Usuario de Google',
                    createdAt: new Date(),
                    lastSeen: new Date(),
                    role: 'user',
                    isGuest: false,
                    textColor: '#ffffff',
                    background: 'default'
                };
                
                await setDoc(doc(db, 'users', user.uid), userData);
            } else {
                userData = userDoc.data();
            }
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error con Google: ' + error.message, 'error');
        }
    });

    // Facebook login
    document.getElementById('facebook-login').addEventListener('click', async function() {
        try {
            const result = await signInWithPopup(auth, facebookProvider);
            const user = result.user;
            
            // Check if user exists
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            let userData;
            if (!userDoc.exists()) {
                // Create new user
                const userId = generateUserId();
                const username = user.displayName ? user.displayName.substring(0, 10) : 'FacebookUser';
                
                userData = {
                    userId: userId,
                    username: username,
                    email: user.email,
                    avatar: user.photoURL || 'images/profileuser.jpg',
                    description: 'Usuario de Facebook',
                    createdAt: new Date(),
                    lastSeen: new Date(),
                    role: 'user',
                    isGuest: false,
                    textColor: '#ffffff',
                    background: 'default'
                };
                
                await setDoc(doc(db, 'users', user.uid), userData);
            } else {
                userData = userDoc.data();
            }
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error con Facebook: ' + error.message, 'error');
        }
    });
});