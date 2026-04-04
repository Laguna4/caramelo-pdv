import React, { useState, useEffect } from 'react';
import { FaTimes, FaArrowRight, FaCheck, FaPrint, FaBarcode } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';

const DemoGuide = () => {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    // Steps configuration
    const steps = [
        {
            title: "Bem-vindo ao Modo Demo! 🚀",
            content: (
                <>
                    <p className="mb-2">Você está no comando de uma <b>Versão de Apresentação</b>.</p>
                    <p>Aqui você pode testar tudo: cadastrar produtos, fazer vendas e emitir comprovantes.</p>
                    <div className="bg-amber-600/20 p-2 rounded-lg mt-3 border border-amber-500/30">
                        <p className="text-xs font-bold text-amber-500 mb-1">⚠️ AVISO IMPORTANTE:</p>
                        <p className="text-[11px] text-gray-300">• Senha padrão para testes: <b>1234</b></p>
                        <p className="text-[11px] text-gray-300">• Dados são <b>resetados a cada 1 hora</b>.</p>
                        <p className="text-[11px] text-gray-300">• Não use para dados reais do seu negócio.</p>
                    </div>
                </>
            ),
            path: '/dashboard',
            highlight: null
        },
        {
            title: "Passo 1: Cadastro e Etiquetas 🏷️",
            content: (
                <>
                    <p className="mb-2">Vamos ver como é fácil gerenciar seu estoque.</p>
                    <p>Clique em <b>Produtos</b> para adicionar itens, gerar códigos de barras e imprimir etiquetas.</p>
                </>
            ),
            path: '/dashboard',
            highlight: 'F3', // Shortcut or logic to highlight
            actionLabel: "Ir para Produtos",
            action: () => navigate('/products')
        },
        {
            title: "Impressão de Etiquetas 🖨️",
            content: (
                <>
                    <p className="mb-2">Na tela de produtos, procure pelo ícone de código de barras <FaBarcode className="inline" />.</p>
                    <p>O Caramelo gera automaticamente etiquetas prontas para imprimir e colar nas prateleiras!</p>
                </>
            ),
            path: '/products',
            highlight: 'print-btn'
        },
        {
            title: "Passo 2: Frente de Caixa (PDV) 💸",
            content: (
                <>
                    <p className="mb-2">Agora vamos vender!</p>
                    <p>Acesse o <b>PDV</b> para simular uma venda rápida, como se estivesse no balcão.</p>
                </>
            ),
            path: '/products', // Starting from products
            actionLabel: "Abrir PDV",
            action: () => navigate('/pos')
        },
        {
            title: "Finalize a Venda ✅",
            content: (
                <>
                    <p className="mb-2">Bipe um produto (ou digite o nome) e finalize a venda.</p>
                    <p>Ao final, você verá o cupom fiscal (NFC-e fictícia) pronto para impressão.</p>
                </>
            ),
            path: '/pos'
        }
    ];

    // Auto-advance logic based on route could go here, but manual is safer for now.

    if (!isVisible) return null;

    // Check if current step matches current path (basic sync)
    // If user navigates away, we might want to minimize or adjust.
    // For simplicity, we just show the modal on top.

    const currentStep = steps[step];

    return (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-slide-up">
            <div className="bg-slate-800 border-2 border-amber-500 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-amber-500 p-3 flex justify-between items-center">
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                        🎓 Tutorial Demo ({step + 1}/{steps.length})
                    </span>
                    <button onClick={() => setIsVisible(false)} className="text-slate-900 hover:text-white transition-colors">
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 text-gray-100">
                    <h3 className="text-lg font-bold text-white mb-2">{currentStep.title}</h3>
                    <div className="text-sm leading-relaxed mb-6 text-gray-300">
                        {currentStep.content}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => setStep(Math.max(0, step - 1))}
                            className={`text-sm text-gray-400 hover:text-white ${step === 0 ? 'invisible' : ''}`}
                        >
                            Voltar
                        </button>

                        {currentStep.action ? (
                            <button
                                onClick={() => {
                                    currentStep.action();
                                    setStep(step + 1);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all"
                            >
                                {currentStep.actionLabel} <FaArrowRight />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (step < steps.length - 1) setStep(step + 1);
                                    else setIsVisible(false);
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all"
                            >
                                {step === steps.length - 1 ? 'Concluir' : 'Próximo'} {step === steps.length - 1 ? <FaCheck /> : <FaArrowRight />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-slate-700 h-1 w-full">
                    <div
                        className="bg-green-500 h-full transition-all duration-300"
                        style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default DemoGuide;
