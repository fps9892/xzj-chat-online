import { db, doc, setDoc, getDoc, deleteDoc, collection, getDocs, serverTimestamp, currentUser } from './firebase.js';

class FriendSystem {
  constructor() {
    this.friendsCache = new Map();
    this.init();
  }

  init() {
    document.addEventListener('click', async (e) => {
      if (e.target.closest('#addFriendBtn')) {
        const btn = e.target.closest('#addFriendBtn');
        const targetUserId = btn.dataset.userId;
        const status = await this.checkFriendshipStatus(targetUserId);
        
        if (status === 'friends' || status === 'pending') {
          this.showNotification(status === 'friends' ? 'Ya son amigos' : 'Solicitud pendiente', 'info');
          return;
        }
        
        await this.sendFriendRequest(targetUserId);
      }
    });
  }

  async checkFriendshipStatus(targetUserId) {
    if (!currentUser || !targetUserId) return 'none';
    
    const userId = currentUser.firebaseUid || currentUser.userId || currentUser.uid;
    if (!userId) return 'none';

    const friendId = `${userId}_${targetUserId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const friendDoc = await getDoc(doc(db, 'friends', friendId));
    if (friendDoc.exists()) return 'friends';

    const requestId = `${userId}_${targetUserId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
    if (requestDoc.exists()) return 'pending';

    return 'none';
  }

  async sendFriendRequest(targetUserId) {
    if (!currentUser) return;
    if (!targetUserId) {
      this.showNotification('Usuario no válido', 'error');
      return;
    }

    try {
      const userId = currentUser.firebaseUid || currentUser.userId || currentUser.uid;
      if (!userId) {
        this.showNotification('Error: Usuario no identificado', 'error');
        return;
      }

      const requestId = `${userId}_${targetUserId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const requestRef = doc(db, 'friendRequests', requestId);

      const existingRequest = await getDoc(requestRef);
      if (existingRequest.exists()) {
        this.showNotification('Ya enviaste una solicitud a este usuario', 'warning');
        return;
      }

      let currentUserData;
      if (currentUser.isGuest) {
        const guestDoc = await getDoc(doc(db, 'guests', userId));
        currentUserData = guestDoc.exists() ? guestDoc.data() : {};
      } else {
        const userDoc = await getDoc(doc(db, 'users', userId));
        currentUserData = userDoc.exists() ? userDoc.data() : {};
      }

      await setDoc(requestRef, {
        from: userId,
        to: targetUserId,
        fromUsername: currentUserData.username || currentUserData.name || currentUser.name || 'Usuario',
        fromAvatar: currentUserData.avatar || currentUser.avatar || '/images/profileuser.svg',
        status: 'pending',
        timestamp: serverTimestamp()
      });

      if (window.notificationPanel) {
        window.notificationPanel.addNotification(
          'friend-request-sent',
          `Solicitud enviada`,
          { userId: targetUserId }
        );
      }

      this.showNotification('✓ Solicitud enviada', 'success');
      this.updateButtonState(targetUserId, 'pending');
      this.updateNotificationBadge();
    } catch (error) {
      console.error('Error sending friend request:', error);
      this.showNotification('Error al enviar solicitud', 'error');
    }
  }

  async acceptFriendRequest(requestId, fromUserId) {
    if (!currentUser) return;

    try {
      const userId = currentUser.firebaseUid || currentUser.userId || currentUser.uid;
      const friendId1 = `${userId}_${fromUserId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const friendId2 = `${fromUserId}_${userId}`.replace(/[^a-zA-Z0-9_-]/g, '_');

      await setDoc(doc(db, 'friends', friendId1), {
        user1: userId,
        user2: fromUserId,
        timestamp: serverTimestamp()
      });

      await setDoc(doc(db, 'friends', friendId2), {
        user1: fromUserId,
        user2: userId,
        timestamp: serverTimestamp()
      });

      const fromUserDoc = await getDoc(doc(db, 'users', fromUserId));
      let fromUserData = fromUserDoc.exists() ? fromUserDoc.data() : null;
      if (!fromUserData) {
        const guestDoc = await getDoc(doc(db, 'guests', fromUserId));
        fromUserData = guestDoc.exists() ? guestDoc.data() : {};
      }
      const fromUsername = fromUserData.username || fromUserData.name || 'Usuario';

      await deleteDoc(doc(db, 'friendRequests', requestId));

      await this.notifyFriendAccepted(fromUserId, userId, fromUsername);

      if (window.notificationPanel) {
        window.notificationPanel.addNotification(
          'friend-accepted',
          `Ahora eres amigo de ${fromUsername}`,
          { userId: fromUserId }
        );
      }

      this.showNotification('✓ Solicitud aceptada', 'success');
      this.loadFriendRequests();
      this.updateNotificationBadge();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      this.showNotification('Error al aceptar solicitud', 'error');
    }
  }

  async rejectFriendRequest(requestId) {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      this.showNotification('Solicitud rechazada', 'info');
      this.loadFriendRequests();
      this.updateNotificationBadge();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  }

  async loadFriendRequests() {
    if (!currentUser) return;

    try {
      const userId = currentUser.firebaseUid || currentUser.userId || currentUser.uid;
      if (!userId) return;

      const requestsRef = collection(db, 'friendRequests');
      const snapshot = await getDocs(requestsRef);
      const requests = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.to === userId && data.status === 'pending') {
          requests.push({ id: docSnap.id, ...data });
        }
      });

      this.renderFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  }

