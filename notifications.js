import { database, ref, push, set } from './firebase.js';

export class NotificationManager {
  constructor(currentRoom) {
    this.currentRoom = currentRoom;
  }

  updateRoom(roomId) {
    this.currentRoom = roomId;
  }

  // Muestra una notificación flotante pequeña (no persistente)
  showFloatingNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `user-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Notifica cuando un usuario entra a la sala (solo notificación pequeña)
  async userJoined(username, userId) {
    this.showFloatingNotification(`👋 ${username} entró a la sala`, 'join');
  }

  // Notifica cuando un usuario sale de la sala (solo notificación pequeña)
  async userLeft(username, toRoom, userId) {
    this.showFloatingNotification(`👋 ${username} salió de la sala`, 'leave');
  }
}
