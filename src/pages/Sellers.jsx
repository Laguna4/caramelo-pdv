import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaSave, FaTimes, FaUserTie, FaIdCard, FaLock, FaUserShield, FaKey, FaUsers } from 'react-icons/fa';
import { getSellers, addSeller, updateSeller, deleteSeller, getStore } from '../services/dbService';
import { getCurrentStore } from '../utils/storage';
import { checkLimit } from '../utils/plans';
import PinModal from '../components/PinModal';
import TutorialModal from '../components/TutorialModal';

const PERMISSIONS = {
    modules: [
        { id: 'pos', label: 'Iniciar Venda (PDV)' },
        { id: 'products', label: 'Produtos (Estoque)' },
        { id: 'sales', label: 'Vendas (Histórico)' },
        { id: 'customers', label: 'Clientes (CRM)' },
        { id: 'financial', label: 'Financeiro' },
        { id: 'sellers', label: 'Equipe (Vendedores)' },
        { id: 'reports', label: 'Relatórios' },
        { id: 'debts', label: 'Painel Fiado' },
        { id: 'inventory', label: 'Consultar Estoque' },
        { id: 'tables', label: 'Mesas (Garçom)' },
        { id: 'kitchen', label: 'Cozinha (KDS)' },
        { id: 'settings', label: 'Configurações' }
    ],
    actions: [
        { id: 'cancel_sale', label: 'Cancelar Venda' },
        { id: 'exchange_item', label: 'Realizar Troca' },
        { id: 'delete_product', label: 'Excluir Produto' }
    ]
};

const ROLE_PRESETS = {
    'MANAGER': [...PERMISSIONS.modules.map(m => m.id), ...PERMISSIONS.actions.map(a => a.id)],
    'VENDEDOR': ['pos', 'customers', 'inventory'],
    'CAIXA': ['pos', 'customers', 'debts', 'inventory', 'sales'],
    'GARCON': ['tables', 'pos'],
    'CUSTOM': []
};

