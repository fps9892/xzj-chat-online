import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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

const cache = {
    onlineUsers: 0
};

// --- FUNCIÓN DE FIREBASE Y DISPLAY (Mantenida) ---

function countOnlineUsers() {
    const allUsersRef = ref(database, 'rooms');
    
    onValue(allUsersRef, (snapshot) => {
        const uniqueUsers = new Set();
        
        if (snapshot.exists()) {
            snapshot.forEach((roomSnapshot) => {
                const usersData = roomSnapshot.child('users').val();
                if (usersData && typeof usersData === 'object') {
                    Object.entries(usersData).forEach(([userId, userData]) => {
                        if (userData?.status === 'online') {
                            uniqueUsers.add(userId);
                        }
                    });
                }
            });
        }
        
        const totalUsers = uniqueUsers.size;
        updateOnlineUsersDisplay(totalUsers);
    }, (error) => {
        console.error('Error fetching online users:', error);
    });
}

function updateOnlineUsersDisplay(totalUsers) {
    if (cache.onlineUsers === totalUsers) return;
    
    const onlineUsersElement = document.getElementById('onlineUsers');
    if (!onlineUsersElement) return;
    
    const currentNumber = parseInt(onlineUsersElement.textContent) || 0;
    
    if (currentNumber !== totalUsers) {
        animateNumber(onlineUsersElement, currentNumber, totalUsers, 500); 
        cache.onlineUsers = totalUsers;
    }
}

function animateNumber(element, fromNumber, toNumber, duration = 500) {
    const start = performance.now();
    const step = (timestamp) => {
        const elapsed = timestamp - start;
        const progress = Math.min(1, elapsed / duration);
        const value = Math.floor(progress * (toNumber - fromNumber) + fromNumber);
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = toNumber;
        }
    };
    requestAnimationFrame(step);
}


// --- EFECTO DE TIPEO EN HERO ---
const taglineEl = document.getElementById('typing-tagline');
const subtitleEl = document.getElementById('typing-subtitle');
// Se elimina la variable mockChatEl

// Almacenar el texto completo y limpiar el contenido para la animación
const taglineText = taglineEl ? taglineEl.textContent.trim() : '';
const subtitleText = subtitleEl ? subtitleEl.textContent.trim() : '';

if (taglineEl) taglineEl.textContent = '';
if (subtitleEl) subtitleEl.textContent = '';

function typeEffect(element, text, delay = 50, callback) {
    if (!element) return;
    let i = 0;
    
    element.style.visibility = 'visible';
    
    // Crear el cursor
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    element.appendChild(cursor);

    function typing() {
        if (i < text.length) {
            // Añadir el carácter y asegurar que el cursor esté al final
            element.textContent += text.charAt(i);
            i++;
            element.appendChild(cursor); 
            setTimeout(typing, delay);
        } else {
            // Eliminar el cursor y ejecutar el callback
            cursor.remove(); 
            if (callback) callback();
        }
    }
    typing();
}

function startTypingSequence() {
    if (taglineEl && taglineText) {
        typeEffect(taglineEl, taglineText, 50, () => {
            // Callback al terminar el tagline
            if (subtitleEl && subtitleText) {
                // Pequeño retraso antes de empezar el subtitulo
                setTimeout(() => {
                    typeEffect(subtitleEl, subtitleText, 30); 
                    // Ya no hay lógica para el mockup
                }, 500); 
            }
        });
    }
}

// Iniciar la secuencia de tipeo después de un breve retraso
window.addEventListener('load', () => {
    setTimeout(startTypingSequence, 1000); 
});


// --- NAVEGACIÓN DE ANCLAJES Y TÍTULOS (OPTIMIZADA CON INTERSECTION OBSERVER) ---
const sections = document.querySelectorAll('section[id]:not(#hero-start)'); 
const navDots = document.querySelectorAll('.anchor-dot');
const sectionTitles = document.querySelectorAll('.section-title');

const anchorObserverOptions = {
    root: null, 
    rootMargin: "-20% 0px -20% 0px", 
    threshold: 0.1 
};

const titleObserverOptions = {
    root: null,
    rootMargin: "0px 0px -10% 0px", 
    threshold: 0.1
};

// 1. Observer para Anchor Dots (mantener activo el punto de la nav)
const anchorObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            navDots.forEach(dot => {
                const targetId = dot.getAttribute('data-target');
                dot.classList.toggle('active', targetId === sectionId);
            });
        }
    });
}, anchorObserverOptions);

// 2. Observer para Animación de Títulos
const titleObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); 
        }
    });
}, titleObserverOptions);

// Observar todas las secciones
sections.forEach(section => {
    anchorObserver.observe(section);
});

// Observar todos los títulos
sectionTitles.forEach(title => {
    titleObserver.observe(title);
});


// --- SCROLL SUAVE PARA ANCLAJES (Mantenido) ---
document.addEventListener('click', (e) => {
    const dot = e.target.closest('.anchor-dot');
    
    if (dot) {
        e.preventDefault();
        const href = dot.getAttribute('href');
        
        if (href) {
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
});


// --- INICIALIZACIÓN ---
countOnlineUsers();