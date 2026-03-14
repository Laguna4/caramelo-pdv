import React from 'react';
import { FaStar, FaQuoteLeft } from 'react-icons/fa';
import lavicLogo from '../assets/lavic-logo.png';
import bellaLogo from '../assets/bella-logo.png';
import vienaLogo from '../assets/viena-logo.png';

const testimonials = [
    {
        name: "Lojista La Vic",
        role: "La Vic Produtos",
        text: "O melhor sistema que já usei até hoje. É simples, rápido e resolveu toda a nossa bagunça com estoque e vendas. O Caramelo é essencial no nosso dia a dia.",
        rating: 5,
        image: lavicLogo
    },
    {
        name: "Gerente",
        role: "Bella Boutique",
        text: "Meus funcionários aprenderam a usar em 10 minutos. O suporte pelo WhatsApp é muito rápido e o visual do sistema é o mais bonito que já vi.",
        rating: 5,
        image: bellaLogo
    },
    {
        name: "Lojista",
        role: "Use Viena",
        text: "O Caramelo facilitou demais as nossas vendas. É prático, o visual é clean e as funções de estoque são muito precisas. Recomendo para todos os lojistas!",
        rating: 5,
        image: vienaLogo
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
