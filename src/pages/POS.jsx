import { useState, useEffect, useRef } from 'react';
// Force HMR Update
import { FaBarcode, FaSearch, FaTimes, FaBox, FaUserCircle, FaTrash, FaCheckCircle, FaKeyboard, FaUserTie, FaMoneyBillWave, FaLock, FaArrowDown } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/caramelo-logo.png';
import PaymentModal from '../components/PaymentModal';
import PinModal from '../components/PinModal';
import ProductSearchModal from '../components/ProductSearchModal';
import CashManagementModal from '../components/CashManagementModal';
import TutorialModal from '../components/TutorialModal';
import { getProductByBarcode, addSale, getProducts, reduceStock, getSellers, getOpenCashRegister, getCustomers, addDebt, saveBudget, deleteBudget, finishSaleAtomic, updateBudgetStatus } from '../services/dbService';
import { emitAndWaitNfce, emitNfe55 } from '../services/nfeService';
import { updateComanda } from '../services/comandaService';
import CustomerSelectionModal from '../components/CustomerSelectionModal';
import CustomerFormModal from '../components/CustomerFormModal';
import { getCurrentStore } from '../utils/storage';
import { formatCurrency, generateId } from '../utils/calculations';
import SalespersonSelectionModal from '../components/SalespersonSelectionModal';
import { printReceipt } from '../utils/printer';

