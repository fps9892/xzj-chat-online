import { db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let developerSettings = {
  christmasAnimation: true,
  guestLogin: true,
  polls: true,
  voiceMessages: true
};

export async function checkDeveloperStatus(userId) {
  try {
    const devDoc = await getDoc(doc(db, 'developers', userId));
    return devDoc.exists();
  } catch (error) {
    console.error('Error checking developer status:', error);
    return false;
  }
}

export async function loadDeveloperSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    if (settingsDoc.exists()) {
      developerSettings = { ...developerSettings, ...settingsDoc.data() };
    }
  } catch (error) {
    console.error('Error loading developer settings:', error);
  }
}

export async function saveDeveloperSettings() {
  try {
    await setDoc(doc(db, 'settings', 'global'), developerSettings);
  } catch (error) {
    console.error('Error saving developer settings:', error);
  }
}

export function showDeveloperPanel() {
  const panel = document.createElement('div');
  panel.className = 'developer-panel-overlay active';
  panel.innerHTML = `
    <div class="developer-panel">
      <div class="developer-panel-header">
        <div class="developer-panel-title">
          <span>⚡</span>
          <span>Panel de Desarrollador</span>
        </div>
        <button class="close-developer-panel">×</button>
      </div>
      <div class="developer-panel-content">
        <div class="dev-section">
          <div class="dev-section-title">🎛️ Controles del Chat</div>
          <div class="dev-control-item">
            <span class="dev-control-label">Animaciones de Navidad</span>
            <div class="dev-toggle ${developerSettings.christmasAnimation ? 'active' : ''}" data-setting="christmasAnimation">
              <div class="dev-toggle-slider"></div>
            </div>
          </div>
          <div class="dev-control-item">
            <span class="dev-control-label">Login de Invitados</span>
            <div class="dev-toggle ${developerSettings.guestLogin ? 'active' : ''}" data-setting="guestLogin">
              <div class="dev-toggle-slider"></div>
            </div>
          </div>
          <div class="dev-control-item">
            <span class="dev-control-label">Encuestas</span>
            <div class="dev-toggle ${developerSettings.polls ? 'active' : ''}" data-setting="polls">
              <div class="dev-toggle-slider"></div>
            </div>
          </div>
          <div class="dev-control-item">
            <span class="dev-control-label">Mensajes de Voz</span>
            <div class="dev-toggle ${developerSettings.voiceMessages ? 'active' : ''}" data-setting="voiceMessages">
              <div class="dev-toggle-slider"></div>
            </div>
          </div>
        </div>

        <div class="dev-section">
          <div class="dev-section-title">🎉 Acciones Especiales</div>
          <div class="dev-control-item">
            <span class="dev-control-label">Anuncio Feliz 2025</span>
            <button class="dev-action-btn" id="triggerNewYear">Activar</button>
          </div>
        </div>

        <div class="dev-section">
          <div class="dev-section-title">📊 Estadísticas del Sistema</div>
          <div class="dev-stats-grid">
            <div class="dev-stat-card">
              <div class="dev-stat-value" id="totalUsers">0</div>
              <div class="dev-stat-label">Usuarios Totales</div>
            </div>
            <div class="dev-stat-card">
              <div class="dev-stat-value" id="onlineUsers">0</div>
              <div class="dev-stat-label">Usuarios Online</div>
            </div>
            <div class="dev-stat-card">
              <div class="dev-stat-value" id="totalRooms">0</div>
              <div class="dev-stat-label">Salas Activas</div>
            </div>
            <div class="dev-stat-card">
              <div class="dev-stat-value" id="totalMessages">0</div>
              <div class="dev-stat-label">Mensajes Hoy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Event listeners
  panel.querySelector('.close-developer-panel').addEventListener('click', () => panel.remove());
  panel.addEventListener('click', (e) => {
    if (e.target === panel) panel.remove();
  });

  // Toggle switches
  panel.querySelectorAll('.dev-toggle').forEach(toggle => {
    toggle.addEventListener('click', async () => {
      const setting = toggle.dataset.setting;
      toggle.classList.toggle('active');
      developerSettings[setting] = toggle.classList.contains('active');
      await saveDeveloperSettings();
    });
  });

  // New Year button
  panel.querySelector('#triggerNewYear').addEventListener('click', async () => {
    await triggerNewYearAnimation();
  });

  // Load stats
  loadDeveloperStats();
}

async function loadDeveloperStats() {
  // Placeholder - implement real stats
  document.getElementById('totalUsers').textContent = '0';
  document.getElementById('onlineUsers').textContent = '0';
  document.getElementById('totalRooms').textContent = '0';
  document.getElementById('totalMessages').textContent = '0';
}

async function triggerNewYearAnimation() {
  const { database, ref, set, push } = await import('./firebase.js');
  
  const announcementRef = push(ref(database, 'announcements'));
  await set(announcementRef, {
    message: '🎉 ¡FELIZ 2025! 🎊',
    timestamp: Date.now(),
    type: 'celebration'
  });
}

export function getDeveloperSettings() {
  return developerSettings;
}
