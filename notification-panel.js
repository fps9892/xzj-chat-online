// Sistema de Panel de Notificaciones
class NotificationPanel {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 50;
    this.init();
  }

  init() {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    const clearBtn = document.getElementById('clearNotificationsBtn');
    const tabs = document.querySelectorAll('.notifications-tab');

    notificationBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationsPanel.classList.toggle('active');
      if (notificationsPanel.classList.contains('active')) {
        this.markAllAsRead();
      }
    });

    document.addEventListener('click', (e) => {
      if (!notificationsPanel.contains(e.target) && !notificationBtn.contains(e.target)) {
        notificationsPanel.classList.remove('active');
      }
    });

    clearBtn?.addEventListener('click', () => {
      this.clearAll();
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.notifications-list').forEach(list => {
          list.classList.remove('active');
        });
        document.querySelector(`[data-section="${targetTab}"]`)?.classList.add('active');
      });
    });

    this.loadNotifications();
  }

  addNotification(type, message, data = {}) {
    const notification = {
      id: Date.now(),
      type,
      message,
      data,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.unshift(notification);
    
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.saveNotifications();
    this.render();
    this.updateBadge();
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.updateBadge();
  }

  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.render();
    this.updateBadge();
  }

  saveNotifications() {
    try {
      localStorage.setItem('chatNotifications', JSON.stringify(this.notifications));
    } catch (e) {
      console.error('Error saving notifications:', e);
    }
  }

  loadNotifications() {
    try {
      const saved = localStorage.getItem('chatNotifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
        this.render();
        this.updateBadge();
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
  }

  updateBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    if (badge) {
      badge.textContent = unreadCount;
      if (unreadCount > 0) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    }
  }

  getIcon(type) {
    const icons = {
      'user-join': '/images/users-connected.svg',
      'user-leave': '/images/users-connected.svg',
      'mention': '/images/profileuser.svg',
      'room-invite': '/images/rooms-public-icon.svg',
      'game-invite': '/images/play.svg',
      'system': '/images/notification.svg'
    };
    return icons[type] || '/images/notification.svg';
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }

  render() {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = '<div class="empty-notifications">No hay notificaciones</div>';
      return;
    }

    list.innerHTML = this.notifications.map(notif => `
      <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
        <div class="notification-content">
          <img src="${this.getIcon(notif.type)}" alt="Icon" class="notification-icon" />
          <div>
            <div class="notification-text">${notif.message}</div>
            <div class="notification-time">${this.formatTime(notif.timestamp)}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// Inicializar el panel de notificaciones
const notificationPanel = new NotificationPanel();

// Exportar para uso global
window.notificationPanel = notificationPanel;

export default notificationPanel;
