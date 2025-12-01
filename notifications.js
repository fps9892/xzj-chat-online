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

    // Calcular posición vertical para evitar que se pisen
    const notifications = document.querySelectorAll('.user-notification.show');
    const offsetBottom = 100 + (notifications.length * 70);
    notification.style.bottom = offsetBottom + 'px';

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

  // Notificar cuando usuario sale del chat completamente
  async userDisconnected(username, userId) {
    this.showFloatingNotification(`👋 ${username} desconectado`, 'leave');
  }

  // Notificar solicitud de acceso a sala privada
  async userRequestedAccess(username, userId) {
    // Esta notificación se mostrará dentro del chat como mensaje del sistema
    const messageRef = push(ref(database, `rooms/${this.currentRoom}/messages`));
    await set(messageRef, {
      text: `📨 ${username} solicita el acceso a esta sala privada`,
      type: 'access-request',
      timestamp: Date.now(),
      id: messageRef.key,
      requestedUserId: userId,
      isSystemNotification: true
    });
  }
}
