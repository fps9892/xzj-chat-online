// Sistema de gestión de emotes y gifs con favoritos
import { sendMessage, currentUser } from './firebase.js';

const EMOTES = Array.from({length: 22}, (_, i) => `/images/emotes/emote${i+1}.png`);
const GIFS = Array.from({length: 11}, (_, i) => `/images/emotes/gifs/emote${i+1}.gif`);

// Obtener favoritos del localStorage
function getFavorites(type) {
    const key = `favorites_${type}_${currentUser.userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
}

// Guardar favoritos
function saveFavorites(type, favorites) {
    const key = `favorites_${type}_${currentUser.userId}`;
    localStorage.setItem(key, JSON.stringify(favorites));
}

// Incrementar contador de uso
function incrementUsage(type, src) {
    const favorites = getFavorites(type);
    favorites[src] = (favorites[src] || 0) + 1;
    saveFavorites(type, favorites);
}

// Obtener top 5 más usados
function getTopFavorites(type, items) {
    const favorites = getFavorites(type);
    return items
        .map(src => ({ src, count: favorites[src] || 0 }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => item.src);
}

// Renderizar emotes/gifs
function renderItems(items, gridId, type) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.innerHTML = '';
    items.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'emote-item';
        img.dataset.type = type;
        img.addEventListener('click', () => handleItemClick(src, type));
        grid.appendChild(img);
    });
}

// Renderizar favoritos
function renderFavorites(type) {
    const items = type === 'emotes' ? EMOTES : GIFS;
    const topFavorites = getTopFavorites(type, items);
    
    const favSection = document.getElementById(type === 'emotes' ? 'favoriteEmotes' : 'favoriteGifs');
    const favGrid = document.getElementById(type === 'emotes' ? 'favoriteEmotesGrid' : 'favoriteGifsGrid');
    
    if (!favSection || !favGrid) return;
    
    if (topFavorites.length > 0) {
        favSection.style.display = 'block';
        favGrid.innerHTML = '';
        topFavorites.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.className = 'favorite-item';
            img.dataset.type = type;
            img.addEventListener('click', () => handleItemClick(src, type));
            favGrid.appendChild(img);
        });
    } else {
        favSection.style.display = 'none';
    }
}

// Manejar click en emote/gif
async function handleItemClick(src, type) {
    incrementUsage(type, src);
    
    try {
        await sendMessage(currentUser.username || 'Usuario', 'emote', src);
        document.querySelector('.emote-panel').classList.remove('active');
        
        // Actualizar favoritos después de enviar
        setTimeout(() => renderFavorites(type), 100);
    } catch (error) {
        console.error('Error sending emote:', error);
    }
}

// Inicializar panel de emotes
export function initEmotePanel() {
    const emoteBtn = document.querySelector('.emote-btn');
    const emotePanel = document.querySelector('.emote-panel');
    const emoteTabs = document.querySelectorAll('.emote-tab');
    
    if (!emoteBtn || !emotePanel) return;
    
    // Renderizar emotes y gifs
    renderItems(EMOTES, 'emotesGrid', 'emotes');
    renderItems(GIFS, 'gifsGrid', 'gifs');
    renderFavorites('emotes');
    renderFavorites('gifs');
    
    // Toggle panel
    emoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emotePanel.classList.toggle('active');
    });
    
    // Cambiar tabs
    emoteTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.dataset.tab;
            
            // Actualizar tabs activos
            emoteTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Mostrar sección correspondiente
            document.querySelectorAll('.emote-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelector(`[data-section="${tabType}"]`).classList.add('active');
        });
    });
    
    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!emoteBtn.contains(e.target) && !emotePanel.contains(e.target)) {
            emotePanel.classList.remove('active');
        }
    });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmotePanel);
} else {
    initEmotePanel();
}
