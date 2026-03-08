import { useState, useEffect } from 'react';
import {
    FaArrowLeft, FaCheck, FaTimes, FaCalendarAlt, FaUser,
    FaMoneyBillWave, FaHistory, FaSearch, FaCheckCircle,
    FaClock, FaChevronDown, FaChevronUp, FaCreditCard,
    FaQrcode, FaExchangeAlt, FaPrint
} from 'react-icons/fa';
import { getDebtsByStore, updateDebt, addTransaction, getSale, getCompletedSalesByCustomer } from '../services/dbService';
import { getCurrentStore, getSettings } from '../utils/storage';
import { formatCurrency } from '../utils/calculations';
import { printDebtReceipt, printDebtorReport, printCustomerHistory, printReceipt } from '../utils/printer';

const Debts = () => {
    const [debts, setDebts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedDebt, setExpandedDebt] = useState(null);
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, debt: null, installmentIndex: null });
    const [itemsModal, setItemsModal] = useState({ isOpen: false, items: [], sale: null });
    const [historyModal, setHistoryModal] = useState({ isOpen: false, customer: null, sales: [] });
    const [isProcessing, setIsProcessing] = useState(false);

    const store = getCurrentStore();

    useEffect(() => {
        if (store) loadDebts();
    }, []);

    const loadDebts = async () => {
        setLoading(true);
        const data = await getDebtsByStore(store.id);
        setDebts(data);
        setLoading(false);
    };

    const handleMarkAsPaid = (debt, installmentIndex) => {
        setPaymentModal({
            isOpen: true,
            debt,
            installmentIndex
        });
    };

    const confirmPayment = async (method) => {
        if (isProcessing) return;

        const { debt, installmentIndex } = paymentModal;
        if (!debt) return;

        setIsProcessing(true);
        try {
            const installment = debt.installments[installmentIndex];

            // 0. Tentar recuperar vendedor original se não existir (Dívida Antiga)
            let sellerId = debt.sellerId;
            let sellerName = debt.sellerName;

            if (!sellerName && debt.saleId) {
                try {
                    const originalSale = await getSale(debt.saleId);
                    if (originalSale) {
                        sellerId = originalSale.sellerId;
                        sellerName = originalSale.sellerName;
                        await updateDebt(debt.id, { sellerId, sellerName });
                    }
                } catch (err) {
                    console.error("Erro ao recuperar vendedor da venda original:", err);
                }
            }

            // 1. Registrar Transação Financeira (Regime de Caixa)
            await addTransaction(store.id, {
                description: `Receb. Crediário: ${debt.customerName} (Parc. ${installment.number})`,
                amount: installment.amount,
                type: 'REVENUE',
                date: new Date().toISOString().split('T')[0],
                category: 'Vendas',
                paid: true,
                paymentMethod: method,
                debtId: debt.id,
                customerId: debt.customerId,
                sellerId: sellerId || 'OWNER',
                sellerName: sellerName || 'Loja'
            });

            // 2. Atualizar Dívida
            const updatedInstallments = [...debt.installments];
            updatedInstallments[installmentIndex].status = 'PAID';
            updatedInstallments[installmentIndex].paidAt = new Date().toISOString();
            updatedInstallments[installmentIndex].paymentMethod = method;

            const paidInstallments = updatedInstallments.filter(i => i.status === 'PAID');
            const remainingAmount = debt.totalAmount - paidInstallments.reduce((acc, i) => acc + i.amount, 0);
            const status = remainingAmount <= 0.01 ? 'PAID' : 'PENDING';

            await updateDebt(debt.id, {
                installments: updatedInstallments,
                remainingAmount,
                status
            });

            setPaymentModal({ isOpen: false, debt: null, installmentIndex: null });
            loadDebts();
        } catch (error) {
            console.error("Erro ao processar pagamento:", error);
            alert("Erro ao processar pagamento. Tente novamente.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = (debt, inst) => {
        try {
            const settings = getSettings();
            const currentStore = store || getCurrentStore();
            if (!currentStore) throw new Error("Loja não encontrada para impressão");
            printDebtReceipt(debt, inst, currentStore, settings);
        } catch (err) {
            console.error("Erro ao imprimir:", err);
            alert("Não foi possível iniciar a impressão. Tente novamente.");
        }
    };

    const loadItems = async (debt) => {
        setIsProcessing(true);
        try {
            let items = [];
            let sale = null;
            if (debt.items) {
                items = debt.items;
            } else {
                sale = await getSale(debt.saleId);
                if (sale && sale.items) {
                    items = sale.items;
                }
            }
            if (items.length > 0) {
                setItemsModal({ isOpen: true, items, sale: sale || { id: debt.saleId, items, total: debt.totalAmount, date: debt.createdAt } });
            } else {
                alert("Não foi possível carregar os itens desta venda.");
            }
        } catch (err) {
            console.error("Erro ao carregar itens:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const loadCustomerHistory = async (debt) => {
        setIsProcessing(true);
        try {
            const sales = await getCompletedSalesByCustomer(store.id, debt.customerId);
            setHistoryModal({
                isOpen: true,
                customer: { id: debt.customerId, name: debt.customerName },
                sales
            });
        } catch (err) {
            console.error("Erro ao carregar histórico:", err);
            alert("Erro ao carregar histórico do cliente.");
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredDebts = debts.filter(d =>
        d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-white flex items-center justify-center h-full">Carregando crediário...</div>;

    return (
        <div className="p-8 overflow-auto h-full bg-[#050505]">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white transition-colors">
                        <FaArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
                        <FaHistory className="text-caramelo-primary" /> Painel de Crediário
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => printDebtorReport(debts, store)}
                        className="bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 border border-white/10 transition-all"
                    >
                        <FaPrint /> RELATÓRIO DE DEVEDORES
                    </button>
                    <div className="relative w-64 group">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-caramelo-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="w-full bg-[#111] border border-gray-800 rounded-full py-2 pl-10 pr-4 text-white text-sm focus:border-caramelo-primary outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredDebts.length > 0 ? filteredDebts.map((debt) => (
                    <div key={debt.id} className="bg-[#111] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
                        <div
                            className="p-6 cursor-pointer flex justify-between items-center"
                            onClick={() => setExpandedDebt(expandedDebt === debt.id ? null : debt.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-caramelo-primary/10 flex items-center justify-center text-caramelo-primary border border-caramelo-primary/20">
                                    <FaUser size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {debt.customerName}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); loadCustomerHistory(debt); }}
                                            className="p-1.5 bg-white/5 hover:bg-caramelo-primary hover:text-white rounded-lg transition-all"
                                            title="Ver Histórico Completo"
                                        >
                                            <FaHistory size={12} />
                                        </button>
                                    </h3>
                                    <p className="text-xs text-gray-500 font-mono">#{debt.id.slice(-8).toUpperCase()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className={`text-xs uppercase font-bold mb-1 ${(debt.status === 'PAID' || debt.remainingAmount <= 0.01) ? 'text-green-500' : 'text-gray-500'}`}>
                                        {(debt.status === 'PAID' || debt.remainingAmount <= 0.01) ? 'Quitado' : 'Pendente'}
                                    </p>
                                    <p className={`text-xl font-bold font-mono ${(debt.status === 'PAID' || debt.remainingAmount <= 0.01) ? 'text-gray-500' : 'text-red-500'}`}>
                                        {formatCurrency(debt.remainingAmount)}
                                    </p>
                                </div>

                                {expandedDebt === debt.id ? <FaChevronUp className="text-gray-600" /> : <FaChevronDown className="text-gray-600" />}
                            </div>
                        </div>

                        {expandedDebt === debt.id && (
                            <div className="p-6 bg-black/40 border-t border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Plano de Pagamentos</h4>
                                    <button
                                        onClick={() => loadItems(debt)}
                                        className="text-[10px] text-caramelo-primary hover:underline font-bold uppercase flex items-center gap-1"
                                    >
                                        <FaSearch size={10} /> Ver Itens da Venda
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {debt.installments.map((inst, idx) => (
                                        <div key={idx} className={`p-4 rounded-lg border flex flex-col gap-2 ${inst.status === 'PAID' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#151515] border-white/5'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400">Parcela {inst.number} de {debt.installments.length}</span>
                                                    <span className="text-[9px] text-gray-500 font-bold uppercase">{debt.sellerName || 'Loja'}</span>
                                                </div>
                                                {inst.status === 'PAID' ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePrintReceipt(debt, inst)}
                                                            className="p-1.5 bg-white/5 hover:bg-caramelo-primary hover:text-white rounded-lg transition-all"
                                                            title="Imprimir Comprovante"
                                                        >
                                                            <FaPrint size={10} />
                                                        </button>
                                                        <span className="text-[9px] bg-green-500 text-black font-bold px-2 py-0.5 rounded-full uppercase">Paga</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full uppercase border border-red-500/20">Pendente</span>
                                                )}
                                            </div>
                                            <div className="text-lg font-bold text-white font-mono">{formatCurrency(inst.amount)}</div>
                                            <div className="flex items-center gap-2 text-[9px] text-gray-500 uppercase font-bold">
                                                <FaCalendarAlt /> Venc: {new Date(inst.dueDate).toLocaleDateString()}
                                            </div>

                                            {inst.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleMarkAsPaid(debt, idx)}
                                                    className="mt-2 w-full bg-caramelo-primary hover:bg-caramelo-secondary text-white font-bold py-2 rounded-lg text-[10px] transition-transform active:scale-95"
                                                >
                                                    RECEBER
                                                </button>
                                            )}

                                            {inst.status === 'PAID' && (
                                                <div className="mt-1 text-[9px] text-green-500/80 font-mono italic">
                                                    Recebido em {new Date(inst.paidAt).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="text-center py-20 bg-[#111] rounded-2xl border border-dashed border-gray-800">
                        <FaHistory size={48} className="text-gray-700 mb-4 mx-auto" />
                        <h3 className="text-white text-lg font-bold">Nenhum débito encontrado</h3>
                        <p className="text-gray-500 text-sm">Use o campo de busca acima para localizar um cliente.</p>
                    </div>
                )}
            </div>

            {/* MODAL DE ITENS DA VENDA */}
            {itemsModal.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setItemsModal({ isOpen: false, items: [], sale: null })}></div>
                    <div className="relative bg-[#111] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Itens da Compra</h2>
                            <button
                                onClick={() => printReceipt(itemsModal.sale, store, getSettings())}
                                className="p-2 bg-caramelo-primary/10 text-caramelo-primary rounded-xl hover:bg-caramelo-primary hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                            >
                                <FaPrint /> IMPRIMIR
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] text-gray-500 uppercase font-bold border-b border-white/5">
                                    <tr>
                                        <th className="pb-3">Produto</th>
                                        <th className="pb-3 text-center">Qtd</th>
                                        <th className="pb-3 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {itemsModal.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-white/5">
                                            <td className="py-3 text-white">{item.name}</td>
                                            <td className="py-3 text-white text-center font-mono">{item.quantity}</td>
                                            <td className="py-3 text-white text-right font-mono">{formatCurrency(item.price * item.quantity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-black/40 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-bold uppercase">Total da Venda</span>
                            <span className="text-xl font-bold text-caramelo-primary font-mono">{formatCurrency(itemsModal.sale?.total || 0)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE HISTÓRICO DO CLIENTE */}
            {historyModal.isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setHistoryModal({ isOpen: false, customer: null, sales: [] })}></div>
                    <div className="relative bg-[#111] border border-caramelo-primary/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-white/5 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Histórico de Compras</h2>
                                <p className="text-caramelo-primary font-bold text-sm uppercase">{historyModal.customer?.name}</p>
                            </div>
                            <button
                                onClick={() => printCustomerHistory(historyModal.customer, historyModal.sales, store)}
                                className="bg-caramelo-primary hover:bg-caramelo-secondary text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-caramelo-primary/20"
                            >
                                <FaPrint /> IMPRIMIR HISTÓRICO
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="space-y-4">
                                {historyModal.sales.length > 0 ? historyModal.sales.map((sale) => (
                                    <div key={sale.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:border-caramelo-primary/30 transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                                                    {new Date(sale.date || sale.createdAt).toLocaleString()}
                                                </div>
                                                <div className="text-sm font-bold text-white uppercase tracking-tight">#{sale.id.slice(-8).toUpperCase()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-caramelo-primary mb-1 uppercase italic">
                                                    {sale.payment?.method || 'Venda'}
                                                </div>
                                                <div className="text-lg font-bold text-white font-mono">{formatCurrency(sale.total || 0)}</div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-gray-400 group-hover:text-gray-300">
                                            {(sale.items || []).map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 opacity-50">
                                        <FaHistory size={40} className="mx-auto mb-4" />
                                        <p>Nenhuma compra finalizada encontrada.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-black/60 border-t border-white/5 flex justify-between items-center">
                            <div className="text-xs text-gray-500 font-bold uppercase">Total Gasto Acumulado</div>
                            <div className="text-2xl font-bold text-white font-mono">
                                {formatCurrency(historyModal.sales.reduce((acc, s) => acc + (s.total || 0), 0))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Debts;
