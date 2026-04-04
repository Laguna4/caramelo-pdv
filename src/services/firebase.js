import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

export const firebaseConfig = {
    apiKey: "AIzaSyC4Oe-a73CEUzo4sNTYqG6hHCCy_gJr0JM",
    authDomain: "caramelo-pdv-sistema.firebaseapp.com",
    projectId: "caramelo-pdv-sistema",
    storageBucket: "caramelo-pdv-sistema.firebasestorage.app",
    messagingSenderId: "1006273931367",
    appId: "1:1006273931367:web:a828444e3fac77d5374cc2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Persistence failed: Browser not supported');
    }
});
