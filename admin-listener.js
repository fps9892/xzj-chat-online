// Listener para cambios en permisos de administrador
import { db, currentUser } from './firebase.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Escuchar cambios en permisos de administrador
if (currentUser && !currentUser.isGuest && currentUser.firebaseUid) {
    const adminDocRef = doc(db, 'admins', currentUser.firebaseUid);
    
    onSnapshot(adminDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            currentUser.isAdmin = true;
            currentUser.role = 'Administrador';
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Actualizar UI si es necesario
            const adminOnlyElements = document.querySelectorAll('.admin-only');
            adminOnlyElements.forEach(element => {
                element.style.display = 'flex';
            });
        }
    });
}
