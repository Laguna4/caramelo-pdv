// Calculation utilities for POS system

// Calculate total price for cart items
export const calculateCartTotal = (items) => {
    return items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
};

// Calculate change
export const calculateChange = (total, amountPaid) => {
    return Math.max(0, amountPaid - total);
};

// Format currency to BRL
export const formatCurrency = (value) => {
    try {
        if (value === undefined || value === null || isNaN(value)) {
            return 'R$ 0,00';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    } catch (error) {
        return 'R$ 0,00';
    }
};

// Format date
export const formatDate = (date) => {
    try {
        if (!date) return '-';
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    } catch (error) {
        return '-';
    }
};

// Generate unique ID
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Generate barcode (EAN-13 format simulation)
export const generateBarcode = () => {
    const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    return randomDigits;
};

// Validate barcode format
export const isValidBarcode = (barcode) => {
    return /^\d{8,13}$/.test(barcode);
};

// === PROFESSIONAL CALCULATIONS ===

// Calculate Markup % based on Cost and Sell Price
export const calculateMarkup = (cost, sellPrice) => {
    if (!cost || cost <= 0) return 0;
    return ((sellPrice - cost) / cost) * 100;
};

// Calculate Sell Price based on Cost and Markup %
export const calculateSellPrice = (cost, markup) => {
    if (!cost) return 0;
    return cost + (cost * (markup / 100));
};

// Calculate Profit Amount
export const calculateProfit = (cost, sellPrice) => {
    return sellPrice - cost;
};
