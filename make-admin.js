import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();

// Función para hacerte administrador
async function makeMyself Admin() {
  const user = auth.currentUser;
  if (!user) {
    console.error("No estás autenticado");
    return;
  }

  try {
    await setDoc(doc(db, "admins", user.uid), {
      role: "admin",
      assignedAt: new Date().toISOString(),
      assignedBy: "self" // Indica que se auto-asignó
    });
    console.log(`Te has convertido en administrador con UID: ${user.uid}`);
    alert("¡Ahora eres administrador!");
  } catch (error) {
    console.error("Error al asignarte como admin:", error);
  }
}

// Ejecutar cuando esté autenticado
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuario autenticado:", user.uid);
    // Llamar automáticamente para hacerte admin
    makeMyself Admin();
  }
});