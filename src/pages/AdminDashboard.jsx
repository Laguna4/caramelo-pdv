import { useState, useEffect, useMemo } from 'react';
import { 
    getAllStores, updateStoreSubscription, createStore, updateStore, deleteStore, 
    registerPayment, getSiteSettings, updateSiteSettings,
    getPartners, addPartner, updatePartner, deletePartner,
    getPartnerCommissions, updateCommissionStatus
} from '../services/dbService';
import { provisionUser } from '../services/authService';
import { getCurrentUser } from '../utils/storage'; 
import { FaStore, FaCheck, FaTimes, FaBan, FaCrown, FaEdit, FaPlus, FaTimes as FaClose, FaSearch, FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaMoneyBillWave, FaTrash, FaCog, FaHandshake, FaWallet } from 'react-icons/fa';
import { PLANS, SUBSCRIPTION_STATUS, SUPER_ADMIN_EMAIL } from '../config'; 

const AdminDashboard = () => {
    const APP_VERSION = "v1.3 - Partners"; 
    
    // Main Tabs: 'STORES' | 'PARTNERS'
    const [activeTab, setActiveTab] = useState('STORES');

    // --- STORES STATE ---
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortType, setSortType] = useState('due'); 

    // --- PARTNERS STATE ---
    const [partners, setPartners] = useState([]);
    const [commissions, setCommissions] = useState([]);
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [editingPartner, setEditingPartner] = useState(null);
    const [partnerForm, setPartnerForm] = useState({ name: '', phone: '', pix: '', commissionRate: '' });

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);

    // Form States (Create/Edit Store)
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreEmail, setNewStoreEmail] = useState('');
    const [newOwnerName, setNewOwnerName] = useState('');
    const [newPhone, setNewPhone] = useState(''); 
    const [newPlan, setNewPlan] = useState('BASIC');
    const [newPassword, setNewPassword] = useState('123456'); 
    const [selectedPartnerId, setSelectedPartnerId] = useState(''); // NEW Field

    // Plan & Pricing 
    const [initialMonths, setInitialMonths] = useState(1);
    const [customPrice, setCustomPrice] = useState(0);

    // Payment Form States
    const [paymentMonths, setPaymentMonths] = useState(1);
    const [paymentValue, setPaymentValue] = useState(0);

    // Site Settings Form States
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [siteVideoUrl, setSiteVideoUrl] = useState('');
    const [kiwifiBasic, setKiwifiBasic] = useState('');
    const [kiwifiPro, setKiwifiPro] = useState('');
    const [kiwifiPremium, setKiwifiPremium] = useState('');
    const [kiwifiBasicAnnual, setKiwifiBasicAnnual] = useState('');
    const [kiwifiProAnnual, setKiwifiProAnnual] = useState('');
    const [kiwifiPremiumAnnual, setKiwifiPremiumAnnual] = useState('');
    const [pixelHtml, setPixelHtml] = useState('');

    const currentUser = getCurrentUser();
    const isSuperAdmin = currentUser && currentUser.email === SUPER_ADMIN_EMAIL;

    useEffect(() => {
        if (isSuperAdmin) {
            loadStores();
            loadPartnersData();
        }
    }, [isSuperAdmin]);

    const loadStores = async () => {
        setLoading(true);
        const data = await getAllStores();
        setStores(data);
        setLoading(false);
    };

    const loadPartnersData = async () => {
        const [pData, cData] = await Promise.all([getPartners(), getPartnerCommissions()]);
        setPartners(pData);
        setCommissions(cData);
    };

    const stats = useMemo(() => {
        const total = stores.length;
        const active = stores.filter(s => s.subscriptionStatus === 'active').length;
        const expired = stores.filter(s => s.subscriptionStatus === 'blocked').length;
        const revenue = stores.reduce((acc, curr) => {
            if (curr.email === SUPER_ADMIN_EMAIL) return acc; 
            const plan = Object.values(PLANS).find(p => p.id === curr.plan.toLowerCase()) || PLANS.BASIC;
            return acc + (curr.subscriptionStatus === 'active' ? plan.price : 0);
        }, 0);
        return { total, active, expired, revenue };
    }, [stores]);

    const partnerStats = useMemo(() => {
        const totalPartners = partners.length;
        const pendingCommissions = commissions.filter(c => c.status === 'PENDING').reduce((acc, c) => acc + c.commissionValue, 0);
        const paidCommissions = commissions.filter(c => c.status === 'PAID').reduce((acc, c) => acc + c.commissionValue, 0);
        return { totalPartners, pendingCommissions, paidCommissions };
    }, [partners, commissions]);

    const filteredStores = useMemo(() => {
        const filtered = stores.filter(store =>
            store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            store.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            store.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return [...filtered].sort((a, b) => {
            if (sortType === 'due') {
                const dateA = new Date(a.nextPaymentDue || 0);
                const dateB = new Date(b.nextPaymentDue || 0);
                return dateA - dateB; 
            } else {
                return a.name.localeCompare(b.name);
            }
        });
    }, [stores, searchTerm, sortType]);

    // --- STORE FUNCTIONS ---

    const handleToggleStatus = async (store) => {
        const newStatus = store.subscriptionStatus === 'active' ? 'blocked' : 'active';
        if (confirm(`Deseja alterar o status de ${store.name} para ${newStatus.toUpperCase()}?`)) {
            await updateStoreSubscription(store.id, { subscriptionStatus: newStatus });
            loadStores();
        }
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingId(null);
        setNewStoreName('');
        setNewStoreEmail('');
        setNewOwnerName('');
        setNewPhone('');
        setNewPlan('BASIC');
        setSelectedPartnerId('');
        setInitialMonths(1); 
        setCustomPrice(PLANS.BASIC.price); 
        setShowModal(true);
    };

    const openEditModal = (store) => {
        setIsEditing(true);
        setEditingId(store.id);
        setNewStoreName(store.name);
        setNewStoreEmail(store.email);
        setNewOwnerName(store.ownerName);
        setNewPhone(store.phone || '');
        setNewPlan(store.plan);
        setNewPassword(store.password || '');
        setSelectedPartnerId(store.partnerId || '');
        setShowModal(true);
    };

    useEffect(() => {
        if (!isEditing && showModal) {
            const planPrice = PLANS[newPlan]?.price || 0;
            setCustomPrice(planPrice * initialMonths);
        }
    }, [newPlan, initialMonths, isEditing, showModal]);

    const handleSaveStore = async (e) => {
        e.preventDefault();
        try {
            if (!newStoreEmail || !newStoreName || !newOwnerName) {
                alert("Preencha todos os campos obrigatórios");
                return;
            }

            if (isEditing) {
                await updateStore(editingId, {
                    name: newStoreName,
                    ownerName: newOwnerName,
                    email: newStoreEmail,
                    phone: newPhone,
                    plan: newPlan,
                    password: newPassword,
                    partnerId: selectedPartnerId || null
                });
                alert("Loja atualizada com sucesso!");
            } else {
                const passwordToUse = newPassword || '123456';
                const authResult = await provisionUser(newStoreEmail, passwordToUse);

                if (!authResult.success) {
                    alert("Erro ao criar usuário: " + authResult.error);
                    return;
                }

                const uid = authResult.user.uid;
                const nextDue = new Date();
                nextDue.setMonth(nextDue.getMonth() + Number(initialMonths)); 

                const newStore = {
                    id: uid,
                    name: newStoreName,
                    ownerName: newOwnerName,
                    email: newStoreEmail,
                    phone: newPhone,
                    plan: newPlan,
                    partnerId: selectedPartnerId || null,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    subscriptionStatus: 'active',
                    nextPaymentDue: nextDue.toISOString(),
                    password: passwordToUse, 
                    contractMonths: Number(initialMonths), 
                    contractValue: Number(customPrice), 
                    createdAt: new Date().toISOString()
                };

                await createStore(newStore);
                alert(`Loja criada com sucesso!\n\nEmail: ${newStoreEmail}\nSenha: ${passwordToUse}\nValidade: ${initialMonths} meses`);
            }

            setShowModal(false);
            loadStores();

        } catch (error) {
            console.error(error);
            alert("Erro desconhecido ao salvar loja.");
        }
    };

    const openPaymentModal = (store) => {
        setSelectedStore(store);
        setPaymentMonths(1);
        const planPrice = PLANS[store.plan.toUpperCase()]?.price || 0;
        setPaymentValue(planPrice);
        setShowPaymentModal(true);
    };

    useEffect(() => {
        if (showPaymentModal && selectedStore) {
            const planPrice = PLANS[selectedStore.plan.toUpperCase()]?.price || 0;
            setPaymentValue(planPrice * paymentMonths);
        }
    }, [paymentMonths, showPaymentModal, selectedStore]);

    const handleRegisterPayment = async () => {
        if (!selectedStore) return;
        const result = await registerPayment(selectedStore.id, Number(paymentMonths), Number(paymentValue));
        if (result.success) {
            alert(`Pagamento registrado! Assinatura estendida por ${paymentMonths} meses.\n\nSe houver Revendedor atrelado, a comissão já foi calculada!`);
            setShowPaymentModal(false);
            loadStores();
            loadPartnersData(); // Reload commissions
        } else {
            alert("Erro ao registrar pagamento: " + result.error);
        }
    };

    const openSettingsModal = async () => {
        const settings = await getSiteSettings();
        if (settings) {
            setSiteVideoUrl(settings.landingVideoUrl || '');
            setKiwifiBasic(settings.kiwifiBasic || '');
            setKiwifiPro(settings.kiwifiPro || '');
            setKiwifiPremium(settings.kiwifiPremium || '');
            setKiwifiBasicAnnual(settings.kiwifiBasicAnnual || '');
            setKiwifiProAnnual(settings.kiwifiProAnnual || '');
            setKiwifiPremiumAnnual(settings.kiwifiPremiumAnnual || '');
            setPixelHtml(settings.pixelHtml || '');
        }
        setShowSettingsModal(true);
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            let videoId = siteVideoUrl;
            if (siteVideoUrl.includes('youtu.be/')) videoId = siteVideoUrl.split('youtu.be/')[1].split('?')[0];
            else if (siteVideoUrl.includes('youtube.com/watch?v=')) videoId = siteVideoUrl.split('v=')[1].split('&')[0];
            else if (siteVideoUrl.includes('youtube.com/embed/')) videoId = siteVideoUrl.split('embed/')[1].split('?')[0];

            await updateSiteSettings({ 
                landingVideoUrl: siteVideoUrl, 
                landingVideoId: videoId,
                kiwifiBasic,
                kiwifiPro,
                kiwifiPremium,
                kiwifiBasicAnnual,
                kiwifiProAnnual,
                kiwifiPremiumAnnual,
                pixelHtml
            });
            alert("Configurações atualizadas!");
            setShowSettingsModal(false);
        } catch (error) {
            console.error("Erro ao salvar settings:", error);
        }
    };

    const handleDeleteStore = async (storeId) => {
        if (confirm("ATENÇÃO: Tem certeza que deseja excluir esta loja?\nConfirmar exclusão definitiva?")) {
            const result = await deleteStore(storeId);
            if (result.success) {
                alert("Loja excluída com sucesso.");
                loadStores();
            }
        }
    };

    const getDaysRemaining = (dateString) => {
        if (!dateString) return 0;
        const due = new Date(dateString);
        const now = new Date();
        return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    };

    const formatDate = (dateString, withTime = false) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            ...(withTime && { hour: '2-digit', minute: '2-digit' })
        });
    };

    // --- PARTNER FUNCTIONS ---

    const openPartnerModal = (partner = null) => {
        if (partner) {
            setEditingPartner(partner);
            setPartnerForm({ name: partner.name, phone: partner.phone, pix: partner.pix, commissionRate: partner.commissionRate });
        } else {
            setEditingPartner(null);
            setPartnerForm({ name: '', phone: '', pix: '', commissionRate: '30' });
        }
        setShowPartnerModal(true);
    };

    const handleSavePartner = async (e) => {
        e.preventDefault();
        if (editingPartner) {
            await updatePartner(editingPartner.id, partnerForm);
        } else {
            await addPartner(partnerForm);
        }
        setShowPartnerModal(false);
        loadPartnersData();
    };

    const handlePayCommission = async (commId) => {
        if (confirm("Marcar esta comissão como PAGA? O saldo será zerado.")) {
            await updateCommissionStatus(commId, 'PAID');
            loadPartnersData();
        }
    };

    const handleCancelCommission = async (commId) => {
        if (confirm("Atenção: Deseja cancelar (anular) esta comissão?")) {
            await updateCommissionStatus(commId, 'CANCELLED');
            loadPartnersData();
        }
    };

    const handleDeletePartner = async (partId) => {
        if (confirm("Excluir este parceiro revendedor? (Lojas atreladas a ele perderão o vínculo de comissão nas próximas renovações).")) {
            await deletePartner(partId);
            loadPartnersData();
        }
    };

    if (!isSuperAdmin) return <div className="p-8 text-center text-white">Acesso Negado</div>;

    return (
        <div className="p-6 bg-[#0f172a] min-h-screen text-gray-100 font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Painel Master Admin</h1>
                    <p className="text-gray-400 text-sm">Controle de Assinaturas e Revendedores <span className="ml-2 px-2 py-0.5 rounded bg-gray-800 text-xs text-gray-500">{APP_VERSION}</span></p>
                </div>
                <div>
                    <button onClick={openSettingsModal} className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-lg text-sm">
                        <FaCog /> Landing Page
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 bg-black/30 p-2 rounded-xl border border-gray-800 mb-8 max-w-lg">
                <button 
                    className={`flex-1 py-3 px-4 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'STORES' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('STORES')}
                >
                    <FaStore /> MINHAS LOJAS
                </button>
                <button 
                    className={`flex-1 py-3 px-4 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'PARTNERS' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    onClick={() => setActiveTab('PARTNERS')}
                >
                    <FaHandshake /> REVENDEDORES
                </button>
            </div>

            {/* ==================== STORES VIEW ==================== */}
            {activeTab === 'STORES' && (
                <div className="animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <StatCard icon={<FaStore />} title="Lojas Totais" value={stats.total} color="bg-blue-900/40 text-blue-400" />
                        <StatCard icon={<FaCheck />} title="Ativas" value={stats.active} color="bg-green-900/40 text-green-400" />
                        <StatCard icon={<FaTimes />} title="Vencidas" value={stats.expired} color="bg-red-900/40 text-red-400" />
                        <StatCard icon={<FaMoneyBillWave />} title="Recorrente Bruto" value={`R$ ${stats.revenue.toFixed(2)}`} color="bg-teal-900/40 text-teal-400" />
                    </div>

                    <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-gray-800 mb-6 flex flex-col md:flex-row items-center gap-4">
                        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all shadow-lg shrink-0 w-full md:w-auto">
                            <FaPlus /> Nova Loja (Assinante)
                        </button>
                        <div className="flex items-center gap-4 flex-1 w-full bg-black/20 p-3 rounded-lg border border-gray-800">
                            <FaSearch className="text-gray-500" />
                            <input type="text" placeholder="Buscar cliente ou loja..." className="bg-transparent border-none outline-none text-white w-full placeholder-gray-600" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredStores.map(store => {
                            const days = getDaysRemaining(store.nextPaymentDue);
                            const isExpired = days < 0;
                            const planColor = store.plan === 'PREMIUM' ? 'bg-orange-600' : store.plan === 'PRO' ? 'bg-purple-600' : 'bg-gray-600';
                            const partnerName = partners.find(p => p.id === store.partnerId)?.name;

                            return (
                                <div key={store.id} className="bg-[#1e293b] border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-gray-600 transition-all shadow-md relative overflow-hidden">
                                    {partnerName && <div className="absolute top-0 right-0 bg-orange-600 text-[10px] font-black uppercase text-white px-3 py-1 rounded-bl-lg">Revendedor: {partnerName}</div>}
                                    <div className="flex-1 w-full">
                                        <div className="flex items-center gap-4 mb-3">
                                            <h3 className="text-xl font-bold text-white">{store.name}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${store.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {store.subscriptionStatus === 'active' ? 'Ativa' : 'Bloqueada'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${planColor}`}>{store.plan}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm text-gray-400">
                                            <div className="flex items-center gap-2"><FaUser className="text-gray-600" /> {store.ownerName} <span className="text-yellow-500">(PIN: {store.adminPin||'1234'})</span></div>
                                            <div className="flex items-center gap-2"><FaEnvelope className="text-gray-600" /> {store.email}</div>
                                            <div className="flex items-center gap-2 text-xs"><FaCog className="text-gray-600" /> Senha SaaS: {store.password || '****'}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center md:items-end min-w-[150px]">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><FaCalendarAlt /> Vence em:</div>
                                        <div className={`text-lg font-bold ${isExpired || days < 3 ? 'text-red-500' : 'text-white'}`}>{days} dias</div>
                                        <div className="text-xs text-gray-600">{formatDate(store.nextPaymentDue)}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        {store.email !== SUPER_ADMIN_EMAIL && (
                                            <>
                                                <button className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors" onClick={() => handleToggleStatus(store)} title="Bloquear/Desbloquear">
                                                    {store.subscriptionStatus === 'active' ? <FaBan /> : <FaCheck />}
                                                </button>
                                                <button className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors" onClick={() => openEditModal(store)}>
                                                    <FaEdit />
                                                </button>
                                                <button className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2" onClick={() => openPaymentModal(store)}>
                                                    <FaMoneyBillWave /> Pagar
                                                </button>
                                            </>
                                        )}
                                        <button className="p-3 rounded-lg bg-red-900/50 hover:bg-red-700 text-red-200 transition-colors" onClick={() => handleDeleteStore(store.id)}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ==================== PARTNERS VIEW ==================== */}
            {activeTab === 'PARTNERS' && (
                <div className="animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StatCard icon={<FaHandshake />} title="Parceiros Ativos" value={partnerStats.totalPartners} color="bg-orange-900/40 text-orange-400" />
                        <StatCard icon={<FaWallet />} title="Comissões a Pagar" value={`R$ ${partnerStats.pendingCommissions.toFixed(2)}`} color="bg-red-900/40 text-red-500" />
                        <StatCard icon={<FaCheck />} title="Comissões Pagas (Total)" value={`R$ ${partnerStats.paidCommissions.toFixed(2)}`} color="bg-green-900/40 text-green-400" />
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Partners List */}
                        <div className="flex-[1] bg-[#1e293b] rounded-xl border border-gray-800 p-6 self-start">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Equipe de Vendas</h3>
                                <button onClick={() => openPartnerModal()} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-lg">
                                    <FaPlus /> Adicionar
                                </button>
                            </div>
                            <div className="space-y-3">
                                {partners.length === 0 && <p className="text-gray-500 text-center py-4">Nenhum parceiro cadastrado.</p>}
                                {partners.map(p => (
                                    <div key={p.id} className="bg-black/30 p-4 rounded-lg border border-gray-800 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-white">{p.name}</p>
                                            <p className="text-xs text-orange-400 font-black">{p.commissionRate}% de Comissão</p>
                                            {p.pix && <p className="text-xs text-gray-400 mt-1">PIX: {p.pix}</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 text-gray-400 hover:text-white" onClick={() => openPartnerModal(p)}><FaEdit /></button>
                                            <button className="p-2 text-gray-500 hover:text-red-500" onClick={() => handleDeletePartner(p.id)}><FaTrash /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Commissions Ledger */}
                        <div className="flex-[2] bg-[#1e293b] rounded-xl border border-gray-800 p-6 relative">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <FaWallet className="text-orange-500" /> Extrato Financeiro de Afiliados
                            </h3>
                            
                            <div className="overflow-x-auto text-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 border-b border-gray-700 text-xs text-gray-400 uppercase font-black">
                                        <tr>
                                            <th className="p-3">Data</th>
                                            <th className="p-3">Parceiro</th>
                                            <th className="p-3">Loja/Evento</th>
                                            <th className="p-3">Valor Total</th>
                                            <th className="p-3">Comissão (Líquida)</th>
                                            <th className="p-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {commissions.length === 0 && (
                                            <tr><td colSpan="6" className="text-center p-8 text-gray-500">Nenhum registro de comissão gerado.</td></tr>
                                        )}
                                        {commissions.map(c => (
                                            <tr key={c.id} className={`hover:bg-white/5 transition-colors ${c.status === 'CANCELLED' ? 'opacity-50 line-through' : ''}`}>
                                                <td className="p-3 text-gray-400">{formatDate(c.createdAt)}</td>
                                                <td className="p-3 font-bold text-white">{c.partnerName}</td>
                                                <td className="p-3 text-blue-300">{c.storeName} ({c.monthsPaid}m)</td>
                                                <td className="p-3 text-gray-500 font-mono">R$ {c.paymentValue?.toFixed(2)}</td>
                                                <td className={`p-3 font-black text-lg ${c.status === 'PAID' ? 'text-green-500' : 'text-orange-400'}`}>
                                                    R$ {c.commissionValue?.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {c.status === 'PENDING' && (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => handlePayCommission(c.id)} className="bg-green-600/20 text-green-500 border border-green-600/50 px-3 py-1 rounded text-xs font-bold hover:bg-green-600 hover:text-white transition-colors">
                                                                Fazer Pagamento
                                                            </button>
                                                            <button onClick={() => handleCancelCommission(c.id)} className="text-gray-500 hover:text-red-400 font-bold px-2">X</button>
                                                        </div>
                                                    )}
                                                    {c.status === 'PAID' && <span className="text-green-500 font-bold text-xs"><FaCheck className="inline mr-1"/>PAGO EM {formatDate(c.paidAt)}</span>}
                                                    {c.status === 'CANCELLED' && <span className="text-red-500 font-bold text-xs">CANCELADO</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}

            {/* Partner Form Modal */}
            {showPartnerModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowPartnerModal(false)}><FaClose size={20} /></button>
                        <h2 className="text-2xl font-bold text-white mb-6">{editingPartner ? 'Editar Revendedor' : 'Novo Revendedor'}</h2>
                        <form onSubmit={handleSavePartner} className="space-y-4">
                            <InputGroup label="Nome do Parceiro" value={partnerForm.name} onChange={v => setPartnerForm({...partnerForm, name: v})} placeholder="Ex: João Vendas" />
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Telefone / Contato" value={partnerForm.phone} onChange={v => setPartnerForm({...partnerForm, phone: v})} />
                                <InputGroup label="Taxa % de Comissão" type="number" value={partnerForm.commissionRate} onChange={v => setPartnerForm({...partnerForm, commissionRate: v})} placeholder="Ex: 30" />
                            </div>
                            <InputGroup label="Chave PIX (Para Pagamentos)" value={partnerForm.pix} onChange={v => setPartnerForm({...partnerForm, pix: v})} />
                            
                            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors">SALVAR PARCEIRO</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Store Modal with Partner Selection */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowModal(false)}><FaClose size={20} /></button>
                        <h2 className="text-2xl font-bold text-white mb-6">{isEditing ? 'Editar Loja' : 'Adicionar Nova Loja (Assinante)'}</h2>
                        <form onSubmit={handleSaveStore} className="space-y-4">
                            
                            {/* NEW: Affiliate Dropdown */}
                            <div className="bg-orange-900/10 p-4 border border-orange-500/30 rounded-lg mb-2">
                                <label className="block text-[10px] font-black tracking-widest text-orange-400 mb-2 uppercase">VINCULAR REVENDA (Comissão Automática)</label>
                                <select className="w-full bg-black/50 border border-gray-600 rounded-lg p-2.5 text-white outline-none" value={selectedPartnerId} onChange={e => setSelectedPartnerId(e.target.value)}>
                                    <option value="">Nenhum - Venda Direta Nossa</option>
                                    {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.commissionRate}%)</option>)}
                                </select>
                            </div>

                            <InputGroup label="Email de Login (SaaS)" value={newStoreEmail} onChange={setNewStoreEmail} type="email" placeholder="cliente@email.com" readOnly={isEditing} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Nome da Loja" value={newStoreName} onChange={setNewStoreName} />
                                <InputGroup label="Nome do Dono" value={newOwnerName} onChange={setNewOwnerName} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1 uppercase">Plano</label>
                                    <select className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white outline-none" value={newPlan} onChange={e => setNewPlan(e.target.value)}>
                                        <option value="BASIC">Básico</option>
                                        <option value="PRO">Profissional</option>
                                        <option value="PREMIUM">Premium</option>
                                    </select>
                                </div>
                                <InputGroup label="Telefone" value={newPhone} onChange={setNewPhone} />
                            </div>
                            
                            {!isEditing && (
                                <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <InputGroup label="Senha SaaS" value={newPassword} onChange={setNewPassword} />
                                    <div>
                                        <label className="block text-xs font-bold text-green-400 mb-1 uppercase">Valor Total (R$)</label>
                                        <input type="number" className="w-full bg-black/30 border border-green-600/50 rounded p-2 text-green-400 text-right font-bold" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Renovar p/ Meses</label>
                                        <input type="number" className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white text-center font-bold" value={initialMonths} onChange={e => setInitialMonths(Number(e.target.value))} />
                                    </div>
                                </div>
                            )}
                            {isEditing && <InputGroup label="Forçar Nova Senha (Opcional)" value={newPassword} onChange={setNewPassword} />}
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg mt-4 text-lg transition-colors">{isEditing ? 'SALVAR ALTERAÇÕES' : 'CRIAR ASSINATURA'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {
                showPaymentModal && selectedStore && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Registrar Pagamento</h2>
                            
                            {selectedStore.partnerId ? (
                                <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs p-2 rounded mb-4 text-left font-bold">
                                    <FaHandshake className="inline mr-2" /> Revendedor vinculado. Comissão de {(partners.find(p=>p.id===selectedStore.partnerId)?.commissionRate || 0)}% será agendada.
                                </div>
                            ) : (
                                <div className="bg-gray-800 text-gray-400 text-xs p-2 rounded mb-4 text-left">
                                    Venda Direta Oficial (Nenhum revendedor vai ganhar comissão).
                                </div>
                            )}

                            <div className="bg-black/20 p-4 rounded-xl mb-6 text-left space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Renovação Baseada Em (Meses)</label>
                                    <input type="number" className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white font-bold" value={paymentMonths} onChange={e => setPaymentMonths(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-green-500 mb-1 uppercase">Valor Recebido do Cliente (R$)</label>
                                    <input type="number" className="w-full bg-black/30 border border-green-600/50 rounded p-2 text-green-400 font-bold text-xl" value={paymentValue} onChange={e => setPaymentValue(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setShowPaymentModal(false)} className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold">Cancelar</button>
                                <button onClick={handleRegisterPayment} className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg">Confirmar e Renovar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Site Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowSettingsModal(false)}><FaClose size={20} /></button>
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><FaCog className="text-blue-500" /> Configurações do Site</h2>
                        <p className="text-gray-400 text-sm mb-6 text-center">Edite o vídeo da Landing Page e os links de checkout.</p>
                        
                        <form onSubmit={handleSaveSettings} className="space-y-6">
                            <div className="space-y-4">
                                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                    <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3">Vídeo da Landing Page</h3>
                                    <InputGroup label="URL do YouTube" value={siteVideoUrl} onChange={setSiteVideoUrl} placeholder="https://www.youtube.com/watch?v=..." />
                                </div>

                                <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/20 space-y-4">
                                    <h3 className="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1">Checkouts Kiwifi (Links de Pagamento)</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter border-b border-gray-800 pb-1">Mensal</p>
                                            <InputGroup label="START (M)" value={kiwifiBasic} onChange={setKiwifiBasic} placeholder="Link mensal..." />
                                            <InputGroup label="BUSINESS (M)" value={kiwifiPro} onChange={setKiwifiPro} placeholder="Link mensal..." />
                                            <InputGroup label="EXPERT (M)" value={kiwifiPremium} onChange={setKiwifiPremium} placeholder="Link mensal..." />
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-bold text-orange-500/50 uppercase tracking-tighter border-b border-gray-800 pb-1">Anual</p>
                                            <InputGroup label="START (A)" value={kiwifiBasicAnnual} onChange={setKiwifiBasicAnnual} placeholder="Link anual..." />
                                            <InputGroup label="BUSINESS (A)" value={kiwifiProAnnual} onChange={setKiwifiProAnnual} placeholder="Link anual..." />
                                            <InputGroup label="EXPERT (A)" value={kiwifiPremiumAnnual} onChange={setKiwifiPremiumAnnual} placeholder="Link anual..." />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20">
                                    <h3 className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-3">Trackings e Pixels (Global)</h3>
                                    <label className="block text-[10px] font-black tracking-widest text-gray-500 mb-1 uppercase">HTML do Pixel (Head / Body)</label>
                                    <textarea 
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 transition-colors text-xs font-mono" 
                                        rows="5"
                                        placeholder="Cole aqui o código original do Pixel (Script/Noscript)..."
                                        value={pixelHtml}
                                        onChange={e => setPixelHtml(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>
                            
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95">SALVAR CONFIGURAÇÕES</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, title, value, color }) => (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800 flex items-center gap-4 shadow-lg">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-xl`}>{icon}</div>
        <div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-gray-500 text-xs font-black uppercase tracking-widest">{title}</div>
        </div>
    </div>
);

const InputGroup = ({ label, value, onChange, type = "text", placeholder, readOnly = false }) => (
    <div>
        <label className="block text-[10px] font-black tracking-widest text-gray-500 mb-1 uppercase">{label}</label>
        <input className={`w-full bg-black/30 border border-gray-600 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} type={type} placeholder={placeholder} value={value} onChange={e => onChange && onChange(e.target.value)} readOnly={readOnly} required={!readOnly} />
    </div>
);

export default AdminDashboard;
