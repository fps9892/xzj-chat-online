import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot, updateDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();

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