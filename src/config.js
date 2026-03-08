// Firebase Configuration
// Replace these with your actual Firebase config when ready
export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

export const SUPER_ADMIN_EMAIL = 'lucasluob@gmail.com';

// Subscription Plans
export const PLANS = {
    BASIC: {
        id: 'basic',
        name: 'Básico',
        price: 79.90,
        features: [
            '1 Usuário',
            '500 Produtos',
            'Vendas ilimitadas',
            'Abertura/Fechamento de Caixa',
            'Suporte a Leitor de Barcode'
        ],
        limits: {
            users: 1,
            products: 500
        }
    },
    PRO: {
        id: 'pro',
        name: 'Profissional',
        price: 179.90,
        features: [
            '3 Usuários',
            '2000 Produtos',
            'Vendas ilimitadas',
            'Controle de estoque',
            'Gerador de Código de Barras',
            'Relatórios Financeiros'
        ],
        limits: {
            users: 3,
            products: 2000
        }
    },
    PREMIUM: {
        id: 'premium',
        name: 'Premium',
        price: 249.90,
        annualPrice: 1850.00,
        features: [
            'Usuários ilimitados',
            'Produtos ilimitados',
            'Vendas ilimitadas',
            'Gerente de Conta',
            'Backup em tempo real',
            'Dashboard Multi-lojas',
            'Suporte VIP 24/7'
        ],
        limits: {
            users: Infinity,
            products: Infinity
        }
    }
};

// Product Categories
export const CATEGORIES = {
    GENERAL: 'Geral',
    PRODUCT: 'Produto',
    CLOTHING: 'Roupas',
    MAKEUP: 'Maquiagem',
    ACCESSORIES: 'Acessórios',
    SHOES: 'Calçados'
};

// Payment Methods
export const PAYMENT_METHODS = {
    CASH: 'Dinheiro',
    CREDIT: 'Cartão de Crédito',
    DEBIT: 'Cartão de Débito',
    PIX: 'PIX'
};

// Subscription Status
export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    TRIAL: 'trial',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    BLOCKED: 'blocked'
};
