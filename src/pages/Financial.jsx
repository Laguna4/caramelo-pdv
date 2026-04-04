import { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaEdit, FaTrash, FaCheck, FaTimes, FaCalendarAlt, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaExchangeAlt, FaRedo } from 'react-icons/fa';
import { getCurrentStore } from '../utils/storage';
import { addTransaction, getTransactions, deleteTransaction, updateTransaction } from '../services/dbService';
import { formatCurrency } from '../utils/calculations';

const Financial = () => {
    const [transactions, setTransactions] = useState([]);
    const [store, setStore] = useState(getCurrentStore());
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Filters
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterType, setFilterType] = useState('EXPENSE'); // Fixed to EXPENSE as requested

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'EXPENSE',
        date: new Date().toISOString().split('T')[0],
        category: 'Outros',
        paid: false,
        isRecurrent: false,
        recurrenceDay: 1
    });

    useEffect(() => {
        if (store?.id) {
            loadTransactions();
        }
    }, [store?.id]);

    const loadTransactions = async () => {
        if (!store.id) return;
        setLoading(true);
        const data = await getTransactions(store.id);
        setTransactions(data);
        setLoading(false);
    };

    // Calculate Totals for CURRENT MONTH VIEW
    const getMonthData = () => {
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // 1. Filter One-time transactions in this month
        const monthlyTransactions = transactions.filter(t => {
            if (t.isRecurrent) return false;
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        });

        // 2. Add Recurrent Transactions (Projected)
        const recurrentTransactions = transactions.filter(t => t.isRecurrent).map(t => {
            const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            return {
                ...t,
                date: new Date(currentYear, currentMonth, t.recurrenceDay || 1).toISOString(), // Project to this month
                _isProjected: true,
                _monthKey: monthKey,
                paid: t.paidMonths && t.paidMonths.includes(monthKey)
            };
        });

        // Combine and Sort
        return [...monthlyTransactions, ...recurrentTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const filteredData = getMonthData().filter(t => filterType === 'ALL' || t.type === filterType);

    const totalRevenue = getMonthData().filter(t => t.type === 'REVENUE').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = getMonthData().filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const balance = totalRevenue - totalExpense;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const isRecurrent = formData.isRecurrent;
            const tDate = new Date(formData.date);
            // Handle local timezone offset to avoid date shifting
            const offsetDate = new Date(tDate.getTime() + Math.abs(tDate.getTimezoneOffset() * 60000));
            const monthKey = `${offsetDate.getFullYear()}-${String(offsetDate.getMonth() + 1).padStart(2, '0')}`;

            await addTransaction(store.id, {
                ...formData,
                amount: parseFloat(formData.amount),
                recurrenceDay: isRecurrent ? parseInt(formData.date.split('-')[2], 10) : null,
                paid: isRecurrent ? false : formData.paid,
                paidMonths: (isRecurrent && formData.paid) ? [monthKey] : []
            });
            setShowForm(false);
            setFormData({
                description: '',
                amount: '',
                type: 'EXPENSE',
                date: new Date().toISOString().split('T')[0],
                category: 'Outros',
                paid: false,
                isRecurrent: false,
                recurrenceDay: 1
            });
            loadTransactions();
        } catch (error) {
            alert('Erro ao salvar: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza? Se for recorrente, apagará para todos os meses.')) return;
        await deleteTransaction(id);
        loadTransactions();
    };

    const handleTogglePaid = async (item) => {
        // If it's a projected recurrent item, update the specific month's payment status
        if (item._isProjected) {
            const currentPaidMonths = item.paidMonths || [];
            let newPaidMonths;

            if (item.paid) {
                // Currently paid, remove this month from the array
                newPaidMonths = currentPaidMonths.filter(m => m !== item._monthKey);
            } else {
                // Not paid, add this month to the array
                newPaidMonths = [...currentPaidMonths, item._monthKey];
            }

            await updateTransaction(item.id, { paidMonths: newPaidMonths });
            loadTransactions();
        } else {
            // Normal one-time transaction
            await updateTransaction(item.id, { paid: !item.paid });
            loadTransactions();
        }
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    return (
        <div className="fade-in p-2 md:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3 w-full md:w-auto bg-[#0a0a0a] p-2 rounded-xl border border-gray-800/50">
                    <button onClick={prevMonth} className="btn-secondary p-3"><FaArrowDown className="rotate-90 text-[10px]" /></button>
                    <h2 className="text-base md:text-2xl font-bold text-white capitalize flex-1 text-center">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={nextMonth} className="btn-secondary p-3"><FaArrowUp className="rotate-90 text-[10px]" /></button>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto py-3 px-6 rounded-xl shadow-lg font-bold">
                    <FaPlus className="text-xs" /> Nova Movimentação
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="card-premium border-l-4 border-red-500/50 bg-[#0a0a0a] p-4 md:p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between text-red-400 mb-1">
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-wider">Despesas Totais</span>
                        <FaArrowDown className="text-xs" />
                    </div>
                    <div className="text-xl md:text-3xl font-black text-white">{formatCurrency(totalExpense)}</div>
                </div>
                <div className="card-premium border-l-4 border-blue-500/50 bg-[#0a0a0a] p-4 md:p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between text-blue-400 mb-1">
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-wider">Fluxo de Caixa (Saídas)</span>
                        <FaMoneyBillWave className="text-xs" />
                    </div>
                    <div className="text-xl md:text-3xl font-black text-blue-400">
                        {formatCurrency(totalExpense)}
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">* Apenas saídas manuais e Budgets</p>
                </div>
            </div>

            {/* List */}
            <div className="card overflow-hidden bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-[#111] text-gray-500 text-[10px] md:text-xs uppercase font-black border-b border-gray-800/50">
                        <tr>
                            <th className="p-3 md:p-4">Descrição</th>
                            <th className="p-4 hidden lg:table-cell">Data</th>
                            <th className="p-4 hidden md:table-cell">Categoria</th>
                            <th className="p-4 center hidden sm:table-cell">Tipo</th>
                            <th className="p-3 md:p-4 center">Situação</th>
                            <th className="p-3 md:p-4 text-right">Valor</th>
                            <th className="p-3 md:p-4 center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                        {filteredData.map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="p-3 md:p-4">
                                    <div className="font-bold text-white text-sm md:text-base group-hover:text-primary transition-colors">{item.description}</div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                        <span className="lg:hidden">{new Date(item.date).toLocaleDateString()}</span>
                                        <span className="md:hidden">| {item.category}</span>
                                        {item.isRecurrent && <FaRedo className="text-blue-400" />}
                                    </div>
                                </td>
                                <td className="p-4 text-gray-400 text-sm hidden lg:table-cell">
                                    {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{item.category}</td>
                                <td className="p-4 center hidden sm:table-cell">
                                    {item.type === 'REVENUE'
                                        ? <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[10px] font-bold">Receita</span>
                                        : <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] font-bold">Despesa</span>
                                    }
                                </td>
                                <td className="p-3 md:p-4 center">
                                    <button
                                        onClick={() => handleTogglePaid(item)}
                                        className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all shadow-sm ${item.paid ? 'bg-green-500 text-white' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}
                                    >
                                        {item.paid ? 'PAGO' : 'PENDENTE'}
                                    </button>
                                </td>
                                <td className={`p-3 md:p-4 text-right font-black text-sm md:text-lg ${item.type === 'REVENUE' ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(item.amount)}
                                </td>
                                <td className="p-3 md:p-4 center">
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500/50 hover:text-red-500 transition-colors">
                                        <FaTrash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        Nenhuma movimentação neste mês.
                    </div>
                )}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex-center">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-md animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-4">Nova Movimentação</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Descrição</label>
                                <input
                                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:border-green-500 transition-colors"
                                    placeholder="Ex: Conta de Luz"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Valor (R$)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:border-green-500 transition-colors"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Data / Vencimento</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:border-green-500 transition-colors"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Tipo</label>
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:border-green-500 transition-colors"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        disabled
                                    >
                                        <option value="EXPENSE">Despesa (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Categoria</label>
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-black focus:outline-none focus:border-green-500 transition-colors"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Fixa">Despesa Fixa</option>
                                        <option value="Variável">Despesa Variável</option>
                                        <option value="Fornecedor">Fornecedores</option>
                                        <option value="Pessoal">Pessoal / Salário</option>
                                        <option value="Vendas">Vendas</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
                                <input
                                    type="checkbox"
                                    id="recurrent"
                                    className="w-5 h-5 accent-primary"
                                    checked={formData.isRecurrent}
                                    onChange={e => setFormData({ ...formData, isRecurrent: e.target.checked })}
                                />
                                <label htmlFor="recurrent" className="text-white text-sm cursor-pointer select-none">
                                    <span className="font-bold block">Repetir todo mês?</span>
                                    <span className="text-gray-400 text-xs">Ex: Aluguel, Internet (Cria uma regra fixa)</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-4 mt-2">
                                <input
                                    type="checkbox"
                                    id="paid"
                                    className="w-5 h-5 accent-green-500"
                                    checked={formData.paid}
                                    onChange={e => setFormData({ ...formData, paid: e.target.checked })}
                                />
                                <label htmlFor="paid" className="text-white text-sm cursor-pointer">
                                    Já está pago?
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary w-full">Cancelar</button>
                                <button type="submit" className="btn-primary w-full">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Financial;
