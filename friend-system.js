import { db, doc, setDoc, getDoc, deleteDoc, collection, getDocs, serverTimestamp, currentUser } from './firebase.js';

class FriendSystem {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener('click', async (e) => {
      if (e.target.closest('#addFriendBtn')) {
        const btn = e.target.closest('#addFriendBtn');
        const targetUserId = btn.dataset.userId;
        await this.sendFriendRequest(targetUserId);
      }
    });
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
          `Solicitud de amistad enviada`,
          { userId: targetUserId }
        );
      }

      this.showNotification('Solicitud de amistad enviada', 'success');
      this.updateButtonState(targetUserId, 'pending');
    } catch (error) {
      console.error('Error sending friend request:', error);
      this.showNotification('Error al enviar solicitud', 'error');
    }
  }

  async acceptFriendRequest(requestId, fromUserId) {
    if (!currentUser) return;

    try {
      const userId = currentUser.firebaseUid || currentUser.userId || currentUser.uid;
      const friendId1 = `${userId}_${fromUserId}`;
      const friendId2 = `${fromUserId}_${userId}`;

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

      await deleteDoc(doc(db, 'friendRequests', requestId));

      this.showNotification('Solicitud aceptada', 'success');
      this.loadFriendRequests();
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

  updateButtonState(userId, state) {
    const btn = document.querySelector(`#addFriendBtn[data-user-id="${userId}"]`);
    if (!btn) return;

    btn.classList.remove('pending', 'friends');
    if (state === 'pending') {
      btn.classList.add('pending');
      btn.title = 'Solicitud pendiente';
    } else if (state === 'friends') {
      btn.classList.add('friends');
      btn.title = 'Ya son amigos';
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
  }
}, 5000);

export default friendSystem;
