import * as React from 'react';
import { StudyPlan, Discipline, HistoryLog } from '../types';
import { PlusCircleIcon, FilterIcon, EditIcon, TrashIcon, EyeIcon } from '../constants';
import AdvancedFilterModal, { Filters } from './AdvancedFilterModal';
import PlanFilter from './PlanFilter';

type AugmentedLog = HistoryLog & {
    planId: string;
    disciplineId: string;
    disciplineName: string;
    disciplineColor: string;
};

interface HistoryPageProps {
    plans: StudyPlan[];
    onAddLogRequest: () => void;
    onEditLogRequest: (plan: StudyPlan, discipline: Discipline, log: HistoryLog) => void;
    onDeleteLogRequest: (planId: string, disciplineId: string, logId: string) => void;
    onViewLogRequest: (log: AugmentedLog) => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || timeStr === '-') return 0;
    let totalMinutes = 0;
    const hMatch = timeStr.match(/(\d+)h/);
    const mMatch = timeStr.match(/(\d+)m/);
    if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
    if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
    return totalMinutes;
};

const parseDateLocal = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    date.setHours(0, 0, 0, 0);
    return date;
};

const initialFilters: Filters = {
    startDate: '',
    endDate: '',
    minDuration: '',
    maxDuration: '',
    minPerformance: '',
    maxPerformance: '',
    categories: new Set(),
    disciplineName: '',
    topicName: '',
};

