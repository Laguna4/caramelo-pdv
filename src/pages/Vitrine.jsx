import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getStore, getProducts } from '../services/dbService';
import { FaWhatsapp, FaSearch, FaShoppingBag, FaMinus, FaPlus, FaTimes, FaStore } from 'react-icons/fa';
import { formatCurrency } from '../utils/calculations';

const Vitrine = () => {
    const { storeId } = useParams();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('ALL');
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!storeId) return;
            const [storeData, productsData] = await Promise.all([
                getStore(storeId),
                getProducts(storeId)
            ]);
            setStore(storeData);
            setProducts(productsData.filter(p => p.stock > 0)); // Only show in-stock items
            setLoading(false);
        };
        loadData();
    }, [storeId]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQty = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(0, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(item => item.qty > 0));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    const handleCheckout = () => {
        if (!customerName.trim()) {
            alert('Por favor, informe seu nome.');
            return;
        }

        const itemsList = cart.map(item => `• ${item.qty}x ${item.name} (${formatCurrency(item.price)})`).join('\n');
        const message = `👋 Olá *${store.name}*!%0A` +
            `Sou *${customerName}* e gostaria de fazer um pedido:%0A%0A` +
            `${encodeURIComponent(itemsList)}%0A%0A` +
            `💰 *Total: ${formatCurrency(cartTotal)}*`;

        const phone = store.phone || store.whatsapp; // Ensure this field exists or fallback
        // Clean phone number (remove non-digits)
        const cleanPhone = phone?.replace(/\D/g, '');

        if (cleanPhone) {
            window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
        } else {
            alert('Loja sem número de WhatsApp cadastrado.');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (category === 'ALL' || p.category === category)
    );

    const categories = ['ALL', ...new Set(products.map(p => p.category))];

    if (loading) return <div className="flex-center h-screen bg-black text-white">Carregando Loja...</div>;

    if (!store) return <div className="flex-center h-screen bg-black text-white">Loja não encontrada.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 shadow-lg">
                <div className="container mx-auto max-w-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-full flex items-center justify-center text-black font-bold">
                            <FaStore />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">{store.name}</h1>
                            <p className="text-xs text-green-400">● Aberto Agora</p>
                        </div>
                    </div>
                    {cartCount > 0 && (
                        <button onClick={() => setShowCart(true)} className="relative p-2 text-yellow-500">
                            <FaShoppingBag size={24} />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                {cartCount}
                            </span>
                        </button>
                    )}
                </div>
            </header>

            {/* Search & Filter */}
            <div className="container mx-auto max-w-md p-4 sticky top-[73px] z-10 bg-[#050505]/95 backdrop-blur-sm">
                <div className="relative mb-4">
                    <FaSearch className="absolute left-3 top-3.5 text-gray-500" />
                    <input
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-600 transition-colors"
                        placeholder="O que você procura hoje?"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === cat
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {cat === 'ALL' ? 'Tudo' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <main className="container mx-auto max-w-md p-4">
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                            {/* Image Placeholder */}
                            <div className="h-32 bg-gray-800 flex items-center justify-center relative group">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <FaShoppingBag className="text-4xl text-gray-700" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs uppercase font-bold tracking-widest">Detalhes</span>
                                </div>
                            </div>

                            <div className="p-3 flex-1 flex flex-col">
                                <h3 className="font-bold text-sm mb-1 line-clamp-2 leading-tight">{product.name}</h3>
                                <div className="flex items-center gap-1 mb-2">
                                    <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{product.unit}</span>
                                </div>

                                <div className="mt-auto flex items-center justify-between">
                                    <span className="text-yellow-500 font-bold">{formatCurrency(product.price)}</span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-transform"
                                    >
                                        <FaPlus size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p>Nenhum produto encontrado.</p>
                    </div>
                )}
            </main>

            {/* Floating Action Button for Cart */}
            {cartCount > 0 && !showCart && (
                <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20">
                    <button
                        onClick={() => setShowCart(true)}
                        className="bg-green-600 text-white font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-3 animate-bounce-subtle items-center w-full max-w-md justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <span className="bg-green-800 px-2 py-0.5 rounded text-sm">{cartCount}</span>
                            <span>Ver Carrinho</span>
                        </span>
                        <span>{formatCurrency(cartTotal)}</span>
                    </button>
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 w-full max-w-md h-[80vh] sm:h-auto sm:rounded-2xl flex flex-col border-t sm:border border-gray-800 shadow-2xl animate-slide-up">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/40">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaShoppingBag className="text-yellow-500" /> Seu Pedido
                            </h2>
                            <button onClick={() => setShowCart(false)} className="p-2 text-gray-400 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                                    <div>
                                        <h4 className="font-bold">{item.name}</h4>
                                        <p className="text-yellow-500 text-sm">{formatCurrency(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-black rounded-lg p-1">
                                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">
                                            <FaMinus size={10} />
                                        </button>
                                        <span className="font-mono font-bold w-4 text-center">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-green-400 hover:text-white">
                                            <FaPlus size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && (
                                <div className="text-center py-10 text-gray-500">
                                    Seu carrinho está vazio.
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-black/40 border-t border-gray-800">
                            <div className="mb-4">
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Seu Nome para o Pedido</label>
                                <input
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                    placeholder="Ex: João Silva"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-between items-center mb-4 text-xl font-bold">
                                <span>Total</span>
                                <span className="text-green-400">{formatCurrency(cartTotal)}</span>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={cart.length === 0}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaWhatsapp size={20} /> ENVIAR PEDIDO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vitrine;
