import { useState, useEffect, useRef } from 'react';
import { FaUtensils, FaPlus, FaTimes, FaSearch, FaBarcode, FaCheckCircle, FaPrint, FaArrowLeft, FaReceipt, FaList, FaComment } from 'react-icons/fa';
import { getCurrentStore } from '../utils/storage';
import { getProducts, getOpenCashRegister } from '../services/dbService';
import { subscribeToAllComandas, createComanda, updateComanda } from '../services/comandaService';
import { formatCurrency, generateId } from '../utils/calculations';
import { useNavigate } from 'react-router-dom';
import ProductSearchModal from '../components/ProductSearchModal';

const Tables = () => {
    const navigate = useNavigate();
    const [currentStore, setCurrentStore] = useState(null);
    const [comandas, setComandas] = useState([]);
    const [loading, setLoading] = useState(true);

    // View state
    const [selectedComanda, setSelectedComanda] = useState(null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newMesaId, setNewMesaId] = useState('');

    useEffect(() => {
        const store = getCurrentStore();
        if (!store) {
            navigate('/login');
            return;
        }

        if (!store.enableComandas) {
            alert("Módulo de mesas não está ativado.");
            navigate('/dashboard');
            return;
        }

        setCurrentStore(store);

        const unsubscribe = subscribeToAllComandas(store.id, (data) => {
            setComandas(data);

            // Update selected comanda if it's open and data changed
            setSelectedComanda(prev => {
                if (!prev) return null;
                const updated = data.find(c => c.id === prev.id);
                return updated || prev;
            });

            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleCreateComanda = async (e) => {
        e.preventDefault();
        if (!newMesaId.trim()) return;

        // Check if exists
        if (comandas.some(c => c.identificador.toLowerCase() === newMesaId.trim().toLowerCase())) {
            alert("Já existe uma comanda aberta com esse identificador.");
            return;
        }

        try {
            const newComanda = await createComanda(currentStore.id, {
                identificador: newMesaId.trim()
            });
            setShowNewModal(false);
            setNewMesaId('');
            setSelectedComanda(newComanda);
        } catch (error) {
            alert("Erro ao abrir comanda.");
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#050505] text-white">Carregando mesas...</div>;

    // View: Main Grid
    if (!selectedComanda) {
        return (
            <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-4 md:p-6 pb-24 md:pb-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FaUtensils className="text-rose-500" /> Mesas e Comandas
                        </h2>
                        <p className="text-gray-500 text-sm">Gerencie os pedidos em andamento</p>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
                    >
                        <FaPlus /> <span className="hidden sm:inline">Abrir Comanda</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 overflow-y-auto pb-20 custom-scrollbar">
                    {/* Add Button Card */}
                    <div
                        onClick={() => setShowNewModal(true)}
                        className="bg-[#0a0a0a] border-2 border-dashed border-gray-700 hover:border-rose-500/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer group transition-all min-h-[120px]"
                    >
                        <FaPlus className="text-gray-600 group-hover:text-rose-400 text-2xl mb-2 transition-colors" />
                        <span className="text-gray-500 group-hover:text-rose-300 font-bold text-sm text-center">Nova Comanda</span>
                    </div>

                    {/* Active Comandas */}
                    {comandas.map(comanda => (
                        <div
                            key={comanda.id}
                            onClick={() => setSelectedComanda(comanda)}
                            className={`bg-[#111] border rounded-2xl p-4 cursor-pointer hover:shadow-xl transition-all relative min-h-[120px] flex flex-col justify-between
                                ${comanda.status === 'fechando' ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-gray-800 hover:border-gray-600'}
                            `}
                        >
                            {comanda.status === 'fechando' && (
                                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-full animate-pulse shadow-md">
                                    FECHANDO
                                </div>
                            )}

                            <div>
                                <h3 className="text-xl font-black text-rose-400 mb-1">{comanda.identificador}</h3>
                                <p className="text-xs text-gray-500">{comanda.itens?.length || 0} itens</p>
                            </div>

                            <div className="font-mono text-lg font-bold text-green-400 mt-2">
                                {formatCurrency(comanda.total || 0)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* New Comanda Modal */}
                {showNewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                            <form onSubmit={handleCreateComanda} className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <FaPlus className="text-rose-500" /> Abrir Comanda
                                    </h3>
                                    <button type="button" onClick={() => setShowNewModal(false)} className="text-gray-500 hover:text-white">
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Identificador (Nº Mesa, Cartão)</label>
                                    <input
                                        type="text"
                                        value={newMesaId}
                                        onChange={(e) => setNewMesaId(e.target.value.toUpperCase())}
                                        className="w-full bg-black border-2 border-gray-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-rose-500 transition-all text-xl"
                                        placeholder="Ex: MESA 05"
                                        autoFocus
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-colors"
                                >
                                    Confirmar
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // View: Comanda Details (Adding items)
    return (
        <ComandaDetail
            comanda={selectedComanda}
            store={currentStore}
            onBack={() => setSelectedComanda(null)}
        />
    );
};

// Comanda Detail Sub-Component
const ComandaDetail = ({ comanda, store, onBack }) => {
    const navigate = useNavigate();
    const [allProducts, setAllProducts] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [inputQuantity, setInputQuantity] = useState(1);
    const barcodeInputRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getProducts(store.id).then(products => setAllProducts(products));
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }, [store.id]);

    const handleScan = (e) => {
        e.preventDefault();
        const code = barcodeInput.trim();
        if (!code) return;

        const product = allProducts.find(p => p.barcode === code || p.id === code);

        if (product) {
            handleSelectProduct(product);
        } else {
            const results = allProducts.filter(p =>
                p.name.toLowerCase().includes(code.toLowerCase()) ||
                (p.barcode && p.barcode.includes(code))
            );

            if (results.length === 1) {
                handleSelectProduct(results[0]);
            } else if (results.length > 1) {
                setSearchResults(results);
                setShowSearchModal(true);
            } else {
                alert('Produto não encontrado!');
            }
        }
    };

    const handleSelectProduct = (product) => {
        const newItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: Number(inputQuantity),
            obs: '',
            status_cozinha: 'pendente', // pendente, preparando, pronto
            addedAt: new Date().toISOString()
        };

        const updatedItems = [...(comanda.itens || []), newItem];
        const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        updateComanda(store.id, comanda.id, {
            itens: updatedItems,
            total: newTotal
        }).catch(err => alert("Erro ao adicionar item."));

        setBarcodeInput('');
        setInputQuantity(1);
        setShowSearchModal(false);
        setSuggestions([]);
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
    };

    const handleRemoveItem = async (index) => {
        if (!confirm("Remover este item da comanda?")) return;

        const updatedItems = comanda.itens.filter((_, i) => i !== index);
        const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        await updateComanda(store.id, comanda.id, {
            itens: updatedItems,
            total: newTotal
        });
    };

    const handleAddObservation = async (index) => {
        const item = comanda.itens[index];
        const newObs = prompt(`Observação para ${item.name}:`, item.obs || '');
        if (newObs !== null) {
            const updatedItems = [...comanda.itens];
            updatedItems[index].obs = newObs;
            await updateComanda(store.id, comanda.id, {
                itens: updatedItems
            });
        }
    };

    const handleFechamento = async () => {
        if (!comanda.itens || comanda.itens.length === 0) {
            alert("A comanda está vazia.");
            return;
        }

        if (confirm("Deseja fechar esta comanda e enviar para o caixa?")) {
            setIsSaving(true);
            try {
                // Change status to fechando (allows it to be picked up in PDV Dashboard)
                await updateComanda(store.id, comanda.id, { status: 'fechando' });
                alert("Comanda fechada e enviada para o caixa!");
                onBack();
            } catch (e) {
                alert("Erro ao fechar a comanda.");
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full bg-[#050505] text-white">
            {/* LEFT: Items List */}
            <div className="w-full md:w-[60%] flex flex-col border-r border-gray-800 bg-[#0a0a0a] h-[50vh] md:h-full order-1 md:order-1">
                <div className="p-3 md:p-4 bg-black/90 backdrop-blur-md border-b border-gray-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h2 className="font-bold text-lg leading-none text-rose-400 uppercase">{comanda.identificador}</h2>
                            <p className="text-[10px] text-gray-500 uppercase">Comanda Aberta</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {(!comanda.itens || comanda.itens.length === 0) && (
                        <div className="text-center py-20 opacity-30">
                            <FaUtensils size={40} className="mx-auto mb-4" />
                            <p>Nenhum item adicionado.</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {(comanda.itens || []).map((item, idx) => (
                            <div key={idx} className="bg-[#111] p-3 rounded-xl border border-gray-800 flex justify-between items-center group">
                                <div className="flex-1">
                                    <div className="font-bold text-white flex items-center gap-2">
                                        {item.name}
                                        {/* Status badge for kitchen state */}
                                        {item.status_cozinha === 'pendente' && <span className="text-[9px] bg-red-900/30 text-red-500 px-1.5 py-0.5 rounded uppercase">Cozinha</span>}
                                        {item.status_cozinha === 'preparando' && <span className="text-[9px] bg-yellow-900/30 text-yellow-500 px-1.5 py-0.5 rounded uppercase">Preparando</span>}
                                        {item.status_cozinha === 'pronto' && <span className="text-[9px] bg-green-900/30 text-green-500 px-1.5 py-0.5 rounded uppercase">Pronto</span>}
                                    </div>
                                    <div className="text-sm text-gray-500 font-mono">
                                        {item.quantity}x {formatCurrency(item.price)}
                                    </div>
                                    {item.obs && (
                                        <div className="text-xs text-orange-400 mt-1 italic">Obs: {item.obs}</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-400 font-mono mr-2">
                                        {formatCurrency(item.quantity * item.price)}
                                    </span>
                                    <button onClick={() => handleAddObservation(idx)} className="text-orange-500 hover:text-orange-400 transition-colors p-2" title="Adicionar Observação">
                                        <FaComment />
                                    </button>
                                    <button onClick={() => handleRemoveItem(idx)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: Input & Checkout */}
            <div className="w-full md:w-[40%] bg-[#050505] flex flex-col p-3 md:p-6 gap-3 md:gap-6 shadow-2xl h-[50vh] md:h-full order-2 md:order-2 border-t md:border-t-0 border-gray-800">
                <form onSubmit={handleScan} className="relative z-50 shrink-0">
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={inputQuantity}
                            onChange={(e) => setInputQuantity(e.target.value)}
                            className="w-16 bg-[#111] border-2 border-gray-800 text-white text-center rounded-xl focus:outline-none focus:border-rose-500 font-bold"
                            min="1"
                        />
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-gray-500" />
                            </div>
                            <input
                                ref={barcodeInputRef}
                                className="w-full bg-[#111] border-2 border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-rose-500"
                                placeholder="Buscar produto..."
                                value={barcodeInput}
                                onChange={(e) => {
                                    setBarcodeInput(e.target.value);
                                    if (e.target.value.length > 1) {
                                        setSuggestions(allProducts.filter(p => p.name.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 5));
                                    } else setSuggestions([]);
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchResults(allProducts);
                                setShowSearchModal(true);
                            }}
                            className="bg-[#111] hover:bg-rose-600 border-2 border-gray-800 hover:border-rose-500 text-white p-3 rounded-xl transition-colors flex items-center justify-center"
                            title="Ver todos os produtos"
                        >
                            <FaList />
                        </button>
                    </div>
                    {suggestions.length > 0 && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-[#1e293b] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                            {suggestions.map((p, i) => (
                                <div key={i} onClick={() => handleSelectProduct(p)} className="p-3 border-b border-gray-700 hover:bg-rose-600 cursor-pointer flex justify-between">
                                    <span className="font-bold text-white">{p.name}</span>
                                    <span className="font-mono text-green-400">{formatCurrency(p.price)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                <div className="flex-1 flex flex-col justify-center items-center shrink-0 min-h-0">
                    <div className="w-full bg-[#0a0a0a] rounded-2xl border border-gray-800 p-6 text-center shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">Total da Conta</p>
                        <div className="text-5xl font-bold text-green-500 font-mono tracking-tighter">
                            {formatCurrency(comanda.total || 0)}
                        </div>
                        {store.enableServiceTax && (
                            <div className="mt-3 text-gray-500 text-xs font-medium">
                                + 10% de serviço: {formatCurrency((comanda.total || 0) * 0.1)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 shrink-0">
                    <button
                        onClick={handleFechamento}
                        disabled={isSaving || !comanda.itens || comanda.itens.length === 0 || comanda.status === 'fechando'}
                        className="w-full h-16 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
                    >
                        <FaReceipt /> FECHAR COMANDA
                    </button>
                    {comanda.status === 'fechando' && (
                        <div className="text-center text-xs text-yellow-500 mt-2 animate-pulse font-bold">
                            Aguardando caixa fazer o pagamento...
                        </div>
                    )}
                </div>

                <ProductSearchModal isOpen={showSearchModal} onClose={() => { setShowSearchModal(false); setTimeout(() => barcodeInputRef.current?.focus(), 100); }} results={searchResults} onSelect={handleSelectProduct} />
            </div>
        </div>
    );
};

export default Tables;
