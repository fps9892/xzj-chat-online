// Sistema de gestión de emotes con favoritos
import { sendMessage, currentUser } from './firebase.js';

const EMOTES = Array.from({length: 22}, (_, i) => `/images/emotes/emote${i+1}.png`);

// Obtener favoritos del localStorage
function getFavorites() {
    const key = `favorites_emotes_${currentUser.userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
}

// Guardar favoritos
function saveFavorites(favorites) {
    const key = `favorites_emotes_${currentUser.userId}`;
    localStorage.setItem(key, JSON.stringify(favorites));
}

// Incrementar contador de uso
function incrementUsage(src) {
    const favorites = getFavorites();
    favorites[src] = (favorites[src] || 0) + 1;
    saveFavorites(favorites);
}

// Obtener top 5 más usados
function getTopFavorites() {
    const favorites = getFavorites();
    return EMOTES
        .map(src => ({ src, count: favorites[src] || 0 }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => item.src);
}

// Renderizar emotes
function renderItems() {
    const grid = document.getElementById('emotesGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    EMOTES.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'emote-item';
        img.addEventListener('click', () => handleItemClick(src));
        grid.appendChild(img);
    });
}

// Renderizar favoritos
function renderFavorites() {
    const topFavorites = getTopFavorites();
    const favSection = document.getElementById('favoriteEmotes');
    const favGrid = document.getElementById('favoriteEmotesGrid');
    
    if (!favSection || !favGrid) return;
    
    if (topFavorites.length > 0) {
        favSection.style.display = 'block';
        favGrid.innerHTML = '';
        topFavorites.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.className = 'favorite-item';
            img.addEventListener('click', () => handleItemClick(src));
            favGrid.appendChild(img);
        });
    } else {
        favSection.style.display = 'none';
    }
}

// Manejar click en emote
async function handleItemClick(src) {
    incrementUsage(src);
    
    try {
        await sendMessage(currentUser.username || 'Usuario', 'emote', src);
        document.querySelector('.emote-panel').classList.remove('active');
        setTimeout(() => renderFavorites(), 100);
    } catch (error) {
        console.error('Error sending emote:', error);
    }
}

// Inicializar panel de emotes
export function initEmotePanel() {
    const emoteBtn = document.querySelector('.emote-btn');
    const emotePanel = document.querySelector('.emote-panel');
    
    if (!emoteBtn || !emotePanel) return;
    
    renderItems();
    renderFavorites();
    
    emoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emotePanel.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!emoteBtn.contains(e.target) && !emotePanel.contains(e.target)) {
            emotePanel.classList.remove('active');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmotePanel);
} else {
    initEmotePanel();
}
