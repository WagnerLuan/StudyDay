import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlusCircleIcon, StarIcon, CheckIcon, XMarkIcon, PencilIcon, TrashIcon, ChevronDownIcon, ClockIcon, MinusCircleIcon } from '../constants';
import RegistrarSimuladoModal from './RegistrarSimuladoModal';
import { Simulado, StudyPlan } from '../types';
import PlanFilter from './PlanFilter';

const CircularProgress: React.FC<{ percentage: number }> = ({ percentage }) => (
    <div className="relative w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</span>
    </div>
);

const SimuladoListItem: React.FC<{ 
    simulado: Simulado; 
    onEdit: (s: Simulado) => void; 
    onDelete: (id: string) => void; 
}> = ({ simulado, onEdit, onDelete }) => {
    const stats = React.useMemo(() => {
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalBlank = 0;
        let totalQuestions = 0;
        let totalPoints = 0;

        simulado.disciplines.forEach(d => {
            totalCorrect += Number(d.correctAnswers) || 0;
            totalIncorrect += Number(d.incorrectAnswers) || 0;
            totalBlank += Number(d.blankAnswers) || 0;
            totalQuestions += Number(d.totalQuestions) || 0;
            totalPoints += (Number(d.correctAnswers) || 0) * (Number(d.weight) || 1);
        });

        const performance = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

        return { totalCorrect, totalIncorrect, totalBlank, totalPoints, performance };
    }, [simulado]);
    
    const formattedDate = new Date(simulado.date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-grow text-center sm:text-left">
                <p className="font-bold text-white">{formattedDate}</p>
                <p className="text-sm text-gray-400">{simulado.name} ({simulado.examStyle})</p>
            </div>
            <div className="flex-shrink-0 bg-gray-900/50 px-4 py-2 rounded-lg flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs" title="Tempo Gasto">
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-white">{simulado.timeSpent}</span>
                </div>
                <div className="flex items-center gap-1 text-xs" title="Acertos">
                     <CheckIcon className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-white">{stats.totalCorrect}</span>
                </div>
                <div className="flex items-center gap-1 text-xs" title="Erros">
                    <XMarkIcon className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-white">{stats.totalIncorrect}</span>
                </div>
                 <div className="flex items-center gap-1 text-xs" title="Em Branco">
                    <MinusCircleIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-white">{stats.totalBlank}</span>
                </div>
                 <div className="flex items-center gap-1 text-xs" title="Pontuação">
                    <StarIcon className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold text-white">{stats.totalPoints}</span>
                </div>
                <div className="font-bold text-white text-sm bg-gray-700 px-2 py-1 rounded">
                    {stats.performance.toFixed(0)}%
                </div>
            </div>
             <div className="flex items-center gap-2">
                <button onClick={() => onEdit(simulado)} className="p-2 text-gray-400 hover:text-white" title="Editar"><PencilIcon className="w-5 h-5" /></button>
                <button onClick={() => onDelete(simulado.id)} className="p-2 text-gray-400 hover:text-red-500" title="Excluir"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};


interface SimuladosPageProps {
    plans: StudyPlan[];
    simulados: Simulado[];
    onSaveSimulado: (s: Omit<Simulado, 'id'> & { id?: string }) => Promise<void>;
    onDeleteSimulado: (id: string) => Promise<void>;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const SimuladosPage: React.FC<SimuladosPageProps> = ({ 
    plans, 
    simulados, 
    onSaveSimulado, 
    onDeleteSimulado,
    selectedFilterPlanIds,
    onSelectPlans
}) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [simuladoToEdit, setSimuladoToEdit] = React.useState<Simulado | null>(null);
    const [chartView, setChartView] = React.useState<'desempenho' | 'pontuacao'>('desempenho');

    const filteredSimulados = React.useMemo(() => {
        if (selectedFilterPlanIds.includes('all')) return simulados;
        return simulados.filter(s => selectedFilterPlanIds.includes(s.plan_id));
    }, [simulados, selectedFilterPlanIds]);

    const handleOpenCreate = () => {
        setSimuladoToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (s: Simulado) => {
        setSimuladoToEdit(s);
        setIsModalOpen(true);
    };

    const handleSave = async (s: Omit<Simulado, 'id'> & { id?: string }) => {
        await onSaveSimulado(s);
        setIsModalOpen(false);
    };

    const latestSimulado = React.useMemo(() => {
        if (filteredSimulados.length === 0) return null;
        return [...filteredSimulados].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [filteredSimulados]);

    const latestSimuladoStats = React.useMemo(() => {
        if (!latestSimulado) return { acertos: 0, erros: 0, brancos: 0, performance: 0, totalQuestions: 0 };
        let acertos = 0, erros = 0, brancos = 0, totalQuestions = 0;
        latestSimulado.disciplines.forEach(d => {
            acertos += Number(d.correctAnswers) || 0;
            erros += Number(d.incorrectAnswers) || 0;
            brancos += Number(d.blankAnswers) || 0;
            totalQuestions += Number(d.totalQuestions) || 0;
        });
        const performance = totalQuestions > 0 ? (acertos / totalQuestions) * 100 : 0;
        return { acertos, erros, brancos, performance, totalQuestions };
    }, [latestSimulado]);

    const overallStats = React.useMemo(() => {
        if (filteredSimulados.length === 0) return { average: 0 };
        
        let totalCorrect = 0;
        let totalQuestions = 0;
        
        filteredSimulados.forEach(simulado => {
            simulado.disciplines.forEach(d => {
                totalCorrect += Number(d.correctAnswers) || 0;
                totalQuestions += Number(d.totalQuestions) || 0;
            });
        });
        
        const average = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        return { average };
    }, [filteredSimulados]);

    const chartData = React.useMemo(() => {
        return filteredSimulados
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(simulado => {
                let totalCorrect = 0;
                let totalQuestions = 0;
                let totalPontos = 0;
                simulado.disciplines.forEach(d => {
                    totalCorrect += Number(d.correctAnswers) || 0;
                    totalQuestions += Number(d.totalQuestions) || 0;
                    totalPontos += (Number(d.correctAnswers) || 0) * (Number(d.weight) || 1);
                });
                const performance = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
                const dateObj = new Date(simulado.date + 'T00:00:00');
                const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

                return {
                    name: formattedDate,
                    desempenho: parseFloat(performance.toFixed(1)),
                    pontuacao: totalPontos,
                };
            });
    }, [filteredSimulados]);

    return (
        <>
            <div className="space-y-8">
                <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Simulados</h1>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-5 rounded-lg flex items-center gap-2 transition-colors">
                        <PlusCircleIcon className="w-5 h-5" />
                        <span>Novo Simulado</span>
                    </button>
                </header>

                <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

                {filteredSimulados.length === 0 ? (
                    <div className="bg-gray-800 rounded-lg p-12 text-center flex flex-col items-center">
                        <h2 className="text-xl font-bold text-white mb-2">Nenhum simulado encontrado.</h2>
                        <p className="text-gray-400 mb-6 max-w-md">
                            {selectedFilterPlanIds.includes('all') 
                                ? 'Você ainda não registrou nenhum simulado.' 
                                : 'Não há simulados registrados para os planos selecionados.'}
                        </p>
                        <button
                            onClick={handleOpenCreate}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors">
                            <PlusCircleIcon className="w-6 h-6" />
                            <span>Registrar Novo Simulado</span>
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h2 className="text-gray-300 font-semibold mb-2 text-base">Média Geral</h2>
                                    <p className="text-5xl font-bold text-emerald-500">{overallStats.average.toFixed(0)}%</p>
                                    <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-wider">
                                        Simulados Realizados: <span className="text-lg font-bold text-emerald-400">{filteredSimulados.length}</span>
                                    </p>
                                </div>
                                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h2 className="text-white font-semibold mb-4 text-base">Último Simulado</h2>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <p className="font-semibold text-gray-400">Acertos: <span className="text-green-400">{latestSimuladoStats.acertos}</span></p>
                                            <p className="font-semibold text-gray-400">Erros: <span className="text-red-400">{latestSimuladoStats.erros}</span></p>
                                            <p className="font-semibold text-gray-400">Brancos: <span className="text-gray-300">{latestSimuladoStats.brancos}</span></p>
                                        </div>
                                        <CircularProgress percentage={latestSimuladoStats.performance} />
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-white font-semibold text-base">Evolução do Desempenho</h2>
                                    <div className="flex items-center bg-gray-900/50 rounded-lg p-1">
                                         <button onClick={() => setChartView('desempenho')} className={`px-3 py-1 text-sm rounded ${chartView === 'desempenho' ? 'bg-emerald-500 text-white' : 'text-gray-400'}`}>Desempenho</button>
                                         <button onClick={() => setChartView('pontuacao')} className={`px-3 py-1 text-sm rounded ${chartView === 'pontuacao' ? 'bg-emerald-500 text-white' : 'text-gray-400'}`}>Pontuação</button>
                                    </div>
                                </div>
                                <div className="flex-grow h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false}/>
                                            <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} />
                                            <YAxis tick={{ fill: '#A0AEC0' }} domain={chartView === 'desempenho' ? [0, 100] : undefined}/>
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4A5568' }}/>
                                            <Legend />
                                            <Line type="monotone" dataKey={chartView} name={chartView === 'desempenho' ? 'Desempenho (%)' : 'Pontuação'} stroke="#34d399" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                         <div className="space-y-4">
                            {filteredSimulados.map(simulado => (
                                <SimuladoListItem 
                                    key={simulado.id} 
                                    simulado={simulado} 
                                    onEdit={handleOpenEdit}
                                    onDelete={onDeleteSimulado}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
            <RegistrarSimuladoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                plans={plans}
                simuladoToEdit={simuladoToEdit}
            />
        </>
    );
};

export default SimuladosPage;