import { database, ref, push, set } from './firebase.js';

export class NotificationManager {
  constructor(currentRoom) {
    this.currentRoom = currentRoom;
  }

  updateRoom(roomId) {
    this.currentRoom = roomId;
  }

  async sendSystemMessage(text) {
    if (!this.currentRoom) return;
    
    const messageRef = push(ref(database, `rooms/${this.currentRoom}/messages`));
    await set(messageRef, {
      text,
      type: 'system',
      timestamp: Date.now(),
      id: messageRef.key
    });
  }

  async userJoined(username) {
    await this.sendSystemMessage(`👋 ${username} entró a la sala`);
  }

  async userLeft(username, toRoom) {
    if (toRoom) {
      const roomHash = toRoom === 'general' ? '#general' : `#${toRoom}`;
      await this.sendSystemMessage(`👋 ${username} se fue a ${roomHash}`);
    } else {
      await this.sendSystemMessage(`👋 ${username} salió de la sala`);
    }
  }
}
