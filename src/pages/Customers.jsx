import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaUser, FaIdCard, FaMapMarkerAlt, FaPhone, FaEnvelope, FaEye, FaFolderOpen, FaShoppingCart, FaPrint, FaCheck, FaFileAlt, FaMoneyBillWave, FaTruck, FaCalendarAlt } from 'react-icons/fa';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getStore, getBudgetsByCustomer, deleteBudget, getBudgetsByStore, getDebtsByStore, getSales, updateSaleDelivery } from '../services/dbService'; 
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

    // Delivery Management State
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [customerDeliveries, setCustomerDeliveries] = useState([]);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);
    const [reschedulingSaleId, setReschedulingSaleId] = useState(null);
    const [newDeliveryDate, setNewDeliveryDate] = useState('');

    // Indicators State
    const [debtorIds, setDebtorIds] = useState(new Set());
    const [budgetCustomerIds, setBudgetCustomerIds] = useState(new Set());
    const [pendingDeliveriesMap, setPendingDeliveriesMap] = useState({});
    const [completedDeliveryCustomerIds, setCompletedDeliveryCustomerIds] = useState(new Set());
    const [activeFilter, setActiveFilter] = useState('all'); // all, debtors, budgets, pending_deliveries, completed_deliveries

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
            const [allBudgets, allDebts, allSales] = await Promise.all([
                getBudgetsByStore(storeId),
                getDebtsByStore(storeId),
                getSales(storeId)
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

            const deliveriesMap = {};
            allSales.filter(s => s.deliveryStatus === 'PENDING').forEach(s => {
                const cId = String(s.customerId || s.customer?.id);
                if (s.deliveryDate && (!deliveriesMap[cId] || s.deliveryDate < deliveriesMap[cId])) {
                    deliveriesMap[cId] = s.deliveryDate;
                }
            });

            const completedDeliveries = new Set(
                allSales
                    .filter(s => s.deliveryStatus === 'COMPLETED')
                    .map(s => String(s.customerId || s.customer?.id))
            );

            setBudgetCustomerIds(budgetsWithPending);
            setDebtorIds(pendingDebts);
            setPendingDeliveriesMap(deliveriesMap);
            setCompletedDeliveryCustomerIds(completedDeliveries);
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
        if (activeFilter === 'pending_deliveries') return !!pendingDeliveriesMap[cId];
        if (activeFilter === 'completed_deliveries') return completedDeliveryCustomerIds.has(cId);

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

    const handleOpenDeliveries = async (customer) => {
        setSelectedCustomerForBudget(customer);
        setShowDeliveryModal(true);
        setLoadingDeliveries(true);
        try {
            const { getCompletedSalesByCustomer } = await import('../services/dbService');
            const sales = await getCompletedSalesByCustomer(currentStore.id, customer.id);
            // Filter only sales that have deliveryDate (either pending or completed)
            setCustomerDeliveries(sales.filter(s => s.deliveryDate));
        } catch (error) {
            console.error("Error loading deliveries:", error);
        } finally {
            setLoadingDeliveries(false);
        }
    };

    const handleUpdateDeliveryStatus = async (saleId, status) => {
        try {
            await updateSaleDelivery(saleId, { deliveryStatus: status });
            // Update local state
            setCustomerDeliveries(prev => prev.map(d => d.id === saleId ? { ...d, deliveryStatus: status } : d));
            loadIndicators(currentStore.id);
        } catch (error) {
            alert("Erro ao atualizar entrega: " + error.message);
        }
    };

    const handleRescheduleDelivery = async (saleId) => {
        if (!newDeliveryDate) return;
        try {
            await updateSaleDelivery(saleId, { deliveryDate: newDeliveryDate });
            setCustomerDeliveries(prev => prev.map(d => d.id === saleId ? { ...d, deliveryDate: newDeliveryDate } : d));
            setReschedulingSaleId(null);
            setNewDeliveryDate('');
        } catch (error) {
            alert("Erro ao reagendar: " + error.message);
        }
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

        printBudget(shopInfo, selectedCustomerForBudget, budget.items, budget.total, budget.date, printerSettings, budget.observation, budget.discount, budget.subtotal);
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h1 className="text-xl md:text-[1.8rem] font-bold" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        <FaUser className="mr-2" style={{ color: 'var(--primary)' }} /> Gestão de Clientes
                    </h1>
                    <button className="btn btn-primary w-full md:w-auto" onClick={() => setShowForm(true)}>
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
                    
                    <div className="flex flex-wrap bg-[#111] border border-gray-800 rounded-xl p-1 shrink-0 w-full md:w-auto">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeFilter === 'all' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            TODOS
                        </button>
                        <button
                            onClick={() => setActiveFilter('debtors')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all flex items-center justify-center gap-1 md:gap-2 ${activeFilter === 'debtors' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FaMoneyBillWave className="shrink-0" /> <span className="hidden sm:inline">DEVEDORES</span><span className="sm:hidden">DEV.</span>
                        </button>
                        <button
                            onClick={() => setActiveFilter('budgets')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all flex items-center justify-center gap-1 md:gap-2 ${activeFilter === 'budgets' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FaFileAlt className="shrink-0" /> <span className="hidden sm:inline">ORÇAMENTOS</span><span className="sm:hidden">ORC.</span>
                        </button>
                        <button
                            onClick={() => setActiveFilter('pending_deliveries')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all flex items-center justify-center gap-1 md:gap-2 ${activeFilter === 'pending_deliveries' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FaTruck className="shrink-0" /> <span className="hidden sm:inline">ENTREGAS PEND.</span><span className="sm:hidden">ENT. P.</span>
                        </button>
                        <button
                            onClick={() => setActiveFilter('completed_deliveries')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all flex items-center justify-center gap-1 md:gap-2 ${activeFilter === 'completed_deliveries' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FaCheck className="shrink-0" /> <span className="hidden sm:inline">ENTREGAS REALIZ.</span><span className="sm:hidden">ENT. R.</span>
                        </button>
                    </div>
                </div>

                <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-left">
                        <thead className="bg-[#111] text-gray-500 text-[10px] md:text-xs uppercase font-black border-b border-gray-800/50">
                             <tr>
                                <th className="p-4 lg:p-6">Nome / Identificadores</th>
                                <th className="p-4 lg:p-6">Documento</th>
                                <th className="p-4 lg:p-6">Contato Principal</th>
                                <th className="p-4 lg:p-6">Email</th>
                                <th className="p-4 lg:p-6 text-right">Ações de Gestão</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/30">
                            {filteredCustomers.map(customer => (
                                 <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors border-b border-gray-800/10">
                                    <td className="p-4 lg:p-6">
                                        <div className="flex flex-col gap-2">
                                            <span className="font-black text-white text-base lg:text-lg leading-none">{customer.name}</span>
                                            <div className="flex flex-wrap gap-2">
                                                {budgetCustomerIds.has(String(customer.id)) && (
                                                    <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-tighter">
                                                        Orçamento Aberto
                                                    </span>
                                                )}
                                                {debtorIds.has(String(customer.id)) && (
                                                    <span className="bg-red-500/10 text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-tighter">
                                                        Débito Pendente
                                                    </span>
                                                )}
                                                {pendingDeliveriesMap[String(customer.id)] && (
                                                    <span className="bg-orange-500/10 text-orange-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-orange-500/20 uppercase tracking-tighter flex items-center gap-1">
                                                        <FaTruck size={8} /> Entrega: {pendingDeliveriesMap[String(customer.id)].split('-').reverse().join('/')}
                                                    </span>
                                                )}
                                                {completedDeliveryCustomerIds.has(String(customer.id)) && (
                                                    <span className="bg-green-500/10 text-green-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-green-500/20 uppercase tracking-tighter">
                                                        Entrega Realizada
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 lg:p-6 font-mono text-sm text-gray-400">{customer.cpf || '-'}</td>
                                    <td className="p-4 lg:p-6 text-sm font-bold text-gray-300">{customer.phone || '-'}</td>
                                    <td className="p-4 lg:p-6 text-sm text-gray-500 italic truncate max-w-[150px]">{customer.email || '-'}</td>
                                    <td className="p-4 lg:p-6">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-black transition-all border border-blue-500/20 shadow-lg shadow-blue-500/5 group" onClick={() => handleOpenBudgets(customer)} title="Ver Orçamentos">
                                                <FaFileAlt className="group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button className="p-3 bg-orange-500/10 text-orange-400 rounded-xl hover:bg-orange-500 hover:text-black transition-all border border-orange-500/20 shadow-lg shadow-orange-500/5 group" onClick={() => handleOpenDeliveries(customer)} title="Gerenciar Entregas">
                                                <FaTruck className="group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button className="p-3 bg-gray-600/10 text-gray-400 rounded-xl hover:bg-gray-600 hover:text-white transition-all border border-gray-600/20 shadow-lg shadow-gray-500/5 group" onClick={() => handleOpenHistory(customer)} title="Histórico">
                                                <FaFolderOpen className="group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button className="p-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-white hover:text-black transition-all border border-gray-700 shadow-lg group" onClick={() => handleEdit(customer)} title="Editar">
                                                <FaEdit className="group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-black transition-all border border-red-500/20 shadow-lg shadow-red-500/5 group" onClick={() => handleDelete(customer.id)} title="Excluir">
                                                <FaTrash className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-gray-800/30">
                        {filteredCustomers.map(customer => (
                            <div key={customer.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="font-black text-white text-base truncate leading-tight">{customer.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {budgetCustomerIds.has(String(customer.id)) && (
                                                <span className="bg-blue-500/10 text-blue-400 text-[8px] font-black px-2 py-0.5 rounded border border-blue-500/20 uppercase">Orçamento</span>
                                            )}
                                            {debtorIds.has(String(customer.id)) && (
                                                <span className="bg-red-500/10 text-red-400 text-[8px] font-black px-2 py-0.5 rounded border border-red-500/20 uppercase">Devedor</span>
                                            )}
                                            {pendingDeliveriesMap[String(customer.id)] && (
                                                <span className="bg-orange-500/10 text-orange-400 text-[8px] font-black px-2 py-0.5 rounded border border-orange-500/20 uppercase">
                                                    {pendingDeliveriesMap[String(customer.id)].split('-').reverse().join('/')}
                                                </span>
                                            )}
                                            {completedDeliveryCustomerIds.has(String(customer.id)) && (
                                                <span className="bg-green-500/10 text-green-400 text-[8px] font-black px-2 py-0.5 rounded border border-green-500/20 uppercase">Entregue</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-400 active:scale-95 transition-all" onClick={() => handleEdit(customer)}>
                                            <FaEdit size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-[#050505] p-3 rounded-2xl border border-gray-800/50">
                                        <p className="text-[9px] text-gray-600 uppercase font-black mb-1">Telefone</p>
                                        <p className="text-xs font-bold text-gray-300 truncate">{customer.phone || 'Sem contato'}</p>
                                    </div>
                                    <div className="bg-[#050505] p-3 rounded-2xl border border-gray-800/50">
                                        <p className="text-[9px] text-gray-600 uppercase font-black mb-1">Documento</p>
                                        <p className="text-xs font-mono text-gray-400 truncate">{customer.cpf || 'Não inf.'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button className="py-3 bg-blue-600/10 border border-blue-600/30 text-blue-400 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95" onClick={() => handleOpenBudgets(customer)}>
                                        <FaFileAlt /> Orçamentos
                                    </button>
                                    <button className="py-3 bg-orange-600/10 border border-orange-600/30 text-orange-400 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95" onClick={() => handleOpenDeliveries(customer)}>
                                        <FaTruck /> Entregas
                                    </button>
                                    <button className="py-3 bg-gray-600/10 border border-gray-600/30 text-gray-400 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95" onClick={() => handleOpenHistory(customer)}>
                                        <FaFolderOpen /> Histórico
                                    </button>
                                    <button className="py-3 bg-red-900/10 border border-red-900/30 text-red-500 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95" onClick={() => handleDelete(customer.id)}>
                                        <FaTrash /> Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredCustomers.length === 0 && (
                        <div className="p-24 text-center text-gray-700">
                            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800 shadow-xl">
                                <FaUser size={40} className="text-gray-800" />
                            </div>
                            <p className="font-black uppercase text-xs tracking-[0.3em] opacity-40">Nenhum cliente localizado</p>
                        </div>
                    )}
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
                                                        <div className="flex flex-col mt-1">
                                                            {(budget.discount > 0 || (budget.subtotal && budget.subtotal > budget.total)) && (
                                                                <>
                                                                    <p className="text-[10px] text-gray-500 line-through">Subtotal: {formatCurrency(budget.subtotal || budget.total + (budget.discount || 0))}</p>
                                                                    <p className="text-[10px] text-red-500 font-bold">Desconto: -{formatCurrency(budget.discount || (budget.subtotal - budget.total))}</p>
                                                                </>
                                                            )}
                                                            <p className="text-blue-400 font-black text-lg">{formatCurrency(budget.total)}</p>
                                                        </div>
                                                        <p className="text-xs text-gray-500 uppercase">{budget.items?.length || 0} ITENS</p>
                                                        {budget.observation && (
                                                            <p className="text-[11px] text-orange-300 mt-2 italic bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                                                                <strong>Obs:</strong> {budget.observation}
                                                            </p>
                                                        )}
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
                                                        <div className="flex flex-col items-end">
                                                            {item.discount > 0 && (
                                                                <span className="text-[10px] text-red-500 font-bold">-{formatCurrency(item.discount)} DESC.</span>
                                                            )}
                                                            <p className={`text-xl font-black ${item.type === 'BUDGET' ? (item.status === 'COMPLETED' ? 'text-gray-400' : 'text-blue-400') : 'text-green-500'}`}>{formatCurrency(item.total)}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {item.observation && (
                                                    <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/5 text-[11px] text-gray-400 italic">
                                                        <strong className="text-orange-400 mr-2 uppercase not-italic">Obs:</strong> {item.observation}
                                                    </div>
                                                )}

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
                {/* DELIVERY MANAGEMENT MODAL */}
                {showDeliveryModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                        <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <FaTruck className="text-orange-500" />
                                    Gerenciar Entregas: {selectedCustomerForBudget?.name}
                                </h3>
                                <button onClick={() => setShowDeliveryModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar">
                                {loadingDeliveries ? (
                                    <div className="text-center p-12 text-gray-500">Carregando entregas...</div>
                                ) : customerDeliveries.length > 0 ? (
                                    <div className="space-y-4">
                                        {customerDeliveries.map(sale => (
                                            <div key={sale.id} className={`border rounded-2xl p-5 transition-all ${sale.deliveryStatus === 'PENDING' ? 'bg-orange-500/5 border-orange-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex flex-col gap-1 mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <FaCalendarAlt className="text-gray-500" size={12} />
                                                                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Venda realizada em: {new Date(sale.date).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <FaTruck className="text-caramelo-primary" size={14} />
                                                                <span className="text-white font-black text-sm">ENTREGA AGENDADA: {sale.deliveryDate ? sale.deliveryDate.split('-').reverse().join('/') : 'Não informada'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Address Display */}
                                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-4 shadow-inner">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FaMapMarkerAlt className="text-orange-500" size={14} />
                                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Endereço de Entrega</span>
                                                            </div>
                                                            <p className="text-sm text-gray-200 leading-relaxed font-medium">
                                                                <span className="text-white font-bold">{selectedCustomerForBudget?.logradouro || 'Rua não informada'}</span>, {selectedCustomerForBudget?.numero || 'S/N'}
                                                                {selectedCustomerForBudget?.complemento && <span className="text-gray-400 ml-1">({selectedCustomerForBudget.complemento})</span>}
                                                                <br />
                                                                <span className="text-gray-400">{selectedCustomerForBudget?.bairro || 'Bairro não informado'}</span>
                                                                <br />
                                                                {selectedCustomerForBudget?.cidade || 'Cidade não informada'} - {selectedCustomerForBudget?.uf || 'UF'}
                                                                {selectedCustomerForBudget?.cep && <span className="text-blue-400/60 ml-2 font-mono text-[10px]">CEP: {selectedCustomerForBudget.cep}</span>}
                                                            </p>
                                                        </div>

                                                        <div className="space-y-2 mb-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1 flex justify-between">
                                                                <span>Itens do Pedido</span>
                                                                <span className="text-caramelo-primary">{sale.items?.length || 0} PRODUTOS</span>
                                                            </div>
                                                            {sale.items?.map((it, idx) => (
                                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-[11px] text-gray-400 border border-white/5">{it.quantity}x</span>
                                                                        <span className="text-gray-200 font-bold">{it.name.toUpperCase()}</span>
                                                                    </div>
                                                                    <span className="text-gray-500 font-mono font-bold">{formatCurrency(it.price * it.quantity)}</span>
                                                                </div>
                                                            ))}
                                                            <div className="mt-3 pt-2 border-t border-dashed border-white/10 flex justify-between items-center">
                                                                <span className="text-[10px] font-black text-gray-500 uppercase">Total da Venda</span>
                                                                <span className="text-lg font-black text-white">{formatCurrency(sale.total)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 justify-center md:w-48">
                                                        {sale.deliveryStatus === 'PENDING' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateDeliveryStatus(sale.id, 'COMPLETED')}
                                                                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
                                                                >
                                                                    <FaCheck /> DAR BAIXA
                                                                </button>
                                                                <button
                                                                    onClick={() => { setReschedulingSaleId(sale.id); setNewDeliveryDate(sale.deliveryDate); }}
                                                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-white/5"
                                                                >
                                                                    <FaEdit /> REAGENDAR
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUpdateDeliveryStatus(sale.id, 'PENDING')}
                                                                className="w-full py-3 bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-orange-500/20"
                                                            >
                                                                <FaTimes /> VOLTAR P/ PENDENTE
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {reschedulingSaleId === sale.id && (
                                                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3 animate-fadeIn">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nova Data de Entrega</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="date"
                                                                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                                                                value={newDeliveryDate}
                                                                onChange={(e) => setNewDeliveryDate(e.target.value)}
                                                            />
                                                            <button
                                                                onClick={() => handleRescheduleDelivery(sale.id)}
                                                                className="px-4 py-2 bg-caramelo-primary text-white font-bold rounded-xl text-xs"
                                                            >
                                                                SALVAR
                                                            </button>
                                                            <button
                                                                onClick={() => setReschedulingSaleId(null)}
                                                                className="px-4 py-2 bg-gray-800 text-gray-400 font-bold rounded-xl text-xs"
                                                            >
                                                                CANCELAR
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-12 text-gray-600 flex flex-col items-center gap-4">
                                        <FaTruck size={48} className="opacity-20" />
                                        Nenhuma entrega agendada para este cliente.
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-800 bg-black/40 flex justify-end">
                                <button onClick={() => setShowDeliveryModal(false)} className="btn btn-secondary">Fechar</button>
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
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-6">
                        <div className="mb-2 md:mb-4">
                            <label className="input-label-premium">Nome Completo *</label>
                            <input
                                className="input-premium py-3 md:py-4"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ex: João Silva"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2 md:mb-4">
                            <div>
                                <label className="input-label-premium flex items-center gap-2"><FaIdCard size={12} /> CPF / CNPJ</label>
                                <input
                                    className="input-premium py-3"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium flex items-center gap-2"><FaPhone size={12} /> Telefone / WhatsApp</label>
                                <input
                                    className="input-premium py-3"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div className="mb-2 md:mb-4">
                            <label className="input-label-premium flex items-center gap-2"><FaEnvelope size={12} /> Email</label>
                            <input
                                type="email"
                                className="input-premium py-3"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="cliente@email.com"
                            />
                        </div>

                        <div className="mb-2 md:mb-4">
                            <label className="input-label-premium flex items-center gap-2"><FaMapMarkerAlt size={12} /> CEP (Para NF-e 55)</label>
                            <input
                                className="input-premium py-3"
                                value={formData.cep}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setFormData({ ...formData, cep: val });
                                    if (val.length === 8) handleFetchAddress(val);
                                }}
                                placeholder="00000-000"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 md:mb-4">
                            <div className="md:col-span-2">
                                <label className="input-label-premium">Logradouro / Rua</label>
                                <input
                                    className="input-premium py-3"
                                    value={formData.logradouro}
                                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                                    placeholder="Av. Principal"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium">Número</label>
                                <input
                                    className="input-premium py-3"
                                    value={formData.numero}
                                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                    placeholder="123"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2 md:mb-4">
                            <div>
                                <label className="input-label-premium">Bairro</label>
                                <input
                                    className="input-premium py-3"
                                    value={formData.bairro}
                                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                                    placeholder="Centro"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium">Complemento</label>
                                <input
                                    className="input-premium py-3"
                                    value={formData.complemento}
                                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                                    placeholder="Sala 01"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 md:mb-4">
                            <div className="md:col-span-2">
                                <label className="input-label-premium">Cidade</label>
                                <input
                                    className="input-premium py-3"
                                    value={formData.cidade}
                                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                    placeholder="São Paulo"
                                />
                            </div>
                            <div>
                                <label className="input-label-premium">UF (Estado)</label>
                                <input
                                    className="input-premium py-3"
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
                            <button type="submit" className="flex-[2] py-4 rounded-2xl btn-primary font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2">
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
