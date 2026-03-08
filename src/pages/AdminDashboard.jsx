import { useState, useEffect, useMemo } from 'react';
import { getAllStores, updateStoreSubscription, createStore, updateStore, deleteStore, registerPayment, getSiteSettings, updateSiteSettings } from '../services/dbService';
import { provisionUser } from '../services/authService';
import { getCurrentUser } from '../utils/storage'; // Added getCurrentUser
import { FaStore, FaCheck, FaTimes, FaBan, FaCrown, FaEdit, FaPlus, FaTimes as FaClose, FaSearch, FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaMoneyBillWave, FaTrash, FaCog } from 'react-icons/fa';
import { PLANS, SUBSCRIPTION_STATUS, SUPER_ADMIN_EMAIL } from '../config'; // Added SUPER_ADMIN_EMAIL

const AdminDashboard = () => {
    const APP_VERSION = "v1.2 - Fix Sellers"; // Update this to force visual change
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortType, setSortType] = useState('due'); // 'due' or 'name'

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);

    // Form States (Create/Edit)
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreEmail, setNewStoreEmail] = useState('');
    const [newOwnerName, setNewOwnerName] = useState('');
    const [newPhone, setNewPhone] = useState(''); // Added Phone
    const [newPlan, setNewPlan] = useState('BASIC');
    const [newPassword, setNewPassword] = useState('123456'); // Default but editable

    // Plan & Pricing (New)
    const [initialMonths, setInitialMonths] = useState(1);
    const [customPrice, setCustomPrice] = useState(0);

    // Payment Form States
    const [paymentMonths, setPaymentMonths] = useState(1);
    const [paymentValue, setPaymentValue] = useState(0);

    // Site Settings Form States
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [siteVideoUrl, setSiteVideoUrl] = useState('');

    const currentUser = getCurrentUser();
    const isSuperAdmin = currentUser && currentUser.email === SUPER_ADMIN_EMAIL;

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        setLoading(true);
        const data = await getAllStores();
        setStores(data);
        setLoading(false);
    };

    const stats = useMemo(() => {
        const total = stores.length;
        const active = stores.filter(s => s.subscriptionStatus === 'active').length;
        const expired = stores.filter(s => s.subscriptionStatus === 'blocked').length;
        const revenue = stores.reduce((acc, curr) => {
            if (curr.email === SUPER_ADMIN_EMAIL) return acc; // Don't count admin in revenue
            const plan = Object.values(PLANS).find(p => p.id === curr.plan.toLowerCase()) || PLANS.BASIC;
            return acc + (curr.subscriptionStatus === 'active' ? plan.price : 0);
        }, 0);
        return { total, active, expired, revenue };
    }, [stores]);

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
                return dateA - dateB; // Nearest first
            } else {
                return a.name.localeCompare(b.name);
            }
        });
    }, [stores, searchTerm, sortType]);

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
        setInitialMonths(1); // Default 1 month
        setCustomPrice(PLANS.BASIC.price); // Default price
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
        // Ensure price reflects current plan if editing (or just show plan default)
        setShowModal(true);
    };

    // Auto-update price when plan changes in Create Mode
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
                // EDIT MODE
                await updateStore(editingId, {
                    name: newStoreName,
                    ownerName: newOwnerName,
                    email: newStoreEmail,
                    phone: newPhone,
                    plan: newPlan,
                    password: newPassword
                });
                alert("Loja atualizada com sucesso!");
            } else {
                // CREATE MODE
                const passwordToUse = newPassword || '123456';
                const authResult = await provisionUser(newStoreEmail, passwordToUse);

                if (!authResult.success) {
                    alert("Erro ao criar usuário: " + authResult.error);
                    return;
                }

                const uid = authResult.user.uid;
                const nextDue = new Date();
                nextDue.setMonth(nextDue.getMonth() + Number(initialMonths)); // Add selected months

                const newStore = {
                    id: uid,
                    name: newStoreName,
                    ownerName: newOwnerName,
                    email: newStoreEmail,
                    phone: newPhone,
                    plan: newPlan,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    subscriptionStatus: 'active',
                    nextPaymentDue: nextDue.toISOString(),
                    password: passwordToUse, // Save password for Admin recovery
                    contractMonths: Number(initialMonths), // Record initial contract length
                    contractValue: Number(customPrice), // Record initial deal value
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

    // Auto-update Payment Value when Months change
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
            alert(`Pagamento registrado! Assinatura estendida por ${paymentMonths} meses.`);
            setShowPaymentModal(false);
            loadStores();
        } else {
            alert("Erro ao registrar pagamento: " + result.error);
        }
    };

    const openSettingsModal = async () => {
        const settings = await getSiteSettings();
        if (settings && settings.landingVideoUrl) {
            setSiteVideoUrl(settings.landingVideoUrl);
        } else {
            setSiteVideoUrl('');
        }
        setShowSettingsModal(true);
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            // Basic extraction if they paste full URL or just ID
            let videoId = siteVideoUrl;
            if (siteVideoUrl.includes('youtu.be/')) {
                videoId = siteVideoUrl.split('youtu.be/')[1].split('?')[0];
            } else if (siteVideoUrl.includes('youtube.com/watch?v=')) {
                videoId = siteVideoUrl.split('v=')[1].split('&')[0];
            } else if (siteVideoUrl.includes('youtube.com/embed/')) {
                videoId = siteVideoUrl.split('embed/')[1].split('?')[0];
            }

            const result = await updateSiteSettings({ landingVideoUrl: siteVideoUrl, landingVideoId: videoId });
            if (result.success) {
                alert("Configurações do site atualizadas com sucesso!");
                setShowSettingsModal(false);
            } else {
                alert("Erro ao salvar configurações do site.");
            }
        } catch (error) {
            console.error("Erro ao salvar settings:", error);
            alert("Erro ao salvar.");
        }
    };

    const handleDeleteStore = async (storeId) => {
        if (confirm("ATENÇÃO: Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.")) {
            if (confirm("Confirmar exclusão definitiva?")) {
                const result = await deleteStore(storeId);
                if (result.success) {
                    alert("Loja excluída com sucesso.");
                    loadStores();
                } else {
                    alert("Erro ao excluir loja: " + result.error);
                }
            }
        }
    };

    const getDaysRemaining = (dateString) => {
        if (!dateString) return 0;
        const due = new Date(dateString);
        const now = new Date();
        const diffTime = due - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    if (!isSuperAdmin) return <div className="p-8 text-center">Acesso Negado</div>;

    return (
        <div className="p-6 bg-[#0f172a] min-h-screen text-gray-100 font-sans">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Gestão de Clientes</h1>
                    <p className="text-gray-400 text-sm">Controle de assinaturas do PDV <span className="ml-2 px-2 py-0.5 rounded bg-gray-800 text-xs text-gray-500">{APP_VERSION}</span></p>
                </div>
                <div className="flex gap-4">
                    <button onClick={openSettingsModal} className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                        <FaCog /> Configurar Site
                    </button>
                    <button onClick={openCreateModal} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                        <FaPlus /> Novo Cliente
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={<FaStore />} title="Total de Clientes" value={stats.total} color="bg-blue-900/40 text-blue-400" />
                <StatCard icon={<FaCheck />} title="Assinaturas Ativas" value={stats.active} color="bg-green-900/40 text-green-400" />
                <StatCard icon={<FaTimes />} title="Vencidas" value={stats.expired} color="bg-red-900/40 text-red-400" />
                <StatCard icon={<FaMoneyBillWave />} title="Receita Mensal" value={`R$ ${stats.revenue.toFixed(2)}`} color="bg-yellow-900/40 text-yellow-400" />
            </div>

            <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-gray-800 mb-6 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-4 flex-1 w-full">
                    <FaSearch className="text-gray-500" />
                    <input type="text" placeholder="Buscar cliente..." className="bg-transparent border-none outline-none text-white w-full placeholder-gray-600" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
                    <button
                        onClick={() => setSortType('due')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${sortType === 'due' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        ORDERNAR: VENCIMENTO
                    </button>
                    <button
                        onClick={() => setSortType('name')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${sortType === 'name' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        NOME
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredStores.map(store => {
                    const days = getDaysRemaining(store.nextPaymentDue);
                    const isExpired = days < 0;
                    const planColor = store.plan === 'PREMIUM' ? 'bg-orange-600' : store.plan === 'PRO' ? 'bg-purple-600' : 'bg-gray-600';

                    return (
                        <div key={store.id} className="bg-[#1e293b] border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-gray-600 transition-all shadow-md">
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-4 mb-3">
                                    <h3 className="text-xl font-bold text-white">{store.name}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${store.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {store.subscriptionStatus === 'active' ? 'Ativa' : 'Bloqueada'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${planColor}`}>{store.plan}</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-700 text-white border border-gray-600" title="PIN Admin do Cliente">
                                        PIN: {store.adminPin || '1234'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-900 text-blue-200 border border-blue-700" title="Senha de Login">
                                        Senha: {store.password || '****'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm text-gray-400">
                                    <div className="flex items-center gap-2"><FaUser className="text-gray-600" /> {store.ownerName}</div>
                                    <div className="flex items-center gap-2"><FaEnvelope className="text-gray-600" /> {store.email}</div>
                                    <div className="flex items-center gap-2"><FaPhone className="text-gray-600" /> {store.phone || 'S/ Telefone'}</div>
                                </div>
                                <div className="mt-3 text-lg font-bold text-yellow-500">
                                    {store.email === SUPER_ADMIN_EMAIL ? 'R$ 0.00 (Admin)' : `R$ ${PLANS[store.plan.toUpperCase()]?.price.toFixed(2)}/mês`}
                                </div>
                            </div>
                            <div className="flex flex-col items-center md:items-end min-w-[150px]">
                                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><FaCalendarAlt /> Vence em:</div>
                                <div className={`text-lg font-bold ${isExpired || days < 3 ? 'text-red-500' : 'text-white'}`}>{days} dias</div>
                                <div className="text-xs text-gray-600">{formatDate(store.nextPaymentDue)}</div>
                            </div>
                            <div className="flex gap-3">
                                <button className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors" onClick={() => handleToggleStatus(store)} title={store.subscriptionStatus === 'active' ? 'Bloquear' : 'Desbloquear'}>
                                    {store.subscriptionStatus === 'active' ? <FaBan /> : <FaCheck />}
                                </button>
                                <button className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors" onClick={() => openEditModal(store)} title="Editar">
                                    <FaEdit />
                                </button>
                                <button className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2 transition-colors shadow-lg" onClick={() => openPaymentModal(store)}>
                                    <FaMoneyBillWave /> Pagar
                                </button>
                                <button className="p-3 rounded-lg bg-red-900/50 hover:bg-red-700 text-red-200 transition-colors" onClick={() => handleDeleteStore(store.id)} title="Excluir Loja">
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowModal(false)}><FaClose size={20} /></button>
                        <h2 className="text-2xl font-bold text-white mb-6">{isEditing ? 'Editar Loja' : 'Adicionar Nova Loja'}</h2>
                        <form onSubmit={handleSaveStore} className="space-y-4">
                            <InputGroup label="Email" value={newStoreEmail} onChange={setNewStoreEmail} type="email" placeholder="cliente@email.com" readOnly={isEditing} />
                            <InputGroup label="Nome da Loja" value={newStoreName} onChange={setNewStoreName} placeholder="Ex: Mercadinho Top" />
                            <InputGroup label="Nome do Dono" value={newOwnerName} onChange={setNewOwnerName} placeholder="Nome Completo" />
                            <InputGroup label="Telefone / WhatsApp" value={newPhone} onChange={setNewPhone} placeholder="(11) 99999-9999" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1 uppercase">Plano</label>
                                    <select className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white outline-none" value={newPlan} onChange={e => setNewPlan(e.target.value)}>
                                        <option value="BASIC">Básico</option>
                                        <option value="PRO">Profissional</option>
                                        <option value="PREMIUM">Premium</option>
                                    </select>
                                </div>
                                <InputGroup label="Senha de Acesso" value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 dígitos" />
                            </div>

                            {!isEditing && (
                                <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Meses de Contrato</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setInitialMonths(Math.max(1, initialMonths - 1))} className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600 font-bold">-</button>
                                            <input type="number" className="w-full bg-transparent text-center font-bold text-white outline-none" value={initialMonths} onChange={e => setInitialMonths(Number(e.target.value))} />
                                            <button type="button" onClick={() => setInitialMonths(initialMonths + 1)} className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600 font-bold">+</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-green-400 mb-1 uppercase">Valor Total (R$)</label>
                                        <input type="number" className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white text-right font-bold" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                                    </div>
                                </div>
                            )}
                            {isEditing && <p className="text-xs text-yellow-500">* Ao alterar a senha aqui, você atualiza apenas o registro visual. Se desejar alterar o login real do cliente, ele deve fazê-lo no painel dele por segurança.</p>}
                            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg mt-4 text-lg transition-colors">{isEditing ? 'SALVAR ALTERAÇÕES' : 'CRIAR LOJA'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {
                showPaymentModal && selectedStore && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400 text-3xl"><FaCheck /></div>
                            <h2 className="text-2xl font-bold text-white mb-2">Registrar Pagamento</h2>
                            <p className="text-gray-400 mb-6">Cliente: <span className="text-white font-bold">{selectedStore.name}</span></p>

                            <div className="bg-black/20 p-4 rounded-xl mb-6 text-left space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tempo de Renovação (Meses)</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setPaymentMonths(Math.max(1, paymentMonths - 1))} className="w-10 h-10 bg-gray-700 rounded text-xl font-bold flex items-center justify-center hover:bg-gray-600">-</button>
                                        <input type="number" className="bg-transparent text-center w-full text-2xl font-bold text-white outline-none" value={paymentMonths} onChange={e => setPaymentMonths(Number(e.target.value))} />
                                        <button type="button" onClick={() => setPaymentMonths(paymentMonths + 1)} className="w-10 h-10 bg-gray-700 rounded text-xl font-bold flex items-center justify-center hover:bg-gray-600">+</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor Recebido (R$)</label>
                                    <input type="number" className="w-full bg-black/30 border border-gray-600 rounded p-2 text-white font-bold text-lg" value={paymentValue} onChange={e => setPaymentValue(e.target.value)} />
                                    <p className="text-xs text-gray-500 mt-1">Sugerido: R$ {(PLANS[selectedStore.plan.toUpperCase()]?.price || 0) * paymentMonths}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setShowPaymentModal(false)} className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold">Cancelar</button>
                                <button onClick={handleRegisterPayment} className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg">Confirmar</button>
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
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><FaCog className="text-gray-400" /> Configurações do Site</h2>
                        <p className="text-gray-400 mb-6 text-sm">Altere as informações exibidas na Landing Page pública (caramelopdv.com).</p>

                        <form onSubmit={handleSaveSettings} className="space-y-4">
                            <InputGroup
                                label="Link do Vídeo Principal (YouTube)"
                                value={siteVideoUrl}
                                onChange={setSiteVideoUrl}
                                placeholder="Ex: https://youtu.be/XXXXXX ou apenas o ID"
                            />
                            <p className="text-xs text-gray-500">Cole o link completo ou apenas o ID do vídeo para atualizar o Player da entrada do site.</p>

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg mt-4 transition-colors">SALVAR CONFIGURAÇÕES</button>
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
        <div><div className="text-2xl font-bold text-white">{value}</div><div className="text-gray-500 text-sm font-medium uppercase">{title}</div></div>
    </div>
);

const InputGroup = ({ label, value, onChange, type = "text", placeholder, readOnly = false }) => (
    <div>
        <label className="block text-sm font-bold text-gray-400 mb-1 uppercase">{label}</label>
        <input className={`w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-orange-500 transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} type={type} placeholder={placeholder} value={value} onChange={e => onChange && onChange(e.target.value)} readOnly={readOnly} required={!readOnly} />
    </div>
);

export default AdminDashboard;
