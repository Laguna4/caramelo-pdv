import { useState, useEffect, useMemo } from 'react';
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
    const [sortOrder, setSortOrder] = useState('name_asc');

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

    const sortedAndFiltered = useMemo(() => {
        let result = products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode?.includes(searchTerm)
        );

        return result.sort((a, b) => {
            if (sortOrder === 'name_asc') return a.name.localeCompare(b.name);
            if (sortOrder === 'name_desc') return b.name.localeCompare(a.name);
            if (sortOrder === 'price_asc') return (a.price || 0) - (b.price || 0);
            if (sortOrder === 'price_desc') return (b.price || 0) - (a.price || 0);
            if (sortOrder === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
            if (sortOrder === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
            return 0;
        });
    }, [products, searchTerm, sortOrder]);

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-3 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors shadow-lg border border-gray-800">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Consulta & Estoque</h1>
                        <p className="text-gray-500 text-xs md:text-sm">Localize produtos e verifique o balanço</p>
                    </div>
                </div>
                {!isAuthorized ? (
                    <button
                        onClick={() => setShowPinModal(true)}
                        className="btn bg-gray-900 border border-gray-800 flex items-center justify-center gap-2 hover:bg-gray-800 w-full md:w-auto py-3 px-6 rounded-xl shadow-xl transition-all"
                    >
                        <FaLock className="text-yellow-500" /> <span className="text-sm font-bold">Ver Relatório Financeiro</span>
                    </button>
                ) : (
                    <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20 text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm">
                        <FaChartPie className="animate-pulse" /> Modo Administrador Ativo
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

            {/* Search Bar and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
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
                <div className="w-full md:w-64">
                    <select 
                        className="w-full h-full min-h-[58px] bg-[#0a0a0a] border-2 border-gray-800 rounded-2xl px-4 text-gray-300 focus:border-primary outline-none transition-all cursor-pointer font-bold"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="name_asc">A-Z (Alfabética)</option>
                        <option value="name_desc">Z-A</option>
                        <option value="price_asc">Menor Preço</option>
                        <option value="price_desc">Maior Preço</option>
                        <option value="stock_asc">Menor Estoque</option>
                        <option value="stock_desc">Maior Estoque</option>
                    </select>
                </div>
            </div>

            {/* Product List */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-left">
                    <thead className="bg-[#111] text-gray-500 text-xs uppercase font-black border-b border-gray-800/50">
                        <tr>
                            <th className="p-4 lg:p-6">Identificação do Produto</th>
                            <th className="p-4 lg:p-6">Cód. Barras</th>
                            <th className="p-4 lg:p-6 text-center">Nível Estoque</th>
                            <th className="p-4 lg:p-6 text-right">Valor Venda</th>
                            {isAuthorized && <th className="p-4 lg:p-6 text-right">Investimento</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                        {sortedAndFiltered.map(p => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-all group border-b border-gray-800/10">
                                <td className="p-4 lg:p-6">
                                    <div className="font-black text-white text-base lg:text-lg group-hover:text-primary transition-colors">{p.name}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1 opacity-60">
                                        {p.category}
                                    </div>
                                </td>
                                <td className="p-4 lg:p-6 font-mono text-gray-400 text-sm">{p.barcode || '-'}</td>
                                <td className="p-4 lg:p-6 text-center">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${p.stock <= 5 ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
                                        {p.stock} {p.unit || 'UN'}
                                    </span>
                                </td>
                                <td className="p-4 lg:p-6 text-right text-xl font-black text-white group-hover:text-green-400 transition-all font-mono">
                                    {formatCurrency(p.price)}
                                </td>
                                {isAuthorized && (
                                    <td className="p-4 lg:p-6 text-right text-gray-500 font-mono text-sm opacity-50 italic">
                                        {formatCurrency(p.costPrice || 0)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-800/30">
                    {sortedAndFiltered.map(p => (
                        <div key={p.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex justify-between items-start mb-3 gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-white text-base truncate">{p.name}</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">{p.category}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-black text-white font-mono">{formatCurrency(p.price)}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Preço Saída</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-[#050505] p-3 rounded-2xl border border-gray-800/50 mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-600 uppercase font-black">Cód. Barras</span>
                                    <span className="text-xs font-mono text-gray-400">{p.barcode || 'S/G'}</span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[9px] text-gray-600 uppercase font-black mb-1">Disponível</span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border shadow-inner ${p.stock <= 5 ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
                                        {p.stock} <small className="opacity-60">{p.unit || 'UN'}</small>
                                    </span>
                                </div>
                            </div>
                            
                            {isAuthorized && (
                                <div className="mt-3 flex justify-between items-center px-3 text-[10px]">
                                    <span className="text-gray-600 font-bold uppercase tracking-widest">Custo Operacional:</span>
                                    <span className="text-gray-400 font-mono italic">{formatCurrency(p.costPrice || 0)}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {sortedAndFiltered.length === 0 && (
                    <div className="p-24 text-center text-gray-700">
                        <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800 shadow-xl">
                            <FaBox size={40} className="text-gray-800" />
                        </div>
                        <p className="font-black uppercase text-xs tracking-[0.3em] opacity-40">Nenhum produto localizado</p>
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
