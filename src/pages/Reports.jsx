import { useState, useEffect } from 'react';
import { FaSearch, FaTimes, FaPrint, FaTrash, FaUndo, FaExchangeAlt, FaFileInvoiceDollar, FaLock } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import PinModal from '../components/PinModal';
import { formatCurrency, formatDate, generateId } from '../utils/calculations';
import { getCurrentStore } from '../utils/storage';
import { getSales, getSellers, getTransactions } from '../services/dbService';

const Reports = () => {
    // Security
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [showPinModal, setShowPinModal] = useState(true);

    const handleAuthSuccess = () => {
        setIsAuthorized(true);
        setShowPinModal(false);
    };

    // Store Info for Theme
    const [storeName, setStoreName] = useState('');

    // Exchange/Voucher State
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [voucherAmount, setVoucherAmount] = useState(0);

    // Data State
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [timelineData, setTimelineData] = useState([]); // Chart Data
    const [selectedSale, setSelectedSale] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Filter logic & Report Aggregation
    const [reportData, setReportData] = useState({
        totalSales: 0,
        netProfit: 0,
        ticketAverage: 0,
        bySeller: [],
        byPayment: [],
        totalWithVoucher: 0,
        voucherTotal: 0,
        receivableTotal: 0,
        outrosTotal: 0,
        totalCost: 0
    });

    // New Filter States
    const [sellerFilter, setSellerFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sellersList, setSellersList] = useState([]); // For dropdown

    // LOAD DATA ON MOUNT
    useEffect(() => {
        const load = async () => {
            const store = getCurrentStore();
            if (store) {
                setStoreName(store.name || 'Vexa');

                // Load Sales
                const loadedSales = await getSales(store.id);
                setSales(loadedSales.reverse());

                // Load Sellers
                try {
                    const dbSellers = await getSellers(store.id);
                    const historicalNames = new Set();
                    loadedSales.forEach(s => {
                        if (s.sellerName && s.sellerName !== 'Loja' && !dbSellers.find(ds => ds.name === s.sellerName)) {
                            historicalNames.add(s.sellerName);
                        }
                    });
                    const combinedSellers = [
                        ...dbSellers,
                        ...Array.from(historicalNames).map(name => ({ id: name, name: name, isHistorical: true }))
                    ];
                    setSellersList(combinedSellers);
                } catch (err) {
                    console.error("Error loading sellers", err);
                }

                // Load Transactions
                const loadedTransactions = await getTransactions(store.id);
                setTransactions(loadedTransactions);
            }
        };
        load();
    }, []);

    // Filter logic & Report Aggregation
    useEffect(() => {
        let result = sales.filter(s => s.status !== 'CANCELLED');

        if (searchTerm) {
            result = result.filter(s => s.id.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (sellerFilter) {
            result = result.filter(s => s.sellerId === sellerFilter || s.sellerName === sellerFilter);
        }

        if (startDate) {
            result = result.filter(s => {
                const localSaleDate = new Date(s.date).toLocaleDateString('en-CA');
                return localSaleDate >= startDate;
            });
        }
        if (endDate) {
            result = result.filter(s => {
                const localSaleDate = new Date(s.date).toLocaleDateString('en-CA');
                return localSaleDate <= endDate;
            });
        }

        setFilteredSales(result);

        // Filter Transactions (Revenue from Debt Payments)
        let transResult = transactions.filter(t => t.paid === true && t.type === 'REVENUE');
        if (sellerFilter) {
            transResult = transResult.filter(t => t.sellerId === sellerFilter || t.sellerName === sellerFilter);
        }
        if (startDate) {
            transResult = transResult.filter(t => t.date >= startDate);
        }
        if (endDate) {
            transResult = transResult.filter(t => t.date <= endDate);
        }
        setFilteredTransactions(transResult);

        // --- Timeline Aggregation ---
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
        const timelineMap = {};
        const isMonthly = diffDays > 60;
        const isHourly = diffDays <= 1;

        result.forEach(sale => {
            const date = new Date(sale.date);
            let key = isMonthly ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : date.toLocaleDateString('en-CA');
            if (isHourly) key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;

            if (!timelineMap[key]) timelineMap[key] = 0;

            // Only add liquid (non-debt) amount to timeline
            let saleLiquid = sale.total;
            if (sale.payment?.payments) {
                const pendingAmt = sale.payment.payments
                    .filter(p => p.method === 'CREDIARIO' || p.method === 'VOUCHER')
                    .reduce((acc, p) => acc + p.amount, 0);
                saleLiquid -= pendingAmt;
            }
            timelineMap[key] += saleLiquid;
        });

        transResult.forEach(t => {
            const date = new Date(t.date + 'T12:00:00');
            const key = isMonthly ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : date.toLocaleDateString('en-CA');
            if (!timelineMap[key]) timelineMap[key] = 0;
            timelineMap[key] += t.amount;
        });

        // Fill gap logic remains largely the same but simplified for brevity in this fix
        const chartData = [];
        const iterDate = new Date(start);
        iterDate.setHours(0, 0, 0, 0);
        const endDateLoop = new Date(end);
        endDateLoop.setHours(23, 59, 59, 999);
        let loops = 0;

        while (iterDate <= endDateLoop && loops < 1000) {
            let key, label;
            if (isMonthly) {
                key = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`;
                label = iterDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                iterDate.setMonth(iterDate.getMonth() + 1);
            } else if (isHourly) {
                key = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}-${String(iterDate.getHours()).padStart(2, '0')}`;
                label = `${String(iterDate.getHours()).padStart(2, '0')}:00`;
                iterDate.setHours(iterDate.getHours() + 1);
            } else {
                key = iterDate.toLocaleDateString('en-CA');
                label = iterDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                iterDate.setDate(iterDate.getDate() + 1);
            }
            chartData.push({ name: label, value: timelineMap[key] || 0 });
            loops++;
        }
        setTimelineData(chartData);

        // --- Totals Aggregation ---
        let total = 0;
        let proRataProfit = 0;
        let proRataCost = 0;
        const sellersMap = {};
        const paymentsMap = {};

        // Calculate Average Store Margin for Transaction estimation
        let totalPotentialRevenue = 0;
        let totalPotentialProfit = 0;
        sales.forEach(s => {
            if (s.status === 'CANCELLED') return;
            totalPotentialRevenue += s.total;
            s.items.forEach(item => {
                totalPotentialProfit += ((item.price * item.quantity) - ((item.costPrice || 0) * item.quantity));
            });
        });
        const averageMargin = totalPotentialRevenue > 0 ? (totalPotentialProfit / totalPotentialRevenue) : 0.3; // Default 30%

        result.forEach(sale => {
            total += sale.total;

            // Calculate Sale Global Margin
            let saleGlobalProfit = 0;
            let saleGlobalCost = 0;
            sale.items.forEach(item => {
                const itemRevenue = item.price * item.quantity;
                const itemCost = (item.costPrice || 0) * item.quantity;
                saleGlobalProfit += (itemRevenue - itemCost);
                saleGlobalCost += itemCost;
            });

            const sellerName = sale.sellerName || 'Loja';
            if (!sellersMap[sellerName]) sellersMap[sellerName] = 0;

            // Immediate revenue attribution (non-debt part)
            let saleLiquid = sale.total;
            let paymentSum = 0;
            let remainingChange = parseFloat(sale.payment?.change) || 0;

            if (sale.payment?.payments) {
                sale.payment.payments.forEach(p => {
                    let method = p.methodLabel || 'Outros';
                    if (method.toUpperCase().includes('VALE') || method.toUpperCase().includes('TROCA')) {
                        method = 'Vale Troca';
                    } else if (method.toUpperCase().includes('DINHEIRO')) {
                        method = 'Dinheiro';
                    } else if (method.toUpperCase().includes('CARTÃO DE CRÉDITO')) {
                        method = 'Cartão de Crédito';
                    } else if (method.toUpperCase().includes('CARTÃO DE DÉBITO')) {
                        method = 'Cartão de Débito';
                    } else if (method.toUpperCase().includes('PIX')) {
                        method = 'PIX';
                    } else if (method.toUpperCase().includes('CREDIÁRIO')) {
                        method = 'Crediário (Fiado)';
                    } else {
                        method = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
                    }

                    if (!paymentsMap[method]) paymentsMap[method] = 0;
                    let amountVal = parseFloat(p.amount) || 0;

                    if (p.method === 'MONEY' && remainingChange > 0) {
                        const changeToSubtract = Math.min(amountVal, remainingChange);
                        amountVal -= changeToSubtract;
                        remainingChange -= changeToSubtract;
                    }

                    paymentsMap[method] += amountVal;
                    paymentSum += amountVal;

                    if (p.method === 'CREDIARIO' || p.method === 'VOUCHER') saleLiquid -= p.amount; // Still subtract original pending amt for liquid calculation
                });
            } else {
                paymentSum = sale.total; // Default for old single payments
            }
            sellersMap[sellerName] += saleLiquid;

            // Pro-rata counting for current sale (only what was paid now)
            const paidRatio = sale.total > 0 ? (saleLiquid / sale.total) : 0;
            proRataProfit += (saleGlobalProfit * paidRatio);
            proRataCost += (saleGlobalCost * paidRatio);

            const difference = sale.total - paymentSum;
            if (difference > 0.05) paymentsMap['Outros'] = (paymentsMap['Outros'] || 0) + difference;
        });

        // Add Transaction Payments (Debt payments from previous or current sales)
        transResult.forEach(t => {
            const method = t.paymentMethod === 'MONEY' ? 'Dinheiro' : (t.paymentMethod === 'PIX' ? 'PIX' : (t.paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' : (t.paymentMethod === 'DEBIT_CARD' ? 'Cartão de Débito' : 'Outros')));
            paymentsMap[method] = (paymentsMap[method] || 0) + t.amount;
            const sName = t.sellerName || 'Loja';
            sellersMap[sName] = (sellersMap[sName] || 0) + t.amount;

            // Pro-rata attribution for Debt Payment
            // Since we don't have the item breakdown for historical debts in the transaction record,
            // we use the average store margin to estimate its profit/cost contribution.
            const estimatedProfit = t.amount * averageMargin;
            const estimatedCost = t.amount - estimatedProfit;
            proRataProfit += estimatedProfit;
            proRataCost += estimatedCost;
        });

        const totalRevenue = Object.entries(paymentsMap)
            .filter(([name]) => name !== 'Vale Troca' && name !== 'Crediário (Fiado)' && name !== 'Outros')
            .reduce((acc, [_, val]) => acc + val, 0);

        setReportData({
            totalSales: totalRevenue,
            totalWithVoucher: total,
            voucherTotal: paymentsMap['Vale Troca'] || 0,
            receivableTotal: paymentsMap['Crediário (Fiado)'] || 0,
            outrosTotal: paymentsMap['Outros'] || 0,
            netProfit: proRataProfit,
            totalCost: proRataCost,
            ticketAverage: result.length > 0 ? total / result.length : 0,
            bySeller: Object.entries(sellersMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            byPayment: Object.entries(paymentsMap).filter(([name]) => name !== 'Vale Troca' && name !== 'Crediário (Fiado)' && name !== 'Outros').map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
        });

    }, [searchTerm, sellerFilter, startDate, endDate, sales]);

    // Safe Permission Check with Try-Catch
    let hasVoucherPermission = false;
    let hasCancelPermission = false;
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('vexa_report_user') || '{}');
        const role = currentUser.role;
        const perms = currentUser.permissions || [];

        hasVoucherPermission = role === 'ADMIN' || role === 'MANAGER' || perms.includes('issue_voucher');
        hasCancelPermission = role === 'ADMIN' || role === 'MANAGER';
    } catch (e) {
        console.error("Permission Check Error", e);
    }

    // Safe Date Formatter
    const safeDate = (dateStr) => {
        try {
            if (!dateStr) return '-';
            return formatDate(dateStr);
        } catch (e) {
            return 'Data Inválida';
        }
    };

    return (
        <div className="container-center" style={{ padding: '2rem', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: !isAuthorized ? 'hidden' : 'auto' }}>
            {/* Security Overlay */}
            {!isAuthorized && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
                    zIndex: 50, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="bg-[#111] p-8 rounded-2xl border border-gray-800 text-center max-w-sm w-full shadow-2xl">
                        <FaLock size={48} className="text-primary mb-4 mx-auto" icon="fa-solid fa-lock" />
                        <h2 className="text-white text-2xl font-bold mb-2">Acesso Restrito</h2>
                        <p className="text-gray-400 mb-6">Relatórios Financeiros são exclusivos para a Gerência.</p>
                        <button
                            className="btn btn-primary w-full py-3 text-lg font-bold shadow-lg hover:shadow-primary/20 transition-all"
                            onClick={() => setShowPinModal(true)}
                        >
                            DESBLOQUEAR
                        </button>
                    </div>

                    <PinModal
                        isOpen={showPinModal}
                        onClose={() => setShowPinModal(false)}
                        onSuccess={(user) => {
                            // Check for MANAGER role OR specific 'view_reports' permission
                            if (user.role === 'ADMIN' || user.role === 'MANAGER' || (user.permissions && user.permissions.includes('view_reports'))) {
                                setIsAuthorized(true);
                                setShowPinModal(false);
                                // Store current user for further checks
                                sessionStorage.setItem('vexa_report_user', JSON.stringify(user));
                            } else {
                                alert('Acesso Negado: Você não tem permissão para ver relatórios.');
                            }
                        }}
                        title="Senha de Gerente"
                        requiredRole="SELLER" // Allow any seller to *try*, we check permissions manually
                    />
                </div>
            )}

            {/* HEADER SIMPLES */}
            <div className="flex-between mb-6 border-b border-gray-800 pb-4">
                <h1 className="text-2xl font-bold text-white uppercase tracking-wider">
                    Relatório Financeiro
                </h1>
                <div className="text-right">
                    <div className="text-sm text-gray-400">Período Selecionado</div>
                    <div className="text-white font-mono">{startDate ? safeDate(startDate) : 'Início'} até {endDate ? safeDate(endDate) : 'Hoje'}</div>
                </div>
            </div>

            {/* FILTROS (Compactos) */}
            <div className="flex gap-4 mb-8 bg-[#151515] p-4 rounded border border-gray-800 items-end">
                <div className="flex-1">
                    <label className="text-xs uppercase font-bold text-gray-500 mb-1 block">Vendedor</label>
                    <select
                        className="w-full bg-[#121212] border border-gray-700 rounded p-2 text-white text-sm focus:border-primary outline-none"
                        value={sellerFilter}
                        onChange={(e) => setSellerFilter(e.target.value)}
                    >
                        <option value="">Todos os Vendedores</option>
                        <option value="OWNER">Admin (Loja)</option>
                        {sellersList.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs uppercase font-bold text-gray-500 mb-1 block">De</label>
                    <input
                        type="date"
                        className="bg-[#121212] border border-gray-700 rounded p-2 text-white text-sm focus:border-primary outline-none"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs uppercase font-bold text-gray-500 mb-1 block">Até</label>
                    <input
                        type="date"
                        className="bg-[#121212] border border-gray-700 rounded p-2 text-white text-sm focus:border-primary outline-none"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <button
                    className="btn btn-secondary py-2 hover:bg-white/10"
                    onClick={() => { setSearchTerm(''); setSellerFilter(''); setStartDate(''); setEndDate(''); }}
                >
                    Limpar
                </button>
                <button
                    className="btn btn-primary py-2 px-4 font-bold"
                    onClick={() => {
                        const today = new Date().toLocaleDateString('en-CA');
                        setStartDate(today);
                        setEndDate(today);
                    }}
                >
                    Hoje
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* BLOC 1: RESUMO DE VENDAS (Sem Ícones, Estilo Tabela) */}
                <div className="bg-white text-black rounded-sm overflow-hidden border border-gray-300">
                    <div className="bg-gray-200 p-2 border-b-2 border-black text-center font-bold uppercase text-sm tracking-wide">
                        Resumo de Vendas
                    </div>
                    <div className="p-4">
                        <table className="w-full text-sm font-mono border-collapse">
                            <thead>
                                <tr className="border-b border-black">
                                    <th className="text-left py-1">Formas Pagamento:</th>
                                    <th className="text-right py-1">Total Venda:</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.byPayment.length > 0 ? reportData.byPayment.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-300 last:border-0 hover:bg-gray-50">
                                        <td className="py-2 uppercase">{item.name}</td>
                                        <td className="py-2 text-right">{formatCurrency(item.value)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="2" className="py-4 text-center text-gray-500">- Sem movimentação -</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold border-t-2 border-black">
                                <tr>
                                    <td className="py-2 pl-2">Total Recebido:</td>
                                    <td className="py-2 pr-2 text-right text-black">{formatCurrency(reportData.totalSales)}</td>
                                </tr>
                                {reportData.receivableTotal > 0 && (
                                    <tr className="border-t border-gray-300 text-blue-600">
                                        <td className="py-1 pl-2 text-xs font-mono tracking-tighter">Total a Receber (Fiado):</td>
                                        <td className="py-1 pr-2 text-right text-xs font-mono">{formatCurrency(reportData.receivableTotal)}</td>
                                    </tr>
                                )}
                            </tfoot>
                        </table>

                        {/* Voucher Separate Display */}
                        {reportData.voucherTotal > 0 && (
                            <div className="mt-4 pt-2 border-t border-dashed border-gray-400 text-gray-600 font-bold">
                                <div className="flex justify-between py-1">
                                    <span>+ PAGAMENTO EM VALE (Crédito):</span>
                                    <span>{formatCurrency(reportData.voucherTotal)}</span>
                                </div>
                            </div>
                        )}

                        {/* Outros/Discrepancies Section */}
                        {reportData.outrosTotal > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-gray-400 text-red-600 text-xs">
                                <div className="flex justify-between py-1 font-bold">
                                    <span>? NÃO IDENTIFICADO / OUTROS:</span>
                                    <span>{formatCurrency(reportData.outrosTotal)}</span>
                                </div>
                                <div className="text-right italic" style={{ fontSize: '0.65rem' }}>
                                    (Verificar vendas com cadastro incompleto)
                                </div>
                            </div>
                        )}
                    </div>
                </div>



                {/* TIMELINE CHART (YOUTUBE STYLE) */}
                <div className="bg-white text-black rounded-sm overflow-hidden border border-gray-300 col-span-1 lg:col-span-2 shadow-sm" style={{ height: '350px' }}>
                    <div className="bg-gray-200 p-2 border-b-2 border-black text-center font-bold uppercase text-sm tracking-wide">
                        Evolução do Faturamento
                    </div>
                    <div className="p-4 h-full relative">
                        <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={timelineData}>
                                <defs>
                                    <linearGradient id="colorVe" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={storeName?.toLowerCase().includes('caramelo') ? '#ef4444' : '#d4af37'} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={storeName?.toLowerCase().includes('caramelo') ? '#ef4444' : '#d4af37'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#666' }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#666' }}
                                    tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#333', border: 'none', borderRadius: '4px', color: '#fff' }}
                                    itemStyle={{ color: '#d4af37' }} // Gold text for value
                                    formatter={(value) => [formatCurrency(value), 'Faturamento']}
                                    labelStyle={{ color: '#aaa', marginBottom: '0.2rem' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={storeName?.toLowerCase().includes('caramelo') ? '#ef4444' : '#d4af37'}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorVe)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        {timelineData.reduce((a, b) => a + b.value, 0) === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                                Sem dados no período
                            </div>
                        )}
                    </div>
                </div>

                {/* PIE CHART */}
                <div className="bg-white text-black rounded-sm overflow-hidden border border-gray-300 shadow-sm" style={{ height: '350px' }}>
                    <div className="bg-gray-200 p-2 border-b-2 border-black text-center font-bold uppercase text-sm tracking-wide">
                        Distribuição por Pagamento
                    </div>
                    <div className="p-4 h-full">
                        <ResponsiveContainer width="100%" height="85%">
                            <PieChart>
                                <Pie
                                    data={reportData.byPayment}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {reportData.byPayment.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#d4af37', '#333333', '#999999', '#000000'][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* BLOCO 2: RELATÓRIO FINANCEIRO (Estilo Fiscal) */}
                <div className="flex flex-col gap-6">

                    {/* Total Geral Style */}
                    <div className="bg-white text-black rounded-sm overflow-hidden border border-gray-300 shadow-sm">
                        <div className="bg-gray-200 p-2 border-b-2 border-black text-center font-bold uppercase text-sm tracking-wide">
                            Total Geral
                        </div>
                        <div className="p-4 flex flex-col gap-1 font-mono text-sm">

                            {/* Entradas */}
                            <div className="flex justify-between items-center p-2 border border-black bg-blue-50">
                                <span className="font-bold text-blue-900 font-sans">(+) Entradas Brutas:</span>
                                <span className="font-bold text-blue-900 text-lg">{formatCurrency(reportData.totalSales)}</span>
                            </div>

                            {/* Custos (Simulado como 'Saídas') */}
                            <div className="flex justify-between items-center p-2 border border-black bg-red-50 mt-1">
                                <span className="font-bold text-red-700 font-sans">(-) Custo Produtos:</span>
                                <span className="font-bold text-red-700 text-lg">{formatCurrency(reportData.totalCost)}</span>
                            </div>

                            {/* Saldo */}
                            <div className="flex justify-between items-center p-2 border-2 border-black bg-green-100 mt-2">
                                <span className="font-bold text-black font-sans uppercase">(=) Lucro Líquido:</span>
                                <span className="font-bold text-green-800 text-xl">{formatCurrency(reportData.netProfit)}</span>
                            </div>

                            <div className="text-right text-xs text-gray-500 mt-1">
                                Margem de Lucro: {reportData.totalSales > 0 ? ((reportData.netProfit / reportData.totalSales) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                    </div>

                    {/* Ranking Simples */}
                    <div className="bg-[#111] border border-gray-800 p-4 rounded-sm">
                        <div className="text-gray-400 text-xs font-bold uppercase mb-3 border-b border-gray-800 pb-2">Top Vendedores</div>
                        <ul className="text-sm space-y-2">
                            {reportData.bySeller.map((seller, idx) => (
                                <li key={idx} className="flex justify-between text-gray-300">
                                    <span>{idx + 1}. {seller.name}</span>
                                    <span className="text-white font-mono">{formatCurrency(seller.value)}</span>
                                </li>
                            ))}
                            {reportData.bySeller.length === 0 && <li className="text-gray-600 italic">Nenhum dado</li>}
                        </ul>
                    </div>

                </div>
            </div>

            {/* Footer Alert */}
            <div className="mt-auto pt-6 text-center">
                <p className="text-xs text-gray-600 font-mono">
                    * Relatório gerado em sistemavexa.com.br
                </p>
            </div>
        </div>
    );
};

export default Reports;
