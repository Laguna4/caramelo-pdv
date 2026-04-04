export const PLAN_LIMITS = {
    'BASIC': {
        maxProducts: 150,
        maxCustomers: 10,
        maxUsers: 1
    },
    'PRO': {
        maxProducts: 2000,
        maxCustomers: Infinity,
        maxUsers: 3
    },
    'PREMIUM': {
        maxProducts: Infinity,
        maxCustomers: Infinity,
        maxUsers: Infinity
    }
};

export const checkLimit = (planName, type, currentCount) => {
    // Default to 'BASIC' if plan is unknown or missing, ensuring safety
    // Normalize input to uppercase to match keys
    const normalizedPlan = planName ? planName.toUpperCase() : 'BASIC';
    const plan = PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS['BASIC'];

    let limit = 0;
    if (type === 'products') limit = plan.maxProducts;
    if (type === 'customers') limit = plan.maxCustomers;
    if (type === 'users') limit = plan.maxUsers;

    if (currentCount >= limit) {
        return {
            allowed: false,
            message: `Seu plano ${normalizedPlan} atingiu o limite de ${limit} ${type === 'users' ? 'usuários' : type === 'products' ? 'produtos' : 'clientes'}. Faça upgrade para continuar cadastrando.`
        };
    }
    return { allowed: true };
};