  renderFriendRequests(requests) {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    if (requests.length === 0) {
      requestsList.innerHTML = '<div class="empty-notifications">No hay solicitudes</div>';
      return;
    }

    requestsList.innerHTML = requests.map(req => `
      <div class="request-item" data-request-id="${req.id}">
        <div class="request-content">
          <img src="${req.fromAvatar}" alt="${req.fromUsername}" class="request-avatar" />
          <div class="request-info">
            <div class="request-username">${req.fromUsername}</div>
            <div class="request-message">Quiere ser tu amigo</div>
          </div>
        </div>
        <div class="request-actions">
          <button class="request-accept-btn" data-request-id="${req.id}" data-from-user="${req.from}">
            <img src="/images/id.svg" alt="Accept" class="request-btn-icon" />
            Aceptar
          </button>
          <button class="request-reject-btn" data-request-id="${req.id}">
            <img src="/images/close.svg" alt="Reject" class="request-btn-icon" />
            Rechazar
          </button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.request-accept-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const requestId = btn.dataset.requestId;
        const fromUser = btn.dataset.fromUser;
        this.acceptFriendRequest(requestId, fromUser);
      });
    });

    document.querySelectorAll('.request-reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const requestId = btn.dataset.requestId;
        this.rejectFriendRequest(requestId);
      });
    });
  }

  async updateButtonState(userId, state) {
    const btn = document.querySelector(`#addFriendBtn[data-user-id="${userId}"]`);
    if (!btn) return;

    btn.classList.remove('pending', 'friends');
    const img = btn.querySelector('img');
    
    if (state === 'pending') {
      btn.classList.add('pending');
      btn.title = 'Solicitud pendiente';
      btn.style.cursor = 'not-allowed';
      if (img) img.src = '/images/time.svg';
    } else if (state === 'friends') {
      btn.classList.add('friends');
      btn.title = 'Ya son amigos';
      btn.style.cursor = 'default';
      if (img) img.src = '/images/id.svg';
    } else {
      btn.title = 'Enviar solicitud de amistad';
      btn.style.cursor = 'pointer';
      if (img) img.src = '/images/profileuseradd.svg';
    }
  }

  async updateNotificationBadge() {
    if (!currentUser) return;
    
    const userId = currentUser.firebaseUid || currentUser.userId || currentUser.uid;
    if (!userId) return;

    const requestsRef = collection(db, 'friendRequests');
    const snapshot = await getDocs(requestsRef);
    let count = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.to === userId && data.status === 'pending') {
        count++;
      }
    });

    const badge = document.getElementById('notificationBadge');
    const notifBtn = document.getElementById('notificationBtn');
    
    if (badge) {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    }

    if (notifBtn) {
      if (count > 0) {
        notifBtn.classList.add('has-pending');
      } else {
        notifBtn.classList.remove('has-pending');
      }
    }
  }

  async notifyFriendAccepted(toUserId, fromUserId, accepterUsername) {
    try {
      if (window.notificationPanel) {
        window.notificationPanel.addNotification(
          'friend-request-accepted',
          `${accepterUsername} ha aceptado tu solicitud`,
          { userId: fromUserId }
        );
      }
    } catch (error) {
      console.error('Error notifying friend accepted:', error);
    }
  }

  async removeFriend(friendId) {
    if (!currentUser) return;

    try {
      const userId = currentUser.firebaseUid || currentUser.userId || currentUser.uid;
      const friendId1 = `${userId}_${friendId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const friendId2 = `${friendId}_${userId}`.replace(/[^a-zA-Z0-9_-]/g, '_');

      await deleteDoc(doc(db, 'friends', friendId1));
      await deleteDoc(doc(db, 'friends', friendId2));

      this.showNotification('Amigo eliminado', 'info');
      
      const friendsList = document.querySelector(`#friendsList-${userId}`);
      if (friendsList) {
        this.loadFriends(userId).then(friends => {
          this.renderFriendsList(friendsList, friends, userId);
        });
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      this.showNotification('Error al eliminar amigo', 'error');
    }
  }

  async loadFriends(userId) {
    try {
      const friendsRef = collection(db, 'friends');
      const snapshot = await getDocs(friendsRef);
      const friends = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.user1 === userId) {
          const friendDoc = await getDoc(doc(db, 'users', data.user2));
          if (friendDoc.exists()) {
            friends.push({ id: data.user2, friendsSince: data.timestamp, ...friendDoc.data() });
          } else {
            const guestDoc = await getDoc(doc(db, 'guests', data.user2));
            if (guestDoc.exists()) {
              friends.push({ id: data.user2, friendsSince: data.timestamp, ...guestDoc.data() });
            }
          }
        }
      }

      return friends;
    } catch (error) {
      console.error('Error loading friends:', error);
      return [];
    }
  }

  formatFriendsSince(timestamp) {
    if (!timestamp) return 'Hace tiempo';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `Amigos hace ${years} año${years !== 1 ? 's' : ''}`;
    if (months > 0) return `Amigos hace ${months} mes${months !== 1 ? 'es' : ''}`;
    if (days > 0) return `Amigos hace ${days} día${days !== 1 ? 's' : ''}`;
    return 'Amigos desde hoy';
  }

  renderFriendsList(container, friends, currentUserId) {
    const isOwnProfile = currentUserId === (currentUser.firebaseUid || currentUser.userId || currentUser.uid);
    
    if (friends.length === 0) {
      container.innerHTML = '<div class="empty-friends">No tiene amigos aún</div>';
    } else {
      container.innerHTML = `
        <div class="friends-count">👥 ${friends.length} amigo${friends.length !== 1 ? 's' : ''}</div>
        ${friends.map(friend => `
          <div class="friend-item" data-friend-id="${friend.id}">
            <img src="${friend.avatar || '/images/profileuser.svg'}" alt="${friend.username || friend.name}" class="friend-avatar" />
            <div class="friend-info">
              <div class="friend-name">${friend.username || friend.name}</div>
              <div class="friend-status">${this.formatFriendsSince(friend.friendsSince)}</div>
            </div>
            ${isOwnProfile ? `<button class="remove-friend-btn" data-friend-id="${friend.id}" title="Eliminar amigo">✕</button>` : ''}
          </div>
        `).join('')}
      `;

      container.querySelectorAll('.friend-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.remove-friend-btn')) return;
          const friendId = item.dataset.friendId;
          const friend = friends.find(f => f.id === friendId);
          if (friend && window.showUserProfile) {
            window.showUserProfile(friend);
          }
        });
      });

      if (isOwnProfile) {
        container.querySelectorAll('.remove-friend-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const friendId = btn.dataset.friendId;
            if (confirm('¿Eliminar a este amigo?')) {
              this.removeFriend(friendId);
            }
          });
        });
      }
    }
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type} show`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

const friendSystem = new FriendSystem();

setInterval(() => {
  if (currentUser) {
    friendSystem.loadFriendRequests();
    friendSystem.updateNotificationBadge();
  }
}, 5000);

window.friendSystem = friendSystem;

export default friendSystem;