const HistoryPage: React.FC<HistoryPageProps> = ({ plans, onAddLogRequest, onEditLogRequest, onDeleteLogRequest, onViewLogRequest, selectedFilterPlanIds, onSelectPlans }) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);
    const [activeFilters, setActiveFilters] = React.useState<Filters>(initialFilters);

    const allLogs = React.useMemo(() => {
        const logs: AugmentedLog[] = [];
        const plansToUse = selectedFilterPlanIds.includes('all')
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));

        plansToUse.forEach(plan => {
            plan.disciplines.forEach(discipline => {
                (discipline.historyLogs || []).forEach(log => {
                    logs.push({
                        ...log,
                        planId: plan.id,
                        disciplineId: discipline.id,
                        disciplineName: discipline.name,
                        disciplineColor: discipline.color
                    });
                });
            });
        });
        logs.sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
        return logs;
    }, [plans, selectedFilterPlanIds]);

    const filteredLogs = React.useMemo(() => {
        return allLogs.filter(log => {
            const logDate = parseDateLocal(log.date);
            if (activeFilters.startDate && logDate < new Date(activeFilters.startDate)) return false;
            if (activeFilters.endDate && logDate > new Date(activeFilters.endDate)) return false;
            
            const duration = parseTimeToMinutes(log.time);
            if (activeFilters.minDuration !== '' && duration < activeFilters.minDuration) return false;
            if (activeFilters.maxDuration !== '' && duration > activeFilters.maxDuration) return false;

            if (activeFilters.categories.size > 0) {
                const logCategories = log.category.split(', ').map(c => c.trim());
                if (!logCategories.some(c => activeFilters.categories.has(c))) return false;
            }

            if (activeFilters.disciplineName && log.disciplineName !== activeFilters.disciplineName) return false;
            if (activeFilters.topicName && log.topic !== activeFilters.topicName) return false;
            
            const correct = Number(log.correct) || 0;
            const incorrect = Number(log.incorrect) || 0;
            const totalQuestions = correct + incorrect;
            if (totalQuestions > 0) {
                 const performance = (correct / totalQuestions) * 100;
                 if (activeFilters.minPerformance !== '' && performance < activeFilters.minPerformance) return false;
                 if (activeFilters.maxPerformance !== '' && performance > activeFilters.maxPerformance) return false;
            } else {
                if (activeFilters.minPerformance !== '' || activeFilters.maxPerformance !== '') return false;
            }

            return true;
        });
    }, [allLogs, activeFilters]);

    const logsByDate = React.useMemo(() => {
        const grouped = filteredLogs.reduce((acc, log) => {
            const date = log.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(log);
            return acc;
        }, {} as Record<string, AugmentedLog[]>);
        
        return Object.entries(grouped).sort(([dateA], [dateB]) => {
            const d1 = parseDateLocal(dateA).getTime();
            const d2 = parseDateLocal(dateB).getTime();
            return d2 - d1;
        });
    }, [filteredLogs]);

    const handleEdit = (log: AugmentedLog) => {
        const plan = plans.find(p => p.id === log.planId);
        const discipline = plan?.disciplines.find(d => d.id === log.disciplineId);
        if (plan && discipline) {
            onEditLogRequest(plan, discipline, log);
        }
    };
    
    const handleApplyFilters = (filters: Filters) => {
        setActiveFilters(filters);
        setIsFilterModalOpen(false);
    };

    const renderCategoryBadges = (categoryStr: string) => {
        const categories = categoryStr.split(', ').filter(c => c !== '');
        const categoryColors: { [key: string]: string } = {
            'Teoria': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            'Revisão': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            'Questões': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            'Leitura de Lei': 'bg-green-500/20 text-green-300 border-green-500/30',
            'Jurisprudência': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
            'Vídeoaulas': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        };

        return (
            <div className="flex flex-wrap gap-1">
                {categories.map(cat => (
                    <span key={cat} className={`px-2 py-0.5 text-[10px] font-bold rounded border ${categoryColors[cat] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                        {cat}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <>
            <div className="space-y-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Histórico de Estudos</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onAddLogRequest}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 transition-colors shadow-lg hover:shadow-emerald-500/50">
                            <PlusCircleIcon className="w-7 h-7" />
                            <span className="text-lg">Adicionar Estudo</span>
                        </button>
                        <button
                            onClick={() => setIsFilterModalOpen(true)}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-5 rounded-lg flex items-center gap-3 transition-colors shadow-md hover:shadow-gray-500/50">
                            <FilterIcon className="w-7 h-7" />
                            <span className="text-lg">Filtros</span>
                        </button>
                    </div>
                </header>

                <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

                <div className="space-y-6">
                    {logsByDate.map(([date, logs]) => (
                        <div key={date}>
                            <h2 className="text-xl font-semibold text-gray-300 mb-3">{date}</h2>
                            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-700 text-xs text-gray-400 uppercase tracking-wider">
                                                <th className="p-4 w-2/5">Matéria / Tópico</th>
                                                <th className="p-4">Tempo</th>
                                                <th className="p-4">Questões</th>
                                                <th className="p-4">Categoria</th>
                                                <th className="p-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {logs.map(log => {
                                                const correct = Number(log.correct) || 0;
                                                const incorrect = Number(log.incorrect) || 0;
                                                const totalQuestions = correct + incorrect;
                                                return (
                                                    <tr key={log.id}>
                                                        <td className="p-4 align-top">
                                                            <div className="flex items-center">
                                                                <div className="w-1 h-full rounded-full mr-4 self-stretch" style={{ backgroundColor: log.disciplineColor }}></div>
                                                                <div>
                                                                    <p className="font-bold text-white">{log.disciplineName}</p>
                                                                    <p className="text-sm text-gray-400">{log.topic}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-middle text-gray-300 whitespace-nowrap">{log.time}</td>
                                                        <td className="p-4 align-middle text-gray-300 whitespace-nowrap">
                                                            {totalQuestions > 0 ? (
                                                                <span><span className="text-green-400">{correct}</span> / {totalQuestions}</span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {renderCategoryBadges(log.category)}
                                                        </td>
                                                        <td className="p-4 align-middle text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => onViewLogRequest(log)} className="text-emerald-400 hover:text-emerald-300 p-2" title="Visualizar detalhes"><EyeIcon className="w-5 h-5" /></button>
                                                                <button onClick={() => handleEdit(log)} className="text-blue-400 hover:text-blue-300 p-2" title="Editar registro"><EditIcon className="w-5 h-5" /></button>
                                                                <button onClick={() => onDeleteLogRequest(log.planId, log.disciplineId, log.id)} className="text-red-500 hover:text-red-400 p-2" title="Excluir registro"><TrashIcon className="w-5 h-5" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                    {allLogs.length > 0 && logsByDate.length === 0 && (
                        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                             <p>Nenhum registro encontrado para os filtros aplicados.</p>
                        </div>
                    )}
                    {allLogs.length === 0 && (
                        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
                            <p>Nenhum registro de estudo encontrado.</p>
                            <p>Clique em "Adicionar Estudo" para começar a registrar seu progresso.</p>
                        </div>
                    )}
                </div>
            </div>
            <AdvancedFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={handleApplyFilters}
                onClear={() => setActiveFilters(initialFilters)}
                plans={plans}
                currentFilters={activeFilters}
            />
        </>
    );
};

export default HistoryPage;