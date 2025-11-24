import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const db = getFirestore();

// Crear administrador específico
async function createSpecificAdmin() {
  try {
    const adminDocId = "firebaseUid:Rg8Jg8nnEGNqnnWFZxweuQNScle2";
    const adminRef = doc(db, "admins", adminDocId);
    
    await setDoc(adminRef, {
      addedAt: serverTimestamp(),
      addedBy: "system",
      email: "admin@example.com",
      uid: "Rg8Jg8nnEGNqnnWFZxweuQNScle2"
    });
    
    console.log("Administrador creado exitosamente");
  } catch (error) {
    console.error("Error creando administrador:", error);
  }
}

// Ejecutar
createSpecificAdmin();