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

const PaymentModal = ({ total, onClose, onComplete, storeName, cnpj, customer, onOpenCustomerModal, onSaveBudget }) => {
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
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                <div className="bg-white text-black p-8 w-full max-w-sm font-mono text-center rounded-2xl shadow-2xl animate-scaleUp">
                    <h2 className="text-xl font-bold mb-1">{storeName ? storeName.toUpperCase() : 'LOJA'}</h2>
                    {cnpj && <p className="text-sm mb-4 border-b border-dashed border-black pb-2">CNPJ: {cnpj}</p>}
                    <p className="text-xs mb-4">*** CUPOM NÃO FISCAL ***</p>

                    <div className="flex justify-between mb-1"><span>TOTAL ITENS:</span> <span>{formatCurrency(total)}</span></div>
                    {discountAmount > 0 && <div className="flex justify-between mb-1"><span>DESCONTO:</span> <span>-{formatCurrency(discountAmount)}</span></div>}
                    <div className="flex justify-between mb-4 text-xl font-black border-t border-dashed border-black pt-2">
                        <span>PAGAR:</span> <span>{formatCurrency(finalTotal)}</span>
                    </div>

                    <div className="border-t border-dashed border-black my-4"></div>

                    {payments.map((p, i) => (
                        <div key={i} className="flex justify-between mb-1">
                            <span>{p.methodLabel}</span>
                            <span>{formatCurrency(p.amount)}</span>
                        </div>
                    ))}

                    <div className="border-t border-dashed border-black my-4"></div>
                    <div className="flex justify-between mb-1"><span>TROCO:</span> <span>{formatCurrency(change)}</span></div>

                    {customer && (
                        <div className="mt-4 border-t border-dashed border-black pt-4 text-left text-xs">
                            <p className="font-bold">CLIENTE: {customer.name}</p>
                            <p>CPF: {customer.cpf || '---'}</p>
                        </div>
                    )}

                    <div className="mt-8 text-xs opacity-70">
                        <p>Obrigado pela preferência!</p>
                        <p>{new Date().toLocaleString()}</p>
                    </div>

                    <button
                        className="w-full mt-8 py-4 bg-black text-white font-black rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={confirmPrint}
                        disabled={isCompleting}
                    >
                        <FaPrint /> {isCompleting ? 'PROCESSANDO...' : 'IMPRIMIR E FECHAR'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[1000] p-2 md:p-4"
            onKeyDown={handleKeyDown}
        >
            <div className="bg-[#111] border border-white/10 text-white rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden w-full max-w-5xl max-h-[98vh] md:h-auto md:min-h-[600px] animate-scaleUp">

                {/* LEFT: Amounts & Calc */}
                <div className="flex-[0.9] min-w-[360px] p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#0a0a0a] relative overflow-y-auto custom-scrollbar">
                    {customer && (
                        <div className="absolute top-4 right-4 animate-fadeIn flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
                            <FaUserCircle className="text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider truncate max-w-[150px]">
                                {customer.name}
                            </span>
                        </div>
                    )}

                    <h2 className="text-caramelo-primary text-lg md:text-xl font-black mb-6 flex items-center gap-3 tracking-tighter">
                        <FaCalculator /> PAGAMENTO
                    </h2>

                    <div className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">{formatCurrency(total)}</div>

                    <div className="mb-8 p-6 bg-black rounded-3xl border border-white/10 flex flex-col gap-4 shadow-inner">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Final</span>
                            <span className="text-xl font-black text-white">{formatCurrency(finalTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Restante</span>
                            <span className={`text-xl font-black ${remaining > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatCurrency(remaining)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Troco</span>
                            <span className="text-xl font-black text-blue-500">
                                {formatCurrency(change)}
                            </span>
                        </div>
                    </div>

                    {/* DISCOUNT */}
                    <div className="bg-white/5 p-4 md:p-5 rounded-2xl border border-white/5 mb-6">
                        <label className="text-[10px] uppercase font-black text-gray-500 mb-3 block tracking-widest"><FaPercentage className="inline mr-1" /> Aplicar Desconto</label>
                        <div className="flex gap-2">
                            <div className="flex bg-black rounded-xl border border-white/10 overflow-hidden">
                                <button
                                    type="button"
                                    className={`px-5 text-xs font-black transition-all ${discountType === 'VALUE' ? 'bg-caramelo-primary text-white' : 'text-gray-500 hover:text-white'}`}
                                    onClick={() => setDiscountType('VALUE')}
                                >R$</button>
                                <button
                                    type="button"
                                    className={`px-5 text-xs font-black transition-all ${discountType === 'PERCENT' ? 'bg-caramelo-primary text-white' : 'text-gray-500 hover:text-white'}`}
                                    onClick={() => setDiscountType('PERCENT')}
                                >%</button>
                            </div>
                            <input
                                className="flex-1 bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-black focus:border-caramelo-primary outline-none transition-all text-xl"
                                placeholder="0,00"
                                type="number"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Payment Methods */}
                <div className="flex-[1.4] p-8 md:p-10 bg-[#111] flex flex-col">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xl font-bold text-white tracking-tight">Formas de Recebimento</h3>
                        <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-all"><FaTimes size={24} /></button>
                    </div>

                    {/* Method Selection */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-5">
                        {PAYMENT_METHODS.map(method => (
                            <button
                                type="button"
                                key={method.id}
                                className={`p-3 md:p-4 rounded-xl border-2 flex items-center justify-center gap-2 font-black transition-all text-[10px] md:text-xs uppercase tracking-tighter
                            ${selectedMethod === method.id
                                        ? 'border-caramelo-primary bg-caramelo-primary/10 text-caramelo-primary shadow-[0_0_20px_rgba(255,68,68,0.1)]'
                                        : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`
                                }
                                onClick={() => {
                                    setSelectedMethod(method.id);
                                    if (remaining > 0 && method.id !== 'VOUCHER') setCurrentAmount(remaining.toFixed(2));
                                    if (method.id !== 'VOUCHER') setTimeout(() => document.getElementById('paymentAmountInput')?.focus(), 50);
                                }}
                            >
                                <span className="text-lg">{method.icon}</span> {method.label}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Action Area */}
                    <div className="flex-1 flex flex-col min-h-0 min-h-[150px]">
                        {showBudgetCustomerWarning && !customer ? (
                            <div className="animate-fadeIn">
                                <div className="flex flex-col items-center justify-center p-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl text-center">
                                    <FaUserCircle size={32} className="text-orange-500 mb-3 opacity-50" />
                                    <p className="text-orange-400 font-bold mb-4 text-sm">Este orçamento precisa ser vinculado a um cliente!</p>
                                    <button
                                        type="button"
                                        onClick={onOpenCustomerModal}
                                        className="bg-caramelo-primary hover:bg-caramelo-secondary text-white font-black py-4 px-8 rounded-2xl shadow-xl transition-all w-full flex items-center justify-center gap-2 active:scale-95"
                                    >BUSCAR CLIENTE AGORA (F5)</button>
                                </div>
                            </div>
                        ) : selectedMethod === 'VOUCHER' ? (
                            <div className="animate-fadeIn">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block text-center">Crédito de Vale Troca</label>
                                <div className="flex gap-3">
                                    <input
                                        className="flex-1 bg-black border-2 border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase focus:border-caramelo-primary transition-all outline-none text-xl"
                                        placeholder="VALE-XXXXXX"
                                        value={voucherCode}
                                        onChange={e => setVoucherCode(e.target.value)}
                                        autoFocus
                                    />
                                    <button onClick={handleVoucherPayment} className="bg-caramelo-primary text-white font-black px-8 rounded-2xl hover:bg-caramelo-secondary transition-all shadow-lg active:scale-95">Validar</button>
                                </div>
                            </div>
                        ) : selectedMethod === 'CREDIARIO' ? (
                            <div className="animate-fadeIn">
                                {!customer ? (
                                    <div className="flex flex-col items-center justify-center p-8 bg-orange-500/5 border border-orange-500/20 rounded-2xl text-center">
                                        <FaUserCircle size={40} className="text-orange-500 mb-4 opacity-50" />
                                        <p className="text-orange-400 font-bold mb-6">Nenhum cliente vinculado a esta venda!</p>
                                        <button
                                            type="button"
                                            onClick={onOpenCustomerModal}
                                            className="bg-caramelo-primary hover:bg-caramelo-secondary text-white font-black py-4 px-8 rounded-2xl shadow-xl transition-all w-full flex items-center justify-center gap-2 active:scale-95"
                                        >VINCULAR CLIENTE (F5)</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cliente Vinculado</p>
                                                <p className="font-black text-blue-400 text-xl tracking-tight">{customer.name}</p>
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block text-center">Parcelas</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="24"
                                                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-white font-black text-center text-lg focus:border-caramelo-primary outline-none transition-all"
                                                    value={installments}
                                                    onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <div className="flex-1 flex items-center bg-black border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-caramelo-primary transition-all">
                                                <div className="bg-white/5 px-4 py-4 border-r border-white/10 flex items-center justify-center min-w-[60px]">
                                                    <span className="font-black text-caramelo-primary text-lg">R$</span>
                                                </div>
                                                <input
                                                    id="paymentAmountInput"
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full bg-transparent px-4 py-4 text-2xl font-black text-white outline-none"
                                                    value={currentAmount}
                                                    onChange={(e) => setCurrentAmount(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            <button onClick={handleAddPayment} className="bg-caramelo-primary text-white font-black px-10 py-4 md:py-0 rounded-2xl hover:bg-caramelo-secondary transition-all shadow-xl active:scale-95 whitespace-nowrap">LANÇAR</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-3 animate-fadeIn">
                                <div className="flex-1 flex items-center bg-black border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-caramelo-primary transition-all">
                                    <div className="bg-white/5 px-4 py-4 border-r border-white/10 flex items-center justify-center min-w-[60px]">
                                        <span className="font-black text-caramelo-primary text-lg">R$</span>
                                    </div>
                                    <input
                                        id="paymentAmountInput"
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-transparent px-4 py-2 text-3xl font-black text-white outline-none"
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
                                    className="bg-caramelo-primary text-white font-black px-10 py-4 md:py-0 rounded-2xl hover:bg-caramelo-secondary transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 shadow-caramelo-primary/10 whitespace-nowrap"
                                >
                                    <FaCheck /> LANÇAR
                                </button>
                            </div>
                        )}

                        {/* Payment History List */}
                        <div className="mt-4 flex-1 overflow-auto border-2 border-white/5 rounded-3xl bg-black/40 custom-scrollbar min-h-[140px] md:min-h-[180px]">
                            {payments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-800 gap-3 opacity-30 py-8">
                                    <FaCalculator size={48} />
                                    <p className="font-bold uppercase tracking-widest text-[10px]">Aguardando Lançamentos</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {payments.map((p, i) => (
                                        <div key={i} className="p-4 md:p-5 flex justify-between items-center group hover:bg-white/5 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-white/5 p-3 rounded-2xl text-caramelo-primary shadow-inner">
                                                    {PAYMENT_METHODS.find(m => m.id === p.method)?.icon}
                                                </div>
                                                <div>
                                                    <span className="font-black text-gray-200 uppercase text-[10px] tracking-widest block mb-0.5">{PAYMENT_METHODS.find(m => m.id === p.method)?.label}</span>
                                                    <span className="font-bold text-gray-500 text-xs">{p.methodLabel}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="font-black text-xl tracking-tighter">{formatCurrency(p.amount)}</span>
                                                <button type="button" onClick={() => handleRemovePayment(i)} className="p-3 text-gray-600 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-xl">
                                                    <FaTrash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mt-6">
                        <button
                            type="button"
                            className="flex-1 py-5 md:py-6 rounded-3xl text-xl font-black shadow-2xl transition-all flex items-center justify-center gap-3
                            bg-white/5 hover:bg-white/10 text-white border border-white/10 uppercase tracking-tighter disabled:opacity-50"
                            onClick={async () => {
                                if (!customer) {
                                    setShowBudgetCustomerWarning(true);
                                    return;
                                }
                                setIsSavingBudget(true);
                                try {
                                    await onSaveBudget();
                                } catch (error) {
                                    console.error("Error saving budget:", error);
                                } finally {
                                    setIsSavingBudget(false);
                                }
                            }}
                            disabled={isSavingBudget || isCompleting}
                        >
                            {isSavingBudget ? 'SALVANDO...' : 'SALVAR ORÇAMENTO'}
                        </button>

                        <div className="flex-[1.5] flex flex-col gap-2">
                            {/* Fiscal Selection Area */}
                            <div className="bg-black/40 border border-white/5 p-4 rounded-3xl flex flex-col gap-3">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Tipo de Documento</div>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFiscalType('NONE')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${fiscalType === 'NONE' ? 'border-gray-500 bg-gray-500/10 text-white' : 'border-white/5 text-gray-600 hover:text-gray-400'}`}
                                    >Nenhum</button>
                                    <button
                                        type="button"
                                        onClick={() => setFiscalType('NFCE')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${fiscalType === 'NFCE' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-white/5 text-gray-600 hover:text-indigo-900/40'}`}
                                    >NFC-e</button>
                                    <button
                                        type="button"
                                        onClick={() => setFiscalType('NFE55')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${fiscalType === 'NFE55' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/5 text-gray-600 hover:text-green-900/40'}`}
                                    >NF-e</button>
                                </div>
                                {fiscalType !== 'NONE' && (
                                    <p className="text-[10px] text-green-500/70 font-bold text-center flex items-center justify-center gap-1">
                                        <FaFileInvoiceDollar /> Módulo Fiscal Ativo
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                className="w-full py-5 md:py-6 rounded-3xl text-xl font-black shadow-2xl transition-all flex items-center justify-center gap-3
                                disabled:opacity-10 disabled:grayscale enabled:bg-gradient-to-r enabled:from-green-600 enabled:to-green-500 enabled:hover:scale-[1.01] enabled:active:scale-[0.98] shadow-green-900/20 uppercase tracking-tighter"
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
