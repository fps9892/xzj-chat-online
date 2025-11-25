import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, onSnapshot, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

const firebaseConfig = {
    apiKey: "AIzaSyDavetvIrVymmoiIpRxUigCd5hljMtsr0c",
    authDomain: "fyzar-80936.firebaseapp.com",
    databaseURL: "https://fyzar-80936-default-rtdb.firebaseio.com",
    projectId: "fyzar-80936",
    storageBucket: "fyzar-80936.firebasestorage.app",
    messagingSenderId: "718553577005",
    appId: "1:718553577005:web:74b5b9e790232edf6e2aa4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para actualizar el rol en el perfil del usuario
async function updateUserRole(userId, role) {
  try {
    await updateDoc(doc(db, "users", userId), {
      role: role
    });
    console.log(`Rol actualizado a ${role} para usuario ${userId}`);
  } catch (error) {
    console.error("Error al actualizar rol:", error);
  }
}

// Escuchar cambios en la colección de admins
function listenToAdminChanges() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Escuchar cambios en el documento de admin del usuario actual
      const adminDocRef = doc(db, "admins", user.uid);
      
      onSnapshot(adminDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          // Si existe el documento de admin, actualizar rol a "Administrador"
          updateUserRole(user.uid, "Administrador");
          console.log("Usuario promovido a Administrador");
        } else {
          // Si no existe, actualizar rol a "Usuario"
          updateUserRole(user.uid, "Usuario");
          console.log("Rol actualizado a Usuario");
        }
      });
    }
  });
}

// Iniciar el listener
listenToAdminChanges();