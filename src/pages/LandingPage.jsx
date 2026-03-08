import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCheck, FaStore, FaMobileAlt, FaShieldAlt, FaChartLine, FaWhatsapp, FaArrowRight, FaBolt, FaTimes, FaCrown, FaPrint, FaUsers, FaPlay } from 'react-icons/fa';
import logo from '../assets/caramelo-logo.png';
import { loginDemoUser } from '../services/demoService';
import { getSiteSettings } from '../services/dbService';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';

const VideoPlaceholder = ({ theme = 'amber', videoId = 'K8s_1fkBtUI' }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const shadowClass = theme === 'amber' ? 'rgba(245,158,11,0.5)' : 'rgba(59,130,246,0.5)';
    return (
        <div className="group relative rounded-[40px] bg-gradient-to-b from-white/10 to-transparent p-[1px] shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[#0f172a] rounded-[40px] -z-10"></div>
            <div className={`absolute -top-20 -right-20 w-80 h-80 bg-${theme}-500/10 blur-[100px] rounded-full group-hover:bg-${theme}-500/20 transition-all duration-1000`}></div>
            <div className="relative aspect-video rounded-[39px] overflow-hidden bg-slate-900 flex items-center justify-center">
                {isPlaying ? (
                    <iframe
                        className="w-full h-full absolute inset-0 rounded-[39px]"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                ) : (
                    <>
                        <img
                            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                            alt="Capa do Vídeo"
                            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-500"
                            onError={(e) => {
                                if (e.target.src.includes('maxresdefault')) {
                                    e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                } else {
                                    e.target.style.display = 'none';
                                }
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-all duration-500 group-hover:bg-black/20 cursor-pointer" onClick={() => setIsPlaying(true)}></div>
                        <div className="relative z-10 flex flex-col items-center gap-6 cursor-pointer transform group-hover:scale-110 transition-all duration-500" onClick={() => setIsPlaying(true)}>
                            <div className={`w-24 h-24 rounded-full bg-${theme}-500 flex items-center justify-center text-slate-950 text-3xl shadow-[0_0_50px_${shadowClass}]`}>
                                <div className="ml-1.5"><FaPlay /></div>
                            </div>
                            <span className="text-white font-bold tracking-[0.2em] text-xs uppercase opacity-80 group-hover:opacity-100 transition-all">Veja o sistema em ação</span>
                        </div>
                    </>
                )}
            </div>
            {!isPlaying && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div className={`h-full bg-${theme}-500/50 w-0 group-hover:w-[40%] transition-all duration-[3000ms] ease-out`}></div>
                </div>
            )}
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 transition-colors group hover:bg-slate-800">
        <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-2xl mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all transform group-hover:rotate-6">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const LandingPage = () => {
    const navigate = useNavigate();
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'
    const [globalVideoId, setGlobalVideoId] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getSiteSettings();
            if (settings && settings.landingVideoId) {
                setGlobalVideoId(settings.landingVideoId);
            } else {
                setGlobalVideoId('K8s_1fkBtUI');
            }
        };
        fetchSettings();
    }, []);

    const getWhatsAppLink = (plan) => {
        const period = billingCycle === 'annual' ? ' (Anual)' : ' (Mensal)';
        const msg = `Olá, equipe Caramelo! Estava no site de vocês e tenho muito interesse em assinar o Plano ${plan}${period}. Como fazemos para iniciar?`;
        return `https://wa.me/5531971301955?text=${encodeURIComponent(msg)}`;
    };

    const handleDemoLogin = async () => {
        setIsDemoLoading(true);
        try {
            await loginDemoUser();
            window.location.href = '/dashboard';
        } catch (error) {
            alert("Erro ao entrar na Demo. Tente novamente.");
            console.error(error);
        } finally {
            if (!window.location.href.includes('/dashboard')) {
                setIsDemoLoading(false);
            }
        }
    };

    return (
        <div className="font-sans text-gray-100 bg-slate-900 min-h-screen">
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="Caramelo PDV" className="h-10 w-auto" />
                            <span className="font-bold text-xl text-amber-500 tracking-tight">CarameloPDV</span>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8">
                            <div className="hidden md:flex items-center gap-8">
                                <a href="#features" className="text-gray-300 hover:text-white transition-colors">Funcionalidades</a>
                                <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Quem Usa</a>
                                <a href="#plans" className="text-gray-300 hover:text-white transition-colors">Planos</a>
                            </div>
                            <Link to="/login" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-4 md:px-6 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-amber-500/20 text-sm md:text-base">
                                Entrar <span className="hidden sm:inline">no Sistema</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section 3D Style */}
            <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-900 to-slate-900 z-0"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Left Column: Heading Section */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm animate-fade-in-up">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-gray-300 text-sm font-medium">Sistema Online • v2.4 Atualizada</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                            Sua Loja Merece <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">
                                Mais Inteligência
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed max-w-2xl lg:max-w-none">
                            Abandone as planilhas e o caderninho. Tenha controle total de estoque, vendas e financeiro em uma plataforma simples, bonita e poderosa.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full sm:w-auto">
                            <button
                                onClick={handleDemoLogin}
                                className="group bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                Testar Grátis Agora
                                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <a href="#features" className="bg-slate-800/50 border border-slate-700 text-white font-bold py-4 px-8 rounded-full text-lg hover:bg-slate-800 transition-all backdrop-blur-sm shadow-lg">
                                Ver Detalhes
                            </a>
                        </div>

                        <p className="mt-8 text-sm text-gray-500 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <span className="flex items-center gap-1"><FaCheck className="text-green-500" /> Sem cartão de crédito</span>
                            <span className="flex items-center gap-1"><FaCheck className="text-green-500" /> Cancelamento grátis</span>
                        </p>
                    </div>

                    {/* Right Column: Featured Video */}
                    <div className="w-full relative animate-fade-in-up delay-[400ms]">
                        <div className="relative min-h-[250px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[450px]">
                            {globalVideoId ? (
                                <VideoPlaceholder theme="amber" videoId={globalVideoId} />
                            ) : (
                                <div className="w-full aspect-video rounded-[39px] bg-slate-900 border border-slate-800 shadow-2xl flex justify-center items-center animate-pulse">
                                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </section>

            {/* Features Interativas */}
            <section id="features" className="py-20 bg-slate-800/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-amber-500 font-bold uppercase tracking-wider text-sm">Recursos Poderosos</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">Tudo o que você precisa</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">Desenvolvido pensando na agilidade do balcão e na precisão do escritório.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard icon={<FaStore />} title="Frente de Caixa (PDV)" desc="Venda em segundos. Interface intuitiva, compatível com leitor de código de barras e impressoras térmicas." />
                        <FeatureCard icon={<FaMobileAlt />} title="Acesso Mobile" desc="Acompanhe suas vendas em tempo real de qualquer lugar pelo celular. Seu negócio não para." />
                        <FeatureCard icon={<FaShieldAlt />} title="Segurança Avançada" desc="Bloqueio remoto em caso de inadimplência e backups automáticos na nuvem para você nunca perder dados." />
                        <FeatureCard icon={<FaChartLine />} title="Relatórios Detalhados" desc="Saiba exatamente quanto lucrou. Gráficos de vendas diárias, mensais e produtos mais vendidos." />
                        <FeatureCard icon={<FaCheck />} title="Controle de Estoque" desc="Baixa automática a cada venda. Alertas de estoque baixo para reposição inteligente." />
                        <FeatureCard icon={<FaWhatsapp />} title="Venda no WhatsApp" desc="Envie comprovantes e catálogos digitais diretamente para o WhatsApp do seu cliente." />
                    </div>
                </div>
            </section>

            {/* Target Audience Section */}
            <section className="py-20 bg-slate-900 relative border-t border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-amber-500 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"><FaStore /> Feito Para o Varejo</span>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 max-w-2xl mx-auto leading-tight">
                            Para quem é o <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">Caramelo PDV?</span>
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto mt-4 text-lg">
                            Nosso sistema é otimizado para dar velocidade no balcão e clareza na gestão financeira de comércios gerais.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        {/* Perfect Fit */}
                        <div className="bg-slate-800/40 border border-emerald-500/30 rounded-[32px] p-8 lg:p-10 relative overflow-hidden group hover:border-emerald-500/60 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full"></div>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center text-2xl">
                                    <FaCheck />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Atendemos Perfeitamente</h3>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    'Lojas de Roupas e Calçados',
                                    'Depósitos e Materiais de Construção',
                                    'Conveniências, Adegas e Empórios',
                                    'Autopeças e Oficinas',
                                    'Perfumarias e Cosméticos',
                                    'Assistências Técnicas',
                                    'Comércios Varejistas em Geral'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-gray-300">
                                        <FaCheck className="text-emerald-500 mt-1 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Does Not Fit */}
                        <div className="bg-slate-800/40 border border-red-500/30 rounded-[32px] p-8 lg:p-10 relative overflow-hidden group hover:border-red-500/60 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full"></div>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center text-2xl">
                                    <FaTimes />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Ainda Não Atendemos</h3>
                            </div>
                            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                                Para manter o sistema rápido e simples, optamos por não incluir algumas funções específicas no momento:
                            </p>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 text-red-500 shrink-0"><FaTimes /></div>
                                    <div>
                                        <span className="text-white font-bold block mb-1">Supermercados / Hortifruti</span>
                                        <span className="text-gray-400 text-sm">Ainda não possuímos integração com balanças para produtos vendidos por peso (no quilo).</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 text-red-500 shrink-0"><FaTimes /></div>
                                    <div>
                                        <span className="text-white font-bold block mb-1">Restaurantes e Delivery</span>
                                        <span className="text-gray-400 text-sm">Não possuímos módulo de controle de mesas, emissão de senhas ou integração com iFood/Comandas.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <Testimonials />

            {/* Pricing Plans */}
            <section id="plans" className="py-20 bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div>
                            <span className="text-amber-500 font-bold tracking-widest uppercase text-xs">Investimento</span>
                            <h2 className="text-4xl font-bold text-white mt-4">Escolha o seu nível</h2>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-6 w-full md:w-auto">
                            <p className="text-slate-400 max-w-xs text-sm text-left md:text-right hidden md:block">
                                Cancele a qualquer momento. Sem fidelidade, sem letras miúdas.
                            </p>
                            <div className="bg-slate-800/50 border border-white/10 rounded-full p-1.5 flex items-center w-full sm:w-auto gap-1">
                                <button className={`flex-1 sm:flex-none sm:w-auto px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-slate-700 border border-white/5 shadow-md text-white' : 'text-slate-500 hover:text-white bg-transparent border border-transparent'}`} onClick={() => setBillingCycle('monthly')}>Mensal</button>
                                <button className={`flex-1 sm:flex-none sm:w-auto px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${billingCycle === 'annual' ? 'bg-slate-700 border border-white/5 shadow-md text-white' : 'text-slate-500 hover:text-white bg-transparent border border-transparent'}`} onClick={() => setBillingCycle('annual')}>
                                    Anual <span className={`${billingCycle === 'annual' ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-500/10 text-amber-500/70'} px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider hidden sm:block transition-all`}>2 MESES GRÁTIS</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Start Plan */}
                        <div className="group bg-slate-800/40 border border-white/5 rounded-[32px] p-8 hover:border-white/10 transition-all flex flex-col">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-slate-400 mb-4">Start</h3>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl text-slate-500 font-bold">R$</span>
                                        <span className="text-5xl font-black text-white">{billingCycle === 'annual' ? '66,58' : '79,90'}</span>
                                        <span className="text-slate-500 font-medium">/mês</span>
                                    </div>
                                    {billingCycle === 'annual' && <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">Total: R$ 799,00/ano</span>}
                                </div>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Limites de Cadastro</div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm"><span className="text-slate-400">Produtos</span> <span className="text-white font-bold">150 itens</span></div>
                                        <div className="flex justify-between text-sm"><span className="text-slate-400">Clientes</span> <span className="text-white font-bold">10 cadastros</span></div>
                                        <div className="flex justify-between text-sm items-center mt-2 pt-2 border-t border-white/5"><span className="text-slate-400">Vendedores</span> <span className="text-white font-bold">1 operador</span></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Funcionalidades</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-300"><FaCheck className="text-emerald-500" /> PDV Profissional Instantâneo</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-300"><FaCheck className="text-emerald-500" /> Fluxo de Caixa Real-time</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-300"><FaCheck className="text-emerald-500" /> Gestão de Estoque</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 opacity-40"><FaTimes className="text-red-500" /> Orçamentos Persistentes</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 opacity-40"><FaTimes className="text-red-500" /> Importação de NFe (XML)</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 opacity-40"><FaTimes className="text-red-500" /> CRM & Histórico Especial</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 opacity-40"><FaTimes className="text-red-500" /> Relatórios em PDF</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 opacity-40"><FaTimes className="text-red-500" /> Controle de Fiados</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-300"><FaCheck className="text-emerald-500" /> Sistema em Nuvem</div>
                                </div>
                            </div>

                            <a href={getWhatsAppLink('Start')} target="_blank" rel="noopener noreferrer" className="mt-10 w-full py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-slate-800 transition-all block text-center">Começar Agora</a>
                        </div>

                        {/* Business Plan (Highlighted) */}
                        <div className="relative group p-[2px] rounded-[34px] bg-gradient-to-b from-amber-500 to-orange-700 shadow-2xl shadow-orange-900/20">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-10 shadow-xl">Mais Popular</div>
                            <div className="bg-[#0f172a] rounded-[32px] p-8 h-full flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full"></div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2"><FaCrown /> Business</h3>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl text-slate-500 font-bold">R$</span>
                                            <span className="text-6xl font-black text-white">{billingCycle === 'annual' ? '149,92' : '179,90'}</span>
                                            <span className="text-slate-500 font-medium">/mês</span>
                                        </div>
                                        {billingCycle === 'annual' && <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">Total: R$ 1.799,00/ano</span>}
                                    </div>
                                </div>

                                <div className="space-y-6 flex-1">
                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                                        <div className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest mb-3">Limites de Cadastro</div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm"><span className="text-slate-300">Produtos</span> <span className="text-white font-bold">2.000 itens</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-300">Clientes</span> <span className="text-white font-bold">Ilimitados</span></div>
                                            <div className="flex justify-between text-sm items-center mt-2 pt-2 border-t border-amber-500/10"><span className="text-slate-300">Vendedores</span> <span className="text-white font-bold">3 operadores</span></div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest mb-2">Funcionalidades</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> PDV Profissional Caramelo</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> Fluxo de Caixa Diário</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> Gestão de Estoque Ativa</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> Orçamentos Persistentes</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> Importação de NFe (XML)</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> CRM & Histórico Especial</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> Relatórios em PDF</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> Controle de Fiados</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-200"><FaCheck className="text-amber-500" /> Sistema em Nuvem</div>
                                    </div>
                                </div>

                                <a href={getWhatsAppLink('Business')} target="_blank" rel="noopener noreferrer" className="mt-10 w-full py-5 rounded-2xl bg-amber-500 text-slate-900 font-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 block text-center">Começar Agora</a>
                            </div>
                        </div>

                        {/* Expert Plan */}
                        <div className="group bg-slate-800/40 border border-white/5 rounded-[32px] p-8 hover:border-white/10 transition-all flex flex-col">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-slate-400 mb-4">Expert</h3>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl text-slate-500 font-bold">R$</span>
                                        <span className="text-5xl font-black text-white">{billingCycle === 'annual' ? '208,25' : '249,90'}</span>
                                        <span className="text-slate-500 font-medium">/mês</span>
                                    </div>
                                    {billingCycle === 'annual' && <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">Total: R$ 2.499,00/ano</span>}
                                </div>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Limites de Cadastro</div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm"><span className="text-slate-400">Produtos</span> <span className="text-white font-bold">ILIMITADO</span></div>
                                        <div className="flex justify-between text-sm"><span className="text-slate-400">Clientes</span> <span className="text-white font-bold">ILIMITADO</span></div>
                                        <div className="flex justify-between text-sm items-center mt-2 pt-2 border-t border-white/5"><span className="text-slate-400">Vendedores</span> <span className="text-white font-bold">ILIMITADO</span></div>
                                    </div>
                                </div>

                                <div className="space-y-3 flex-1">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Funcionalidades</div>
                                    <div className="flex items-center gap-3 text-xs text-amber-500 font-bold"><FaCheck /> Tudo do Plano Business</div>
                                    <div className="flex items-center gap-3 text-xs text-amber-500 font-bold"><FaCheck /> Gerente de Conta Dedicado</div>
                                    <div className="flex items-center gap-3 text-xs text-amber-500 font-bold"><FaCheck /> Backup em Tempo Real Plus</div>
                                    <div className="flex items-center gap-3 text-xs text-amber-500 font-bold"><FaCheck /> Dashboard Multi-lojas</div>
                                    <div className="flex items-center gap-3 text-xs text-amber-500 font-bold"><FaCheck /> Suporte VIP 24/7 Ativo</div>
                                    <div className="flex items-center gap-3 text-xs text-amber-500 font-bold"><FaCheck /> Prioridade em Novos Recursos</div>
                                </div>
                            </div>

                            <a href={getWhatsAppLink('Expert')} target="_blank" rel="noopener noreferrer" className="mt-10 w-full py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-slate-800 transition-all text-sm uppercase tracking-widest block text-center">Falar com Consultor</a>
                        </div>
                    </div>
                </div>
            </section>

            <FAQ />

            <footer className="bg-slate-950 py-12 border-t border-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="Caramelo PDV" className="h-8 w-auto grayscale opacity-70" />
                            <span className="font-bold text-lg text-gray-500">CarameloPDV</span>
                        </div>
                        <div className="text-sm text-gray-600">
                            &copy; {new Date().getFullYear()} Caramelo PDV. Todos os direitos reservados.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
