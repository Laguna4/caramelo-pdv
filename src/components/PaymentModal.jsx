import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaCreditCard, FaQrcode, FaExchangeAlt, FaTimes, FaPrint, FaCalculator, FaCheck, FaPercentage, FaTrash, FaUserCircle, FaFileInvoiceDollar } from 'react-icons/fa';
import { formatCurrency, generateId } from '../utils/calculations';
import { getVoucherByCode, updateVoucher } from '../services/dbService';
import { getCurrentStore } from '../utils/storage';

// Payment Methods Configuration
const PAYMENT_METHODS = [
    { id: 'MONEY', label: 'Dinheiro', icon: <FaMoneyBillWave /> },
    { id: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: <FaCreditCard /> },
    { id: 'DEBIT_CARD', label: 'Cartão de Débito', icon: <FaCreditCard /> },
    { id: 'PIX', label: 'PIX', icon: <FaQrcode /> },
    { id: 'VOUCHER', label: 'Vale Troca', icon: <FaExchangeAlt /> },
    { id: 'CREDIARIO', label: 'Crediário (Fiado)', icon: <FaUserCircle /> }
];

const PaymentModal = ({ items = [], total, onClose, onComplete, storeName, cnpj, customer, onOpenCustomerModal, onSaveBudget }) => {
    // State
    const [payments, setPayments] = useState([]);
    const [discountType, setDiscountType] = useState('VALUE'); // 'VALUE' or 'PERCENT'
    const [discountValue, setDiscountValue] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('MONEY');
    const [showReceipt, setShowReceipt] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isSavingBudget, setIsSavingBudget] = useState(false);
    const [showBudgetCustomerWarning, setShowBudgetCustomerWarning] = useState(false);

    // Fiscal State
    const [fiscalType, setFiscalType] = useState('NONE'); // 'NONE', 'NFCE', 'NFE55'

    // Crediário State
    const [installments, setInstallments] = useState(1);

    // Voucher State
    const [voucherCode, setVoucherCode] = useState('');

    // Focus trap for amount input
    useEffect(() => {
        const input = document.getElementById('paymentAmountInput');
        if (input) input.focus();
    }, [payments, selectedMethod]);

    // Calculations
    const calculateDiscountAmount = () => {
        const value = parseFloat(discountValue) || 0;
        if (discountType === 'PERCENT') {
            return total * (value / 100);
        }
        return value;
    };

    const discountAmount = calculateDiscountAmount();
    const finalTotal = Math.max(0, total - discountAmount);
    const totalPaid = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
    const remaining = Math.max(0, finalTotal - totalPaid);
    const change = Math.max(0, totalPaid - finalTotal);

    // Handlers
    const handleAddPayment = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const amount = parseFloat(currentAmount);
        if (!amount || amount <= 0) return;

        // Validation: Check if amount exceeds remaining (except for MONEY)
        if (selectedMethod !== 'MONEY' && (amount - remaining) > 0.01) {
            alert(`Valor superior ao restante (R$ ${formatCurrency(remaining)})! Apenas Dinheiro permite troco.`);
            return;
        }

        if (selectedMethod === 'CREDIARIO' && !customer) {
            alert('Selecione um cliente no PDV para vender no crediário!');
            return;
        }

        const crediarioExtra = selectedMethod === 'CREDIARIO' ? ` (${installments}x)` : '';

        addPayment(selectedMethod, amount, crediarioExtra, selectedMethod === 'CREDIARIO' ? installments : 1);
    };

    const addPayment = (method, amount, extraLabel = '', inst = 1) => {
        setPayments([...payments, {
            id: generateId(),
            method: method,
            methodLabel: (PAYMENT_METHODS.find(m => m.id === method)?.label || method) + extraLabel,
            amount,
            installments: inst
        }]);

        setCurrentAmount(''); // Reset input
        setVoucherCode('');
        setInstallments(1);

        // Keep focus on input for next entry
        document.getElementById('paymentAmountInput')?.focus();
    };

    const handleVoucherPayment = async () => {
        if (!voucherCode) return alert('Digite o código do vale!');

        const store = getCurrentStore() || {};
        const validVoucher = await getVoucherByCode(voucherCode.trim().toUpperCase(), store.id);

        if (!validVoucher) {
            alert('Vale inválido ou não encontrado!');
            return;
        }

        if (validVoucher.status !== 'ACTIVE') {
            alert('Este vale já foi utilizado ou expirou!');
            return;
        }

        const amountToUse = Math.min(validVoucher.remainingValue, remaining);

        await updateVoucher(validVoucher.code, {
            remainingValue: validVoucher.remainingValue - amountToUse,
            status: (validVoucher.remainingValue - amountToUse) <= 0.01 ? 'USED' : 'ACTIVE'
        });

        addPayment('VOUCHER', amountToUse, ` (${validVoucher.code})`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (remaining <= 0.01 && payments.length > 0) {
                e.preventDefault();
                handleFinalize();
            }
        }
    };

    const handleRemovePayment = (index) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const handleFinalize = () => {
        if (remaining > 0.01) {
            alert('Ainda falta receber valor!');
            return;
        }
        setShowReceipt(true);
    };

    const confirmPrint = () => {
        if (isCompleting) return;
        setIsCompleting(true);

        const paymentInfo = {
            totalOriginal: total,
            discount: discountAmount,
            finalTotal,
            payments,
            change,
            date: new Date().toISOString(),
            customer: customer,
            fiscalType // 'NONE', 'NFCE', 'NFE55'
        };
        onComplete(paymentInfo);
    };

    if (showReceipt) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[2000] p-4">
                <div className="bg-white text-black p-6 md:p-8 w-full max-w-md font-mono rounded-3xl shadow-2xl animate-scaleUp overflow-y-auto max-h-[95vh] custom-scrollbar-receipt">

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black tracking-tighter mb-1">{storeName ? storeName.toUpperCase() : 'CARAMELO PDV'}</h2>
                        {cnpj && <p className="text-xs text-gray-600 mb-2">CNPJ: {cnpj}</p>}
                        <div className="text-[10px] font-bold border-y border-dashed border-black/20 py-1 uppercase tracking-widest mt-2">
                            *** CUPOM NÃO FISCAL ***
                        </div>
                    </div>

                    <div className="flex justify-between text-[11px] mb-4">
                        <div className="flex flex-col">
                            <span className="font-bold">DATA:</span>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="font-bold">HORA:</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>

                    {customer && (
                        <div className="mb-4 text-[11px] bg-gray-50 p-2 rounded-lg border border-black/5">
                            <div className="font-bold uppercase mb-0.5">CLIENTE: {customer.name}</div>
                            {customer.cpf && <div>CPF: {customer.cpf}</div>}
                        </div>
                    )}

                    <table className="w-full text-[11px] mb-6 border-collapse">
                        <thead>
                            <tr className="border-b-2 border-dashed border-black">
                                <th className="text-left py-1">ITEM</th>
                                <th className="text-center py-1">QTD</th>
                                <th className="text-right py-1">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dashed divide-black/10">
                            {items.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-2 pr-2 leading-tight">{item.name.toUpperCase().substring(0, 24)}</td>
                                    <td className="text-center py-2">{item.quantity}</td>
                                    <td className="text-right py-2 font-bold">{formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="space-y-1 mb-6 pt-2 border-t border-dashed border-black">
                        <div className="flex justify-between text-[11px]">
                            <span>SUBTOTAL:</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-[11px] text-red-600">
                                <span>DESCONTO:</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-2xl font-black mt-2 pt-2 border-t-2 border-black tracking-tighter">
                            <span>PAGAR:</span>
                            <span>{formatCurrency(finalTotal)}</span>
                        </div>
                    </div>

                    <div className="mb-6 space-y-1">
                        <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Pagamentos:</div>
                        {payments.map((p, i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                                <span>{p.methodLabel.toUpperCase()}</span>
                                <span className="font-bold">{formatCurrency(p.amount)}</span>
                            </div>
                        ))}
                    </div>

                    {change > 0 && (
                        <div className="flex justify-between mb-8 p-3 bg-gray-900 text-white rounded-xl">
                            <span className="font-bold">TROCO:</span>
                            <span className="text-xl font-black">{formatCurrency(change)}</span>
                        </div>
                    )}

                    <div className="text-center text-[10px] text-gray-500 italic mb-8">
                        <p>Obrigado pela preferência!</p>
                        <p className="mt-1 font-bold">CARAMELO PDV SISTEMA</p>
                    </div>

                    <button
                        className="w-full py-5 bg-black text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl mb-4"
                        onClick={confirmPrint}
                        disabled={isCompleting}
                    >
                        <FaPrint size={18} /> {isCompleting ? 'PROCESSANDO...' : 'IMPRIMIR E FECHAR'}
                    </button>

                    <button
                        onClick={() => setShowReceipt(false)}
                        className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                    >
                        Voltar para Pagamento
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[1000] p-2 md:p-4"
            onKeyDown={handleKeyDown}
        >
            {/* Modal container - fixed height layout so nothing overflows */}
            <div className="bg-[#111] border border-white/10 text-white rounded-3xl shadow-2xl flex flex-col md:flex-row w-full max-w-5xl h-[95vh] md:h-[88vh] overflow-hidden animate-scaleUp">

                {/* ===== LEFT PANEL: Amounts & Discount ===== */}
                <div className="w-full md:w-[340px] shrink-0 flex flex-col bg-[#0a0a0a] border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto custom-scrollbar">
                    <div className="p-6 md:p-8 flex flex-col gap-5 relative">
                        {/* Customer badge */}
                        {customer && (
                            <div className="absolute top-4 right-4 animate-fadeIn flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
                                <FaUserCircle className="text-blue-400" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider truncate max-w-[120px]">
                                    {customer.name}
                                </span>
                            </div>
                        )}

                        {/* Title */}
                        <h2 className="text-caramelo-primary text-lg font-black flex items-center gap-3 tracking-tighter">
                            <FaCalculator /> PAGAMENTO
                        </h2>

                        {/* Main total */}
                        <div className="text-4xl font-black text-white tracking-tighter">{formatCurrency(total)}</div>

                        {/* Summary box: Total Final / Restante / Troco */}
                        <div className="p-5 bg-black rounded-2xl border border-white/10 flex flex-col gap-3 shadow-inner">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Final</span>
                                <span className="text-lg font-black text-white">{formatCurrency(finalTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Restante</span>
                                <span className={`text-lg font-black ${remaining > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                                    {formatCurrency(remaining)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Troco</span>
                                <span className="text-lg font-black text-blue-500">
                                    {formatCurrency(change)}
                                </span>
                            </div>
                        </div>

                        {/* Discount section */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <label className="text-[10px] uppercase font-black text-gray-500 mb-3 block tracking-widest">
                                <FaPercentage className="inline mr-1" /> Aplicar Desconto
                            </label>
                            <div className="flex gap-2">
                                {/* Toggle R$ / % */}
                                <div className="flex bg-black rounded-xl border border-white/10 overflow-hidden shrink-0">
                                    <button
                                        type="button"
                                        className={`px-4 py-3 text-sm font-black transition-all ${discountType === 'VALUE' ? 'bg-caramelo-primary text-white' : 'text-gray-500 hover:text-white'}`}
                                        onClick={() => setDiscountType('VALUE')}
                                    >R$</button>
                                    <button
                                        type="button"
                                        className={`px-4 py-3 text-sm font-black transition-all ${discountType === 'PERCENT' ? 'bg-caramelo-primary text-white' : 'text-gray-500 hover:text-white'}`}
                                        onClick={() => setDiscountType('PERCENT')}
                                    >%</button>
                                </div>
                                <input
                                    className="flex-1 min-w-0 bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-black focus:border-caramelo-primary outline-none transition-all text-lg"
                                    placeholder="0,00"
                                    type="number"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== RIGHT PANEL: Payment Methods + History + Actions ===== */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#111]">

                    {/* Scrollable content area */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-8 gap-4">

                        {/* Header */}
                        <div className="flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold text-white tracking-tight">Formas de Recebimento</h3>
                            <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-all"><FaTimes size={24} /></button>
                        </div>

                        {/* Method Selection Buttons */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 shrink-0">
                            {PAYMENT_METHODS.map(method => (
                                <button
                                    type="button"
                                    key={method.id}
                                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-black transition-all text-[10px] uppercase tracking-tighter
                                    ${selectedMethod === method.id
                                            ? 'border-caramelo-primary bg-caramelo-primary/10 text-caramelo-primary'
                                            : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
                                    onClick={() => {
                                        setSelectedMethod(method.id);
                                        if (remaining > 0 && method.id !== 'VOUCHER') setCurrentAmount(remaining.toFixed(2));
                                        if (method.id !== 'VOUCHER') setTimeout(() => document.getElementById('paymentAmountInput')?.focus(), 50);
                                    }}
                                >
                                    <span className="text-base">{method.icon}</span> {method.label}
                                </button>
                            ))}
                        </div>

                        {/* Dynamic Input Area */}
                        <div className="shrink-0">
                            {showBudgetCustomerWarning && !customer ? (
                                <div className="flex flex-col items-center justify-center p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl text-center">
                                    <FaUserCircle size={28} className="text-orange-500 mb-2 opacity-50" />
                                    <p className="text-orange-400 font-bold mb-3 text-sm">Este orçamento precisa de um cliente!</p>
                                    <button type="button" onClick={onOpenCustomerModal}
                                        className="bg-caramelo-primary text-white font-black py-3 px-6 rounded-2xl shadow-xl transition-all w-full active:scale-95">
                                        BUSCAR CLIENTE (F5)
                                    </button>
                                </div>
                            ) : selectedMethod === 'VOUCHER' ? (
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block text-center">Crédito de Vale Troca</label>
                                    <div className="flex gap-3">
                                        <input
                                            className="flex-1 bg-black border-2 border-white/10 rounded-2xl px-5 py-3 text-white font-black uppercase focus:border-caramelo-primary outline-none text-lg"
                                            placeholder="VALE-XXXXXX"
                                            value={voucherCode}
                                            onChange={e => setVoucherCode(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={handleVoucherPayment} className="bg-caramelo-primary text-white font-black px-6 rounded-2xl hover:bg-caramelo-secondary transition-all active:scale-95">Validar</button>
                                    </div>
                                </div>
                            ) : selectedMethod === 'CREDIARIO' ? (
                                <div>
                                    {!customer ? (
                                        <div className="flex flex-col items-center justify-center p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl text-center">
                                            <FaUserCircle size={32} className="text-orange-500 mb-3 opacity-50" />
                                            <p className="text-orange-400 font-bold mb-3">Nenhum cliente vinculado!</p>
                                            <button type="button" onClick={onOpenCustomerModal}
                                                className="bg-caramelo-primary hover:bg-caramelo-secondary text-white font-black py-3 px-6 rounded-2xl shadow-xl transition-all w-full active:scale-95">
                                                VINCULAR CLIENTE (F5)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cliente Vinculado</p>
                                                    <p className="font-black text-blue-400 text-lg">{customer.name}</p>
                                                </div>
                                                <div className="w-20">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block text-center">Parcelas</label>
                                                    <input
                                                        type="number" min="1" max="24"
                                                        className="w-full bg-black border border-white/10 rounded-xl px-2 py-2 text-white font-black text-center text-lg focus:border-caramelo-primary outline-none"
                                                        value={installments}
                                                        onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-1 flex items-center bg-black border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-caramelo-primary transition-all">
                                                    <div className="bg-white/5 px-4 py-3 border-r border-white/10 flex items-center justify-center">
                                                        <span className="font-black text-caramelo-primary">R$</span>
                                                    </div>
                                                    <input
                                                        id="paymentAmountInput"
                                                        type="number" step="0.01"
                                                        className="w-full bg-transparent px-4 py-3 text-2xl font-black text-white outline-none"
                                                        value={currentAmount}
                                                        onChange={(e) => setCurrentAmount(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <button onClick={handleAddPayment} className="bg-caramelo-primary text-white font-black px-8 rounded-2xl hover:bg-caramelo-secondary transition-all shadow-xl active:scale-95 whitespace-nowrap">LANÇAR</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <div className="flex-1 flex items-center bg-black border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-caramelo-primary transition-all">
                                        <div className="bg-white/5 px-4 py-3 border-r border-white/10 flex items-center justify-center">
                                            <span className="font-black text-caramelo-primary">R$</span>
                                        </div>
                                        <input
                                            id="paymentAmountInput"
                                            type="number" step="0.01"
                                            className="w-full bg-transparent px-4 py-2 text-2xl font-black text-white outline-none"
                                            placeholder="0,00"
                                            value={currentAmount}
                                            onChange={(e) => setCurrentAmount(e.target.value)}
                                            autoFocus
                                            autoComplete="off"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddPayment}
                                        className="bg-caramelo-primary text-white font-black px-8 rounded-2xl hover:bg-caramelo-secondary transition-all flex items-center gap-2 shadow-xl active:scale-95 whitespace-nowrap"
                                    >
                                        <FaCheck /> LANÇAR
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Payment History - takes remaining space */}
                        <div className="flex-1 min-h-[120px] border-2 border-white/5 rounded-2xl bg-black/40 overflow-y-auto custom-scrollbar">
                            {payments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-800 gap-3 opacity-30 py-8">
                                    <FaCalculator size={40} />
                                    <p className="font-bold uppercase tracking-widest text-[10px]">Aguardando Lançamentos</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {payments.map((p, i) => (
                                        <div key={i} className="px-4 py-3 flex justify-between items-center hover:bg-white/5 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white/5 p-2 rounded-xl text-caramelo-primary">
                                                    {PAYMENT_METHODS.find(m => m.id === p.method)?.icon}
                                                </div>
                                                <div>
                                                    <span className="font-black text-gray-200 uppercase text-[10px] tracking-widest block">{PAYMENT_METHODS.find(m => m.id === p.method)?.label}</span>
                                                    <span className="font-bold text-gray-500 text-xs">{p.methodLabel}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-lg">{formatCurrency(p.amount)}</span>
                                                <button type="button" onClick={() => handleRemovePayment(i)} className="p-2 text-gray-600 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-xl">
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Actions - always visible, not scrollable */}
                    <div className="shrink-0 border-t border-white/5 p-4 md:p-6 flex flex-col md:flex-row gap-3">
                        <button
                            type="button"
                            className="flex-1 py-4 rounded-2xl text-sm font-black shadow-2xl transition-all flex items-center justify-center gap-2
                            bg-white/5 hover:bg-white/10 text-white border border-white/10 uppercase tracking-tighter disabled:opacity-50"
                            onClick={async () => {
                                if (!customer) { setShowBudgetCustomerWarning(true); return; }
                                setIsSavingBudget(true);
                                try { await onSaveBudget(); } catch (error) { console.error("Error saving budget:", error); } finally { setIsSavingBudget(false); }
                            }}
                            disabled={isSavingBudget || isCompleting}
                        >
                            {isSavingBudget ? 'SALVANDO...' : 'SALVAR ORÇAMENTO'}
                        </button>

                        <div className="flex-[1.5] flex flex-col gap-2">
                            {/* Fiscal Selection */}
                            <div className="bg-black/40 border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-3">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0">Documento:</div>
                                <div className="flex gap-2 flex-1">
                                    {[{ id: 'NONE', label: 'Nenhum' }, { id: 'NFCE', label: 'NFC-e' }, { id: 'NFE55', label: 'NF-e' }].map(ft => (
                                        <button key={ft.id} type="button" onClick={() => setFiscalType(ft.id)}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2
                                            ${fiscalType === ft.id ? 'border-gray-500 bg-gray-500/10 text-white' : 'border-white/5 text-gray-600 hover:text-gray-400'}`}>
                                            {ft.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="w-full py-4 rounded-2xl text-base font-black shadow-2xl transition-all flex items-center justify-center gap-2
                                disabled:opacity-10 disabled:grayscale enabled:bg-gradient-to-r enabled:from-green-600 enabled:to-green-500 enabled:hover:scale-[1.01] enabled:active:scale-[0.98] uppercase tracking-tighter"
                                onClick={handleFinalize}
                                disabled={remaining > 0.01 || payments.length === 0 || isSavingBudget}
                            >
                                <FaCheck /> FINALIZAR VENDA (ENTER)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
