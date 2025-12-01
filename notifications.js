export class NotificationManager {
  constructor() {
    this.container = document.getElementById('joinLeaveNotifications');
  }

  addNotification(username, type) {
    if (!this.container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = `${type === 'join' ? '✅' : '❌'} ${username} ${type === 'join' ? 'entró' : 'salió'} del chat`;
    
    this.container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  userJoined(username) {
    this.addNotification(username, 'join');
  }

  userLeft(username) {
    this.addNotification(username, 'leave');
  }
}
