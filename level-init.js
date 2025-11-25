// Inicialización del sistema de niveles y países
import { initCountrySelector, incrementMessageCount, getUserLevelData } from './level-country.js';
import { currentUser } from './firebase.js';

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar selector de países
    initCountrySelector();
    
    // Interceptar envío de mensajes para incrementar contador
    const originalSendMessage = window.sendMessage;
    if (originalSendMessage) {
        window.sendMessage = async function(...args) {
            const result = await originalSendMessage.apply(this, args);
            
            // Incrementar contador de mensajes
            const userId = currentUser.firebaseUid || currentUser.userId;
            if (userId) {
                await incrementMessageCount(userId, currentUser.isGuest);
            }
            
            return result;
        };
    }
});

// Función para mostrar nivel en perfil de usuario
export async function addLevelToProfile(profilePanel, userId, isGuest) {
    const levelData = await getUserLevelData(userId, isGuest);
    
    const levelSection = document.createElement('div');
    levelSection.className = 'profile-level-section';
    levelSection.innerHTML = `
        <div class="profile-level-badge">
            <span>⭐ Nivel ${levelData.level}</span>
        </div>
        <div class="level-progress-container">
            <div class="level-info">
                <span>Progreso</span>
                <span>${levelData.toNextLevel} mensajes para nivel ${levelData.level + 1}</span>
            </div>
            <div class="level-progress-bar">
                <div class="level-progress-fill" style="width: ${levelData.progress}%"></div>
            </div>
            <div class="level-stats">
                <span>${levelData.messageCount} mensajes enviados</span>
                <span>${Math.floor(levelData.progress)}%</span>
            </div>
        </div>
    `;
    
    const profileInfo = profilePanel.querySelector('.profile-info');
    if (profileInfo) {
        profileInfo.parentNode.insertBefore(levelSection, profileInfo);
    }
}

// Función para agregar badge de nivel en mensajes
export function addLevelBadgeToMessage(messageHeader, level) {
    const badge = document.createElement('span');
    badge.className = 'user-level-badge';
    badge.innerHTML = `⭐${level}`;
    messageHeader.appendChild(badge);
}

// Función para agregar bandera de país
export function addCountryFlag(element, countryFlag) {
    if (countryFlag && countryFlag !== 'No especificado') {
        const flag = document.createElement('span');
        flag.className = 'country-flag';
        flag.textContent = countryFlag;
        element.appendChild(flag);
    }
}
