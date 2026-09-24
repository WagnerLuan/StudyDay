import * as React from 'react';
import { XIcon, SparklesIcon, WrenchScrewdriverIcon } from '../constants';

interface CreateCycleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMode: (mode: 'guided' | 'manual') => void;
}

const OptionCard: React.FC<{ icon: React.ReactNode, title: string, description: string, onClick: () => void, iconColor: string }> = 
({ icon, title, description, onClick, iconColor }) => (
    <div
        onClick={onClick}
        className="bg-gray-700/50 p-6 rounded-lg border border-gray-600 hover:border-emerald-500 hover:bg-gray-700/80 transition-all duration-300 cursor-pointer text-center group transform hover:scale-105"
    >
        <div className={`w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-lg bg-gray-800 text-3xl ${iconColor} transition-colors group-hover:text-emerald-300`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
    </div>
);

const CreateCycleModal: React.FC<CreateCycleModalProps> = ({ isOpen, onClose, onSelectMode }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl text-white transform transition-all relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <XIcon />
                </button>
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">Criar Novo Ciclo de Estudos</h2>
                    <p className="text-gray-400 mb-8">Escolha como você prefere montar seu plano de estudos.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <OptionCard 
                        icon={<SparklesIcon />}
                        title="Modo Guiado"
                        description="Nós guiaremos você passo a passo para criar um plano otimizado e personalizado."
                        onClick={() => onSelectMode('guided')}
                        iconColor="text-emerald-400"
                    />
                    <OptionCard 
                        icon={<WrenchScrewdriverIcon />}
                        title="Modo Manual"
                        description="Crie seu ciclo de estudos adicionando sessões de estudo uma a uma."
                        onClick={() => onSelectMode('manual')}
                        iconColor="text-emerald-400"
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateCycleModal;