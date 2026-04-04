import { FaCheckCircle, FaCircle, FaUserTie, FaBoxOpen, FaMoneyBillWave, FaCashRegister, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const OnboardingChecklist = ({ counts, cashRegister }) => {
    const navigate = useNavigate();

    const steps = [
        {
            id: 'sellers',
            title: 'Cadastrar Vendedor',
            desc: 'A primeira coisa é ter alguém para operar o caixa.',
            icon: <FaUserTie />,
            done: counts.sellers > 0,
            path: '/sellers'
        },
        {
            id: 'products',
            title: 'Cadastrar Produtos',
            desc: 'Cadastre o que você vai vender.',
            icon: <FaBoxOpen />,
            done: counts.products > 0,
            path: '/products'
        },
        {
            id: 'cashier',
            title: 'Abrir o Caixa',
            desc: 'Prepare o caixa para o dia de hoje.',
            icon: <FaMoneyBillWave />,
            done: !!cashRegister,
            path: '/pos'
        },
        {
            id: 'sale',
            title: 'Primeira Venda',
            desc: 'Agora é só vender no PDV (F2).',
            icon: <FaCashRegister />,
            done: false, // Could check if sales > 0 if we pass that count
            path: '/pos'
        }
    ];

    const completedCount = steps.filter(s => s.done).length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <div className="bg-[#151515] border border-orange-500/20 rounded-2xl p-6 shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        🏁 Guia de Início Rápido
                    </h2>
                    <p className="text-gray-500 text-sm">Siga estes passos para configurar sua loja</p>
                </div>
                <div className="text-right">
                    <span className="text-orange-500 font-bold text-lg">{completedCount}/{steps.length}</span>
                    <span className="text-gray-600 text-xs block">Passos concluídos</span>
                </div>
            </div>

            <div className="w-full bg-gray-900 rounded-full h-2 mb-8 border border-gray-800">
                <div
                    className="h-2 rounded-full bg-gradient-to-r from-orange-600 to-yellow-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {steps.map((step, idx) => (
                    <button
                        key={idx}
                        onClick={() => navigate(step.path)}
                        className={`text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${step.done
                                ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                                : 'bg-gray-900/40 border-gray-800 hover:border-orange-500/40 hover:bg-gray-900/60'
                            }`}
                    >
                        <div className={`mt-1 text-xl ${step.done ? 'text-green-500' : 'text-gray-600'}`}>
                            {step.done ? <FaCheckCircle /> : <FaCircle className="opacity-20" />}
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-bold text-sm ${step.done ? 'text-green-500' : 'text-white'}`}>
                                {step.title}
                            </h4>
                            <p className="text-[10px] text-gray-500 leading-tight mt-1">{step.desc}</p>
                        </div>
                        <FaChevronRight className="mt-1 text-gray-700 text-xs" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default OnboardingChecklist;
