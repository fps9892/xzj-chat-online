import { database, ref, push, set } from './firebase.js';

export class NotificationManager {
  constructor(currentRoom) {
    this.currentRoom = currentRoom;
  }

  updateRoom(roomId) {
    this.currentRoom = roomId;
  }

  async sendSystemMessage(text, userId = null) {
    if (!this.currentRoom) return;
    
    const messageRef = push(ref(database, `rooms/${this.currentRoom}/messages`));
    await set(messageRef, {
      text,
      type: 'system-notification',
      timestamp: Date.now(),
      id: messageRef.key,
      notificationUserId: userId
    });
  }

  async userJoined(username, userId) {
    await this.sendSystemMessage(`👋 ${username} entró a la sala`, userId);
  }

  async userLeft(username, toRoom, userId) {
    if (toRoom) {
      const roomHash = toRoom === 'general' ? '#general' : `#${toRoom}`;
      await this.sendSystemMessage(`👋 ${username} se fue a ${roomHash}`, userId);
    } else {
      await this.sendSystemMessage(`👋 ${username} salió de la sala`, userId);
    }
  }
}
