import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const db = getFirestore();

// Función para promover usuario a administrador
async function promoteToAdmin(userUid, userEmail, promotedByUid) {
  try {
    // ID del documento con formato firebaseUid:
    const adminDocId = `firebaseUid:${userUid}`;
    
    // Referencia al documento admin
    const adminRef = doc(db, "admins", adminDocId);
    
    // Verificar si ya es admin
    const adminDoc = await getDoc(adminRef);
    if (adminDoc.exists()) {
      console.log("El usuario ya es administrador");
      return;
    }
    
    // Crear documento de administrador
    await setDoc(adminRef, {
      addedAt: serverTimestamp(),
      addedBy: promotedByUid,
      email: userEmail,
      uid: userUid
    });
    
    console.log(`Usuario ${userUid} promovido a administrador`);
  } catch (error) {
    console.error("Error al promover usuario:", error);
  }
}

// Función para verificar si un usuario es admin
async function isUserAdmin(userUid) {
  try {
    const adminDocId = `firebaseUid:${userUid}`;
    const adminRef = doc(db, "admins", adminDocId);
    const adminDoc = await getDoc(adminRef);
    
    return adminDoc.exists();
  } catch (error) {
    console.error("Error verificando admin:", error);
    return false;
  }
}

// Función para remover administrador
async function removeAdmin(userUid) {
  try {
    const adminDocId = `firebaseUid:${userUid}`;
    const adminRef = doc(db, "admins", adminDocId);
    
    await deleteDoc(adminRef);
    console.log(`Administrador ${userUid} removido`);
  } catch (error) {
    console.error("Error removiendo admin:", error);
  }
}

// Ejemplo de uso
promoteToAdmin(
  "Rg8Jg8nnEGNqnnWFZxweuQNScle2", 
  "admin@example.com", 
  "currentAdminUid"
);

export { promoteToAdmin, isUserAdmin, removeAdmin };