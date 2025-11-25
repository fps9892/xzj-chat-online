import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      await updateDoc(userDocRef, {
        role: role,
        textColor: role === 'Administrador' ? '#ff0000' : '#ffffff' // Color rojo para administradores
      });
      console.log(`Rol actualizado a ${role} para usuario ${userId}`);
    }
  } catch (error) {
    console.error("Error al actualizar rol:", error);
  }
}

// Función para otorgar permisos de administrador al usuario específico
async function grantAdminToSpecificUser() {
  const specificAdminUid = "wv8Z7GkeBpVpIcyC7QYx2Fp3Bx72";
  
  try {
    // Crear documento de administrador
    await setDoc(doc(db, "admins", specificAdminUid), {
      grantedAt: new Date().toISOString(),
      grantedBy: "system",
      isSystemAdmin: true
    });
    
    // Actualizar rol del usuario a Administrador con color rojo
    await updateUserRole(specificAdminUid, "Administrador");
    
    console.log(`Permisos de administrador otorgados a ${specificAdminUid}`);
  } catch (error) {
    console.error("Error otorgando permisos de admin:", error);
  }
}

// Escuchar cambios en la colección de admins y moderadores
function listenToRoleChanges() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Escuchar cambios en el documento de admin del usuario actual
      const adminDocRef = doc(db, "admins", user.uid);
      const moderatorDocRef = doc(db, "moderators", user.uid);
      
      onSnapshot(adminDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          // Si existe el documento de admin, actualizar rol a "Administrador"
          updateUserRole(user.uid, "Administrador");
          console.log("Usuario promovido a Administrador");
        } else {
          // Verificar si es moderador
          onSnapshot(moderatorDocRef, (modSnapshot) => {
            if (modSnapshot.exists()) {
              updateUserRole(user.uid, "Moderador");
              console.log("Usuario promovido a Moderador");
            } else {
              updateUserRole(user.uid, "Usuario");
              console.log("Rol actualizado a Usuario");
            }
          });
        }
      });
    }
  });
}

// Otorgar permisos de administrador al usuario específico
grantAdminToSpecificUser();

// Iniciar el listener
listenToRoleChanges();