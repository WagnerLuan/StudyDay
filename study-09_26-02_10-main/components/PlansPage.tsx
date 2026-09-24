import * as React from 'react';
import { PlusCircleIcon, SparklesIcon, TrashIcon } from '../constants';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { StudyPlan } from '../types';

interface PlansPageProps {
    plans: StudyPlan[];
    onCreatePlanRequest: () => void;
    onDeletePlan: (id: string) => void;
    onViewPlan: (id: string) => void;
    onGeneratePlanFromUrl: (url: string) => Promise<void>;
}

const PlanCard: React.FC<{ plan: StudyPlan; onDelete: (id: string) => void; onView: (id: string) => void; }> = ({ plan, onDelete, onView }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div 
            className="bg-gray-800 p-6 rounded-lg text-center transform hover:-translate-y-1 transition-transform duration-300 cursor-pointer relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onView(plan.id)}
        >
             {isHovered && (
                 <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent card click events
                        onDelete(plan.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors z-10"
                    aria-label={`Excluir plano ${plan.name}`}
                    title="Excluir Plano"
                 >
                     <TrashIcon className="w-5 h-5" /> {/* Adicionado tamanho explícito ao ícone */}
                 </button>
            )}
            
            <div className="w-24 h-24 mx-auto bg-gray-700 rounded-full flex items-center justify-center border-4 border-emerald-400 overflow-hidden">
                {plan.image ? (
                    <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" />
                ) : (
                    // Default logo if no image is provided, especially for the initial one if needed
                    <img src="https://i.imgur.com/g0QcApU.png" alt="Default Logo" className="w-full h-full object-cover rounded-full" />
                )}
            </div>

            <h3 className="text-xl font-bold text-white mt-4">{plan.name}</h3>
            <p className="text-gray-400 mt-2 text-sm">Matérias: {plan.subjects}</p>
            <p className="text-gray-400 text-sm">Tópicos: {plan.topics}</p>
        </div>
    );
};


const PlansPage: React.FC<PlansPageProps> = ({ plans, onCreatePlanRequest, onDeletePlan: onDeletePlanRequest, onViewPlan, onGeneratePlanFromUrl }) => {
    const [isDeleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [planToDeleteId, setPlanToDeleteId] = React.useState<string | null>(null);
    
    const [url, setUrl] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleDeleteRequest = (id: string) => {
        setPlanToDeleteId(id);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (planToDeleteId) {
            onDeletePlanRequest(planToDeleteId);
        }
        setDeleteModalOpen(false);
        setPlanToDeleteId(null);
    };

    const handleGenerate = async () => {
        if (!url.trim()) return;
        setIsGenerating(true);
        setError(null);
        try {
            await onGeneratePlanFromUrl(url);
            setUrl('');
        } catch (e) {
            console.error(e);
            setError('Falha ao gerar o plano. Verifique o link e tente novamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <div className="space-y-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Meus Planos de Estudo</h1>
                    <button 
                        onClick={onCreatePlanRequest}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 transition-colors w-full sm:w-auto justify-center shadow-lg hover:shadow-emerald-500/50">
                        <PlusCircleIcon className="w-7 h-7" />
                        <span>Criar Novo Plano</span>
                    </button>
                </header>

                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-white mb-2">Importar Guia de Estudo do PCI Concursos</h2>
                    <p className="text-gray-400 mb-4">Cole o link do edital abaixo para gerar o plano automaticamente com IA.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input 
                            type="text"
                            placeholder="Cole a URL do edital do PCI Concursos aqui"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="flex-grow bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            disabled={isGenerating}
                            autoComplete="off"
                        />
                        <button 
                            onClick={handleGenerate}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Gerando...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    <span>Gerar Plano com IA</span>
                                </>
                            )}
                        </button>
                    </div>
                     {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                     {plans.map(plan => (
                         <PlanCard key={plan.id} plan={plan} onDelete={handleDeleteRequest} onView={onViewPlan} />
                     ))}
                </div>
            </div>
            
            <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemType="plano"
            />
        </>
    );
};

export default PlansPage;