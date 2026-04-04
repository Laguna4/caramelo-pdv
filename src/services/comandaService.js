import { db } from "./firebase";
import {
    collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
    query, where, orderBy, limit, setDoc, onSnapshot, writeBatch
} from "firebase/firestore";

// --- COMANDAS ---

export const createComanda = async (storeId, comandaData) => {
    try {
        const comandasRef = collection(db, 'stores', storeId, 'comandas');
        const docRef = await addDoc(comandasRef, {
            ...comandaData,
            status: 'aberta',
            itens: [],
            total: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return { id: docRef.id, ...comandaData };
    } catch (error) {
        console.error("Erro ao criar comanda: ", error);
        throw error;
    }
};

export const updateComanda = async (storeId, comandaId, comandaData) => {
    try {
        const comandaRef = doc(db, 'stores', storeId, 'comandas', comandaId);
        await updateDoc(comandaRef, {
            ...comandaData,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Erro ao atualizar comanda: ", error);
        throw error;
    }
};

export const getComandas = async (storeId, status = null) => {
    try {
        const comandasRef = collection(db, 'stores', storeId, 'comandas');
        let q = query(comandasRef, orderBy('createdAt', 'desc'));

        if (status) {
            q = query(comandasRef, where('status', '==', status), orderBy('createdAt', 'desc'));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erro ao buscar comandas: ", error);
        throw error;
    }
};

export const deleteComanda = async (storeId, comandaId) => {
    try {
        const comandaRef = doc(db, 'stores', storeId, 'comandas', comandaId);
        await deleteDoc(comandaRef);
        return true;
    } catch (error) {
        console.error("Erro ao deletar comanda: ", error);
        throw error;
    }
};

// Listener for Real-time Kitchen Updates
export const subscribeToActiveComandas = (storeId, callback) => {
    const comandasRef = collection(db, 'stores', storeId, 'comandas');
    // Only listen for abertas or fechando comandas that might have pending items
    const q = query(comandasRef, where('status', 'in', ['aberta', 'fechando']));

    return onSnapshot(q, (querySnapshot) => {
        const comandas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(comandas);
    }, (error) => {
        console.error("Erro ao escutar comandas: ", error);
    });
};

// Listener for Real-time Tables View (All active tables to prevent waiters overlapping)
export const subscribeToAllComandas = (storeId, callback) => {
    const comandasRef = collection(db, 'stores', storeId, 'comandas');
    // Only fetch comandas that are not paid yet
    const q = query(comandasRef, where('status', '!=', 'paga'));

    return onSnapshot(q, (querySnapshot) => {
        const comandas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(comandas);
    }, (error) => {
        console.error("Erro ao escutar comandas das mesas: ", error);
    });
};
