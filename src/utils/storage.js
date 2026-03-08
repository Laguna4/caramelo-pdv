// Local Storage Management for Demo
// This will be replaced with Firebase in production

const STORAGE_KEYS = {
    STORES: 'vexa_stores',
    PRODUCTS: 'vexa_products',
    SALES: 'vexa_sales',
    CUSTOMERS: 'vexa_customers',
    SELLERS: 'vexa_sellers',
    CURRENT_USER: 'vexa_current_user',
    CURRENT_STORE: 'vexa_current_store',
    VOUCHERS: 'vexa_vouchers'
};

// Get data from localStorage
export const getStorageData = (key) => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS[key]);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
};

// Set data to localStorage
export const setStorageData = (key, value) => {
    try {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error writing to localStorage:', error);
        return false;
    }
};

// Remove data from localStorage
export const removeStorageData = (key) => {
    try {
        localStorage.removeItem(STORAGE_KEYS[key]);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
};

// Clear all storage
export const clearAllStorage = () => {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
};

// Store Management
export const getStores = () => {
    return getStorageData('STORES') || [];
};

export const saveStore = (store) => {
    const stores = getStores();
    const existingIndex = stores.findIndex(s => s.id === store.id);

    if (existingIndex >= 0) {
        stores[existingIndex] = store;
    } else {
        stores.push(store);
    }

    return setStorageData('STORES', stores);
};

export const getStoreById = (storeId) => {
    const stores = getStores();
    return stores.find(s => s.id === storeId);
};

// Product Management
export const getProducts = (storeId) => {
    const allProducts = getStorageData('PRODUCTS') || [];
    return storeId ? allProducts.filter(p => p.storeId === storeId) : allProducts;
};

export const saveProduct = (product) => {
    const products = getStorageData('PRODUCTS') || [];
    const existingIndex = products.findIndex(p => p.id === product.id);

    if (existingIndex >= 0) {
        products[existingIndex] = product;
    } else {
        products.push(product);
    }

    return setStorageData('PRODUCTS', products);
};

export const deleteProduct = (productId) => {
    const products = getStorageData('PRODUCTS') || [];
    const filtered = products.filter(p => p.id !== productId);
    return setStorageData('PRODUCTS', filtered);
};

export const getProductByBarcode = (barcode, storeId) => {
    const products = getProducts(storeId);
    return products.find(p => p.barcode === barcode);
};

// Sales Management
export const getSales = (storeId) => {
    const allSales = getStorageData('SALES') || [];
    return storeId ? allSales.filter(s => s.storeId === storeId) : allSales;
};

export const saveSale = (sale) => {
    const sales = getStorageData('SALES') || [];
    sales.push(sale);
    return setStorageData('SALES', sales);
};

// Deduct Stock
export const reduceStock = (items) => {
    const products = getStorageData('PRODUCTS') || [];
    let updated = false;

    items.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.id);
        if (productIndex >= 0) {
            // Deduct quantity
            products[productIndex].stock = Math.max(0, products[productIndex].stock - item.quantity);
            updated = true;
        }
    });

    if (updated) {
        setStorageData('PRODUCTS', products);
    }
};

// Customer Management
export const getCustomers = (storeId) => {
    const allCustomers = getStorageData('CUSTOMERS') || [];
    return storeId ? allCustomers.filter(c => c.storeId === storeId) : allCustomers;
};

export const saveCustomer = (customer) => {
    const customers = getStorageData('CUSTOMERS') || [];
    const existingIndex = customers.findIndex(c => c.id === customer.id);
    if (existingIndex >= 0) customers[existingIndex] = customer;
    else customers.push(customer);
    return setStorageData('CUSTOMERS', customers);
};

export const deleteCustomer = (customerId) => {
    const customers = getStorageData('CUSTOMERS') || [];
    return setStorageData('CUSTOMERS', customers.filter(c => c.id !== customerId));
};

// Seller Management
export const getSellers = (storeId) => {
    const allSellers = getStorageData('SELLERS') || [];
    return storeId ? allSellers.filter(s => s.storeId === storeId) : allSellers;
};

export const saveSeller = (seller) => {
    const sellers = getStorageData('SELLERS') || [];
    const existingIndex = sellers.findIndex(s => s.id === seller.id);
    if (existingIndex >= 0) sellers[existingIndex] = seller;
    else sellers.push(seller);
    return setStorageData('SELLERS', sellers);
};

export const deleteSeller = (sellerId) => {
    const sellers = getStorageData('SELLERS') || [];
    return setStorageData('SELLERS', sellers.filter(s => s.id !== sellerId));
};

// User Session
export const getCurrentUser = () => {
    return getStorageData('CURRENT_USER');
};

export const setCurrentUser = (user) => {
    return setStorageData('CURRENT_USER', user);
};

export const getCurrentStore = () => {
    return getStorageData('CURRENT_STORE');
};

export const setCurrentStore = (store) => {
    return setStorageData('CURRENT_STORE', store);
};

export const logout = () => {
    removeStorageData('CURRENT_STORE');
    removeStorageData('CURRENT_USER');
};

export const getSettings = () => {
    try {
        const data = localStorage.getItem('vexa_printer_settings');
        return data ? JSON.parse(data) : { receiptPrinter: 'thermal_80', autoPrint: true };
    } catch (e) {
        return { receiptPrinter: 'thermal_80', autoPrint: true };
    }
};

// --- VOUCHERS MANAGEMENT ---

export const getVouchers = (storeId) => {
    const all = getStorageData('VOUCHERS') || [];
    return storeId ? all.filter(v => v.storeId === storeId) : all;
};

export const createVoucher = (voucher) => {
    const vouchers = getStorageData('VOUCHERS') || [];
    vouchers.push(voucher);
    return setStorageData('VOUCHERS', vouchers);
};

export const getVoucherByCode = (code, storeId) => {
    const vouchers = getVouchers(storeId);
    return vouchers.find(v => v.code === code && v.status === 'ACTIVE');
};


export const updateVoucher = (code, updates) => {
    const all = getStorageData('VOUCHERS') || [];
    const index = all.findIndex(v => v.code === code);
    if (index >= 0) {
        all[index] = { ...all[index], ...updates };
        return setStorageData('VOUCHERS', all);
    }
    return false;
};

// --- BACKUP MANAGEMENT ---

/**
 * Exports all local storage data mapped by STORAGE_KEYS to a JSON file
 */
export const exportBackup = () => {
    try {
        const backup = {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {}
        };

        // Extract all known tables from localStorage
        for (const [name, key] of Object.entries(STORAGE_KEYS)) {
            backup.data[name] = getStorageData(name) || null;
        }

        // Create Blob
        const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });

        // Trigger Download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `caramelopdv_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
    } catch (error) {
        console.error("Backup failed:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Restores local storage data from a JSON file
 * @param {File} file 
 */
export const restoreBackup = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);

                if (!backup.data) {
                    throw new Error("Arquivo de backup inválido (dados ausentes).");
                }

                // Restore each table
                for (const [name, key] of Object.entries(STORAGE_KEYS)) {
                    if (backup.data[name] !== undefined && backup.data[name] !== null) {
                        setStorageData(name, backup.data[name]);
                    }
                }

                resolve({ success: true });

            } catch (error) {
                console.error("Restore failed:", error);
                resolve({ success: false, error: error.message });
            }
        };

        reader.onerror = () => resolve({ success: false, error: "Erro ao ler arquivo." });
        reader.readAsText(file);
    });
};
