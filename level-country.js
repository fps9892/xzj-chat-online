// Sistema de niveles y selector de países

// Mapa de países con emojis
export const countryFlags = {
    '🇦🇷': 'Argentina',
    '🇧🇷': 'Brasil',
    '🇨🇱': 'Chile',
    '🇨🇴': 'Colombia',
    '🇨🇷': 'Costa Rica',
    '🇨🇺': 'Cuba',
    '🇪🇨': 'Ecuador',
    '🇸🇻': 'El Salvador',
    '🇪🇸': 'España',
    '🇺🇸': 'Estados Unidos',
    '🇬🇹': 'Guatemala',
    '🇭🇳': 'Honduras',
    '🇲🇽': 'México',
    '🇳🇮': 'Nicaragua',
    '🇵🇦': 'Panamá',
    '🇵🇾': 'Paraguay',
    '🇵🇪': 'Perú',
    '🇵🇷': 'Puerto Rico',
    '🇩🇴': 'República Dominicana',
    '🇺🇾': 'Uruguay',
    '🇻🇪': 'Venezuela',
    '🌎': 'Otro'
};

// Calcular nivel basado en mensajes enviados
export function calculateLevel(messageCount) {
    // 10 mensajes por nivel
    return Math.floor(messageCount / 10) + 1;
}

// Calcular progreso al siguiente nivel
export function calculateProgress(messageCount) {
    const messagesInCurrentLevel = messageCount % 10;
    return (messagesInCurrentLevel / 10) * 100;
}

// Obtener mensajes necesarios para siguiente nivel
export function getMessagesToNextLevel(messageCount) {
    return 10 - (messageCount % 10);
}

// Inicializar selector de países
export function initCountrySelector() {
    const countryItem = document.querySelector('.config-item[data-config="country"]');
    if (!countryItem) return;
    
    const button = countryItem.querySelector('button');
    const panel = countryItem.querySelector('.country-selector-panel');
    const select = countryItem.querySelector('.country-select');
    const acceptBtn = panel?.querySelector('.accept-btn');
    const cancelBtn = panel?.querySelector('.cancel-btn');
    
    if (!button || !panel || !select) return;
    
    // Abrir panel
    button.addEventListener('click', () => {
        panel.classList.add('active');
        button.style.display = 'none';
    });
    
    // Cancelar
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            panel.classList.remove('active');
            button.style.display = 'block';
        });
    }
    
    // Aceptar
    if (acceptBtn) {
        acceptBtn.addEventListener('click', async () => {
            const selectedFlag = select.value;
            if (selectedFlag) {
                const { updateUserData } = await import('./firebase.js');
                const success = await updateUserData({ country: selectedFlag });
                
                if (success) {
                    const notification = document.createElement('div');
                    notification.className = 'notification success';
                    notification.textContent = 'País actualizado correctamente';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.classList.add('show'), 100);
                    setTimeout(() => {
                        notification.classList.remove('show');
                        setTimeout(() => notification.remove(), 300);
                    }, 3000);
                }
                
                panel.classList.remove('active');
                button.style.display = 'block';
            }
        });
    }
}

// Actualizar contador de mensajes y nivel
export async function incrementMessageCount(userId, isGuest) {
    try {
        const { getFirestore, doc, getDoc, updateDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
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
        
        const collection = isGuest ? 'guests' : 'users';
        const userRef = doc(db, collection, userId);
        const userDoc = await getDoc(userRef);
        
        let messageCount = 0;
        if (userDoc.exists()) {
            messageCount = (userDoc.data().messageCount || 0) + 1;
            await updateDoc(userRef, { messageCount });
        } else {
            messageCount = 1;
            await setDoc(userRef, { messageCount }, { merge: true });
        }
        
        return messageCount;
    } catch (error) {
        console.error('Error incrementing message count:', error);
        return 0;
    }
}

// Obtener datos de nivel del usuario
export async function getUserLevelData(userId, isGuest) {
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
        
        const collection = isGuest ? 'guests' : 'users';
        const userRef = doc(db, collection, userId);
        const userDoc = await getDoc(userRef);
        
        const messageCount = userDoc.exists() ? (userDoc.data().messageCount || 0) : 0;
        const level = calculateLevel(messageCount);
        const progress = calculateProgress(messageCount);
        const toNextLevel = getMessagesToNextLevel(messageCount);
        
        return { messageCount, level, progress, toNextLevel };
    } catch (error) {
        console.error('Error getting user level data:', error);
        return { messageCount: 0, level: 1, progress: 0, toNextLevel: 10 };
    }
}
