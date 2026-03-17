import { Link, useNavigate } from 'react-router-dom';
import { FaCashRegister, FaBox, FaBoxOpen, FaChartLine, FaCog, FaSignOutAlt, FaSearch, FaUsers, FaUserTie, FaMoneyBillWave, FaClipboardList, FaExclamationTriangle, FaHistory, FaUtensils, FaFire, FaPrint } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { logout as storageLogout, getCurrentUser, exportBackup } from '../utils/storage';
import { logout as authLogout } from '../services/authService';
import { getProducts, getCustomers, getSellers, getStore, getOpenCashRegister } from '../services/dbService';
import { printComandaPreBill } from '../utils/printer';
import { PLAN_LIMITS } from '../utils/plans';
import logo from '../assets/caramelo-logo.png';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { FaQuestionCircle } from 'react-icons/fa';
import { subscribeToAllComandas } from '../services/comandaService';

const Dashboard = ({ store }) => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ products: 0, customers: 0, sellers: 0 });
    const [liveStore, setLiveStore] = useState(store);
    const [tutorialMode, setTutorialMode] = useState(() => {
        const saved = localStorage.getItem('caramelo_tutorial_mode');
        return saved === null ? true : saved === 'true'; // Default ON for new users
    });
    const [cashRegister, setCashRegister] = useState(null);
    const [pendingComandas, setPendingComandas] = useState([]);

    const activePlan = liveStore?.plan || store?.plan || 'BASIC';
    // Fix: Handle cases where plan is an object (from config) or string
    const planString = typeof activePlan === 'string' ? activePlan : (activePlan?.id || 'BASIC');
    const currentPlanName = planString.toUpperCase();
    const currentLimits = PLAN_LIMITS[currentPlanName] || PLAN_LIMITS['BASIC'];

    useEffect(() => {
        const fetchData = async () => {
            if (store?.id) {
                try {
                    const storeData = await getStore(store.id);
                    if (storeData) setLiveStore(prev => ({ ...prev, ...storeData }));

                    const products = await getProducts(store.id);
                    const customers = await getCustomers(store.id);
                    const sellers = await getSellers(store.id);
                    const register = await getOpenCashRegister(store.id);

                    setCounts({
                        products: products.length,
                        customers: customers.length,
                        sellers: sellers.length
                    });
                    setCashRegister(register);
                } catch (error) {
                    console.error("Error fetching dashboard data:", error);
                }
            }
        };
        fetchData();
    }, [store]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2') navigate('/pos');
            if (e.key === 'F3') navigate('/products');
            if (e.key === 'F4') navigate('/sales');
            if (e.key === 'F5') navigate('/customers');
            if (e.key === 'F11') navigate('/debts');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    useEffect(() => {
        if (!liveStore?.id || !liveStore?.enableComandas) return;

        const unsubscribe = subscribeToAllComandas(liveStore.id, (comandas) => {
            // Only care about comandas that are 'fechando'
            const pending = comandas.filter(c => c.status === 'fechando');
            setPendingComandas(pending);
        });

        return () => unsubscribe();
    }, [liveStore?.id, liveStore?.enableComandas]);

    const user = getCurrentUser();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

    // Helper to check permissions
    const hasPermission = (permId) => {
        if (isAdmin) return true;
        if (!user) return false;
        return (user.permissions || []).includes(permId);
    };

    const menuItems = [
        { title: 'Iniciar Venda', icon: <FaCashRegister />, path: '/pos', color: 'text-red-500', bg: 'hover:bg-red-900/20 hover:border-red-500', desc: 'Frente de Caixa (PDV)', shortcut: 'F2', permission: 'pos' },
        { title: 'Produtos', icon: <FaBoxOpen />, path: '/products', color: 'text-amber-400', bg: 'hover:bg-amber-900/20 hover:border-amber-400', desc: 'Estoque e Preços', shortcut: 'F3', permission: 'products' },
        { title: 'Vendas', icon: <FaSearch />, path: '/sales', color: 'text-orange-400', bg: 'hover:bg-orange-900/20 hover:border-orange-400', desc: 'Histórico e Devoluções', shortcut: 'F4', permission: 'sales' },
        { title: 'Clientes', icon: <FaUsers />, path: '/customers', color: 'text-blue-400', bg: 'hover:bg-blue-900/20 hover:border-blue-400', desc: 'Gestão de Fiado/CRM', shortcut: 'F5', permission: 'customers' },
        { title: 'Financeiro', icon: <FaMoneyBillWave />, path: '/financial', color: 'text-green-400', bg: 'hover:bg-green-900/20 hover:border-green-400', desc: 'Contas e Lucros', shortcut: 'F6', permission: 'financial' },
        { title: 'Vendedores', icon: <FaUserTie />, path: '/sellers', color: 'text-purple-400', bg: 'hover:bg-purple-900/20 hover:border-purple-400', desc: 'Equipe e Comissões', shortcut: 'F7', permission: 'sellers' },
        { title: 'Relatórios', icon: <FaChartLine />, path: '/reports', color: 'text-cyan-400', bg: 'hover:bg-cyan-900/20 hover:border-cyan-400', desc: 'Metas e Resultados', shortcut: 'F8', permission: 'reports' },
        { title: 'Painel Fiado', icon: <FaHistory />, path: '/debts', color: 'text-pink-500', bg: 'hover:bg-pink-900/20 hover:border-pink-500', desc: 'Crediário e Cobrança', shortcut: 'F11', permission: 'debts' },
        { title: 'Consul. Estoque', icon: <FaClipboardList />, path: '/inventory', color: 'text-yellow-200', bg: 'hover:bg-yellow-900/20 hover:border-yellow-200', desc: 'Preços e Inventário', shortcut: 'F9', permission: 'inventory' },
        ...(liveStore?.enableComandas ? [
            { title: 'Mesas (Garçom)', icon: <FaUtensils />, path: '/tables', color: 'text-orange-500', bg: 'hover:bg-orange-900/20 hover:border-orange-500', desc: 'Comandas Mobile', shortcut: '', permission: 'tables' },
            { title: 'Cozinha (KDS)', icon: <FaFire />, path: '/kitchen', color: 'text-red-500', bg: 'hover:bg-red-900/20 hover:border-red-500', desc: 'Monitor de Pedidos', shortcut: '', permission: 'kitchen' }
        ] : []),
        { title: 'Configurações', icon: <FaCog />, path: '/settings', color: 'text-gray-400', bg: 'hover:bg-gray-800 hover:border-gray-500', desc: 'Sistema e Loja', shortcut: 'F10', permission: 'settings' },
    ].filter(item => hasPermission(item.permission));

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-4 md:p-8 font-sans overflow-x-hidden">
            <div className="w-full max-w-6xl">
                {/* Header Section */}
                <div className="text-center mb-8 md:mb-12 relative">
                    <button
                        type="button"
                        className="flex flex-col md:flex-row md:absolute md:top-4 md:right-4 items-center gap-3 mb-6 md:mb-0 cursor-pointer group select-none transition-all active:scale-95 z-[50] bg-transparent border-none p-0"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newValue = !tutorialMode;
                            console.log("Toggling Help Mode to:", newValue);
                            setTutorialMode(newValue);
                            localStorage.setItem('caramelo_tutorial_mode', newValue.toString());
                        }}
                        title={tutorialMode ? 'Desativar Modo Ajuda' : 'Ativar Modo Ajuda'}
                    >
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${tutorialMode ? 'text-orange-500' : 'text-gray-600'} group-hover:text-white`}>
                            {tutorialMode ? 'Modo Ajuda Ativo' : 'Ajuda Desativada'}
                        </span>
                        <div
                            className={`w-12 h-6 rounded-full p-1 transition-all flex items-center shadow-lg ${tutorialMode ? 'bg-orange-600' : 'bg-gray-800'} ring-1 ring-white/10 group-hover:ring-orange-500/50`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-md transform ${tutorialMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </button>

                    <div className="dashboard-logo-wrapper mb-2">
                        <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-yellow-500 tracking-tighter">
                            CARAMELO<span className="text-white">PDV</span>
                        </h1>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
                        Olá! 💎 {liveStore?.ownerName || 'Admin'}
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Bem-vindo ao CarameloPDV • <span className="text-white font-bold">{liveStore?.name || 'Sua Loja'}</span>
                        {liveStore?.email === 'lucasluob@gmail.com' && <span className="ml-2 bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded border border-red-500/50">MASTER</span>}
                    </p>
                </div>

                {/* Onboarding Checklist */}
                {tutorialMode && (
                    <OnboardingChecklist counts={counts} cashRegister={cashRegister} />
                )}

                {/* Plan Usage Section */}
                <div className="w-full mb-8 bg-[#151515] border border-gray-800 rounded-2xl p-6 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Meu Plano: <span className="text-red-500">{currentPlanName}</span></h2>
                            <p className="text-gray-500 text-sm">Acompanhe seus limites de uso</p>
                        </div>
                        <button onClick={() => navigate('/settings')} className="text-sm text-red-500 hover:text-red-400 font-bold transition-colors">
                            Gerenciar Plano &rarr;
                        </button>
                    </div>

                    {/* Pending Comandas Alert Block */}
                    {pendingComandas.length > 0 && (
                        <div className="w-full mb-8 bg-orange-950/40 border border-orange-800/50 rounded-2xl p-6 shadow-[0_0_30px_rgba(234,88,12,0.15)] animate-pulse">
                            <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                                <FaMoneyBillWave className="text-orange-500" /> Contas Solicitadas (Mesas)
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {pendingComandas.map(com => (
                                    <div
                                        key={com.id}
                                        onClick={() => navigate('/pos', { state: { comanda: com } })}
                                        className="bg-[#111] border border-orange-500/30 p-4 rounded-xl cursor-pointer hover:bg-orange-950/50 hover:border-orange-500 transition-all group flex justify-between items-center"
                                    >
                                        <div>
                                            <div className="font-bold text-white group-hover:text-orange-400 transition-colors uppercase">
                                                {com.identificador}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {com.itens?.length || 0} itens aguardando pgto.
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="bg-green-500/10 text-green-500 text-sm font-black px-3 py-1.5 rounded border border-green-500/20">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                    (com.total || 0) + (liveStore?.enableServiceTax ? (com.total || 0) * 0.1 : 0)
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const printerSettings = JSON.parse(localStorage.getItem('caramelo_printer_settings') || '{}');
                                                    printComandaPreBill(com, liveStore, printerSettings);
                                                }}
                                                title="Imprimir Prévia para o Cliente"
                                                className="bg-gray-800 text-gray-400 p-2 rounded hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
                                            >
                                                <FaPrint size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Menu Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Produtos</span>
                                <span className={counts.products >= currentLimits.maxProducts ? "text-red-500 font-bold" : "text-white"}>
                                    {counts.products} / {currentLimits.maxProducts === Infinity ? '∞' : currentLimits.maxProducts}
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all duration-500 ${counts.products >= currentLimits.maxProducts ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${currentLimits.maxProducts === Infinity ? 0 : Math.min((counts.products / currentLimits.maxProducts) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Vendedores</span>
                                <span className={counts.sellers >= currentLimits.maxUsers ? "text-red-500 font-bold" : "text-white"}>
                                    {counts.sellers} / {currentLimits.maxUsers === Infinity ? '∞' : currentLimits.maxUsers}
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all duration-500 ${counts.sellers >= currentLimits.maxUsers ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${currentLimits.maxUsers === Infinity ? 0 : Math.min((counts.sellers / currentLimits.maxUsers) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Clientes</span>
                                <span className={counts.customers >= currentLimits.maxCustomers ? "text-red-500 font-bold" : "text-white"}>
                                    {counts.customers} / {currentLimits.maxCustomers === Infinity ? '∞' : currentLimits.maxCustomers}
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all duration-500 ${counts.customers >= currentLimits.maxCustomers ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${currentLimits.maxCustomers === Infinity ? 0 : Math.min((counts.customers / currentLimits.maxCustomers) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid Menu */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {menuItems.map((item, index) => (
                        <Link key={index} to={item.path} className={`group relative bg-[#151515] border border-gray-800 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-red-500/50 ${item.bg}`}>
                            <span className="absolute top-4 right-4 text-xs font-mono font-bold bg-gray-900 text-gray-500 px-2 py-1 rounded border border-gray-800">{item.shortcut}</span>
                            <div className={`text-5xl mb-6 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg ${item.color}`}>{item.icon}</div>
                            <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                        </Link>
                    ))}
                    <button onClick={async () => {
                        if (confirm('Sair do sistema?')) {
                            if (confirm('Deseja fazer um BACKUP da máquina atual antes de sair? (Recomendado)')) {
                                exportBackup();
                            }
                            await authLogout();
                            storageLogout();
                            window.location.href = '/';
                        }
                    }} className="group bg-[#151515] border border-red-900/30 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:bg-red-900/10 hover:border-red-600/50 hover:-translate-y-1">
                        <div className="text-5xl mb-6 text-red-500 group-hover:scale-110 transition-transform"><FaSignOutAlt /></div>
                        <h3 className="text-xl font-bold text-red-500 mb-1">Backup & Sair</h3>
                        <p className="text-sm text-gray-600">Encerrar Sessão</p>
                    </button>
                </div>

                {/* Footer Section */}
                <div className="mt-16 text-center text-gray-600 text-sm">
                    {liveStore?.email === 'lucasluob@gmail.com' ? (
                        <p className="text-yellow-500 font-bold">👑 LICENÇA VITALÍCIA (DONO) • ACESSO MESTRE</p>
                    ) : (
                        <p>CarameloPDV 1.0 • Licença {currentPlanName}</p>
                    )}
                    <p className="mt-1 text-gray-700">ID da Loja: {liveStore?.id}</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
