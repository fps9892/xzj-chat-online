import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function addDeveloper() {
    const devUid = "h7RgUx3nJMUXZdGh9X1gdHxGalD3";
    
    try {
        await setDoc(doc(db, "developers", devUid), {
            isDeveloper: true,
            grantedAt: new Date().toISOString(),
            grantedBy: "system"
        });
        
        console.log(`✅ Rol de desarrollador otorgado a ${devUid}`);
        process.exit(0);
        
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

addDeveloper();
