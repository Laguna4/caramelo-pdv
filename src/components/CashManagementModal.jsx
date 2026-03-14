import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaMoneyBillWave, FaTimes, FaCheck, FaExclamationTriangle, FaArrowDown, FaCalculator, FaPrint } from 'react-icons/fa';
import { openCashRegister, closeCashRegister, addCashMovement, getSalesByRegister } from '../services/dbService';
import { formatCurrency } from '../utils/calculations';
import PinModal from './PinModal';

const CashManagementModal = ({ isOpen, onClose, currentRegister, store, user, onRegisterUpdate, initialMode = 'OPEN' }) => {
    const navigate = useNavigate();
    // Modes: OPEN (abrir caixa), CLOSE (fechar caixa), SANGRIA (retirada)
    const [mode, setMode] = useState(initialMode);

    // Form States
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    // Totals for Closing
    const [totalSalesCash, setTotalSalesCash] = useState(0);
    const [totalSangrias, setTotalSangrias] = useState(0);
    const [expectedBalance, setExpectedBalance] = useState(0);
    const [calculating, setCalculating] = useState(false);

    // Auth
    const [showPinModal, setShowPinModal] = useState(false);
    const [authorizedAdmin, setAuthorizedAdmin] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [receiptData, setReceiptData] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setAmount('');
            setReason('');
            setNotes('');
            setError('');
            setAuthorizedAdmin(null);
        }
    }, [isOpen, initialMode]);

    useEffect(() => {
        if (mode === 'CLOSE' && currentRegister) {
            calculateTotals();
        }
    }, [mode, currentRegister, isOpen]);

    // Internal Auto-Print Effect
    useEffect(() => {
        if (receiptData) {
            // Small delay to ensure render
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [receiptData]);

    const calculateTotals = async () => {
        if (!currentRegister) return;
        setCalculating(true);
        try {
            console.log("=== CALCULATING TOTALS ===");
            console.log("Register ID:", currentRegister.id);

            // 1. Get Sales
            const sales = await getSalesByRegister(currentRegister.id);
            console.log("Fetched Sales:", sales);

            // Calculate total cash from all sales (checking the payments array)
            const cashSales = sales
                .filter(s => s.status !== 'CANCELLED' && s.payment?.payments)
                .reduce((acc, sale) => {
                    // Sum up only payments with method 'MONEY'
                    const saleCashIn = sale.payment.payments
                        .filter(p => p.method === 'MONEY')
                        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

                    // Subtract change (troco) if there was any cash payment involved
                    // Assuming change is always given in cash
                    const change = parseFloat(sale.payment.change) || 0;

                    return acc + saleCashIn - change;
                }, 0);

            console.log("Cash Sales Total:", cashSales);

            // 2. Get Sangrias from current register prop (it should be updated)
            const movements = currentRegister.movements || [];
            console.log("Movements in Register:", movements);

            const sangrias = movements
                .filter(m => m.type === 'SANGRIA')
                .reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);

            const supplies = movements
                .filter(m => m.type === 'SUPRIMENTO')
                .reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);

            const opening = parseFloat(currentRegister.openingBalance) || 0;
            const expected = opening + cashSales + supplies - sangrias;

            console.log(`Calculation: Opening (${opening}) + Sales (${cashSales}) + Supplies (${supplies}) - Sangrias (${sangrias}) = Expected (${expected})`);

            setTotalSalesCash(cashSales);
            setTotalSangrias(sangrias);
            setExpectedBalance(expected);
        } catch (e) {
            console.error("Error calculating totals:", e);
            setError("Erro ao calcular totais. Verifique o console.");
        }
        setCalculating(false);
    };

    const handleOpenRegister = async () => {
        if (!amount) return setError('Informe o valor inicial (Fundo de Troco).');
        setLoading(true);
        const res = await openCashRegister(store.id, user.id, amount, user.name);
        if (res.success) {
            onRegisterUpdate(); // Parent re-fetches register
            onClose();
        } else {
            setError('Erro ao abrir caixa: ' + res.error);
        }
        setLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleFinalClose = () => {
        onRegisterUpdate();
        onClose();
        navigate('/dashboard'); // Close and go to dashboard
    };

    // ... (rest of the file)

    const handleCloseRegister = async () => {
        if (!amount) return setError('Informe o valor total em dinheiro na gaveta.');
        setLoading(true);

        const closingBalance = parseFloat(amount);
        const difference = closingBalance - expectedBalance;

        const closingData = {
            closingBalance: closingBalance,
            expectedBalance: expectedBalance,
            salesCash: totalSalesCash,
            totalSangrias: totalSangrias,
            // ADDED: List of sangrias for detailed receipt
            sangriaList: (currentRegister.movements || []).filter(m => m.type === 'SANGRIA'),
            closedBy: user.id,
            closedByName: user.name,
            notes: notes,
            difference: difference,
            openingBalance: parseFloat(currentRegister.openingBalance) || 0,
            date: new Date().toISOString()
        };

        const res = await closeCashRegister(currentRegister.id, closingData);
        if (res.success) {
            setReceiptData(closingData);
            // Don't close immediately, show receipt
        } else {
            setError('Erro ao fechar caixa: ' + res.error);
        }
        setLoading(false);
    };

    const handlePinSuccess = (adminUser) => {
        setAuthorizedAdmin(adminUser);
        setShowPinModal(false);
    };

    const handleSangria = async () => {
        if (!amount || !reason) return setError('Informe valor e motivo.');

        // First, authorize
        if (!authorizedAdmin) {
            setShowPinModal(true);
            return;
        }

        setLoading(true);
        const movement = {
            type: 'SANGRIA',
            amount: parseFloat(amount),
            reason: reason,
            authorizedBy: authorizedAdmin.id,
            authorizedByName: authorizedAdmin.name,
            requestedBy: user.id,
            date: new Date().toISOString()
        };

        const res = await addCashMovement(currentRegister.id, movement);
        if (res.success) {
            alert("Sangria realizada com sucesso!");
            onRegisterUpdate();
            onClose();
        } else {
            setError('Erro ao registrar sangria: ' + res.error);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    // RENDER RECEIPT
    if (receiptData) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <style>
                    {`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #receipt-content, #receipt-content * {
                                visibility: visible;
                            }
                            #receipt-content {
                                position: fixed;
                                left: 0;
                                top: 0;
                                width: 100%;
                                height: auto;
                                margin: 0;
                                padding: 0;
                                background: white;
                                color: black;
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                    `}
                </style>
                <div className="bg-white text-black p-6 rounded-lg w-full max-w-sm shadow-2xl overflow-hidden relative" id="receipt-content">
                    <div className="text-center font-mono border-b border-dashed border-gray-400 pb-4 mb-4">
                        <h2 className="font-bold text-xl uppercase">{store?.name || 'CARAMELO PDV'}</h2>
                        <p className="text-xs">FECHAMENTO DE CAIXA</p>
                        <p className="text-xs">{new Date(receiptData.date).toLocaleString()}</p>
                        <p className="text-xs mt-1">Op: {user.name}</p>
                    </div>

                    <div className="font-mono text-sm space-y-2 border-b border-dashed border-gray-400 pb-4 mb-4">
                        <div className="flex justify-between">
                            <span>FUNDO DE ABERTURA:</span>
                            <span>{formatCurrency(receiptData.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>(+) VENDAS DINHEIRO:</span>
                            <span>{formatCurrency(receiptData.salesCash)}</span>
                        </div>
                        <div className="flex justify-between text-black font-bold">
                            <span>(-) SANGRIAS TOTAL:</span>
                            <span>{formatCurrency(receiptData.totalSangrias)}</span>
                        </div>

                        {/* Sangrias Detail */}
                        {receiptData.sangriaList && receiptData.sangriaList.length > 0 && (
                            <div className="pl-2 border-l-2 border-gray-300 my-1 text-xs">
                                {receiptData.sangriaList.map((s, i) => (
                                    <div key={i} className="flex justify-between">
                                        <span>- {s.reason}</span>
                                        <span>{formatCurrency(s.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between font-bold pt-2 border-t border-dotted border-gray-300">
                            <span>(=) ESPERADO:</span>
                            <span>{formatCurrency(receiptData.expectedBalance)}</span>
                        </div>
                    </div>

                    <div className="font-mono text-sm space-y-2 border-b border-dashed border-gray-400 pb-4 mb-4">
                        <div className="flex justify-between font-bold text-base">
                            <span>(*) INFORMADO:</span>
                            <span>{formatCurrency(receiptData.closingBalance)}</span>
                        </div>

                        {receiptData.difference !== 0 && (
                            <div className="flex justify-between font-bold mt-2">
                                <span>DIFERENÇA (QUEBRA):</span>
                                <span>{formatCurrency(receiptData.difference)}</span>
                            </div>
                        )}
                    </div>

                    {receiptData.notes && (
                        <div className="font-mono text-xs border-b border-dashed border-gray-400 pb-4 mb-4">
                            <p className="font-bold mb-1">OBSERVAÇÕES:</p>
                            <p>{receiptData.notes}</p>
                        </div>
                    )}

                    <div className="text-center font-mono text-xs mt-4 mb-6">
                        <p>_______________________________</p>
                        <p className="mt-1">Assinatura do Operador</p>
                    </div>

                    <div className="flex gap-3 no-print">
                        <button
                            onClick={handlePrint}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                            <FaPrint /> IMPRIMIR
                        </button>
                        <button
                            onClick={handleFinalClose}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg"
                        >
                            CONCLUIR
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER CONTENT BY MODE ---
    // ... (rest of original render)

    const renderOpenMode = () => (
        <div className="space-y-4">
            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 flex gap-3 text-yellow-500">
                <FaExclamationTriangle className="text-xl flex-shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold">Caixa Fechado</h4>
                    <p className="text-sm opacity-80">Você precisa abrir o caixa para iniciar as vendas.</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Fundo de Troco (R$)</label>
                <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-2xl text-white font-mono focus:border-green-500 outline-none"
                    placeholder="0,00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    autoFocus
                />
            </div>

            <button
                onClick={handleOpenRegister}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95"
            >
                {loading ? 'Abrindo...' : 'ABRIR CAIXA'}
            </button>
        </div>
    );

    const renderCloseMode = () => {
        // Crash Prevention: If register is null (e.g. just closed), don't render this part
        if (!currentRegister) return (
            <div className="text-center text-gray-500 py-10">
                <p>Carregando dados do caixa...</p>
            </div>
        );

        return (
            <div className="space-y-4">
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-900/50 text-blue-100 mb-4">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><FaCalculator /> Resumo do Turno {calculating && '(Calculando...)'}</h4>
                    <div className="space-y-1 text-sm font-mono">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Abertura:</span>
                            <span>{formatCurrency(currentRegister.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between text-green-400">
                            <span>+ Vendas (Dinheiro):</span>
                            <span>{formatCurrency(totalSalesCash)}</span>
                        </div>
                        <div className="flex justify-between text-orange-400">
                            <span>- Sangrias:</span>
                            <span>{formatCurrency(totalSangrias)}</span>
                        </div>
                        <div className="border-t border-blue-800 my-2 pt-2 flex justify-between font-bold text-lg">
                            <span>= Esperado:</span>
                            <span>{formatCurrency(expectedBalance)}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Valor em Dinheiro na Gaveta (R$)</label>
                    <input
                        type="number"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-2xl text-white font-mono focus:border-red-500 outline-none"
                        placeholder="0,00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-2">* Conte somente o dinheiro físico.</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Observações / Motivo da Quebra</label>
                    <textarea
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-slate-500 outline-none"
                        rows="2"
                        placeholder="Descreva aqui o motivo de sangrias especiais ou justificativa para quebra de caixa..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleCloseRegister}
                    disabled={loading || calculating}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Fechando...' : 'FINALIZAR E FECHAR CAIXA'}
                </button>
            </div>
        );
    };

    const renderSangriaMode = () => (
        <div className="space-y-4">
            <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20 text-orange-400 mb-4 flex gap-3 items-center">
                <FaLock />
                <p className="text-sm font-bold">Autorização de Administrador Necessária</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Valor da Retirada (R$)</label>
                <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-2xl text-white font-mono focus:border-orange-500 outline-none"
                    placeholder="0,00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    autoFocus
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Motivo</label>
                <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                    placeholder="Ex: Pagamento Fornecedor, Vale Transporte..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />
            </div>

            {authorizedAdmin ? (
                <div className="flex items-center gap-2 text-green-500 text-sm font-bold bg-green-900/20 p-2 rounded">
                    <FaCheck /> Autorizado por: {authorizedAdmin.name}
                </div>
            ) : null}

            <button
                onClick={handleSangria}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                {authorizedAdmin ? (loading ? 'Registrando...' : 'CONFIRMAR SANGRIA') : <><FaLock /> AUTORIZAR E SACAR</>}
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#111]">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {mode === 'OPEN' && <><FaMoneyBillWave className="text-green-500" /> Abertura de Caixa</>}
                        {mode === 'CLOSE' && <><FaLock className="text-red-500" /> Fechamento de Caixa</>}
                        {mode === 'SANGRIA' && <><FaArrowDown className="text-orange-500" /> Sangria (Retirada)</>}
                    </h3>
                    {/* Only allow closing modal if NOT in OPEN mode (forced) */}
                    {mode !== 'OPEN' && (
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <FaTimes size={24} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm font-bold flex items-center gap-2">
                            <FaExclamationTriangle /> {error}
                        </div>
                    )}

                    {mode === 'OPEN' && renderOpenMode()}
                    {mode === 'CLOSE' && renderCloseMode()}
                    {mode === 'SANGRIA' && renderSangriaMode()}
                </div>
            </div>

            {/* Admin PIN for Sangria */}
            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={handlePinSuccess}
                title="Senha do Administrador"
                requiredRole="ADMIN"
            />
        </div>
    );
};

export default CashManagementModal;
