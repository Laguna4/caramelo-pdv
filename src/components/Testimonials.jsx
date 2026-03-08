import React from 'react';
import { FaStar, FaQuoteLeft } from 'react-icons/fa';

const testimonials = [
    {
        name: "Ricardo Silva",
        role: "Dono da Padaria Pão Dourado",
        text: "O Caramelo mudou minha vida. Antes eu passava horas fechando caixa no caderno. Agora faço tudo em 10 minutos pelo celular.",
        rating: 5,
        image: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
        name: "Fernanda Costa",
        role: "Gerente, Boutique Flor de Lis",
        text: "Simples e direto. Meus funcionários aprenderam a usar em um dia. O suporte é incrível também!",
        rating: 5,
        image: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
        name: "Carlos Eduardo",
        role: "Mercadinho do Bairro",
        text: "Melhor investimento que fiz. O controle de estoque automático me avisa quando comprar. Recomendo demais.",
        rating: 5,
        image: "https://randomuser.me/api/portraits/men/85.jpg"
    }
];

const Testimonials = () => {
    return (
        <section id="testimonials" className="py-20 bg-slate-900 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Quem usa, aprova
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Junte-se a mais de 500 lojistas que transformaram seus negócios com o Caramelo.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((t, index) => (
                        <div key={index} className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 relative hover:-translate-y-2 transition-transform duration-300">
                            <FaQuoteLeft className="text-amber-500/20 text-4xl absolute top-6 right-6" />

                            <div className="flex items-center gap-1 mb-4 text-amber-400">
                                {[...Array(t.rating)].map((_, i) => (
                                    <FaStar key={i} />
                                ))}
                            </div>

                            <p className="text-gray-300 mb-6 leading-relaxed italic">
                                "{t.text}"
                            </p>

                            <div className="flex items-center gap-4">
                                <img
                                    src={t.image}
                                    alt={t.name}
                                    className="w-12 h-12 rounded-full border-2 border-amber-500"
                                />
                                <div>
                                    <h4 className="text-white font-bold text-sm">{t.name}</h4>
                                    <span className="text-gray-500 text-xs uppercase tracking-wide">{t.role}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
