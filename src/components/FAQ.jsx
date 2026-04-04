import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const faqs = [
    {
        question: "Preciso de internet para usar?",
        answer: "O Caramelo PDV funciona online para garantir backups em tempo real. Porém, se a internet cair, o Frente de Caixa (PDV) continua operando offline e sincroniza tudo quando a conexão voltar."
    },
    {
        question: "Posso cancelar quando quiser?",
        answer: "Sim! Não temos contrato de fidelidade. Você é livre para cancelar a qualquer momento sem multas. Acreditamos que você vai ficar porque gosta, não porque é obrigado."
    },
    {
        question: "Funciona no meu celular?",
        answer: "Sim! O Caramelo é 100% responsivo. Você pode acompanhar vendas, cadastrar produtos e ver relatórios direto do seu smartphone ou tablet."
    },
    {
        question: "Emite Nota Fiscal (NFCe/NFe)?",
        answer: "Essa funcionalidade está em desenvolvimento e será lançada em breve como um plano separado para quem deseja emitir Notas Fiscais diretamente pelo sistema."
    },
    {
        question: "Como funciona o suporte?",
        answer: "Temos um time de especialistas prontos para te ajudar via WhatsApp (horário comercial) e E-mail (24h). No plano Premium, você tem um gerente de conta dedicado."
    },
    {
        question: "E se a internet cair ou o computador quebrar?",
        answer: "O sistema funciona normalmente sem internet! Além disso, recomendamos usar o botão 'Backup & Sair' no final do dia. Ele salva uma cópia de segurança segura no seu equipamento. Assim, mesmo se o computador pifar antes da internet voltar, você poderá recuperar todas as suas vendas."
    }
];

const FAQ = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleFAQ = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <section id="faq" className="py-20 bg-slate-900 border-t border-slate-800">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Perguntas Frequentes
                    </h2>
                    <p className="text-gray-400">
                        Tudo o que você precisa saber antes de transformar sua loja.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="border border-slate-700 rounded-lg overflow-hidden transition-all duration-300">
                            <button
                                className="w-full flex justify-between items-center p-6 bg-slate-800/50 hover:bg-slate-800 text-left focus:outline-none"
                                onClick={() => toggleFAQ(index)}
                            >
                                <span className="font-semibold text-lg text-white">{faq.question}</span>
                                {activeIndex === index ? (
                                    <FaChevronUp className="text-amber-500" />
                                ) : (
                                    <FaChevronDown className="text-slate-400" />
                                )}
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${activeIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-6 bg-slate-800/30 text-gray-300 border-t border-slate-700/50 leading-relaxed">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
