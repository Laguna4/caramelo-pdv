import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    writeBatch,
    increment
} from "firebase/firestore";
import { generateId } from "../utils/calculations";

// --- STORES ---

export const createStore = async (storeData) => {
    try {
        const storeRef = doc(db, "stores", storeData.id);
        await setDoc(storeRef, storeData);
        return { success: true };
    } catch (error) {
        console.error("Error creating store:", error);
        return { success: false, error: error.message };
    }
};

export const getStore = async (storeId) => {
    try {
        const docRef = doc(db, "stores", storeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting store:", error);
        return null;
    }
};

// --- PRODUCTS ---

export const addProduct = async (storeId, productData) => {
    try {
        // Add createdAt timestamp if not present
        const data = {
            ...productData,
            storeId,
            createdAt: productData.createdAt || new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, "products"), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const updateProduct = async (productId, updates) => {
    try {
        const docRef = doc(db, "products", productId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const deleteProduct = async (productId) => {
    try {
        await deleteDoc(doc(db, "products", productId));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const getProducts = async (storeId) => {
    try {
        // Query products for this store
        const q = query(
            collection(db, "products"),
            where("storeId", "==", storeId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

// --- SALES ---

export const addSale = async (storeId, saleData) => {
    try {
        // Use setDoc with a specific ID (saleData.id) to ensure idempotency.
        // If the same ID is sent multiple times (e.g. offline retries), it will just overwrite.
        const saleId = saleData.id || generateId(); // Fallback to generation if not provided
        const saleRef = doc(db, "sales", saleId);

        await setDoc(saleRef, {
            ...saleData,
            storeId,
            id: saleId // Ensure the ID is stored in the document
        });

        return { success: true, id: saleId };
    } catch (error) {
        console.error("Error adding sale:", error);
        return { success: false, error: error.message };
    }
};

export const getSales = async (storeId) => {
    try {
        const q = query(collection(db, "sales"), where("storeId", "==", storeId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching sales:", error);
        return [];
    }
};

export const getSalesByRegister = async (registerId) => {
    try {
        const q = query(collection(db, "sales"), where("registerId", "==", registerId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching sales by register:", error);
        return [];
    }
};

export const getSale = async (saleId) => {
    try {
        const docRef = doc(db, "sales", saleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching sale:", error);
        return null;
    }
};

export const getProductByBarcode = async (barcode, storeId) => {
    try {
        const q = query(
            collection(db, "products"),
            where("storeId", "==", storeId),
            where("barcode", "==", barcode)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }
        return null;
    } catch (error) {
        console.error("Error finding product by barcode:", error);
        return null;
    }
};

// --- STOCK ---

export const reduceStock = async (items) => {
    try {
        const batch = writeBatch(db);
        items.forEach(item => {
            const productRef = doc(db, "products", item.id);
            // Use increment with negative value to subtract
            batch.update(productRef, {
                stock: increment(-item.quantity)
            });
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error reducing stock:", error);
        return { success: false, error: error.message };
    }
};

/**
 * atomic function to finalize a sale, update stock, and create debts in one go.
 */
export const finishSaleAtomic = async (storeId, saleData, debts = []) => {
    try {
        const batch = writeBatch(db);
        const saleId = saleData.id || generateId();
        const saleRef = doc(db, "sales", saleId);

        // 1. Add Sale
        batch.set(saleRef, {
            ...saleData,
            storeId,
            id: saleId
        });

        // 2. Reduce Stock
        saleData.items.forEach(item => {
            const productRef = doc(db, "products", item.id);
            batch.update(productRef, {
                stock: increment(-item.quantity)
            });
        });

        // 3. Add Debts (if any)
        debts.forEach(debtData => {
            const debtRef = doc(collection(db, "debts"), generateId());
            batch.set(debtRef, {
                ...debtData,
                storeId,
                createdAt: new Date().toISOString(),
                status: 'PENDING',
                paidAmount: 0,
                remainingAmount: debtData.totalAmount
            });
        });

        await batch.commit();
        return { success: true, id: saleId };
    } catch (error) {
        console.error("Error in atomic sale execution:", error);
        return { success: false, error: error.message };
    }
};

export const increaseStock = async (items) => {
    try {
        const batch = writeBatch(db);
        items.forEach(item => {
            const productRef = doc(db, "products", item.id);
            batch.update(productRef, {
                stock: increment(item.quantity)
            });
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error increasing stock:", error);
        return { success: false, error: error.message };
    }
};

// --- VOUCHERS ---

export const createVoucher = async (voucherData) => {
    try {
        await addDoc(collection(db, "vouchers"), voucherData);
        return { success: true };
    } catch (error) {
        console.error("Error creating voucher:", error);
        return { success: false, error: error.message };
    }
};

export const getVoucherByCode = async (code, storeId) => {
    try {
        const q = query(
            collection(db, "vouchers"),
            where("storeId", "==", storeId),
            where("code", "==", code),
            where("status", "==", "ACTIVE")
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting voucher:", error);
        return null;
    }
};

export const updateVoucher = async (code, updates) => {
    try {
        // We need ID to update, so first get it
        // Or if we passed the voucher object we would have the ID.
        // But the previous implementation passed code.
        const q = query(
            collection(db, "vouchers"),
            where("code", "==", code)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docRef = querySnapshot.docs[0].ref;
            await updateDoc(docRef, updates);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error updating voucher:", error);
        return false;
    }
};



export const updateSaleStatus = async (saleId, status) => {
    try {
        const saleRef = doc(db, "sales", saleId);
        await updateDoc(saleRef, {
            status,
            cancelledAt: status === 'CANCELLED' ? new Date().toISOString() : null
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating sale status:", error);
        return { success: false, error: error.message };
    }
};

export const getAllStores = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "stores"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching all stores:", error);
        return [];
    }
};

export const updateStoreSubscription = async (storeId, data) => {
    try {
        const storeRef = doc(db, "stores", storeId);
        await updateDoc(storeRef, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const registerPayment = async (storeId, months = 1, value = 0) => {
    try {
        const storeRef = doc(db, "stores", storeId);
        const storeSnap = await getDoc(storeRef);

        if (!storeSnap.exists()) throw new Error("Loja não encontrada");

        const storeData = storeSnap.data();

        // Calculate new expiration date
        const currentExpiration = storeData.nextPaymentDue ? new Date(storeData.nextPaymentDue) : new Date();
        const now = new Date();
        let baseDate = currentExpiration < now ? now : currentExpiration;

        // Add months
        baseDate.setMonth(baseDate.getMonth() + months);

        await updateDoc(storeRef, {
            nextPaymentDue: baseDate.toISOString(),
            subscriptionStatus: 'active', // Auto-activate on payment
            lastPaymentValue: value,
            lastPaymentDate: new Date().toISOString(),
            contractValue: value // Update current contract value if changed
        });

        return { success: true, newDate: baseDate.toISOString() };

    } catch (error) {
        console.error("Error registering payment:", error);
        return { success: false, error: error.message };
    }
};

export const updateStore = async (storeId, updates) => {
    try {
        const storeRef = doc(db, "stores", storeId);
        await updateDoc(storeRef, updates);
        return { success: true };
    } catch (error) {
        console.error("Error updating store:", error);
        return { success: false, error: error.message };
    }
};

export const deleteStore = async (storeId) => {
    try {
        await deleteDoc(doc(db, "stores", storeId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting store:", error);
        return { success: false, error: error.message };
    }
};

// --- ADDED MISSING EXPORTS ---

// --- CUSTOMERS ---

export const addCustomer = async (storeId, customerData) => {
    try {
        const data = { ...customerData, storeId, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, "customers"), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const updateCustomer = async (id, updates) => {
    try {
        const docRef = doc(db, "customers", id);
        await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const deleteCustomer = async (id) => {
    try {
        await deleteDoc(doc(db, "customers", id));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const getCustomers = async (storeId) => {
    try {
        const q = query(collection(db, "customers"), where("storeId", "==", storeId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching customers:", error);
        return [];
    }
};

// --- SELLERS ---

export const addSeller = async (storeId, sellerData) => {
    try {
        const data = { ...sellerData, storeId, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, "sellers"), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const updateSeller = async (id, updates) => {
    try {
        const docRef = doc(db, "sellers", id);
        await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const deleteSeller = async (id) => {
    try {
        await deleteDoc(doc(db, "sellers", id));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const getSellers = async (storeId) => {
    try {
        const q = query(collection(db, "sellers"), where("storeId", "==", storeId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching sellers:", error);
        return [];
    }
};

// --- FINANCIAL (Transactions) ---

export const addTransaction = async (storeId, transactionData) => {
    try {
        // Need to clean undefined values
        const cleanData = JSON.parse(JSON.stringify({ ...transactionData, storeId, createdAt: new Date().toISOString() }));
        const docRef = await addDoc(collection(db, "transactions"), cleanData);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error adding transaction:", error);
        return { success: false, error: error.message };
    }
};

export const getTransactions = async (storeId) => {
    try {
        // Fetch ALL transactions for the store (filtering done in UI for now to support recurrent logic)
        // In V2 we can optimize this query
        const q = query(collection(db, "transactions"), where("storeId", "==", storeId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
};

export const updateTransaction = async (id, updates) => {
    try {
        const docRef = doc(db, "transactions", id);
        await updateDoc(docRef, filterUndefined(updates));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const deleteTransaction = async (id) => {
    try {
        await deleteDoc(doc(db, "transactions", id));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Helper to remove undefined fields
const filterUndefined = (obj) => {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
};


// --- CASH REGISTER ---

export const openCashRegister = async (storeId, userId, initialValue, userName) => {
    try {
        const registerData = {
            storeId,
            openedBy: userId,
            openedByName: userName || 'Vendedor',
            openedAt: new Date().toISOString(),
            status: 'OPEN',
            openingBalance: parseFloat(initialValue),
            closingBalance: 0,
            movements: [], // Array for bleedings/supplies
            sales: [] // Optional: track sale IDs for easier query, or just query by timestamp
        };
        const docRef = await addDoc(collection(db, "cash_registers"), registerData);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error opening cash register:", error);
        return { success: false, error: error.message };
    }
};

export const closeCashRegister = async (registerId, closingData) => {
    try {
        const docRef = doc(db, "cash_registers", registerId);
        await updateDoc(docRef, {
            ...closingData,
            status: 'CLOSED',
            closedAt: new Date().toISOString()
        });
        return { success: true };
    } catch (error) {
        console.error("Error closing cash register:", error);
        return { success: false, error: error.message };
    }
};

export const getOpenCashRegister = async (storeId) => {
    try {
        const q = query(
            collection(db, "cash_registers"),
            where("storeId", "==", storeId),
            where("status", "==", "OPEN")
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting open cash register:", error);
        return null;
    }
};

export const addCashMovement = async (registerId, movement) => {
    try {
        const docRef = doc(db, "cash_registers", registerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const currentMovements = docSnap.data().movements || [];
            await updateDoc(docRef, {
                movements: [...currentMovements, { ...movement, createdAt: new Date().toISOString() }]
            });
            return { success: true };
        }
        return { success: false, error: "Register not found" };
    } catch (error) {
        console.error("Error adding cash movement:", error);
        return { success: false, error: error.message };
    }
};

export const getPastRegisters = async (storeId, limitCount = 20) => {
    try {
        const q = query(
            collection(db, "cash_registers"),
            where("storeId", "==", storeId),
            where("status", "==", "CLOSED"),
            orderBy("closedAt", "desc"),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching past registers:", error);
        // Fallback for missing index
        try {
            const qBasic = query(
                collection(db, "cash_registers"),
                where("storeId", "==", storeId),
                where("status", "==", "CLOSED")
            );
            const querySnapshot = await getDocs(qBasic);
            const registers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return registers.sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt)).slice(0, limitCount);
        } catch (innerError) {
            console.error("Error in fallback registers search:", innerError);
            return [];
        }
    }
};


// --- DEBTS (Crediário) ---

export const addDebt = async (debtData) => {
    try {
        const data = {
            ...debtData,
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            paidAmount: 0,
            remainingAmount: debtData.totalAmount
        };
        const docRef = await addDoc(collection(db, "debts"), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error adding debt:", error);
        return { success: false, error: error.message };
    }
};

export const getDebtsByStore = async (storeId) => {
    try {
        const q = query(collection(db, "debts"), where("storeId", "==", storeId));
        const querySnapshot = await getDocs(q);
        const debts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return debts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error("Error fetching debts:", error);
        return [];
    }
};

export const updateDebt = async (debtId, updates) => {
    try {
        const docRef = doc(db, "debts", debtId);
        await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (error) {
        console.error("Error updating debt:", error);
        return { success: false, error: error.message };
    }
};

export const getDebtsByCustomer = async (storeId, customerId) => {
    try {
        const q = query(
            collection(db, "debts"),
            where("storeId", "==", storeId),
            where("customerId", "==", customerId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching customer debts:", error);
        return [];
    }
};

// --- BUDGETS (Orçamentos) ---

export const saveBudget = async (storeId, budgetData) => {
    try {
        const data = {
            ...budgetData,
            storeId,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, "budgets"), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving budget:", error);
        return { success: false, error: error.message };
    }
};

export const getBudgetsByCustomer = async (storeId, customerId) => {
    try {
        const q = query(
            collection(db, "budgets"),
            where("storeId", "==", storeId),
            where("customerId", "==", customerId)
        );
        const querySnapshot = await getDocs(q);
        const budgets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort manually to avoid index requirement
        return budgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error("Error fetching budgets:", error);
        return [];
    }
};

export const getBudgetsByStore = async (storeId) => {
    try {
        const q = query(
            collection(db, "budgets"),
            where("storeId", "==", storeId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching store budgets:", error);
        return [];
    }
};

export const updateBudgetStatus = async (budgetId, status) => {
    try {
        const docRef = doc(db, "budgets", budgetId);
        await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (error) {
        console.error("Error updating budget status:", error);
        return { success: false, error: error.message };
    }
};

export const getCompletedSalesByCustomer = async (storeId, customerId) => {
    try {
        const q = query(
            collection(db, "sales"),
            where("storeId", "==", storeId),
            where("customer.id", "==", customerId),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching completed sales:", error);
        // Fallback for missing index: Fetch and filter manually
        try {
            const qBasic = query(
                collection(db, "sales"),
                where("storeId", "==", storeId)
            );
            const querySnapshot = await getDocs(qBasic);
            const allSales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return allSales
                .filter(s => (s.customer?.id === customerId) || (s.payment?.customer?.id === customerId))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (innerError) {
            console.error("Error in fallback sales search:", innerError);
            return [];
        }
    }
};

export const deleteBudget = async (budgetId) => {
    try {
        await deleteDoc(doc(db, "budgets", budgetId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting budget:", error);
        return { success: false, error: error.message };
    }
};

// --- SITE SETTINGS ---

export const getSiteSettings = async () => {
    try {
        const settingsRef = doc(db, 'system', 'site_settings');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            return settingsSnap.data();
        }
        return null;
    } catch (e) {
        console.error("Error getting site settings:", e);
        return null;
    }
};

export const updateSiteSettings = async (settingsData) => {
    try {
        const settingsRef = doc(db, 'system', 'site_settings');
        await setDoc(settingsRef, settingsData, { merge: true });
        return { success: true };
    } catch (e) {
        console.error("Error updating site settings:", e);
        return { success: false, error: e.message };
    }
};
