// Panel de juegos
export async function showGamesPanel() {
    const { createTatetiGame, createCarrerasGame, createConecta4Game, createDamasGame, createUnoGame, database, ref, push, serverTimestamp, currentUser, currentRoom } = await import('./firebase.js');
    
    const createElement = (html) => {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    };
    
    const panel = createElement(`
        <div class="games-panel-overlay active">
            <div class="games-panel">
                <div class="games-panel-header">
                    <h2>🎮 Crear Juego</h2>
                    <button class="close-games-panel">×</button>
                </div>
                <div class="games-list">
                    <div class="game-card" data-game="tateti">
                        <div class="game-icon">❌⭕</div>
                        <h3>Ta-Te-Ti</h3>
                        <p>Juego clásico para 2 jugadores</p>
                        <button class="create-game-btn" data-game="tateti">Crear Sala</button>
                    </div>
                    <div class="game-card" data-game="carreras">
                        <div class="game-icon">🏎️</div>
                        <h3>Carreras</h3>
                        <p>Compite contra otros jugadores</p>
                        <button class="create-game-btn" data-game="carreras">Crear Sala</button>
                    </div>
                    <div class="game-card" data-game="conecta4">
                        <div class="game-icon">🔴</div>
                        <h3>Conecta 4</h3>
                        <p>Conecta 4 fichas en línea</p>
                        <button class="create-game-btn" data-game="conecta4">Crear Sala</button>
                    </div>
                    <div class="game-card" data-game="damas">
                        <div class="game-icon">👑</div>
                        <h3>Damas</h3>
                        <p>Juego de estrategia clásico</p>
                        <button class="create-game-btn" data-game="damas">Crear Sala</button>
                    </div>
                    <div class="game-card" data-game="uno">
                        <div class="game-icon">🎴</div>
                        <h3>UNO</h3>
                        <p>Juego de cartas para 2-8 jugadores</p>
                        <button class="create-game-btn" data-game="uno">Crear Sala</button>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    document.body.appendChild(panel);
    
    panel.querySelector('.close-games-panel').addEventListener('click', () => panel.remove());
    panel.addEventListener('click', (e) => {
        if (e.target === panel) panel.remove();
    });
    
    panel.querySelectorAll('.create-game-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const gameType = btn.dataset.game;
            
            const gameNames = { tateti: 'Ta-Te-Ti', carreras: 'Carreras', conecta4: 'Conecta 4', damas: 'Damas', uno: 'UNO' };
            const gameEmojis = { tateti: '🎮', carreras: '🏎️', conecta4: '🔴', damas: '👑', uno: '🎴' };
            const gameFunctions = { tateti: createTatetiGame, carreras: createCarrerasGame, conecta4: createConecta4Game, damas: createDamasGame, uno: createUnoGame };
            
            if (gameFunctions[gameType]) {
                const gameName = gameNames[gameType];
                const gameEmoji = gameEmojis[gameType];
                try {
                    btn.textContent = 'Creando...';
                    btn.disabled = true;
                    
                    const gameId = await gameFunctions[gameType]();
                    const gameLink = `${window.location.origin}/juegos/${gameType}.html?id=${gameId}`;
                    
                    // Enviar mensaje al chat con el link
                    const messagesRef = ref(database, `rooms/${currentRoom}/messages`);
                    await push(messagesRef, {
                        text: `${gameEmoji} Nueva sala de ${gameName} creada por ${currentUser.username}`,
                        userId: 'bot-juegos',
                        userName: '🤖 Bot de Juegos',
                        userAvatar: 'images/logo.svg',
                        textColor: '#00ff88',
                        timestamp: serverTimestamp(),
                        type: 'game',
                        gameLink: gameLink,
                        isGuest: false,
                        role: 'bot',
                        firebaseUid: null
                    });
                    
                    // Mostrar notificación
                    const notification = document.createElement('div');
                    notification.className = 'notification success';
                    notification.textContent = 'Sala de juego creada exitosamente';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.classList.add('show'), 100);
                    setTimeout(() => {
                        notification.classList.remove('show');
                        setTimeout(() => notification.remove(), 300);
                    }, 3000);
                    
                    panel.remove();
                } catch (error) {
                    const notification = document.createElement('div');
                    notification.className = 'notification error';
                    notification.textContent = 'Error al crear juego: ' + error.message;
                    document.body.appendChild(notification);
                    setTimeout(() => notification.classList.add('show'), 100);
                    setTimeout(() => {
                        notification.classList.remove('show');
                        setTimeout(() => notification.remove(), 300);
                    }, 3000);
                    
                    btn.textContent = 'Crear Sala';
                    btn.disabled = false;
                }
            }
        });
    });
}
