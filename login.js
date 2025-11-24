import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < 15; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Check username availability
    async function isUsernameAvailable(username) {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
    }

    // Upload avatar
    async function uploadAvatar(file, userId) {
        const avatarRef = ref(storage, `avatars/${userId}`);
        await uploadBytes(avatarRef, file);
        return await getDownloadURL(avatarRef);
    }

    // Create user profile
    async function createUserProfile(user, userData) {
        const userId = generateUserId();
        await setDoc(doc(db, 'users', user.uid), {
            userId: userId,
            username: userData.username,
            email: user.email,
            avatar: userData.avatar || 'images/profileuser.jpg',
            description: userData.description || '',
            createdAt: new Date(),
            lastSeen: new Date(),
            role: 'user'
        });
        return userId;
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
            const email = userDoc.data().email;
            
            await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem('currentUser', JSON.stringify(userDoc.data()));
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error al iniciar sesión: ' + error.message, 'error');
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

        try {
            // Check username availability
            if (!(await isUsernameAvailable(username))) {
                showNotification('El nombre de usuario ya está en uso', 'error');
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            let avatarUrl = 'images/profileuser.jpg';

            if (avatarFile) {
                avatarUrl = await uploadAvatar(avatarFile, userCredential.user.uid);
            }

            const userId = await createUserProfile(userCredential.user, {
                username,
                avatar: avatarUrl,
                description
            });

            localStorage.setItem('currentUser', JSON.stringify({
                userId,
                username,
                email,
                avatar: avatarUrl,
                description,
                role: 'user'
            }));

            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error al registrarse: ' + error.message, 'error');
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

            const guestUser = {
                userId: generateUserId(),
                username: nickname,
                avatar: 'images/profileuser.jpg',
                description: 'Usuario invitado',
                role: 'guest',
                isGuest: true
            };

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
            
            if (!userDoc.exists()) {
                // Create new user
                const userId = await createUserProfile(user, {
                    username: user.displayName.substring(0, 10),
                    avatar: user.photoURL || 'images/profileuser.jpg'
                });
                
                localStorage.setItem('currentUser', JSON.stringify({
                    userId,
                    username: user.displayName.substring(0, 10),
                    email: user.email,
                    avatar: user.photoURL || 'images/profileuser.jpg',
                    role: 'user'
                }));
            } else {
                localStorage.setItem('currentUser', JSON.stringify(userDoc.data()));
            }
            
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
            
            // Similar logic to Google login
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
                const userId = await createUserProfile(user, {
                    username: user.displayName.substring(0, 10),
                    avatar: user.photoURL || 'images/profileuser.jpg'
                });
                
                localStorage.setItem('currentUser', JSON.stringify({
                    userId,
                    username: user.displayName.substring(0, 10),
                    email: user.email,
                    avatar: user.photoURL || 'images/profileuser.jpg',
                    role: 'user'
                }));
            } else {
                localStorage.setItem('currentUser', JSON.stringify(userDoc.data()));
            }
            
            window.location.href = 'index.html';
        } catch (error) {
            showNotification('Error con Facebook: ' + error.message, 'error');
        }
    });
});