import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC4Oe-a73CEUzo4sNTYqG6hHCCy_gJr0JM",
    authDomain: "caramelo-pdv-sistema.firebaseapp.com",
    projectId: "caramelo-pdv-sistema",
    storageBucket: "caramelo-pdv-sistema.firebasestorage.app",
    messagingSenderId: "1006273931367",
    appId: "1:1006273931367:web:a828444e3fac77d5374cc2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const settings = {
    kiwifiBasic: 'https://pay.kiwify.com.br/GYVVoKc',
    kiwifiBasicAnnual: 'https://pay.kiwify.com.br/9coU9qa',
    kiwifiPro: 'https://pay.kiwify.com.br/n0UjOY9',
    kiwifiProAnnual: 'https://pay.kiwify.com.br/N6L9YVg',
    kiwifiPremium: 'https://pay.kiwify.com.br/SmlUCqs',
    kiwifiPremiumAnnual: 'https://pay.kiwify.com.br/VYfGZ2F'
};

const updateSettings = async () => {
    try {
        await setDoc(doc(db, 'system', 'site_settings'), settings, { merge: true });
        console.log("Firestore settings updated successfully with the LATEST official links!");
        process.exit(0);
    } catch (e) {
        console.error("Error updating settings in Firestore:", e);
        process.exit(1);
    }
};

updateSettings();
