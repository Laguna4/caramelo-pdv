import { useState, useEffect } from 'react';
import { FaBox, FaSearch, FaDollarSign, FaBarcode, FaLock, FaChartPie, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../services/dbService';
import { getCurrentStore, getCurrentUser } from '../utils/storage';
import { formatCurrency } from '../utils/calculations';
import PinModal from '../components/PinModal';

const Inventory = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Totals
    const [stats, setStats] = useState({
        totalItems: 0,
        totalStock: 0,
        costValue: 0,
        sellValue: 0,
        potentialProfit: 0
    });

    useEffect(() => {
        const load = async () => {
            const store = getCurrentStore();
            if (store) {
                const data = await getProducts(store.id);
                setProducts(data);

                // Calculate Stats
                let stock = 0;
                let cost = 0;
                let sell = 0;
                data.forEach(p => {
                    const q = p.stock || 0;
                    stock += q;
                    cost += (p.costPrice || 0) * q;
                    sell += (p.price || 0) * q;
                });

                setStats({
                    totalItems: data.length,
                    totalStock: stock,
                    costValue: cost,
                    sellValue: sell,
                    potentialProfit: sell - cost
                });
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
            {/* Header */}
            <div className="flex-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-3 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Consulta & Estoque</h1>
                        <p className="text-gray-500 text-sm">Localize produtos e verifique o balanço</p>
                    </div>
                </div>
                {!isAuthorized ? (
                    <button
                        onClick={() => setShowPinModal(true)}
                        className="btn bg-gray-900 border border-gray-800 flex items-center gap-2 hover:bg-gray-800"
                    >
                        <FaLock className="text-yellow-500" /> Ver Relatório Financeiro
                    </button>
                ) : (
                    <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20 text-sm font-bold flex items-center gap-2">
                        <FaChartPie /> Modo Administrador Ativo
                    </div>
                )}
            </div>

            {/* Quick Stats (Only if authorized) */}
            {isAuthorized && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
                    <div className="card-premium">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Itens no Estoque</p>
                        <h2 className="text-2xl font-bold">{stats.totalStock} <span className="text-xs font-normal text-gray-600">unidades</span></h2>
                    </div>
                    <div className="card-premium border-l-4 border-blue-500">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Valor de Custo (Investido)</p>
                        <h2 className="text-2xl font-bold text-blue-400">{formatCurrency(stats.costValue)}</h2>
                    </div>
                    <div className="card-premium border-l-4 border-green-500">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Valor de Venda (Bruto)</p>
                        <h2 className="text-2xl font-bold text-green-400">{formatCurrency(stats.sellValue)}</h2>
                    </div>
                    <div className="card-premium border-l-4 border-orange-500">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Lucro Projetado</p>
                        <h2 className="text-2xl font-bold text-orange-400">{formatCurrency(stats.potentialProfit)}</h2>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative mb-6">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                    type="text"
                    placeholder="Bipe o código ou digite o nome do produto..."
                    className="w-full bg-[#0a0a0a] border-2 border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-xl focus:border-primary outline-none transition-all shadow-2xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            {/* Product List */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[#111] text-gray-500 text-xs uppercase font-bold border-b border-gray-800">
                        <tr>
                            <th className="p-4">Produto</th>
                            <th className="p-4">Cód. Barras</th>
                            <th className="p-4 text-center">Estoque</th>
                            <th className="p-4 text-right">Preço de Venda</th>
                            {isAuthorized && <th className="p-4 text-right">Preço de Custo</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <div className="font-bold text-white group-hover:text-primary transition-colors">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.category}</div>
                                </td>
                                <td className="p-4 font-mono text-gray-400 text-sm">{p.barcode || '-'}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.stock <= 5 ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                        {p.stock} {p.unit || 'UN'}
                                    </span>
                                </td>
                                <td className="p-4 text-right text-xl font-bold text-white group-hover:text-green-400">
                                    {formatCurrency(p.price)}
                                </td>
                                {isAuthorized && (
                                    <td className="p-4 text-right text-gray-400 font-mono">
                                        {formatCurrency(p.costPrice || 0)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredProducts.length === 0 && (
                    <div className="p-20 text-center text-gray-600">
                        <FaBox size={40} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhum produto encontrado</p>
                    </div>
                )}
            </div>

            {/* Pin Modal for Admin View */}
            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                title="Acesso ao Relatório Financeiro de Estoque"
                requiredRole="ADMIN"
                onSuccess={(user) => {
                    if (user.role === 'ADMIN' || user.role === 'OWNER') {
                        setIsAuthorized(true);
                        setShowPinModal(false);
                    } else {
                        alert('Acesso Negado: Apenas ADMINISTRADORES podem ver dados financeiros.');
                    }
                }}
            />
        </div>
    );
};

export default Inventory;
