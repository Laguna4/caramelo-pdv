import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { FaStore, FaUserCircle, FaBars, FaTimes, FaHome, FaCashRegister, FaBoxOpen, FaSearch, FaUsers, FaMoneyBillWave, FaUserTie, FaChartLine, FaHistory, FaClipboardList, FaUtensils, FaFire, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { logout as authLogout } from './services/authService';
import './tailwind_app.css';
import logo from './assets/caramelo-logo.png';

// Pages
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import POS from './pages/POS';
import Products from './pages/Products';
import Dashboard from './pages/Dashboard';
import Debts from './pages/Debts';
// import Manual from './pages/Manual'; // Removed because file doesn't exist
import Reports from './pages/Reports';
import DemoGuide from './components/DemoGuide'; // Import Tutorial
import Sales from './pages/Sales';
import Sellers from './pages/Sellers';
import Customers from './pages/Customers';
import Financial from './pages/Financial';
import Inventory from './pages/Inventory';
// import Vitrine from './pages/Vitrine'; // (Disabled temporarily)
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import UpdateStoreName from './pages/UpdateStoreName';
import Tables from './pages/Tables';
import Kitchen from './pages/Kitchen';

// Utils & Services
import { getCurrentStore, getCurrentUser, logout } from './utils/storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './services/firebase';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => { };
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const store = getCurrentStore();
        const user = getCurrentUser();

        if (store && store.id && user) {
          if (isMounted) {
            setCurrentStore(store);
            setIsAuthenticated(true);
          }

          // Real-time listener logic
          console.log("Iniciando listener para loja:", store.id);
          try {
            const unsub = onSnapshot(doc(db, "stores", store.id), (docSnapshot) => {
              if (!isMounted) return;

              if (docSnapshot.exists()) {
                const freshData = { id: docSnapshot.id, ...docSnapshot.data() };

                if (freshData.subscriptionStatus === 'blocked') {
                  alert("Aparelho BLOQUEADO pelo administrador.\n\nEntre em contato com o suporte para regularizar.");
                  logout();
                  setIsAuthenticated(false);
                  setTimeout(() => window.location.href = '/login', 500);
                  return;
                }

                // Sync fresh data to localStorage to ensure PINs and settings are always up to date
                localStorage.setItem('caramelo_current_store', JSON.stringify(freshData));
                setCurrentStore(freshData);

              } else {
                console.log("Loja não encontrada! Logout.");
                logout();
                setIsAuthenticated(false);
              }
            }, (error) => {
              console.error("Erro no listener de status:", error);
            });

            if (isMounted) {
              unsubscribe = unsub;
            } else {
              unsub(); // Cleanup if unmounted during setup
            }
          } catch (err) {
            console.error("Erro ao criar listener:", err);
          }
        } else {
          // Invalid state, ensure forced logout if partial data exists
          if (store || user) {
            logout();
          }
        }
      } catch (error) {
        console.error("Erro crítico na verificação de auth:", error);
        // Fallback: allow loading to finish so user sees Landing Page instead of white screen
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Run once on mount. Login action handles state updates manually.

  const handleLogin = (store) => {
    setCurrentStore(store);
    setIsAuthenticated(true);
    // Force reload to trigger useEffect if needed, or just let state cascade
    // For simplicity, state update is enough to show protected routes, 
    // and a reload would ensure fresh listeners.
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />

        {/* Protected Routes Wrapper */}
        <Route path="/pos" element={isAuthenticated ? <POS /> : <Navigate to="/login" />} />
        <Route path="/*" element={
          isAuthenticated ? (
            <AppLayout currentStore={currentStore} />
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white p-8">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Ops! Algo deu errado.</h1>
          <p className="text-gray-400 mb-4">Ocorreu um erro inesperado na aplicação.</p>
          <div className="bg-slate-800 p-4 rounded text-sm font-mono text-red-300 max-w-2xl overflow-auto border border-red-900 mb-6">
            {this.state.error && this.state.error.toString()}
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition-colors"
          >
            Limpar Dados e Reiniciar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Layout Wrapper to conditionally show Header
const AppLayout = ({ currentStore }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await authLogout();
    logout();
    window.location.href = "/";
  };

  if (!currentStore) {
    return <div className="p-8 text-white">Carregando dados da loja...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-slate-100 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#0a0a0a] border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="w-8 h-8" />
              <span className="font-bold text-lg">Menu</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white">
              <FaTimes size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
            <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors">
              <FaHome /> Início / Dashboard
            </Link>
            <Link to="/pos" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-red-400 hover:text-red-300 transition-colors">
              <FaCashRegister /> Frente de Caixa
            </Link>
            <Link to="/products" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-amber-400 hover:text-amber-300 transition-colors">
              <FaBoxOpen /> Produtos
            </Link>
            <Link to="/sales" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-orange-400 hover:text-orange-300 transition-colors">
              <FaSearch /> Vendas
            </Link>
            <Link to="/customers" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-blue-400 hover:text-blue-300 transition-colors">
              <FaUsers /> Clientes
            </Link>
            <Link to="/financial" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-green-400 hover:text-green-300 transition-colors">
              <FaMoneyBillWave /> Financeiro
            </Link>
            <Link to="/sellers" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-purple-400 hover:text-purple-300 transition-colors">
              <FaUserTie /> Vendedores
            </Link>
            <Link to="/reports" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-cyan-400 hover:text-cyan-300 transition-colors">
              <FaChartLine /> Relatórios
            </Link>
            <Link to="/debts" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-pink-500 hover:text-pink-400 transition-colors">
              <FaHistory /> Painel Fiado
            </Link>
            <Link to="/inventory" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-yellow-200 hover:text-yellow-100 transition-colors">
              <FaClipboardList /> Consul. Estoque
            </Link>
            {currentStore?.enableComandas && (
              <>
                <Link to="/tables" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-orange-500 hover:text-orange-400 transition-colors">
                  <FaUtensils /> Mesas / Comandas
                </Link>
                <Link to="/kitchen" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-red-500 hover:text-red-400 transition-colors">
                  <FaFire /> Cozinha / Pedidos
                </Link>
              </>
            )}
            <Link to="/settings" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-300 transition-colors">
              <FaCog /> Configurações
            </Link>
          </nav>

          <div className="pt-6 border-t border-gray-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-900/20 text-red-500 hover:bg-red-900/40 transition-colors">
              <FaSignOutAlt /> Sair do Sistema
            </button>
          </div>
        </div>
      </div>

      <header className="bg-[#050505] border-b border-[#111] p-3 md:p-4 flex justify-between items-center shadow-lg shrink-0 relative overflow-hidden">
        {/* Subtle Gold Reflection Streak */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/5 to-transparent pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          {/* Hamburger Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-slate-300 hover:text-white p-1"
          >
            <FaBars size={24} />
          </button>

          <Link to="/dashboard" className="flex items-center gap-3 no-underline text-white">
            <img src={logo} alt="Logo" className="w-8 h-8 md:w-9 md:h-9 object-contain" />
            <div>
              <h1 className="text-sm md:text-base font-bold leading-tight tracking-tight text-white mb-0 mt-0">Caramelo PDV</h1>
              <span className="text-[10px] text-slate-500 block uppercase tracking-tighter">
                {currentStore.name}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-300 mb-0 mt-0 tracking-tight leading-none">{currentStore.ownerName}</p>
            <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest flex items-center justify-end gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Online</span>
          </div>
          <FaUserCircle size={32} className="text-slate-600" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a] relative custom-scrollbar">
        {/* Helper for Demo User */}
        {currentStore?.email === 'demo@caramelopdv.com' && <DemoGuide />}

        <ErrorBoundary>
          <div className="page-container">
            <Routes>
              <Route path="/dashboard" element={<Dashboard store={currentStore} />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/products" element={<Products />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sellers" element={<Sellers />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/returns" element={<Placeholder title="Devoluções" />} />
              <Route path="/tables" element={currentStore?.enableComandas ? <Tables store={currentStore} /> : <Navigate to="/dashboard" />} />
              <Route path="/kitchen" element={currentStore?.enableComandas ? <Kitchen store={currentStore} /> : <Navigate to="/dashboard" />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
};

const Placeholder = ({ title }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    color: 'var(--gray-400)'
  }}>
    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</h1>
    <h2>{title} em Desenvolvimento</h2>
    <p>Em breve disponível na versão Premium</p>
    <Link to="/dashboard" className="btn btn-primary mt-4">Voltar ao Início</Link>
  </div>
);

export default App;
