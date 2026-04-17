import { useState, useEffect } from 'react';
import { FaSearch, FaTimes, FaPrint, FaTrash, FaUndo, FaExchangeAlt, FaFileInvoiceDollar, FaLock } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import PinModal from '../components/PinModal';
import { formatCurrency, formatDate, generateId } from '../utils/calculations';
import { getCurrentStore } from '../utils/storage';
import { getSales, getSellers, getTransactions, getPastRegisters } from '../services/dbService';

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
        totalCost: 0,
        byProduct: [],
        byCustomer: [],
        totalDiscount: 0
    });

    // New Filter States
    const [sellerFilter, setSellerFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sellersList, setSellersList] = useState([]); // For dropdown
    const [cashRegisters, setCashRegisters] = useState([]);
    const [selectedAuditRegister, setSelectedAuditRegister] = useState(null);
    const [rankingView, setRankingView] = useState('sellers'); // 'sellers', 'products', 'customers'

    // LOAD DATA ON MOUNT
    useEffect(() => {
        const load = async () => {
            const store = getCurrentStore();
            if (store) {
                setStoreName(store.name || 'Caramelo');

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

                // Load Registers
                const loadedRegisters = await getPastRegisters(store.id);
                setCashRegisters(loadedRegisters);
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
        let totalDiscountAccumulated = 0;
        let proRataProfit = 0;
        let proRataCost = 0;
        const sellersMap = {};
        const paymentsMap = {};
        const productsMap = {};
        const customersMap = {};

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
            const saleDiscount = parseFloat(sale.payment?.discount) || 0;
            totalDiscountAccumulated += saleDiscount;
            const saleNet = sale.total - saleDiscount;
            let saleLiquid = saleNet;
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
            const paidRatio = saleNet > 0 ? (saleLiquid / saleNet) : 0;
            proRataProfit += ((saleGlobalProfit - saleDiscount) * paidRatio);
            proRataCost += (saleGlobalCost * paidRatio);

            const difference = saleNet - paymentSum;
            if (difference > 0.05) paymentsMap['Outros'] = (paymentsMap['Outros'] || 0) + difference;

            // Product Ranking Aggregation
            sale.items.forEach(item => {
                const pName = item.name || 'Produto sem nome';
                if (!productsMap[pName]) productsMap[pName] = { name: pName, quantity: 0, total: 0 };
                productsMap[pName].quantity += item.quantity;
                productsMap[pName].total += (item.price * item.quantity);
            });

            // Customer Ranking Aggregation
            if (sale.customer?.name) {
                const cName = sale.customer.name;
                if (!customersMap[cName]) customersMap[cName] = { name: cName, total: 0, count: 0 };
                customersMap[cName].total += saleNet;
                customersMap[cName].count += 1;
            }
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
            byPayment: Object.entries(paymentsMap).filter(([name]) => name !== 'Vale Troca' && name !== 'Crediário (Fiado)' && name !== 'Outros').map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            byProduct: Object.values(productsMap).sort((a, b) => b.quantity - a.quantity),
            byCustomer: Object.values(customersMap).sort((a, b) => b.total - a.total),
            totalDiscount: totalDiscountAccumulated
        });

    }, [searchTerm, sellerFilter, startDate, endDate, sales, transactions]);

    // Safe Permission Check with Try-Catch
    let hasVoucherPermission = false;
    let hasCancelPermission = false;
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('caramelo_report_user') || '{}');
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

        <div className="container-center p-4 md:p-8 min-h-[calc(100vh-70px)] flex flex-col relative overflow-y-auto">
            {/* Security Overlay (Same logic) */}
            {!isAuthorized && (
                <div className="absolute inset-0 bg-black/98 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-gray-800 max-w-sm w-full shadow-3xl animate-scale-in">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                            <FaLock size={32} className="text-primary" />
                        </div>
                        <h2 className="text-white text-2xl font-black mb-2 uppercase tracking-tight">Acesso Restrito</h2>
                        <p className="text-gray-500 mb-8 text-sm">Relatórios Financeiros são exclusivos para a Gerência do Toro PDV.</p>
                        <button
                            className="btn btn-primary w-full py-4 text-lg font-black shadow-2xl hover:shadow-primary/20 transition-all rounded-2xl"
                            onClick={() => setShowPinModal(true)}
                        >
                            DESBLOQUEAR ACESSO
                        </button>
                    </div>
                </div>
            )}

            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={(user) => {
                    if (user.role === 'ADMIN' || user.role === 'MANAGER' || (user.permissions && user.permissions.includes('view_reports'))) {
                        setIsAuthorized(true);
                        setShowPinModal(false);
                        sessionStorage.setItem('caramelo_report_user', JSON.stringify(user));
                    } else {
                        alert('Acesso Negado: Você não tem permissão para ver relatórios.');
                    }
                }}
                title="Senha de Gerente"
                requiredRole="SELLER"
            />

            {/* HEADER RESPONSIVO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Relatório Financeiro
                    </h1>
                    <p className="text-gray-500 text-xs md:text-sm font-medium">Análise de desempenho e saúde do negócio</p>
                </div>
                <div className="bg-[#0a0a0a] px-4 py-2 rounded-xl border border-gray-800 flex items-center gap-3 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="text-[10px] md:text-xs text-gray-400 uppercase font-black">Período:</div>
                    <div className="text-white font-mono text-xs font-bold leading-none">{startDate ? safeDate(startDate) : 'Início'} ➔ {endDate ? safeDate(endDate) : 'Hoje'}</div>
                </div>
            </div>

            {/* FILTROS RESPONSIVOS */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8 bg-[#0a0a0a] p-4 rounded-2xl border border-gray-800/50 shadow-xl items-end">
                <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-gray-500 mb-1.5 block">Filtrar Vendedor</label>
                    <select
                        className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-white text-sm focus:border-primary outline-none font-bold transition-all"
                        value={sellerFilter}
                        onChange={(e) => setSellerFilter(e.target.value)}
                    >
                        <option value="">TODOS OS VENDEDORES</option>
                        <option value="OWNER">ADMIN (LOJA)</option>
                        {sellersList.map(s => (
                            <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
                    <div className="relative group">
                        <label className="text-[10px] uppercase font-black text-primary mb-1.5 block flex items-center gap-2">
                            Data Inicial
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-[#1a1a1a] border-2 border-primary/60 rounded-xl p-3 text-white text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none font-bold transition-all group-hover:border-primary [color-scheme:dark]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="relative group">
                        <label className="text-[10px] uppercase font-black text-primary mb-1.5 block flex items-center gap-2">
                            Data Final
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-[#1a1a1a] border-2 border-primary/60 rounded-xl p-3 text-white text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none font-bold transition-all group-hover:border-primary [color-scheme:dark]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                <div className="grid grid-cols-2 gap-2 mt-4 md:mt-0">
                    <button
                        className="btn bg-white/5 border border-white/10 py-3 text-[10px] font-black uppercase hover:bg-white/10 hover:border-white/20 rounded-xl transition-all text-gray-300"
                        onClick={() => { setSearchTerm(''); setSellerFilter(''); setStartDate(''); setEndDate(''); }}
                    >
                        Limpar
                    </button>
                    <button
                        className="btn btn-primary py-3 px-4 font-black text-[10px] uppercase shadow-lg rounded-xl"
                        onClick={() => {
                            const today = new Date().toLocaleDateString('en-CA');
                            setStartDate(today);
                            setEndDate(today);
                        }}
                    >
                        Hoje
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* BLOC 1: RESUMO DE VENDAS */}
                <div className="bg-white text-black rounded-3xl overflow-hidden border border-gray-200 shadow-xl">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 text-center font-black uppercase text-[10px] tracking-widest text-gray-500">
                        Resumo de Movimentação
                    </div>
                    <div className="p-6 md:p-8">
                        <table className="w-full text-xs md:text-sm font-mono border-collapse">
                            <thead>
                                <tr className="border-b-2 border-black">
                                    <th className="text-left py-3 uppercase font-black">Forma Pagto.</th>
                                    <th className="text-right py-3 uppercase font-black">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.byPayment.length > 0 ? reportData.byPayment.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 uppercase font-bold text-gray-700">{item.name}</td>
                                        <td className="py-4 text-right font-black">{formatCurrency(item.value)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="2" className="py-8 text-center text-gray-400 italic">- Sem movimentação no período -</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-black border-t-2 border-black">
                                <tr>
                                    <td className="py-4 pl-2 uppercase">Total Final:</td>
                                    <td className="py-4 pr-2 text-right text-xl">{formatCurrency(reportData.totalSales)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Additional Info Cards */}
                        <div className="mt-8 grid grid-cols-1 gap-3">
                            {reportData.totalDiscount > 0 && (
                                <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100/50">
                                    <span className="text-[10px] font-black text-red-800 uppercase tracking-tighter">Total Descontos</span>
                                    <span className="font-black text-red-600">-{formatCurrency(reportData.totalDiscount)}</span>
                                </div>
                            )}
                            {reportData.receivableTotal > 0 && (
                                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-tighter">Fiado (A Receber)</span>
                                    <span className="font-black text-blue-600">{formatCurrency(reportData.receivableTotal)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>



                {/* TIMELINE CHART */}
                <div className="bg-[#0a0a0a] text-white rounded-3xl overflow-hidden border border-gray-800 col-span-1 lg:col-span-2 shadow-2xl h-[350px]">
                    <div className="bg-gray-900/50 p-4 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Fluxo de Faturamento</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                        </div>
                    </div>
                    <div className="p-4 h-full relative">
                        <ResponsiveContainer width="100%" height="75%">
                            <AreaChart data={timelineData}>
                                <defs>
                                    <linearGradient id="colorVe" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#555' }}
                                    minTickGap={20}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#555' }}
                                    tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                                    formatter={(value) => [formatCurrency(value), 'Faturamento']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#d4af37"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorVe)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        {timelineData.reduce((a, b) => a + b.value, 0) === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs font-bold uppercase tracking-widest">
                                Sem movimentação no período
                            </div>
                        )}
                    </div>
                </div>

                {/* PIE CHART */}
                <div className="bg-[#0a0a0a] text-white rounded-3xl overflow-hidden border border-gray-800 shadow-2xl h-[350px]">
                    <div className="bg-gray-900/50 p-4 border-b border-gray-800 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Meios de Pagamento
                    </div>
                    <div className="p-4 h-full">
                        <ResponsiveContainer width="100%" height="75%">
                            <PieChart>
                                <Pie
                                    data={reportData.byPayment}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {reportData.byPayment.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#d4af37', '#ffffff', '#333333', '#111111'][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
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
                            <div className="flex justify-between items-center p-2 border border-black bg-orange-50 mt-1">
                                <span className="font-bold text-orange-700 font-sans">(-) Total Descontos:</span>
                                <span className="font-bold text-orange-700 text-lg">{formatCurrency(reportData.totalDiscount)}</span>
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

                    {/* Ranking Section */}
                    <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-3xl shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                            <div className="flex gap-4 overflow-x-auto pb-2 w-full no-scrollbar">
                                <button
                                    onClick={() => setRankingView('sellers')}
                                    className={`text-[10px] font-black uppercase transition-all whitespace-nowrap px-3 py-1 rounded-full ${rankingView === 'sellers' ? 'bg-primary text-black' : 'text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                                >
                                    Vendedores
                                </button>
                                <button
                                    onClick={() => setRankingView('products')}
                                    className={`text-[10px] font-black uppercase transition-all whitespace-nowrap px-3 py-1 rounded-full ${rankingView === 'products' ? 'bg-primary text-black' : 'text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                                >
                                    Produtos
                                </button>
                                <button
                                    onClick={() => setRankingView('customers')}
                                    className={`text-[10px] font-black uppercase transition-all whitespace-nowrap px-3 py-1 rounded-full ${rankingView === 'customers' ? 'bg-primary text-black' : 'text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                                >
                                    Clientes
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            <ul className="text-sm space-y-4">
                                {rankingView === 'sellers' && (
                                    <>
                                        {reportData.bySeller.map((seller, idx) => (
                                            <li key={idx} className="flex justify-between text-gray-300 items-center p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                                                <span className="truncate pr-4 flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500">{idx + 1}</span>
                                                    <span className="font-bold">{seller.name}</span>
                                                </span>
                                                <span className="text-white font-mono font-black shrink-0">{formatCurrency(seller.value)}</span>
                                            </li>
                                        ))}
                                        {reportData.bySeller.length === 0 && <li className="text-gray-600 italic text-center py-4">Nenhum dado</li>}
                                    </>
                                )}

                                {rankingView === 'products' && (
                                    <>
                                        {reportData.byProduct.map((product, idx) => (
                                            <li key={idx} className="flex justify-between text-gray-300 items-center p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                                                <div className="truncate pr-4 flex flex-col">
                                                    <span className="truncate font-bold"><span className="text-gray-600 mr-2">#{idx + 1}</span> {product.name}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono mt-0.5">{formatCurrency(product.total)} acumulado</span>
                                                </div>
                                                <span className={`shrink-0 font-black px-3 py-1 rounded-lg ${idx < 3 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-gray-900 text-gray-500'}`}>
                                                    {product.quantity} <small className="text-[10px] opacity-60">un</small>
                                                </span>
                                            </li>
                                        ))}
                                        {reportData.byProduct.length === 0 && <li className="text-gray-600 italic text-center py-4">Nenhum dado</li>}
                                    </>
                                )}

                                {rankingView === 'customers' && (
                                    <>
                                        {reportData.byCustomer.map((customer, idx) => (
                                            <li key={idx} className="flex justify-between text-gray-300 items-center p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                                                <div className="truncate pr-4 flex flex-col">
                                                    <span className="truncate font-bold"><span className="text-gray-600 mr-2">#{idx + 1}</span> {customer.name}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono mt-0.5">{customer.count} compras</span>
                                                </div>
                                                <span className="text-white font-mono font-black shrink-0">{formatCurrency(customer.total)}</span>
                                            </li>
                                        ))}
                                        {reportData.byCustomer.length === 0 && <li className="text-gray-600 italic text-center py-4">
                                            Somente vendas com cliente identificado.
                                        </li>}
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEGMENTO: HISTÓRICO DE CAIXA (RESPONSIVO) */}
            <div className="mt-12 bg-white text-black rounded-3xl overflow-hidden border border-border shadow-2xl">
                <div className="bg-gray-900 p-4 text-white text-center font-black uppercase text-xs tracking-widest flex justify-between items-center px-6">
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Auditoria de Caixas
                    </span>
                    <span className="text-[10px] font-normal opacity-50 hidden sm:block">Últimos 20 turnos fechados</span>
                </div>
                <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-xs font-mono border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="text-left p-4 uppercase font-black text-[10px] text-gray-500">Data / Turno</th>
                                <th className="text-left p-4 uppercase font-black text-[10px] text-gray-500">Operador</th>
                                <th className="text-right p-4 uppercase font-black text-[10px] text-gray-500">Abertura</th>
                                <th className="text-right p-4 uppercase font-black text-[10px] text-gray-400">Esperado</th>
                                <th className="text-right p-4 uppercase font-black text-[10px] text-gray-500">Fechado</th>
                                <th className="text-right p-4 uppercase font-black text-[10px] text-gray-500">Diferença</th>
                                <th className="text-center p-4 uppercase font-black text-[10px] text-gray-500">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cashRegisters.length > 0 ? cashRegisters.map((reg, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold">{new Date(reg.closedAt || reg.date).toLocaleString()}</td>
                                    <td className="p-4 font-sans font-bold text-gray-600">{reg.closedByName || '---'}</td>
                                    <td className="p-4 text-right">{formatCurrency(reg.openingBalance)}</td>
                                    <td className="p-4 text-right text-gray-400">{formatCurrency(reg.expectedBalance)}</td>
                                    <td className="p-4 text-right font-black text-gray-900">{formatCurrency(reg.closingBalance)}</td>
                                    <td className={`p-4 text-right font-black ${reg.difference < 0 ? 'text-red-600' : (reg.difference > 0 ? 'text-blue-600' : 'text-green-600')}`}>
                                        {formatCurrency(reg.difference)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => setSelectedAuditRegister(reg)}
                                            className="bg-primary text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:shadow-lg transition-all"
                                        >
                                            Detalhes
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="p-16 text-center text-gray-400 font-sans italic text-sm">Nenhum histórico de caixa fechado encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AUDIT MODAL (RESPONSIVO) */}
            {selectedAuditRegister && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-white text-black p-6 md:p-10 rounded-[2.5rem] w-full max-w-xl shadow-3xl relative max-h-[90vh] overflow-y-auto animate-scale-in">
                        <button onClick={() => setSelectedAuditRegister(null)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors">
                            <FaTimes size={20} />
                        </button>

                        <div className="text-center border-b border-gray-100 pb-8 mb-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaFileInvoiceDollar size={24} className="text-gray-400" />
                            </div>
                            <h2 className="font-black text-2xl uppercase tracking-tighter">Detalhes do Turno</h2>
                            <p className="text-[10px] font-bold text-gray-400 bg-gray-50 inline-block px-3 py-1 rounded-full mt-2 uppercase tracking-widest">{new Date(selectedAuditRegister.closedAt || selectedAuditRegister.date).toLocaleString()}</p>
                            <p className="text-base mt-2 font-bold text-gray-800">Responsável: {selectedAuditRegister.closedByName}</p>
                        </div>

                        <div className="font-mono text-xs md:text-sm space-y-4 border-b border-gray-100 pb-8 mb-8">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 uppercase font-bold">Saldo Inicial:</span>
                                <span className="font-black">{formatCurrency(selectedAuditRegister.openingBalance)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 uppercase font-bold">Vendas Dinheiro:</span>
                                <span className="font-black">{formatCurrency(selectedAuditRegister.salesCash)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 rounded-2xl border border-red-100">
                                <span className="font-black text-red-800 uppercase text-[10px]">(-) Sangrias Total:</span>
                                <span className="font-black text-red-600">{formatCurrency(selectedAuditRegister.totalSangrias)}</span>
                            </div>

                            {/* Detalhe de Sangrias */}
                            {selectedAuditRegister.movements && selectedAuditRegister.movements.filter(m => m.type === 'SANGRIA').length > 0 && (
                                <div className="pl-4 border-l-4 border-gray-100 my-4 space-y-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Motivos Discrimininados:</p>
                                    {selectedAuditRegister.movements.filter(m => m.type === 'SANGRIA').map((m, i) => (
                                        <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-0 items-start">
                                            <span className="text-[11px] leading-tight text-gray-600">
                                                <span className="font-black text-gray-800 block text-xs">{m.reason}</span>
                                                Aut: {m.authorizedByName}
                                            </span>
                                            <span className="font-black text-red-500 whitespace-nowrap">{formatCurrency(m.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 text-gray-400">
                                <span className="uppercase font-bold text-[10px]">Valor Esperado em Caixa:</span>
                                <span className="font-bold">{formatCurrency(selectedAuditRegister.expectedBalance)}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 px-6 bg-gray-900 rounded-3xl text-white shadow-xl">
                                <span className="font-black uppercase text-xs">Valor Informado:</span>
                                <span className="font-black text-2xl">{formatCurrency(selectedAuditRegister.closingBalance)}</span>
                            </div>
                            <div className={`flex justify-between items-center font-black text-base p-4 rounded-2xl border-2 ${selectedAuditRegister.difference < 0 ? 'bg-red-50 border-red-100 text-red-700' : (selectedAuditRegister.difference > 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-green-50 border-green-100 text-green-700')}`}>
                                <span className="uppercase text-[10px]">Diferença (Quebra):</span>
                                <span className="text-xl">{formatCurrency(selectedAuditRegister.difference)}</span>
                            </div>
                        </div>

                        {selectedAuditRegister.notes && (
                            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 mb-8">
                                <p className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Justificativa do Operador:</p>
                                <p className="text-sm italic font-medium leading-relaxed text-gray-700 font-serif">"{selectedAuditRegister.notes}"</p>
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedAuditRegister(null)}
                            className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 hover:bg-gray-900 transition-all"
                        >
                            FECHAR AUDITORIA
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-12 mb-8 text-center border-t border-gray-800 pt-8 opacity-30">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">
                    Toro PDV • Inteligência Financeira
                </p>
            </div>
        </div>
    );
};

export default Reports;
