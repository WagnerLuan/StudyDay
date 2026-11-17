import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { PlusCircleIcon, StarIcon, CheckIcon, XMarkIcon, PencilIcon, TrashIcon, ClockIcon, MinusCircleIcon } from '../constants';
import RegistrarSimuladoModal from './RegistrarSimuladoModal';
import { Simulado, StudyPlan } from '../types';
import PlanFilter from './PlanFilter';

const parseTimeSpentToSeconds = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':').map(part => Number(part));
    if (parts.some(p => isNaN(p) || p < 0)) return 0;
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
        return parts[0] * 3600 + parts[1] * 60;
    }
    if (parts.length === 1) {
        return parts[0] * 60;
    }
    return 0;
};

const formatAverageTimePerQuestion = (totalSeconds: number, totalQuestions: number): string => {
    if (totalQuestions <= 0 || totalSeconds <= 0) return '--';
    const avgSeconds = Math.round(totalSeconds / totalQuestions);
    const mins = Math.floor(avgSeconds / 60);
    const secs = avgSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const getPerformanceBadgeClasses = (percentage: number, totalQuestions: number): string => {
    if (totalQuestions <= 0) {
        return 'bg-gray-700/70 text-gray-400 border border-gray-600/60';
    }
    if (percentage >= 80) {
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    }
    if (percentage >= 70) {
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
    }
    return 'bg-red-500/20 text-red-400 border border-red-500/40';
};

const CircularProgress: React.FC<{ percentage: number }> = ({ percentage }) => (
    <div className="relative w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</span>
    </div>
);

const SimuladoListItem: React.FC<{ 
    simulado: Simulado; 
    onEdit: (s: Simulado) => void; 
    onDelete: (id: string) => void;
    getDisciplineColor: (planId: string, disciplineName: string) => string | undefined;
}> = ({ simulado, onEdit, onDelete, getDisciplineColor }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [performanceSort, setPerformanceSort] = React.useState<'none' | 'desc' | 'asc'>('none');

    const handleTogglePerformanceSort = () => {
        setPerformanceSort(prev => (prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none'));
    };

    const sortedDisciplines = React.useMemo(() => {
        if (performanceSort === 'none') {
            return simulado.disciplines;
        }
        return [...simulado.disciplines].sort((a, b) => {
            const totalQA = Number(a.totalQuestions) || 0;
            const totalQB = Number(b.totalQuestions) || 0;
            const isAZero = totalQA <= 0;
            const isBZero = totalQB <= 0;

            if (isAZero && !isBZero) return 1;
            if (!isAZero && isBZero) return -1;
            if (isAZero && isBZero) return 0;

            const perfA = ((Number(a.correctAnswers) || 0) / totalQA) * 100;
            const perfB = ((Number(b.correctAnswers) || 0) / totalQB) * 100;

            return performanceSort === 'desc' ? perfB - perfA : perfA - perfB;
        });
    }, [simulado.disciplines, performanceSort]);

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

        return { totalCorrect, totalIncorrect, totalBlank, totalPoints, performance, totalQuestions };
    }, [simulado]);
    
    const formattedDate = new Date(simulado.date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-grow text-center sm:text-left">
                    <p className="font-bold text-white">{formattedDate}</p>
                    <p className="text-sm text-gray-400">{simulado.name} ({simulado.examStyle})</p>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(prev => !prev)}
                        aria-expanded={isExpanded}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                        <span>{isExpanded ? '▲ Ocultar Detalhes' : '▼ Ver Detalhes por Matéria'}</span>
                    </button>
                </div>
                <div className="flex-shrink-0 bg-gray-900/50 px-4 py-2 rounded-lg flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1 text-xs" title="Tempo Gasto">
                        <ClockIcon className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-white">{simulado.timeSpent}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs bg-gray-800/80 px-2 py-1 rounded border border-gray-700/60" title="Total de Questões">
                        <span className="text-cyan-400 font-bold text-xs">📝</span>
                        <span className="font-semibold text-white">{stats.totalQuestions} <span className="text-gray-400 font-normal">quest.</span></span>
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

            <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="border-t border-gray-700/70 bg-gray-900/40 px-4 py-3">
                        {simulado.disciplines.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-2">Nenhuma disciplina registrada neste simulado.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-700/70 text-gray-400 uppercase text-[11px] tracking-wider">
                                            <th className="py-2 pr-3 font-semibold">Disciplina</th>
                                            <th className="py-2 px-3 font-semibold text-center">Questões</th>
                                            <th className="py-2 px-3 font-semibold text-center">Acertos</th>
                                            <th className="py-2 px-3 font-semibold text-center">Erros</th>
                                            <th className="py-2 pl-3 font-semibold text-right">
                                                <button
                                                    type="button"
                                                    onClick={handleTogglePerformanceSort}
                                                    className={`inline-flex items-center justify-end gap-1 cursor-pointer transition-colors uppercase select-none ${
                                                        performanceSort !== 'none'
                                                            ? 'text-emerald-400 hover:text-emerald-300'
                                                            : 'text-gray-400 hover:text-gray-200'
                                                    }`}
                                                    title={
                                                        performanceSort === 'none'
                                                            ? 'Ordenar por aproveitamento (Maior → Menor)'
                                                            : performanceSort === 'desc'
                                                            ? 'Ordenar por aproveitamento (Menor → Maior)'
                                                            : 'Restaurar ordem original'
                                                    }
                                                >
                                                    <span>Aproveitamento (%)</span>
                                                    {performanceSort === 'none' && <ArrowUpDown className="w-3.5 h-3.5 opacity-75" />}
                                                    {performanceSort === 'desc' && <ArrowDown className="w-3.5 h-3.5" />}
                                                    {performanceSort === 'asc' && <ArrowUp className="w-3.5 h-3.5" />}
                                                </button>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/80">
                                        {sortedDisciplines.map((d, idx) => {
                                            const totalQ = Number(d.totalQuestions) || 0;
                                            const correct = Number(d.correctAnswers) || 0;
                                            const incorrect = Number(d.incorrectAnswers) || 0;
                                            const percentage = totalQ > 0 ? (correct / totalQ) * 100 : 0;
                                            const discColor = getDisciplineColor(simulado.plan_id, d.name);

                                            return (
                                                <tr key={d.id || `${d.name}-${idx}`} className="hover:bg-gray-800/40 transition-colors">
                                                    <td className="py-2 pr-3 text-gray-200 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: discColor || '#6b7280' }}
                                                            />
                                                            <span>{d.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-center text-gray-300 font-semibold">{totalQ}</td>
                                                    <td className="py-2 px-3 text-center text-green-400 font-semibold">{correct}</td>
                                                    <td className="py-2 px-3 text-center text-red-400 font-semibold">{incorrect}</td>
                                                    <td className="py-2 pl-3 text-right">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getPerformanceBadgeClasses(percentage, totalQ)}`}>
                                                            {percentage.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
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
    const [selectedDisciplineFilter, setSelectedDisciplineFilter] = React.useState<string>('all');

    const filteredSimulados = React.useMemo(() => {
        if (selectedFilterPlanIds.includes('all')) return simulados;
        return simulados.filter(s => selectedFilterPlanIds.includes(s.plan_id));
    }, [simulados, selectedFilterPlanIds]);

    const disciplineColorLookup = React.useMemo(() => {
        const byPlanAndName = new Map<string, string>();
        const byName = new Map<string, string>();

        plans.forEach(plan => {
            (plan.disciplines || []).forEach(disc => {
                if (disc.name && disc.color) {
                    const normalizedName = disc.name.trim().toLowerCase();
                    byPlanAndName.set(`${plan.id}::${normalizedName}`, disc.color);
                    if (!byName.has(normalizedName)) {
                        byName.set(normalizedName, disc.color);
                    }
                }
            });
        });

        return (planId: string, disciplineName: string): string | undefined => {
            const normalizedName = disciplineName.trim().toLowerCase();
            return byPlanAndName.get(`${planId}::${normalizedName}`) || byName.get(normalizedName);
        };
    }, [plans]);

    const availableDisciplines = React.useMemo(() => {
        const uniqueNames = new Set<string>();
        filteredSimulados.forEach(simulado => {
            (simulado.disciplines || []).forEach(d => {
                const name = d.name?.trim();
                if (name) {
                    uniqueNames.add(name);
                }
            });
        });
        return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [filteredSimulados]);

    React.useEffect(() => {
        if (selectedDisciplineFilter !== 'all' && !availableDisciplines.includes(selectedDisciplineFilter)) {
            setSelectedDisciplineFilter('all');
        }
    }, [availableDisciplines, selectedDisciplineFilter]);

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
        if (filteredSimulados.length === 0) {
            return { average: 0, avgTimePerQuestion: '--' };
        }
        
        let totalCorrect = 0;
        let totalQuestions = 0;
        let totalSeconds = 0;
        
        filteredSimulados.forEach(simulado => {
            totalSeconds += parseTimeSpentToSeconds(simulado.timeSpent);
            simulado.disciplines.forEach(d => {
                totalCorrect += Number(d.correctAnswers) || 0;
                totalQuestions += Number(d.totalQuestions) || 0;
            });
        });
        
        const average = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        const avgTimePerQuestion = formatAverageTimePerQuestion(totalSeconds, totalQuestions);
        return { average, avgTimePerQuestion };
    }, [filteredSimulados]);

    const chartData = React.useMemo(() => {
        const chronologicalSimulados = [...filteredSimulados].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return chronologicalSimulados
            .map(simulado => {
                let totalCorrect = 0;
                let totalQuestions = 0;
                let totalPontos = 0;

                if (selectedDisciplineFilter === 'all') {
                    simulado.disciplines.forEach(d => {
                        totalCorrect += Number(d.correctAnswers) || 0;
                        totalQuestions += Number(d.totalQuestions) || 0;
                        totalPontos += (Number(d.correctAnswers) || 0) * (Number(d.weight) || 1);
                    });
                } else {
                    const normalizedTarget = selectedDisciplineFilter.trim().toLowerCase();
                    const matchingDisciplines = simulado.disciplines.filter(
                        d => d.name?.trim().toLowerCase() === normalizedTarget
                    );
                    if (matchingDisciplines.length === 0) {
                        return null;
                    }
                    let hasQuestionsOrAnswers = false;
                    matchingDisciplines.forEach(d => {
                        const q = Number(d.totalQuestions) || 0;
                        const c = Number(d.correctAnswers) || 0;
                        const i = Number(d.incorrectAnswers) || 0;
                        const b = Number(d.blankAnswers) || 0;
                        if (q > 0 || c + i + b > 0) {
                            hasQuestionsOrAnswers = true;
                        }
                        totalCorrect += c;
                        totalQuestions += q;
                        totalPontos += c * (Number(d.weight) || 1);
                    });
                    if (!hasQuestionsOrAnswers) {
                        return null;
                    }
                }

                const performance = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
                const dateObj = new Date(simulado.date + 'T00:00:00');
                const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

                return {
                    name: formattedDate,
                    simuladoName: simulado.name,
                    desempenho: parseFloat(performance.toFixed(1)),
                    pontuacao: totalPontos,
                };
            })
            .filter((item): item is { name: string; simuladoName: string; desempenho: number; pontuacao: number } => item !== null);
    }, [filteredSimulados, selectedDisciplineFilter]);

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
                                    <div className="mt-4 pt-3 border-t border-gray-700/70 flex items-center justify-between gap-2">
                                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                            <ClockIcon className="w-4 h-4 text-gray-400" />
                                            Tempo Médio por Questão:
                                        </span>
                                        <span className="text-sm font-bold text-emerald-400 whitespace-nowrap">
                                            {overallStats.avgTimePerQuestion}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h2 className="text-white font-semibold mb-4 text-base">Último Simulado</h2>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <p className="font-semibold text-gray-400">Total de Questões: <span className="text-white font-bold">{latestSimuladoStats.totalQuestions}</span></p>
                                            <p className="font-semibold text-gray-400">Acertos: <span className="text-green-400">{latestSimuladoStats.acertos}</span></p>
                                            <p className="font-semibold text-gray-400">Erros: <span className="text-red-400">{latestSimuladoStats.erros}</span></p>
                                            <p className="font-semibold text-gray-400">Brancos: <span className="text-gray-300">{latestSimuladoStats.brancos}</span></p>
                                        </div>
                                        <CircularProgress percentage={latestSimuladoStats.performance} />
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                                    <h2 className="text-white font-semibold text-base">Evolução do Desempenho</h2>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="simulado-discipline-filter" className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                                Filtrar por Disciplina
                                            </label>
                                            <select
                                                id="simulado-discipline-filter"
                                                aria-label="Filtrar por Disciplina"
                                                value={selectedDisciplineFilter}
                                                onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
                                                className="bg-gray-900/70 text-gray-200 text-xs sm:text-sm rounded-lg border border-gray-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 max-w-[200px] sm:max-w-[220px] truncate cursor-pointer"
                                            >
                                                <option value="all">Todas (Geral)</option>
                                                {availableDisciplines.map(discName => (
                                                    <option key={discName} value={discName}>{discName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center bg-gray-900/50 rounded-lg p-1">
                                             <button onClick={() => setChartView('desempenho')} className={`px-3 py-1 text-sm rounded ${chartView === 'desempenho' ? 'bg-emerald-500 text-white' : 'text-gray-400'}`}>Desempenho</button>
                                             <button onClick={() => setChartView('pontuacao')} className={`px-3 py-1 text-sm rounded ${chartView === 'pontuacao' ? 'bg-emerald-500 text-white' : 'text-gray-400'}`}>Pontuação</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-grow h-64">
                                    {chartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-sm text-gray-400">
                                            Sem dados registrados para esta disciplina nos simulados selecionados.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false}/>
                                                <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} />
                                                <YAxis tick={{ fill: '#A0AEC0' }} domain={chartView === 'desempenho' ? [0, 100] : undefined}/>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4A5568', borderRadius: '0.5rem' }}
                                                    labelStyle={{ color: '#F3F4F6', fontWeight: 600 }}
                                                    labelFormatter={(_, payload) => {
                                                        const item = payload?.[0]?.payload;
                                                        return item ? `${item.simuladoName} (${item.name})` : '';
                                                    }}
                                                />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey={chartView}
                                                    name={
                                                        selectedDisciplineFilter === 'all'
                                                            ? (chartView === 'desempenho' ? 'Desempenho (%)' : 'Pontuação')
                                                            : (chartView === 'desempenho' ? `Desempenho (%) — ${selectedDisciplineFilter}` : `Pontuação — ${selectedDisciplineFilter}`)
                                                    }
                                                    stroke="#34d399"
                                                    strokeWidth={2}
                                                    dot={{ r: 4, fill: '#34d399', strokeWidth: 2 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
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
                                    getDisciplineColor={disciplineColorLookup}
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