// Sample products for testing
// These will be automatically loaded for demo purposes

export const sampleProducts = [
    // Roupas
    {
        id: 'sample_1',
        name: 'Camiseta Básica Branca',
        category: 'CLOTHING',
        price: 49.90,
        stock: 25,
        barcode: '7891234567890'
    },
    {
        id: 'sample_2',
        name: 'Calça Jeans Skinny',
        category: 'CLOTHING',
        price: 129.90,
        stock: 15,
        barcode: '7891234567891'
    },
    {
        id: 'sample_3',
        name: 'Vestido Floral',
        category: 'CLOTHING',
        price: 159.90,
        stock: 8,
        barcode: '7891234567892'
    },
    {
        id: 'sample_4',
        name: 'Blusa de Frio Cinza',
        category: 'CLOTHING',
        price: 89.90,
        stock: 20,
        barcode: '7891234567893'
    },

    // Maquiagem
    {
        id: 'sample_5',
        name: 'Batom Vermelho Matte',
        category: 'MAKEUP',
        price: 35.90,
        stock: 30,
        barcode: '7891234567894'
    },
    {
        id: 'sample_6',
        name: 'Base Líquida FPS 30',
        category: 'MAKEUP',
        price: 79.90,
        stock: 12,
        barcode: '7891234567895'
    },
    {
        id: 'sample_7',
        name: 'Máscara para Cílios',
        category: 'MAKEUP',
        price: 42.90,
        stock: 18,
        barcode: '7891234567896'
    },
    {
        id: 'sample_8',
        name: 'Paleta de Sombras',
        category: 'MAKEUP',
        price: 89.90,
        stock: 10,
        barcode: '7891234567897'
    },
    {
        id: 'sample_9',
        name: 'Delineador Líquido Preto',
        category: 'MAKEUP',
        price: 29.90,
        stock: 22,
        barcode: '7891234567898'
    },
    {
        id: 'sample_10',
        name: 'Pó Compacto Translúcido',
        category: 'MAKEUP',
        price: 54.90,
        stock: 16,
        barcode: '7891234567899'
    },

    // Acessórios
    {
        id: 'sample_11',
        name: 'Bolsa Transversal',
        category: 'ACCESSORIES',
        price: 119.90,
        stock: 7,
        barcode: '7891234567800'
    },
    {
        id: 'sample_12',
        name: 'Óculos de Sol',
        category: 'ACCESSORIES',
        price: 149.90,
        stock: 5,
        barcode: '7891234567801'
    },

    // Calçados
    {
        id: 'sample_13',
        name: 'Tênis Casual Branco',
        category: 'SHOES',
        price: 199.90,
        stock: 12,
        barcode: '7891234567802'
    },
    {
        id: 'sample_14',
        name: 'Sandália Salto Alto',
        category: 'SHOES',
        price: 139.90,
        stock: 9,
        barcode: '7891234567803'
    }
];

// Function to load sample data for a store
export const loadSampleData = (storeId) => {
    return sampleProducts.map(product => ({
        ...product,
        storeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }));
};