const Sellers = () => {
    const [sellers, setSellers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSeller, setEditingSeller] = useState(null);
    const [currentStore, setCurrentStore] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Tutorial
    const [showTutorial, setShowTutorial] = useState(false);
    const tutorialSteps = [
        {
            title: 'Equipe de Vendas',
            content: 'Aqui você cadastra quem vai usar o sistema. Pode ser você mesmo, um gerente ou um vendedor.',
            icon: <FaUsers className="text-white" />
        },
        {
            title: 'O que é o PIN?',
            content: 'O PIN é uma senha numérica de 4 dígitos. Ela será usada no PDV para identificar quem está fazendo a venda.',
            icon: <FaKey className="text-white" />
        },
        {
            title: 'Níveis de Acesso',
            content: 'Gerentes podem fazer tudo, inclusive ver relatórios. Vendedores são limitados apenas ao que você permitir.',
            icon: <FaUserShield className="text-white" />
        }
    ];
    const [currentStep, setCurrentStep] = useState(0);

    // Security
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [showPinModal, setShowPinModal] = useState(true); // Start locked

    const [formData, setFormData] = useState({
        name: '',
        role: 'VENDEDOR', // VENDEDOR, MANAGER, CAIXA, GARCON, CUSTOM
        pin: '',
        commission: '0',
        active: true,
        permissions: [] // New permissions array
    });

    useEffect(() => {
        const store = getCurrentStore();
        setCurrentStore(store);
        if (store) {
            loadSellers(store.id);

            // Tutorial Check
            const tutorialActive = localStorage.getItem('caramelo_tutorial_mode') !== 'false';
            const tutorialShown = localStorage.getItem('caramelo_tutorial_sellers_shown');
            if (tutorialActive && !tutorialShown) {
                setShowTutorial(true);
            }
        }
    }, []);

    // Sync role with permissions
    useEffect(() => {
        if (formData.role !== 'CUSTOM' && ROLE_PRESETS[formData.role]) {
            setFormData(prev => ({ ...prev, permissions: ROLE_PRESETS[formData.role] }));
        }
    }, [formData.role]);

    const handleAuthSuccess = () => {
        setIsAuthorized(true);
        setShowPinModal(false);
    };

    const closeTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem('caramelo_tutorial_sellers_shown', 'true');
    };

    const loadSellers = async (storeId) => {
        if (!storeId) return;
        const data = await getSellers(storeId);
        setSellers(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.pin) {
            alert('Nome e Senha/PIN são obrigatórios');
            return;
        }

        const masterPin = String(currentStore?.adminPin || '1234').trim();
        const inputPin = String(formData.pin).trim();
        if (inputPin === masterPin || inputPin === '0000') {
            alert('Este PIN é restrito ao Administrador Master. Por favor, escolha um código diferente para este colaborador.');
            return;
        }

        // Check Limits
        if (!editingSeller) {
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

            const { allowed, message } = checkLimit(activePlan, 'users', sellers.length);
            if (!allowed) {
                alert(message);
                return;
            }
        }

        try {
            if (editingSeller) {
                await updateSeller(editingSeller.id, {
                    ...formData,
                    commission: parseFloat(formData.commission) || 0
                });
            } else {
                await addSeller(currentStore.id, {
                    ...formData,
                    commission: parseFloat(formData.commission) || 0
                });
            }
            loadSellers(currentStore.id);
            resetForm();
        } catch (error) {
            alert("Erro ao salvar vendedor: " + error.message);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', role: 'VENDEDOR', pin: '', commission: '0', active: true, permissions: ROLE_PRESETS['VENDEDOR'] });
        setEditingSeller(null);
        setShowForm(false);
    };

    const handleEdit = (seller) => {
        setEditingSeller(seller);
        setFormData({
            name: seller.name,
            role: seller.role,
            pin: seller.pin,
            commission: seller.commission,
            active: seller.active,
            permissions: seller.permissions || []
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Excluir este vendedor?')) {
            await deleteSeller(id);
            loadSellers(currentStore.id);
        }
    };

    const filteredSellers = sellers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!showForm) {
        return (
            <div className="container-center" style={{ padding: '2rem', position: 'relative' }}>
                {/* Security Overlay */}
                {!isAuthorized && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                        zIndex: 50, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <FaLock size={64} className="text-gray-500 mb-4" />
                        <h2 className="text-white mb-2">Gestão de Equipe</h2>
                        <button className="btn btn-primary" onClick={() => setShowPinModal(true)}>
                            <FaLock className="mr-2" /> DESBLOQUEAR
                        </button>
                        <PinModal
                            isOpen={showPinModal}
                            onClose={() => setShowPinModal(false)}
                            onSuccess={handleAuthSuccess}
                            title="Acesso Admin"
                            requiredRole="ADMIN"
                        />
                    </div>
                )}

                <div className="flex-between mb-4">
                    <h1 style={{ fontSize: '1.8rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        <FaUserTie className="mr-2" style={{ color: 'var(--primary)' }} /> Equipe de Vendas
                    </h1>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <FaPlus /> Novo Colaborador
                    </button>
                </div>

                <div className="card mb-4 p-4 flex gap-4 bg-[#111] border border-gray-800 rounded-lg">
                    <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                        <FaSearch className="text-gray-500 mt-3" />
                        <input
                            className="input-premium"
                            placeholder="Buscar vendedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="premium-table-container mt-0 bg-[#0a0a0a]">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Cargo / Nível</th>
                                <th>Comissão (%)</th>
                                <th>PIN (Acesso)</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSellers.map(seller => (
                                <tr key={seller.id}>
                                    <td style={{ fontWeight: 'bold' }}>{seller.name}</td>
                                    <td>
                                        <span className={`badge ${seller.role === 'MANAGER' ? 'bg-primary text-black' : 'bg-gray-800 text-gray-300'}`}>
                                            {seller.role}
                                        </span>
                                    </td>
                                    <td>{seller.commission}%</td>
                                    <td style={{ fontFamily: 'monospace' }}>****</td>
                                    <td>
                                        {seller.active ? <span className="text-green-500">Ativo</span> : <span className="text-red-500">Inativo</span>}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(seller)}><FaEdit /></button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(seller.id)}><FaTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSellers.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center p-8 text-muted">
                                        Nenhum vendedor cadastrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="container-center" style={{ padding: '2rem', maxWidth: '600px' }}>
            <div className="modal-premium p-6">
                <div className="flex-between mb-6 pb-2 border-b border-gray-800">
                    <h2 className="text-xl text-white">{editingSeller ? 'Editar Vendedor' : 'Novo Colaborador'}</h2>
                    <button onClick={resetForm} className="text-gray-400 hover:text-white"><FaTimes size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="input-label-premium">Nome Completo</label>
                        <input
                            className="input-premium"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="input-label-premium">Cargo</label>
                            <select
                                className="input-premium"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="VENDEDOR">Vendedor</option>
                                <option value="MANAGER">Gerente</option>
                                <option value="CAIXA">Caixa</option>
                                <option value="GARCON">Garçom</option>
                                <option value="CUSTOM">Personalizado</option>
                            </select>
                        </div>
                        <div>
                            <label className="input-label-premium">Comissão (%)</label>
                            <input
                                type="number"
                                className="input-premium"
                                value={formData.commission}
                                onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Permissions Grid */}
                    <div className="mb-6 p-4 bg-black border border-gray-800 rounded-xl">
                        <h3 className="text-xs font-black text-caramelo-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FaUserShield /> {formData.role === 'CUSTOM' ? 'DEFINIR PERMISSÕES' : 'PERMISSÕES DO CARGO'}
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Acesso aos Módulos</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {PERMISSIONS.modules.map(mod => (
                                        <label key={mod.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${formData.permissions.includes(mod.id) ? 'bg-caramelo-primary/10 border-caramelo-primary/30 text-white' : 'bg-white/5 border-transparent text-gray-500'}`}>
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.includes(mod.id)}
                                                onChange={(e) => {
                                                    const perms = formData.permissions;
                                                    const newPerms = e.target.checked ? [...perms, mod.id] : perms.filter(p => p !== mod.id);
                                                    setFormData({ ...formData, permissions: newPerms, role: 'CUSTOM' });
                                                }}
                                                className="accent-caramelo-primary"
                                            />
                                            <span className="text-[11px] font-bold">{mod.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Ações Restritas</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {PERMISSIONS.actions.map(act => (
                                        <label key={act.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${formData.permissions.includes(act.id) ? 'bg-red-500/10 border-red-500/30 text-white' : 'bg-white/5 border-transparent text-gray-500'}`}>
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.includes(act.id)}
                                                onChange={(e) => {
                                                    const perms = formData.permissions;
                                                    const newPerms = e.target.checked ? [...perms, act.id] : perms.filter(p => p !== act.id);
                                                    setFormData({ ...formData, permissions: newPerms, role: 'CUSTOM' });
                                                }}
                                                className="accent-red-500"
                                            />
                                            <span className="text-[11px] font-bold">{act.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="input-label-premium flex items-center gap-2">
                            <FaLock size={12} /> PIN de Acesso (4 Dígitos)
                        </label>
                        <input
                            type="password"
                            maxLength="6"
                            className="input-premium text-center tracking-[0.5em] font-bold text-xl"
                            style={{ borderColor: 'var(--primary)' }}
                            value={formData.pin}
                            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                            placeholder="****"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Senha usada para liberar ações restritas.</p>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" className="btn btn-secondary flex-1" onClick={resetForm}>Cancelar</button>
                        <button type="submit" className="btn btn-success flex-1 font-bold">Salvar Cadastro</button>
                    </div>
                </form>
            </div>
            {/* Tutorial */}
            <TutorialModal
                isOpen={showTutorial}
                onClose={closeTutorial}
                title="Tutorial: Vendedores"
                steps={tutorialSteps}
                currentStep={currentStep}
                onNext={() => setCurrentStep(prev => prev + 1)}
                onPrev={() => setCurrentStep(prev => prev - 1)}
            />
        </div>
    );
};

export default Sellers;
