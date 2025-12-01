import { database, ref, push, set } from './firebase.js';

export class NotificationManager {
  constructor(currentRoom) {
    this.currentRoom = currentRoom;
    this.notificationsEnabled = true;
    this.checkNotificationSettings();
  }

  async checkNotificationSettings() {
    try {
      const { getDoc, doc } = await import('./firebase.js');
      const { db } = await import('./firebase.js');
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        this.notificationsEnabled = settings.notificationsEnabled !== false;
      }
    } catch (error) {
      console.error('Error checking notification settings:', error);
    }
  }

  updateRoom(roomId) {
    this.currentRoom = roomId;
  }

  showFloatingNotification(message, type = 'info') {
    if (!this.notificationsEnabled) return;
    
    const notification = document.createElement('div');
    notification.className = `user-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    const notifications = document.querySelectorAll('.user-notification.show');
    const offsetBottom = 100 + (notifications.length * 70);
    notification.style.bottom = offsetBottom + 'px';

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  async userJoined(username, userId) {
    this.showFloatingNotification(`👋 ${username} entró a la sala`, 'join');
  }

  async userLeft(username, toRoom, userId) {
    this.showFloatingNotification(`👋 ${username} salió de la sala`, 'leave');
  }

  async userDisconnected(username, userId) {
    this.showFloatingNotification(`👋 ${username} desconectado`, 'leave');
  }

  async userRequestedAccess(username, userId) {
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
