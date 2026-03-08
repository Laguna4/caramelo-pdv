import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { PLANS } from "../config";
import { setCurrentUser, setCurrentStore, logout } from "../utils/storage"; // Import storage utils

const DEMO_CREDENTIALS = {
    email: "demo@caramelopdv.com",
    password: "demo123" // Simple password for public access
};

const RESET_INTERVAL_MS = 60 * 60 * 1000; // 1 Hour

export const loginDemoUser = async () => {
    try {
        // Clear previous session to avoid conflicts
        logout();

        console.log("Tentando login na conta Demo...");
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(auth, DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                console.log("Conta Demo não existe. Criando...");
                userCredential = await createUserWithEmailAndPassword(auth, DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
                // Initial setup for new demo account
                await resetDemoData(userCredential.user.uid, true);
            } else {
                throw error;
            }
        }

        const user = userCredential.user;
        const userId = user.uid;

        // Check if reset is needed
        const metaRef = doc(db, "demo_metadata", "status");
        const metaSnap = await getDoc(metaRef);

        let needsReset = true;

        if (metaSnap.exists()) {
            const data = metaSnap.data();
            const lastReset = data.lastReset?.toMillis() || 0;
            if (Date.now() - lastReset < RESET_INTERVAL_MS) {
                needsReset = false;
            }
        }

        let storeData = null;

        if (needsReset) {
            console.log("Realizando limpeza automática da conta Demo...");
            storeData = await resetDemoData(userId);
        } else {
            console.log("Conta Demo está limpa. Acesso liberado.");
            // Fetch existing store data
            const DEMO_STORE_ID = "loja-demo-oficial";
            const storeRef = doc(db, "stores", DEMO_STORE_ID);
            const storeSnap = await getDoc(storeRef);

            if (storeSnap.exists()) {
                storeData = { id: storeSnap.id, ...storeSnap.data() };
            } else {
                // Should not happen if confirmed clean, but fallback to reset
                storeData = await resetDemoData(userId, true);
            }
        }

        // CRITICAL: Save to LocalStorage for App.jsx checkAuth
        if (storeData) {
            // Force OWNER role for Demo to access all features (Products, Settings)
            setCurrentUser({ uid: user.uid, email: user.email, role: 'OWNER' });
            setCurrentStore(storeData);
        }

        return user;

    } catch (error) {
        console.error("Erro no login Demo:", error);
        throw error;
    }
};

const resetDemoData = async (userId, isNewAccount = false) => {
    // 1. Get the store ID (assuming 1 store per user for demo)
    const DEMO_STORE_ID = "loja-demo-oficial";

    // 2. Clean Collections
    if (!isNewAccount) {
        await deleteCollection(db, "products", DEMO_STORE_ID);
        await deleteCollection(db, "sales", DEMO_STORE_ID);
        await deleteCollection(db, "customers", DEMO_STORE_ID);
    }

    // 3. Reseed Data
    const batch = writeBatch(db);

    // Create/Reset Store Profile
    const storeRef = doc(db, "stores", DEMO_STORE_ID);
    const storeData = {
        id: DEMO_STORE_ID,
        name: "Caramelo Demo Store",
        ownerId: userId,
        ownerName: "Usuário Demo",
        email: DEMO_CREDENTIALS.email,
        plan: 'PREMIUM', // Store as string ID to avoid Dashboard crash
        subscriptionStatus: 'active',
        createdAt: serverTimestamp()
    };

    batch.set(storeRef, storeData);

    // Sample Products
    const products = [
        { name: "Coca Test", price: 5.00, cost: 2.50, stock: 100, category: "Bebidas" },
        { name: "Blusa Test", price: 59.90, cost: 29.90, stock: 50, category: "Roupas" },
        { name: "Item Test", price: 15.00, cost: 7.50, stock: 200, category: "Geral" }
    ];

    products.forEach((p, index) => {
        const prodRef = doc(collection(db, "products")); // Auto ID
        batch.set(prodRef, {
            ...p,
            storeId: DEMO_STORE_ID,
            barcode: `78900000${index}`,
            active: true,
            createdAt: serverTimestamp()
        });
    });

    // Update Metadata
    const metaRef = doc(db, "demo_metadata", "status");
    batch.set(metaRef, {
        lastReset: serverTimestamp(),
        lastUser: "public"
    });

    await batch.commit();
    console.log("Limpeza e Reseed concluídos!");

    return storeData;
};

// Helper: Delete all docs in a collection for a specific store
const deleteCollection = async (db, collectionName, storeId) => {
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        const batch = writeBatch(db);
        let count = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.storeId === storeId) {
                batch.delete(doc.ref);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Deletados ${count} itens de ${collectionName}`);
        }
    } catch (e) {
        console.error(`Erro ao limpar ${collectionName}:`, e);
    }
};
