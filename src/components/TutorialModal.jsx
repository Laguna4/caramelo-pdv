import { FaTimes, FaLightbulb, FaArrowRight, FaCheck } from 'react-icons/fa';

const TutorialModal = ({ isOpen, onClose, title, steps, currentStep, onNext, onPrev, targetId }) => {
    if (!isOpen) return null;

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1a1a1a] border-2 border-orange-500/50 rounded-2xl w-full max-w-md shadow-2xl shadow-orange-500/10 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-600 to-yellow-600 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-white font-bold">
                        <FaLightbulb />
                        <span>{title}</span>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center justify-center mb-6">
                        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500 text-3xl animate-bounce">
                            {step.icon || <FaLightbulb />}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white text-center mb-3">
                        {step.title}
                    </h3>

                    <p className="text-gray-400 text-center text-sm leading-relaxed mb-8">
                        {step.content}
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={currentStep === steps.length - 1 ? onClose : onNext}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                            {currentStep === steps.length - 1 ? (
                                <><FaCheck /> Entendi, vamos lá!</>
                            ) : (
                                <><FaArrowRight /> Próximo Passo</>
                            )}
                        </button>

                        {steps.length > 1 && (
                            <div className="flex justify-center gap-1.5 pt-2">
                                {steps.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-800'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-[#111] p-3 text-center border-t border-gray-800">
                    <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                        Desativar modo ajuda em Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TutorialModal;
