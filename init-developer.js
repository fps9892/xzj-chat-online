// Script para inicializar el desarrollador
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const db = getFirestore(app);

async function initializeDeveloper() {
    const devUid = "h7RgUx3nJMUXZdGh9X1gdHxGalD3";
    
    try {
        await setDoc(doc(db, "developers", devUid), {
            isDeveloper: true,
            grantedAt: new Date().toISOString(),
            grantedBy: "system"
        });
        
        console.log(`✅ Rol de desarrollador otorgado a ${devUid}`);
        
    } catch (error) {
        console.error("❌ Error inicializando desarrollador:", error);
    }
}

initializeDeveloper();