const POS = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStore, setCurrentStore] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [lastProduct, setLastProduct] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [error, setError] = useState('');
    const barcodeInputRef = useRef(null);

    // Modals
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [allProducts, setAllProducts] = useState([]); // Local cache for synchronous search

    // Operator
    const [sellers, setSellers] = useState([]);
    const [operator, setOperator] = useState(null);
    const [showOperatorModal, setShowOperatorModal] = useState(false);

    // Salesperson Selection
    const [showSalespersonModal, setShowSalespersonModal] = useState(false);
    const [finalizingSeller, setFinalizingSeller] = useState(null);

    // Cart Management
    const [inputQuantity, setInputQuantity] = useState(1);
    const [removingItemIndex, setRemovingItemIndex] = useState(null);
    const [removeQuantity, setRemoveQuantity] = useState(1);

    // Cash Register Management
    const [cashRegister, setCashRegister] = useState(null);
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashModalMode, setCashModalMode] = useState('OPEN'); // OPEN, CLOSE, SANGRIA
    const [loadingRegister, setLoadingRegister] = useState(true);

    // Customer Selection
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState(null);

    const [isCompleting, setIsCompleting] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const tutorialSteps = [
        { target: '.barcode-input', title: 'Entrada de Produtos', content: 'Escaneie o código de barras ou digite o nome/código aqui. Use * (ex: 10*) para definir quantidade.', position: 'bottom' },
        { target: '.total-display', title: 'Valor da Venda', content: 'Aqui você acompanha o valor total e a quantidade de itens no carrinho.', position: 'top' },
        { target: '.finalize-btn', title: 'Fechamento de Venda', content: 'Clique aqui ou pressione F10 para abrir as formas de pagamento.', position: 'top' },
        { target: '.customer-btn', title: 'Venda a Prazo (Fiado)', content: 'Para vender no Crediário, você DEVE selecionar um cliente primeiro.', position: 'bottom' }
    ];

    useEffect(() => {
        const store = getCurrentStore();
        setCurrentStore(store);

        if (store) {
            getProducts(store.id).then(products => {
                setAllProducts(products);

                // Check if we are loading a budget from navigation state
                if (location.state?.budget) {
                    const budget = location.state.budget;
                    setCartItems(budget.items || []);
                    if (budget.customerId && customers.length > 0) {
                        const found = customers.find(c => c.id === budget.customerId);
                        if (found) setSelectedCustomer(found);
                    }
                }

                // Check if we are loading a comanda from navigation state
                if (location.state?.comanda) {
                    const comandaObj = location.state.comanda;
                    let comandaItems = comandaObj.itens || [];

                    // Add 10% service tax item if enabled
                    if (store.enableServiceTax) {
                        const serviceTaxAmount = (comandaObj.total || 0) * 0.1;
                        comandaItems.push({
                            id: 'taxa-servico',
                            name: 'Taxa de Serviço (10%)',
                            price: serviceTaxAmount,
                            quantity: 1,
                            total: serviceTaxAmount,
                            isServiceTax: true
                        });
                    }

                    setCartItems(comandaItems);
                }
            });
            getSellers(store.id).then(data => setSellers(data));
            getCustomers(store.id).then(data => {
                setCustomers(data);
                if (location.state?.budget?.customerId) {
                    const found = data.find(c => c.id === location.state.budget.customerId);
                    if (found) setSelectedCustomer(found);
                }
            });
            checkCashRegister(store.id);

            const savedOperator = sessionStorage.getItem('caramelo_pos_operator');
            if (savedOperator) {
                setOperator(JSON.parse(savedOperator));
            } else {
                setShowOperatorModal(true);
            }
        }
    }, [location.state]);

    const checkCashRegister = async (storeId) => {
        setLoadingRegister(true);
        const register = await getOpenCashRegister(storeId);
        setCashRegister(register);
        if (!register) {
            setCashModalMode('OPEN');
            setShowCashModal(true);
        }
        setLoadingRegister(false);
    };

    const handleOperatorAuth = (user) => {
        setOperator(user);
        sessionStorage.setItem('caramelo_pos_operator', JSON.stringify(user));
        setShowOperatorModal(false);
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
    };

    const handleOperatorLoginClose = () => {
        if (operator) setShowOperatorModal(false);
        else navigate('/dashboard');
    };

    const handleSwitchOperator = () => {
        sessionStorage.removeItem('caramelo_pos_operator');
        setOperator(null);
        setShowOperatorModal(true);
    };

    const openCashAction = (mode) => {
        setCashModalMode(mode);
        setShowCashModal(true);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F10' && cartItems.length > 0) {
                e.preventDefault();
                setShowSalespersonModal(true);
            }
            if (e.key === 'F1') {
                e.preventDefault();
                setSearchResults(allProducts);
                setShowSearchModal(true);
            }
            if (e.key === 'F8') {
                e.preventDefault();
                handleSwitchOperator();
            }
            if (e.key === 'Escape') {
                if (showPaymentModal) setShowPaymentModal(false);
                else if (showOperatorModal) setShowOperatorModal(false);
                else if (showCashModal && cashModalMode !== 'OPEN') setShowCashModal(false);
                else navigate('/dashboard');
            }
            if (document.activeElement.tagName !== 'INPUT' && !showPaymentModal && !showOperatorModal && !showCashModal) {
                barcodeInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cartItems, showPaymentModal, showOperatorModal, showCashModal, cashModalMode, navigate, allProducts]);

    const handleScan = async (e) => {
        e.preventDefault();
        if (!cashRegister) {
            alert("Caixa Fechado! Abra o caixa para vender.");
            setCashModalMode('OPEN');
            setShowCashModal(true);
            return;
        }

        const input = barcodeInput.trim();
        if (!input) return;

        let qty = Number(inputQuantity);
        let code = input;

        if (input.includes('*')) {
            const parts = input.split('*');
            qty = Number(parts[0]) || 1;
            code = parts[1];
        }

        const product = allProducts.find(p => p.barcode === code || p.id === code);

        if (product) {
            setError('');
            addToCart(product, qty);
            setLastProduct(product);
            setBarcodeInput('');
            setInputQuantity(1);
            setSuggestions([]);
        } else {
            const results = allProducts.filter(p =>
                p.name.toLowerCase().includes(code.toLowerCase()) ||
                (p.barcode && p.barcode.includes(code))
            );

            if (results.length === 1) {
                setError('');
                addToCart(results[0], qty);
                setLastProduct(results[0]);
                setBarcodeInput('');
                setInputQuantity(1);
                setSuggestions([]);
            } else if (results.length > 1) {
                setSearchResults(results);
                setShowSearchModal(true);
                setError('');
            } else {
                setError('Produto não encontrado!');
            }
        }
    };

    const handleSelectProduct = (product) => {
        if (!cashRegister) {
            alert("Caixa Fechado! Abra o caixa para vender.");
            setCashModalMode('OPEN');
            setShowCashModal(true);
            return;
        }
        addToCart(product, Number(inputQuantity));
        setLastProduct(product);
        setBarcodeInput('');
        setInputQuantity(1);
        setShowSearchModal(false);
        setSuggestions([]);
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
    };

    const addToCart = (product, qty = 1) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.quantity + qty > product.stock) {
                    setError('Estoque insuficiente!');
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + qty } : item);
            }
            return [...prev, { ...product, quantity: qty }];
        });
    };

    const removeFromCart = (index) => {
        const item = cartItems[index];
        if (item.quantity > 1) {
            setRemovingItemIndex(index);
            setRemoveQuantity(1);
        } else {
            setCartItems(prev => prev.filter((_, i) => i !== index));
        }
    };

    const confirmRemovePartial = () => {
        if (removingItemIndex === null) return;
        const qtyToRemove = Number(removeQuantity);
        setCartItems(prev => {
            const newItems = [...prev];
            const item = newItems[removingItemIndex];
            if (qtyToRemove >= item.quantity) {
                return prev.filter((_, i) => i !== removingItemIndex);
            } else {
                newItems[removingItemIndex] = { ...item, quantity: item.quantity - qtyToRemove };
                return newItems;
            }
        });
        setRemovingItemIndex(null);
    };

    const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const handleSaveBudget = async () => {
        if (cartItems.length === 0) return;

        const saleSellerId = finalizingSeller ? finalizingSeller.id : (operator ? operator.id : 'OWNER');
        const saleSellerName = finalizingSeller ? finalizingSeller.name : (operator ? operator.name : (currentStore.ownerName || 'Loja'));

        const budgetData = {
            items: cartItems,
            total,
            customerId: selectedCustomer?.id || null,
            customerName: selectedCustomer?.name || 'Consumidor',
            sellerId: saleSellerId,
            sellerName: saleSellerName,
            date: new Date().toISOString(),
        };

        try {
            const res = await saveBudget(currentStore.id, budgetData);
            if (res.success) {
                // If we were editing an existing budget, delete the old one
                if (location.state?.budget?.id) {
                    await deleteBudget(location.state.budget.id);
                }

                alert("Orçamento salvo com sucesso!");
                setCartItems([]);
                setSelectedCustomer(null);
                setShowPaymentModal(false);
                setFinalizingSeller(null);
                setTimeout(() => barcodeInputRef.current?.focus(), 100);
            } else {
                alert("Erro ao salvar orçamento: " + (res.error || "Erro desconhecido"));
            }
        } catch (err) {
            console.error("Erro ao salvar orçamento:", err);
            alert("Erro ao salvar orçamento. Verifique sua conexão.");
        }
    };

    const completeSale = async (paymentInfo) => {
        if (isCompleting) return;
        setIsCompleting(true);

        const saleSellerId = finalizingSeller ? finalizingSeller.id : (operator ? operator.id : 'OWNER');
        const saleSellerName = finalizingSeller ? finalizingSeller.name : (operator ? operator.name : (currentStore.ownerName || 'Loja'));
        const saleId = generateId();

        const sale = {
            id: saleId,
            storeId: currentStore.id,
            sellerId: saleSellerId,
            sellerName: saleSellerName,
            customer: selectedCustomer || null,
            items: cartItems,
            total,
            payment: paymentInfo,
            date: paymentInfo.date || new Date().toISOString(),
            status: 'COMPLETED',
            registerId: cashRegister?.id
        };

        // Prepare Debts if applicable
        const debtsToCreate = [];
        const crediarioPayments = paymentInfo.payments.filter(p => p.method === 'CREDIARIO');

        if (crediarioPayments.length > 0 && selectedCustomer) {
            for (const pay of crediarioPayments) {
                const installmentValue = pay.amount / pay.installments;
                const installmentsList = [];
                for (let i = 1; i <= pay.installments; i++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i);
                    installmentsList.push({
                        number: i,
                        amount: installmentValue,
                        dueDate: dueDate.toISOString(),
                        status: 'PENDING'
                    });
                }

                debtsToCreate.push({
                    customerId: selectedCustomer.id,
                    customerName: selectedCustomer.name,
                    saleId: saleId,
                    totalAmount: pay.amount,
                    remainingAmount: pay.amount,
                    installments: installmentsList,
                    sellerId: saleSellerId,
                    sellerName: saleSellerName,
                    description: `Venda ${saleId.slice(-6)}`
                });
            }
        }

        try {
            // Atomic operation: Sale + Stock + Debts
            const res = await finishSaleAtomic(currentStore.id, sale, debtsToCreate);

            if (!res.success) {
                throw new Error(res.error || "Erro ao salvar venda");
            }

            // If this was a budget being converted to a sale, mark it as completed
            if (location.state?.budget?.id) {
                try {
                    await updateBudgetStatus(location.state.budget.id, 'COMPLETED');
                } catch (budgetErr) {
                    console.warn("Erro ao finalizar orçamento pós-venda:", budgetErr);
                }
            }

            // If this was a comanda being converted to a sale, mark it as paid
            if (location.state?.comanda?.id) {
                try {
                    await updateComanda(currentStore.id, location.state.comanda.id, { status: 'paga' });
                } catch (comandaErr) {
                    console.warn("Erro ao fechar comanda:", comandaErr);
                }
            }

            // ----------------------------------------------------
            // FISCAL EMISSION INTEGRATION (NFC-e or NF-e 55)
            // ----------------------------------------------------
            if (paymentInfo.fiscalType === 'NFCE') {
                const nfceRes = await emitAndWaitNfce(currentStore.id, sale);
                if (nfceRes.success) {
                    alert(`NFC-e Emitida com Sucesso!\nStatus: Autorizado`);
                    if (nfceRes.pdf) window.open(`https://api.focusnfe.com.br${nfceRes.pdf}`, '_blank');
                } else {
                    alert(`Falha ao emitir NFC-e:\n${nfceRes.error}`);
                }
            } else if (paymentInfo.fiscalType === 'NFE55') {
                const nfeRes = await emitNfe55(currentStore.id, sale);
                if (nfeRes.success) {
                    alert(`NF-e (Modelo 55) enviada com sucesso!\nStatus: Processando`);
                } else {
                    alert(`Falha ao emitir NF-e (Modelo 55):\n${nfeRes.error}`);
                }
            }

            const printerSettings = JSON.parse(localStorage.getItem('caramelo_printer_settings') || '{}');
            if (printerSettings.autoPrint !== false) {
                printReceipt(sale, currentStore, printerSettings);
            }

            setCartItems([]);
            setLastProduct(null);
            setSelectedCustomer(null);
            setShowPaymentModal(false);
            setFinalizingSeller(null);
            setTimeout(() => barcodeInputRef.current?.focus(), 100);
        } catch (err) {
            console.error("Erro ao finalizar venda:", err);
            alert("Erro ao salvar venda. Verifique sua conexão.");
        } finally {
            setIsCompleting(false);
        }
    };

    const closeTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem('tutorial_pos_shown', 'true');
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-black text-white overflow-x-hidden md:overflow-hidden font-sans">
            <div className="w-full md:w-[60%] flex flex-col border-r border-gray-800 bg-[#0a0a0a] h-[50vh] md:h-full order-1">
                {/* Header */}
                <div className="p-3 md:p-4 bg-black/90 backdrop-blur-md border-b border-gray-800 flex justify-between items-center shadow-lg z-10 shrink-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Logo" className="w-8 h-8 md:w-9 md:h-9 object-contain" />
                            <div className="flex flex-col">
                                <h2 className="font-bold text-sm md:text-base leading-none text-white tracking-tight">Caramelo PDV</h2>
                                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{currentStore?.name}</p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase transition-colors ${cashRegister ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${cashRegister ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            {cashRegister ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                        </div>

                        {/* Role Badge */}
                        <div className="flex items-center gap-1.5 bg-[#1e293b] border border-gray-700 px-2.5 py-1 rounded-full text-slate-300 text-[10px] md:text-xs font-bold">
                            <FaUserCircle className="text-slate-500" />
                            {operator?.role === 'ADMIN' ? 'Administrador' : (operator?.name || 'Operador')}
                        </div>

                        {/* Customer Selector Button */}
                        <button
                            onClick={() => setShowCustomerModal(true)}
                            className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase transition-all ${selectedCustomer ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                        >
                            <FaUserCircle className={selectedCustomer ? 'text-orange-500' : 'text-gray-500'} />
                            {selectedCustomer ? selectedCustomer.name.split(' ')[0] : 'Selecionar Cliente'}
                            {selectedCustomer && (
                                <FaTimes
                                    className="ml-1 hover:text-white cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCustomer(null);
                                    }}
                                />
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar bg-[#0a0a0a]">
                    <div className="md:hidden space-y-2">
                        {cartItems.map((item, index) => (
                            <div key={index} className="bg-[#111] p-3 rounded-lg border border-gray-800 flex justify-between items-center text-sm">
                                <div><div className="font-bold">{item.name}</div><div className="text-gray-500">{item.quantity}x {formatCurrency(item.price)}</div></div>
                                <div className="flex items-center gap-3"><span className="font-bold text-green-500">{formatCurrency(item.price * item.quantity)}</span><button onClick={() => removeFromCart(index)} className="text-red-500 p-2"><FaTrash /></button></div>
                            </div>
                        ))}
                    </div>
                    <table className="hidden md:table w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#0a0a0a] text-gray-500 text-xs uppercase font-bold z-10">
                            <tr>
                                <th className="pb-3 pl-2">#</th>
                                <th className="pb-3">PRODUTO</th>
                                <th className="pb-3 text-right">QTD</th>
                                <th className="pb-3 text-right">UNITÁRIO</th>
                                <th className="pb-3 text-right">TOTAL</th>
                                <th className="pb-3 text-center">AÇÃO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50 text-sm">
                            {cartItems.map((item, index) => (
                                <tr key={index} className="hover:bg-white/5">
                                    <td className="py-4 pl-2 font-mono text-xs">{index + 1}</td>
                                    <td className="py-4 font-bold">{item.name}<div className="text-xs text-gray-500 font-normal">{item.barcode || 'S/G'}</div></td>
                                    <td className="py-4 text-right font-mono">{item.quantity}</td>
                                    <td className="py-4 text-right font-mono">{formatCurrency(item.price)}</td>
                                    <td className="py-4 text-right font-bold font-mono">{formatCurrency(item.price * item.quantity)}</td>
                                    <td className="py-4 text-center"><button onClick={() => removeFromCart(index)} className="p-2 text-gray-600 hover:text-red-500"><FaTrash size={14} /></button></td>
                                </tr>
                            ))}
                            {cartItems.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-gray-600">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <FaBox size={60} />
                                            <h3 className="text-xl font-bold">Caixa Livre</h3>
                                            <p className="text-sm">Passe um produto ou digite o código/nome</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="w-full md:w-[40%] bg-[#050505] flex flex-col p-3 md:p-6 gap-3 md:gap-6 shadow-2xl z-20 h-[50vh] md:h-full order-2 border-l border-gray-800">
                <form onSubmit={handleScan} className="barcode-input relative z-50">
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={inputQuantity}
                            onChange={(e) => setInputQuantity(e.target.value)}
                            className="w-12 md:w-16 bg-[#111] border-2 border-gray-800 text-white text-center rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-bold text-sm md:text-lg"
                            min="1"
                            placeholder="1"
                            disabled={!cashRegister}
                        />
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                                <FaBarcode className="text-gray-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                            </div>
                            <input
                                ref={barcodeInputRef}
                                className="w-full bg-[#111] border-2 border-gray-800 text-white text-base md:text-lg rounded-xl pl-10 md:pl-12 pr-4 py-3 md:py-4 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder-gray-600"
                                placeholder="Produto (F1)..."
                                value={barcodeInput}
                                onChange={(e) => {
                                    setBarcodeInput(e.target.value);
                                    if (e.target.value.length > 1) {
                                        setSuggestions(allProducts.filter(p => p.name.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 5));
                                    } else setSuggestions([]);
                                }}
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-1">
                            <button type="submit" className="h-full px-4 bg-gray-800 rounded-xl hover:bg-gray-700 text-gray-400 border border-gray-700">
                                <FaSearch />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchResults(allProducts);
                                    setShowSearchModal(true);
                                }}
                                className="h-full px-4 bg-orange-600/20 hover:bg-orange-600/30 text-orange-500 rounded-xl border border-orange-500/30 flex flex-col items-center justify-center font-bold text-[10px] transition-all"
                            >
                                <FaBox size={16} />
                                <span>LISTA</span>
                            </button>
                        </div>
                    </div>

                    {/* Autocomplete */}
                    {suggestions.length > 0 && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-[#1e293b] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 mb-safe animate-fadeIn">
                            {suggestions.map((p, i) => (
                                <div key={i} onClick={() => handleSelectProduct(p)} className="p-3 md:p-4 border-b border-gray-700 hover:bg-blue-600 cursor-pointer flex justify-between group transition-colors">
                                    <span className="font-bold text-white text-sm md:text-base">{p.name}</span>
                                    <span className="font-mono text-green-400 group-hover:text-white text-sm md:text-base">{formatCurrency(p.price)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                <div className="flex-1 flex flex-col justify-center">
                    {/* TOTAL DISPLAY */}
                    <div className="total-display w-full bg-[#0a0a0a] rounded-2xl border border-gray-800 p-4 md:p-8 text-center shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
                        <p className="text-gray-500 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-1 md:mb-2">Total a Pagar</p>
                        <div className="text-5xl md:text-[5rem] leading-none font-bold text-green-500 font-mono tracking-tighter" style={{ textShadow: '0 0 40px rgba(34, 197, 94, 0.2)' }}>
                            {formatCurrency(total)}
                        </div>
                        <div className="mt-2 md:mt-4 text-gray-600 text-[10px] md:text-sm font-medium bg-gray-900/50 inline-block px-3 py-1 rounded-full">
                            {totalItems} itens no carrinho
                        </div>
                    </div>
                </div>

                {/* Big Action Buttons */}
                <div className="grid grid-cols-4 gap-2 md:gap-4 h-16 md:h-auto shrink-0">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="col-span-1 h-full md:h-20 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-bold text-xs md:text-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                    >
                        <span className="text-[10px] md:text-xs text-gray-500 uppercase hidden md:inline">ESC</span>
                        <span className="hidden md:inline">VOLTAR</span>
                        <span className="md:hidden"><FaTimes /></span>
                    </button>

                    <button
                        onClick={() => { if (confirm('Limpar caixa?')) setCartItems([]); }}
                        className="col-span-1 h-full md:h-20 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-500 font-bold text-xs md:text-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                        disabled={cartItems.length === 0}
                    >
                        <span className="text-[10px] md:text-xs text-gray-500 uppercase hidden md:inline">DEL</span>
                        <span className="hidden md:inline">CANCELAR</span>
                        <span className="md:hidden"><FaTrash /></span>
                    </button>

                    {/* Cash Management Buttons if Cart is Empty */}
                    {cartItems.length === 0 && cashRegister && (
                        <div className="col-span-2 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => openCashAction('SANGRIA')}
                                className="h-full rounded-xl bg-orange-900/20 hover:bg-orange-900/40 border border-orange-900/50 text-orange-500 font-bold text-[10px] md:text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                            >
                                <FaArrowDown />
                                <span>SANGRIA</span>
                            </button>
                            <button
                                onClick={() => openCashAction('CLOSE')}
                                className="h-full rounded-xl bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/50 text-blue-400 font-bold text-[10px] md:text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                            >
                                <FaLock />
                                <span>CAIXA</span>
                            </button>
                        </div>
                    )}

                    {/* Main Action Button (Proceed or Open) */}
                    {!cashRegister ? (
                        <button
                            onClick={() => openCashAction('OPEN')}
                            className="col-span-2 h-full md:h-32 rounded-xl flex flex-col items-center justify-center gap-1 md:gap-2 shadow-lg transition-all active:scale-95 bg-green-600 hover:bg-green-500 text-white border-b-4 border-green-800 hover:border-green-700 animate-pulse"
                        >
                            <div className="flex items-center gap-2 md:gap-3">
                                <FaMoneyBillWave className="text-xl md:text-3xl" />
                                <span className="text-xl md:text-3xl font-bold tracking-tight uppercase">Abrir Caixa</span>
                            </div>
                            <div className="hidden md:block bg-black/20 px-4 py-1 rounded-full text-xs font-mono font-bold">
                                Necessário para vender
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => cartItems.length > 0 && setShowSalespersonModal(true)}
                            disabled={cartItems.length === 0}
                            className={`finalize-btn col-span-2 h-full md:h-32 rounded-xl flex flex-col items-center justify-center gap-1 md:gap-2 shadow-lg transition-all active:scale-95 ${cartItems.length === 0 ? 'bg-gray-800 text-gray-600' : 'bg-green-600 hover:bg-green-500 text-white border-b-4 border-green-800 hover:border-green-700'}`}
                        >
                            <div className="flex items-center gap-2 md:gap-3">
                                <FaCheckCircle className="text-xl md:text-3xl" />
                                <span className="text-xl md:text-3xl font-bold tracking-tight">FINALIZAR</span>
                            </div>
                            <div className="hidden md:block bg-black/20 px-4 py-1 rounded-full text-sm font-mono font-bold">
                                Pressione F10
                            </div>
                        </button>
                    )}
                </div>

                <div className="flex justify-between text-xs text-gray-600 font-mono px-2 shrink-0">
                    <span>F8: Troc. Operador</span>
                    <span>Ayres System v1.0</span>
                </div>
            </div>

            {showPaymentModal && <PaymentModal items={cartItems} total={total} onClose={() => setShowPaymentModal(false)} onComplete={completeSale} storeName={currentStore?.name} cnpj={currentStore?.cnpj} customer={selectedCustomer} onOpenCustomerModal={() => setShowCustomerModal(true)} onSaveBudget={handleSaveBudget} />}
            <PinModal isOpen={showOperatorModal} onClose={handleOperatorLoginClose} onSuccess={handleOperatorAuth} title="Identifique-se" requiredRole="SELLER" />
            <ProductSearchModal isOpen={showSearchModal} onClose={() => { setShowSearchModal(false); setTimeout(() => barcodeInputRef.current?.focus(), 100); }} results={searchResults} onSelect={handleSelectProduct} />
            <SalespersonSelectionModal isOpen={showSalespersonModal} onClose={() => setShowSalespersonModal(false)} sellers={sellers} onSelect={(seller) => { setFinalizingSeller(seller); setShowSalespersonModal(false); setShowPaymentModal(true); }} />
            {operator && <CashManagementModal isOpen={showCashModal} onClose={() => setShowCashModal(false)} currentRegister={cashRegister} store={currentStore} user={operator} initialMode={cashModalMode} onRegisterUpdate={() => checkCashRegister(currentStore?.id)} />}
            <TutorialModal isOpen={showTutorial} onClose={closeTutorial} title="Tutorial: Frente de Caixa" steps={tutorialSteps} currentStep={currentStep} onNext={() => setCurrentStep(prev => prev + 1)} onPrev={() => setCurrentStep(prev => prev - 1)} />
            <CustomerSelectionModal
                isOpen={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                customers={customers}
                onSelect={(customer) => { setSelectedCustomer(customer); setShowCustomerModal(false); barcodeInputRef.current?.focus(); }}
                onAddNew={() => { setShowCustomerModal(false); setCustomerToEdit(null); setShowCustomerFormModal(true); }}
            />

            <CustomerFormModal
                isOpen={showCustomerFormModal}
                onClose={() => setShowCustomerFormModal(false)}
                customerToEdit={customerToEdit}
                storeId={currentStore?.id}
                onSaveSuccess={async (customerId) => {
                    const updatedCustomers = await getCustomers(currentStore.id);
                    setCustomers(updatedCustomers);
                    const newCust = updatedCustomers.find(c => c.id === customerId);
                    if (newCust) setSelectedCustomer(newCust);
                    setShowCustomerFormModal(false);
                    setTimeout(() => barcodeInputRef.current?.focus(), 100);
                }}
            />

            {removingItemIndex !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-white mb-2">Excluir Unidades</h3>
                        <p className="text-gray-400 mb-6">Remover quantas unidades de {cartItems[removingItemIndex]?.name}?</p>
                        <input type="number" value={removeQuantity} onChange={(e) => setRemoveQuantity(Math.min(e.target.value, cartItems[removingItemIndex]?.quantity))} className="w-full bg-black border-2 border-gray-800 rounded-xl px-4 py-3 text-white text-xl font-bold mb-6" min="1" max={cartItems[removingItemIndex]?.quantity} autoFocus />
                        <div className="flex gap-3"><button onClick={() => setRemovingItemIndex(null)} className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold rounded-xl">CANCELAR</button><button onClick={confirmRemovePartial} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl">EXCLUIR</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;
