import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaUser, FaIdCard, FaMapMarkerAlt, FaPhone, FaEnvelope, FaEye, FaFolderOpen, FaShoppingCart, FaPrint, FaCheck, FaFileAlt, FaMoneyBillWave } from 'react-icons/fa';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getStore, getBudgetsByCustomer, deleteBudget, getBudgetsByStore, getDebtsByStore } from '../services/dbService'; // Added getStore, getBudgetsByStore, getDebtsByStore
import { useNavigate } from 'react-router-dom';
import { getCurrentStore, getSettings } from '../utils/storage';
import { formatCurrency } from '../utils/calculations';
import { printBudget } from '../utils/printUtils';
import { checkLimit } from '../utils/plans';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [currentStore, setCurrentStore] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Budget History State
    const [showBudgetHistory, setShowBudgetHistory] = useState(false);
    const [selectedCustomerForBudget, setSelectedCustomerForBudget] = useState(null);
    const [customerBudgets, setCustomerBudgets] = useState([]);
    const [loadingBudgets, setLoadingBudgets] = useState(false);

    // Indicators State
    const [debtorIds, setDebtorIds] = useState(new Set());
    const [budgetCustomerIds, setBudgetCustomerIds] = useState(new Set());
    const [activeFilter, setActiveFilter] = useState('all'); // all, debtors, budgets

    const [formData, setFormData] = useState({
        email: '',
        address: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        notes: ''
    });

    useEffect(() => {
        const store = getCurrentStore();
        setCurrentStore(store);
        if (store) {
            loadCustomers(store.id);
            loadIndicators(store.id);
        }
    }, []);

    const loadIndicators = async (storeId) => {
        try {
            const [allBudgets, allDebts] = await Promise.all([
                getBudgetsByStore(storeId),
                getDebtsByStore(storeId)
            ]);

            const budgetsWithPending = new Set(
                allBudgets
                    .filter(b => b.status === 'PENDING' || b.status === 'OPEN' || !b.status)
                    .map(b => String(b.customerId || b.customer?.id))
            );

            const pendingDebts = new Set(
                allDebts
                    .filter(d => d.remainingAmount > 0.01)
                    .map(d => String(d.customerId || d.customer?.id))
            );

            setBudgetCustomerIds(budgetsWithPending);
            setDebtorIds(pendingDebts);
            console.log("Indicators load complete!", {
                budgetsFound: budgetsWithPending.size,
                debtsFound: pendingDebts.size,
                budgetIds: Array.from(budgetsWithPending),
                debtIds: Array.from(pendingDebts)
            });
        } catch (error) {
            console.error("Error loading indicators:", error);
        }
    };

    const loadCustomers = async (storeId) => {
        if (!storeId) return;
        const data = await getCustomers(storeId);
        setCustomers(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            alert('Nome é obrigatório');
            return;
        }

        // Check Limits
        if (!editingCustomer) {
            // Fetch FRESH store data to get real-time plan
            let activePlan = currentStore.plan || 'Start';
            try {
                const freshStore = await getStore(currentStore.id);
                if (freshStore && freshStore.plan) {
                    activePlan = freshStore.plan;
                }
            } catch (err) {
                console.error("Error fetching fresh plan:", err);
            }

            const { allowed, message } = checkLimit(activePlan, 'customers', customers.length);
            if (!allowed) {
                alert(message);
                return;
            }
        }

        try {
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, formData);
            } else {
                await addCustomer(currentStore.id, formData);
            }
            loadCustomers(currentStore.id);
            resetForm();
        } catch (error) {
            alert("Erro ao salvar cliente: " + error.message);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', cpf: '', phone: '', email: '', address: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', notes: '' });
        setEditingCustomer(null);
        setShowForm(false);
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            cpf: customer.cpf || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            cep: customer.cep || '',
            logradouro: customer.logradouro || '',
            numero: customer.numero || '',
            complemento: customer.complemento || '',
            bairro: customer.bairro || '',
            cidade: customer.cidade || '',
            uf: customer.uf || '',
            notes: customer.notes || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Excluir este cliente?')) {
            await deleteCustomer(id);
            loadCustomers(currentStore.id);
        }
    };

    const formatPhone = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const handleFetchAddress = async (cepValue) => {
        const cleanCep = cepValue.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        logradouro: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        uf: data.uf
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            }
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.cpf?.includes(searchTerm) ||
            c.phone?.includes(searchTerm);

        if (!matchesSearch) return false;

        const cId = String(c.id);
        if (activeFilter === 'debtors') return debtorIds.has(cId);
        if (activeFilter === 'budgets') return budgetCustomerIds.has(cId);

        return true;
    });

    const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleOpenBudgets = async (customer) => {
        setSelectedCustomerForBudget(customer);
        setShowBudgetHistory(true);
        setLoadingBudgets(true);
        try {
            const budgets = await getBudgetsByCustomer(currentStore.id, customer.id);
            // Only show open budgets in this specific modal
            setCustomerBudgets(budgets.filter(b => b.status !== 'COMPLETED'));
        } catch (error) {
            console.error("Error loading budgets:", error);
        } finally {
            setLoadingBudgets(false);
        }
    };

    const handleOpenHistory = async (customer) => {
        setSelectedCustomerForBudget(customer);
        setShowPurchaseHistory(true);
        setLoadingHistory(true);
        try {
            const { getCompletedSalesByCustomer, getBudgetsByCustomer } = await import('../services/dbService');
            const [sales, budgets] = await Promise.all([
                getCompletedSalesByCustomer(currentStore.id, customer.id),
                getBudgetsByCustomer(currentStore.id, customer.id)
            ]);

            // Combine and sort
            const unified = [
                ...sales.map(s => ({ ...s, type: 'SALE' })),
                ...budgets.map(b => ({ ...b, type: 'BUDGET' }))
            ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

            setPurchaseHistory(unified);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleLoadBudget = (budget) => {
        navigate('/pos', { state: { budget: { ...budget, customerId: selectedCustomerForBudget.id } } });
    };

    const handlePrintBudget = async (budget) => {
        const printerSettings = getSettings();
        let shopInfo = getCurrentStore();

        if (!shopInfo) {
            alert('Erro: Informações da loja não encontradas. Verifique as Configurações.');
            return;
        }

        // Try to fetch newest data from Firestore to be 100% sure
        try {
            const { getStore } = await import('../services/dbService');
            const freshStore = await getStore(shopInfo.id);
            if (freshStore) shopInfo = { ...shopInfo, ...freshStore };
        } catch (e) {
            console.error("No firestore info, using local", e);
        }

        printBudget(shopInfo, selectedCustomerForBudget, budget.items, budget.total, budget.date, printerSettings);
    };

    const handleDeleteBudget = async (id) => {
        if (confirm('Excluir este orçamento?')) {
            await deleteBudget(id);
            setCustomerBudgets(prev => prev.filter(b => b.id !== id));
        }
    };

    if (!showForm) {
        return (
            <div className="container-center" style={{ padding: '2rem' }}>
                <div className="flex-between mb-4">
                    <h1 style={{ fontSize: '1.8rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        <FaUser className="mr-2" style={{ color: 'var(--primary)' }} /> Gestão de Clientes
                    </h1>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <FaPlus /> Novo Cliente
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 card p-4 flex gap-4 bg-[#111] border border-gray-800 rounded-xl">
                        <FaSearch className="text-gray-500 mt-1" />
                        <input
                            className="w-full bg-transparent border-none text-white focus:outline-none"
                            placeholder="Buscar por nome, CPF ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex bg-[#111] border border-gray-800 rounded-xl p-1 shrink-0">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeFilter === 'all' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            TODOS
                        </button>
                        <button
                            onClick={() => setActiveFilter('debtors')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'debtors' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FaMoneyBillWave /> DEVEDORES
                        </button>
                        <button
                            onClick={() => setActiveFilter('budgets')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'budgets' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FaFileAlt /> ORÇAMENTOS
                        </button>
                    </div>
                </div>

                <div className="premium-table-container mt-0 bg-[#0a0a0a]">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>CPF / CNPJ</th>
                                <th>Telefone</th>
                                <th>Email</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(customer => (
                                <tr key={customer.id}>
                                    <td style={{ fontWeight: 'bold' }}>
                                        <div className="flex items-center gap-2">
                                            {customer.name}
                                            <div className="flex gap-1">
                                                {budgetCustomerIds.has(String(customer.id)) && (
                                                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-[0_0_10px_rgba(37,99,235,0.5)] flex items-center gap-1 animate-pulse border border-blue-400" title="Possui Orçamento Aberto">
                                                        <FaFileAlt size={8} /> ORÇAMENTO EM ABERTO
                                                    </span>
                                                )}
                                                {debtorIds.has(String(customer.id)) && (
                                                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] flex items-center gap-1 border border-red-400" title="Possui Débito Pendente">
                                                        <FaMoneyBillWave size={8} /> DÉBITO PENDENTE
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace' }}>{customer.cpf || '-'}</td>
                                    <td>{customer.phone || '-'}</td>
                                    <td className="text-muted">{customer.email || '-'}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-sm btn-secondary flex flex-col items-center gap-1 min-w-[70px] py-2"
                                                title="Visualizar Orçamentos Abertos"
                                                onClick={() => handleOpenBudgets(customer)}
                                            >
                                                <FaEye />
                                                <span className="text-[9px] uppercase font-black">Orçamento</span>
                                            </button>
                                            <button
                                                className="btn btn-sm btn-secondary flex flex-col items-center gap-1 min-w-[70px] py-2"
                                                style={{ backgroundColor: '#de6b0e', border: 'none' }}
                                                title="Histórico de Compras"
                                                onClick={() => handleOpenHistory(customer)}
                                            >
                                                <FaFolderOpen />
                                                <span className="text-[9px] uppercase font-black">Histórico</span>
                                            </button>
                                            <button
                                                className="btn btn-sm btn-secondary flex flex-col items-center gap-1 min-w-[70px] py-2"
                                                onClick={() => handleEdit(customer)}
                                            >
                                                <FaEdit />
                                                <span className="text-[9px] uppercase font-black">Editar</span>
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger flex flex-col items-center gap-1 min-w-[70px] py-2"
                                                onClick={() => handleDelete(customer.id)}
                                            >
                                                <FaTrash />
                                                <span className="text-[9px] uppercase font-black">Excluir</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center p-8 text-muted">
                                        Nenhum cliente encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ACTIVE BUDGETS MODAL (EYE ICON) */}
                {showBudgetHistory && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                        <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <FaEye className="text-caramelo-primary" />
                                    Orçamentos Abertos: {selectedCustomerForBudget?.name}
                                </h3>
                                <button onClick={() => setShowBudgetHistory(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar">
                                {loadingBudgets ? (
                                    <div className="text-center p-12 text-gray-500">Carregando orçamentos...</div>
                                ) : customerBudgets.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="text-center p-8 bg-black/20 rounded-xl border border-white/5 mb-4">
                                            <p className="text-gray-400 mb-4">Os orçamentos agora aparecem junto com o histórico completo para sua conveniência.</p>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => { setShowBudgetHistory(false); handleOpenHistory(selectedCustomerForBudget); }}
                                            >
                                                VER HISTÓRICO COMPLETO
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {customerBudgets.map(budget => (
                                                <div key={budget.id} className="bg-blue-900/10 border border-blue-500/30 rounded-xl p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white font-bold">{new Date(budget.createdAt).toLocaleString()}</p>
                                                        <p className="text-blue-400 font-black text-lg">{formatCurrency(budget.total)}</p>
                                                        <p className="text-xs text-gray-500 uppercase">{budget.items?.length || 0} ITENS</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button className="btn btn-sm btn-primary" onClick={() => handlePrintBudget(budget)}><FaPrint /> IMPRIMIR</button>
                                                        <button className="btn btn-sm btn-success" onClick={() => handleLoadBudget(budget)}><FaShoppingCart /> FINALIZAR</button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteBudget(budget.id)}><FaTrash /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-12 text-gray-600">
                                        Nenhum orçamento aberto para este cliente.
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-800 bg-black/40 flex justify-end">
                                <button onClick={() => setShowBudgetHistory(false)} className="btn btn-secondary">Fechar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PURCHASE HISTORY MODAL (FOLDER ICON) */}
                {showPurchaseHistory && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                        <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <FaFolderOpen className="text-orange-500" />
                                    Histórico: {selectedCustomerForBudget?.name}
                                </h3>
                                <button onClick={() => setShowPurchaseHistory(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar">
                                {loadingHistory ? (
                                    <div className="text-center p-12 text-gray-500">Carregando histórico...</div>
                                ) : purchaseHistory.length > 0 ? (
                                    <div className="space-y-6">
                                        {purchaseHistory.map(item => (
                                            <div key={item.id} className={`border rounded-xl p-4 transition-all ${item.type === 'BUDGET' ? (item.status === 'COMPLETED' ? 'bg-gray-600/10 border-gray-500/30' : 'bg-blue-900/10 border-blue-500/30') : 'bg-white/5 border-white/10'}`}>
                                                <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${item.type === 'BUDGET' ? (item.status === 'COMPLETED' ? 'bg-gray-600 text-white' : 'bg-blue-500 text-white') : 'bg-green-600 text-white'}`}>
                                                            {item.type === 'BUDGET' ? (item.status === 'COMPLETED' ? 'Orçamento (Finalizado)' : 'Orçamento') : 'Venda'}
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-gray-500 uppercase font-black">Data</span>
                                                            <p className="font-bold text-white text-sm">{new Date(item.date || item.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs text-gray-500 uppercase font-black">Total</span>
                                                        <p className={`text-xl font-black ${item.type === 'BUDGET' ? (item.status === 'COMPLETED' ? 'text-gray-400' : 'text-blue-400') : 'text-green-500'}`}>{formatCurrency(item.total)}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-4">
                                                    {item.items.map((prod, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-gray-400">
                                                                    {prod.quantity}x
                                                                </span>
                                                                <span className="text-gray-200">{prod.name}</span>
                                                            </div>
                                                            <span className="font-mono text-gray-400">{formatCurrency(prod.price * prod.quantity)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {(item.type === 'BUDGET' && item.status !== 'COMPLETED') && (
                                                    <div className="flex gap-2 justify-end pt-2 border-t border-white/5 mt-2">
                                                        <button
                                                            className="btn btn-sm btn-primary flex items-center gap-2"
                                                            onClick={() => handlePrintBudget(item)}
                                                        >
                                                            <FaPrint size={10} /> IMPRIMIR
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-success flex items-center gap-2"
                                                            onClick={() => handleLoadBudget(item)}
                                                        >
                                                            <FaShoppingCart size={10} /> FINALIZAR
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDeleteBudget(item.id)}
                                                        >
                                                            <FaTrash size={10} />
                                                        </button>
                                                    </div>
                                                )}

                                                {(item.type === 'BUDGET' && item.status === 'COMPLETED') && (
                                                    <div className="flex gap-2 justify-end pt-2 border-t border-white/5 mt-2">
                                                        <button
                                                            className="btn btn-sm btn-primary flex items-center gap-2"
                                                            onClick={() => handlePrintBudget(item)}
                                                        >
                                                            <FaPrint size={10} /> REIMPRIMIR
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary flex items-center gap-2"
                                                            onClick={() => handleLoadBudget(item)}
                                                        >
                                                            <FaPlus size={10} /> USAR COMO BASE
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-12 text-gray-600">
                                        Nenhum registro encontrado para este cliente.
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-800 bg-black/40 flex justify-end">
                                <button onClick={() => setShowPurchaseHistory(false)} className="btn btn-secondary">Fechar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slideUp">
                <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#0a0a0a] to-[#111]">
                    <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            {editingCustomer ? <FaEdit size={20} /> : <FaUser size={20} />}
                        </div>
                        {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                    <button onClick={resetForm} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"><FaTimes size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="mb-4">
                            <label className="input-label-premium">Nome Completo *</label>
                            <input
                                className="input-premium"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ex: João Silva"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="input-label-premium flex items-center gap-2"><FaIdCard size={12} /> CPF / CNPJ</label>
                                <input
                                    className="input-premium"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium flex items-center gap-2"><FaPhone size={12} /> Telefone / WhatsApp</label>
                                <input
                                    className="input-premium"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="input-label-premium flex items-center gap-2"><FaEnvelope size={12} /> Email</label>
                            <input
                                type="email"
                                className="input-premium"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="cliente@email.com"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="input-label-premium flex items-center gap-2"><FaMapMarkerAlt size={12} /> CEP (Para NF-e 55)</label>
                            <input
                                className="input-premium"
                                value={formData.cep}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setFormData({ ...formData, cep: val });
                                    if (val.length === 8) handleFetchAddress(val);
                                }}
                                placeholder="00000-000"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="input-label-premium">Logradouro / Rua</label>
                                <input
                                    className="input-premium"
                                    value={formData.logradouro}
                                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                                    placeholder="Av. Principal"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium">Número</label>
                                <input
                                    className="input-premium"
                                    value={formData.numero}
                                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                    placeholder="123"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="input-label-premium">Bairro</label>
                                <input
                                    className="input-premium"
                                    value={formData.bairro}
                                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                                    placeholder="Centro"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium">Complemento</label>
                                <input
                                    className="input-premium"
                                    value={formData.complemento}
                                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                                    placeholder="Sala 01"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="input-label-premium">Cidade</label>
                                <input
                                    className="input-premium"
                                    value={formData.cidade}
                                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                    placeholder="São Paulo"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium">UF (Estado)</label>
                                <input
                                    className="input-premium"
                                    value={formData.uf}
                                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase().slice(0, 2) })}
                                    placeholder="SP"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="input-label-premium flex items-center gap-2"><FaMapMarkerAlt size={12} /> Endereço Completo (Opcional)</label>
                            <textarea
                                className="input-premium"
                                rows="1"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Resumo do endereço"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="input-label-premium">Observações</label>
                            <textarea
                                className="input-premium"
                                rows="2"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Preferências, histórico, etc."
                            />
                        </div>

                        <div className="flex gap-4 pt-6 border-t border-white/5 mt-4">
                            <button type="button" className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10" onClick={resetForm}>CANCELAR</button>
                            <button type="submit" className="flex-[2] py-4 rounded-2xl bg-primary hover:bg-primary-dark text-black font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2">
                                <FaCheck /> {editingCustomer ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR CLIENTE'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Customers;
