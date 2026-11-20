import * as React from 'react';
import { StudyPlan, Discipline, Topic, HistoryLog } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { PlusCircleIcon, FilterIcon } from '../constants';
import AdvancedFilterModal, { Filters } from './AdvancedFilterModal';
import PlanFilter from './PlanFilter';
import DisciplineTimeChart from './DisciplineTimeChart';
import {
    stripTopicPrefix,
    sortTopics,
    computeHierarchicalNumbers,
    detectSubtopicFromLine,
} from '../src/utils/topicUtils';

interface StatisticsPageProps {
    plans: StudyPlan[];
    onAddLogRequest: () => void;
    onAddLogForTopic?: (plan: StudyPlan, discipline: Discipline, topic: Topic) => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const parseDate = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    date.setHours(0, 0, 0, 0);
    return date;
};

const parseIsoDateLocal = (isoStr: string): Date => {
    const [y, m, d] = isoStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
};

const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || timeStr === '-') return 0;
    let totalMinutes = 0;
    const hMatch = timeStr.match(/(\d+)h/);
    const mMatch = timeStr.match(/(\d+)m/);
    if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
    if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
    return totalMinutes;
};

const formatTimeHours = (minutes: number) => {
    if (!minutes || minutes < 1) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
};

const initialFilters: Filters = {
    planId: '', startDate: '', endDate: '', minDuration: '', maxDuration: '',
    minPerformance: '', maxPerformance: '', categories: new Set(),
    disciplineName: '', topicName: '',
};

const ChevronDownIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

type AggregatedTopic = {
    id: string;
    name: string;
    cleanName?: string;
    displayNumber?: string;
    isSubtopic?: boolean;
    parentTopicId?: string;
    orderIndex?: number;
    status: 'Concluído' | 'Pendente';
    questionLink?: string;
    completionDate?: string;
    correct: number;
    incorrect: number;
    total: number;
    accuracy: number;
    lastStudied: string | null;
    hasActivity?: boolean;
    planId?: string;
    disciplineId?: string;
    topicId?: string;
}

type AggregatedDiscipline = {
    name: string;
    color: string;
    topics: AggregatedTopic[];
    totalTopics: number;
    completedTopics: number;
    progress: number;
    totalCorrect: number;
    totalIncorrect: number;
    totalQuestions: number;
    accuracy: number;
    totalStudyMinutes: number;
    originalDisciplines: { planId: string, disciplineId: string }[];
    hasActivity?: boolean;
};

const sortAggregatedDisciplines = (disciplines: AggregatedDiscipline[], order: string): AggregatedDiscipline[] => {
    const sortedDisciplines = [...disciplines].sort((a, b) => {
        const aHasQuestions = (a.totalQuestions || 0) > 0;
        const bHasQuestions = (b.totalQuestions || 0) > 0;

        let compareValue = 0;
        switch (order) {
            case 'editalOrder':
                if (aHasQuestions && !bHasQuestions) return -1;
                if (!aHasQuestions && bHasQuestions) return 1;
                return a.name.localeCompare(b.name, 'pt-BR');
            case 'mostCorrect':
                if (aHasQuestions && !bHasQuestions) return -1;
                if (!aHasQuestions && bHasQuestions) return 1;
                compareValue = b.totalCorrect - a.totalCorrect;
                break;
            case 'mostIncorrect':
                if (aHasQuestions && !bHasQuestions) return -1;
                if (!aHasQuestions && bHasQuestions) return 1;
                compareValue = b.totalIncorrect - a.totalIncorrect;
                break;
            case 'mostQuestions':
                if (aHasQuestions && !bHasQuestions) return -1;
                if (!aHasQuestions && bHasQuestions) return 1;
                compareValue = b.totalQuestions - a.totalQuestions;
                break;
            case 'bestPerformance':
                // Disciplinas estudadas da maior % para a menor; não iniciadas ao final
                if (aHasQuestions && !bHasQuestions) return -1;
                if (!aHasQuestions && bHasQuestions) return 1;
                if (!aHasQuestions && !bHasQuestions) return a.name.localeCompare(b.name);
                compareValue = b.accuracy - a.accuracy;
                if (compareValue === 0) compareValue = b.totalQuestions - a.totalQuestions;
                break;
            case 'worstPerformance':
                // Disciplinas estudadas da menor % para a maior; não iniciadas ao final
                if (aHasQuestions && !bHasQuestions) return -1;
                if (!aHasQuestions && bHasQuestions) return 1;
                if (!aHasQuestions && !bHasQuestions) return a.name.localeCompare(b.name);
                compareValue = a.accuracy - b.accuracy;
                if (compareValue === 0) compareValue = b.totalQuestions - a.totalQuestions;
                break;
            default:
                if (aHasQuestions && !bHasQuestions) return -1;
                if (!aHasQuestions && bHasQuestions) return 1;
                compareValue = b.accuracy - a.accuracy;
        }
        return compareValue;
    });

    return sortedDisciplines.map(disc => {
        const sortedTopics = [...disc.topics].sort((a, b) => {
            if (order === 'editalOrder') {
                const idxA = typeof a.orderIndex === 'number' ? a.orderIndex : Number.MAX_SAFE_INTEGER;
                const idxB = typeof b.orderIndex === 'number' ? b.orderIndex : Number.MAX_SAFE_INTEGER;
                return idxA - idxB;
            }

            const aHas = (a.total || 0) > 0;
            const bHas = (b.total || 0) > 0;

            let topicCompareValue = 0;
            switch (order) {
                case 'mostCorrect':
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    topicCompareValue = b.correct - a.correct;
                    break;
                case 'mostIncorrect':
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    topicCompareValue = b.incorrect - a.incorrect;
                    break;
                case 'mostQuestions':
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    topicCompareValue = b.total - a.total;
                    break;
                case 'bestPerformance':
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    if (!aHas && !bHas) return a.name.localeCompare(b.name);
                    topicCompareValue = b.accuracy - a.accuracy;
                    if (topicCompareValue === 0) topicCompareValue = b.total - a.total;
                    break;
                case 'worstPerformance':
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    if (!aHas && !bHas) return a.name.localeCompare(b.name);
                    topicCompareValue = a.accuracy - b.accuracy;
                    if (topicCompareValue === 0) topicCompareValue = b.total - a.total;
                    break;
                default:
                    if (aHas && !bHas) return -1;
                    if (!aHas && bHas) return 1;
                    topicCompareValue = b.accuracy - a.accuracy;
            }
            return topicCompareValue;
        });
        return { ...disc, topics: sortedTopics };
    });
};

const TopicPerformanceTable: React.FC<{
    data: AggregatedDiscipline[];
    sortOrder: string;
    onQuickAddLog: (disc: AggregatedDiscipline, topic: AggregatedTopic) => void;
}> = ({ data, sortOrder, onQuickAddLog }) => {
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
    const [expandedTopics, setExpandedTopics] = React.useState<Set<string>>(new Set());

    const isHierarchicalMode = sortOrder === 'editalOrder';

    const toggleExpand = (name: string) => {
        const newSet = new Set(expanded);
        newSet.has(name) ? newSet.delete(name) : newSet.add(name);
        setExpanded(newSet);
    };

    const toggleTopicExpand = (topicKey: string) => {
        setExpandedTopics(prev => {
            const next = new Set(prev);
            if (next.has(topicKey)) {
                next.delete(topicKey);
            } else {
                next.add(topicKey);
            }
            return next;
        });
    };

    const getPerfColor = (p: number) => {
        if (p < 70) return 'bg-red-600 text-white';
        if (p < 80) return 'bg-amber-500 text-white';
        return 'bg-emerald-500 text-white';
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-700/50 text-[10px] text-gray-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-4">Disciplina/Tópico</th>
                            <th className="p-4 text-center">Acertos</th>
                            <th className="p-4 text-center">Erros</th>
                            <th className="p-4 text-center">Total</th>
                            <th className="p-4 text-center">Desempenho</th>
                            <th className="p-4 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-400 text-sm">
                                    Nenhum registro encontrado para os filtros aplicados.
                                </td>
                            </tr>
                        ) : data.map(disc => {
                            const isNotStarted = (disc.totalQuestions || 0) === 0;
                            const isDiscExpanded = expanded.has(disc.name);

                            const childrenCountMap = new Map<string, number>();
                            const visibleParentIds = new Set<string>();
                            if (isDiscExpanded) {
                                disc.topics.forEach(t => {
                                    if (!t.isSubtopic) {
                                        visibleParentIds.add(t.id);
                                    } else if (t.parentTopicId) {
                                        childrenCountMap.set(
                                            t.parentTopicId,
                                            (childrenCountMap.get(t.parentTopicId) || 0) + 1
                                        );
                                    }
                                });
                            }

                            return (
                                <React.Fragment key={disc.name}>
                                    <tr className="bg-gray-800/40 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => toggleExpand(disc.name)}>
                                        <td className="p-4 align-middle font-bold text-white flex items-center gap-3">
                                            <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isDiscExpanded ? 'rotate-180' : ''}`} />
                                            <span className="text-sm uppercase tracking-tight">{disc.name}</span>
                                        </td>
                                        <td className="p-4 text-center text-gray-300 font-mono text-[17px]">{disc.totalCorrect}</td>
                                        <td className="p-4 text-center text-gray-300 font-mono text-[17px]">{disc.totalIncorrect}</td>
                                        <td className="p-4 text-center text-blue-400 font-mono text-[17px]">
                                            {isNotStarted ? (
                                                <span className="text-gray-400 text-sm font-normal">0 / 0 questões</span>
                                            ) : (
                                                `${disc.totalQuestions} questões`
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {isNotStarted ? (
                                                <span className="inline-block px-2.5 py-1 rounded text-[12px] font-bold font-mono bg-gray-700 text-gray-300 border border-gray-600">
                                                    Não iniciada
                                                </span>
                                            ) : (
                                                <span className={`inline-block min-w-[60px] px-2 py-1 rounded text-[14px] font-black font-mono ${getPerfColor(disc.accuracy)}`}>
                                                    {disc.accuracy.toFixed(1)}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center"></td>
                                    </tr>
                                    {isDiscExpanded && disc.topics.map((topic: AggregatedTopic) => {
                                        const isSubtopic = Boolean(topic.isSubtopic);
                                        const hasVisibleParent = Boolean(
                                            isSubtopic && topic.parentTopicId && visibleParentIds.has(topic.parentTopicId)
                                        );
                                        const parentExpandKey = topic.parentTopicId
                                            ? `${disc.name}::${topic.parentTopicId}`
                                            : '';

                                        if (isHierarchicalMode && hasVisibleParent && !expandedTopics.has(parentExpandKey)) {
                                            return null;
                                        }

                                        const topicExpandKey = `${disc.name}::${topic.id}`;
                                        const hasChildren =
                                            isHierarchicalMode &&
                                            !isSubtopic &&
                                            (childrenCountMap.get(topic.id) || 0) > 0;
                                        const isTopicExpanded = expandedTopics.has(topicExpandKey);
                                        const topicNotStarted = (topic.total || 0) === 0;
                                        const displayTitle = topic.cleanName || topic.name;

                                        return (
                                            <tr
                                                key={topic.id}
                                                onClick={hasChildren ? () => toggleTopicExpand(topicExpandKey) : undefined}
                                                className={
                                                    isSubtopic
                                                        ? 'bg-slate-900/40 hover:bg-slate-900/60 text-sm border-l-4 border-slate-700 transition-colors'
                                                        : `bg-gray-900/30 text-sm border-l-4 border-emerald-500/20 ${
                                                              hasChildren ? 'cursor-pointer hover:bg-gray-800/60 transition-colors' : ''
                                                          }`
                                                }
                                            >
                                                <td
                                                    className={
                                                        isSubtopic
                                                            ? 'py-2.5 px-4 pl-16 text-slate-200 not-italic align-middle'
                                                            : 'py-3 px-4 pl-10 text-slate-200 not-italic align-middle'
                                                    }
                                                >
                                                    {isSubtopic ? (
                                                        <div className="flex items-start gap-2 border-l-2 border-slate-700 pl-3">
                                                            <span
                                                                className="text-slate-500 font-mono text-xs mt-0.5 select-none flex-shrink-0"
                                                                aria-hidden="true"
                                                            >
                                                                └─
                                                            </span>
                                                            <span className="leading-snug text-slate-300">
                                                                {topic.displayNumber && (
                                                                    <span className="font-bold text-emerald-400/90 mr-1.5">
                                                                        {topic.displayNumber}
                                                                    </span>
                                                                )}
                                                                <span>{displayTitle}</span>
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-2">
                                                            {hasChildren ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleTopicExpand(topicExpandKey);
                                                                    }}
                                                                    className="mt-0.5 text-gray-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                                                                    aria-label={
                                                                        isTopicExpanded
                                                                            ? `Recolher subtópicos de ${displayTitle}`
                                                                            : `Expandir subtópicos de ${displayTitle}`
                                                                    }
                                                                >
                                                                    {isTopicExpanded ? (
                                                                        <ChevronDown className="w-4 h-4 text-emerald-400" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <span className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                                                            )}
                                                            <span className="leading-snug">
                                                                {topic.displayNumber && (
                                                                    <span className="font-bold text-emerald-400 mr-1.5">
                                                                        {topic.displayNumber}
                                                                    </span>
                                                                )}
                                                                <span>{displayTitle}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-300 font-mono text-[15px]">{topic.correct}</td>
                                                <td className="py-3 px-4 text-center text-slate-300 font-mono text-[15px]">{topic.incorrect}</td>
                                                <td className="py-3 px-4 text-center text-slate-300 font-mono text-[15px]">
                                                    {topicNotStarted ? '0 / 0 questões' : `${topic.total} questões`}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {topicNotStarted ? (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-gray-700 text-gray-300 border border-gray-600">
                                                            Não iniciada
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-block min-w-[50px] px-1.5 py-0.5 rounded text-[13px] font-bold font-mono ${getPerfColor(topic.accuracy)}`}>
                                                            {topic.accuracy.toFixed(1)}%
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onQuickAddLog(disc, topic);
                                                        }}
                                                        title="Registrar estudo / revisão"
                                                        aria-label={`Registrar estudo / revisão para ${topic.name}`}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-full inline-flex items-center justify-center transition-colors shadow-sm"
                                                    >
                                                        <PlusCircleIcon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatisticsPage: React.FC<StatisticsPageProps> = ({ plans, onAddLogRequest, onAddLogForTopic, selectedFilterPlanIds, onSelectPlans }) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);
    const [activeFilters, setActiveFilters] = React.useState<Filters>(initialFilters);
    const [sortOrder, setSortOrder] = React.useState<string>(() => localStorage.getItem('topicPerformanceSortOrder_v2') || 'editalOrder');

    React.useEffect(() => {
        localStorage.setItem('topicPerformanceSortOrder_v2', sortOrder);
    }, [sortOrder]);

    const statsData = React.useMemo(() => {
        const plansToAggregate = activeFilters.planId
            ? plans.filter(p => p.id === activeFilters.planId)
            : selectedFilterPlanIds.includes('all')
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));

        const allLogs: (HistoryLog & { disciplineName: string, disciplineColor: string, planId: string, disciplineId: string })[] = [];
        plansToAggregate.forEach(plan => {
            plan.disciplines.forEach(disc => {
                if (disc.historyLogs) {
                    allLogs.push(...disc.historyLogs.map(log => ({ ...log, disciplineName: disc.name, disciplineColor: disc.color, planId: plan.id, disciplineId: disc.id })));
                }
            });
        });

        const startDateLocal = activeFilters.startDate ? parseIsoDateLocal(activeFilters.startDate) : null;
        const endDateLocal = activeFilters.endDate ? parseIsoDateLocal(activeFilters.endDate) : null;

        const filteredLogs = allLogs.filter(log => {
            const logDate = parseDate(log.date);
            if (startDateLocal && logDate < startDateLocal) return false;
            if (endDateLocal && logDate > endDateLocal) return false;
            const duration = parseTimeToMinutes(log.time);
            if (activeFilters.minDuration !== '' && duration < activeFilters.minDuration) return false;
            if (activeFilters.maxDuration !== '' && duration > activeFilters.maxDuration) return false;
            
            if (activeFilters.categories.size > 0) {
                const logCategories = log.category.split(', ').map(c => c.trim());
                if (!logCategories.some(c => activeFilters.categories.has(c))) return false;
            }

            if (activeFilters.disciplineName && log.disciplineName !== activeFilters.disciplineName) return false;
            if (activeFilters.topicName && log.topic !== activeFilters.topicName) return false;
            const logCorrect = Math.max(0, parseInt(String(log.correct), 10) || 0);
            const logIncorrect = Math.max(0, parseInt(String(log.incorrect), 10) || 0);
            const totalQuestions = logCorrect + logIncorrect;
            if (totalQuestions > 0) {
                 const performance = (logCorrect / totalQuestions) * 100;
                 if (activeFilters.minPerformance !== '' && performance < activeFilters.minPerformance) return false;
                 if (activeFilters.maxPerformance !== '' && performance > activeFilters.maxPerformance) return false;
            } else if (activeFilters.minPerformance !== '' || activeFilters.maxPerformance !== '') return false;
            return true;
        });

        let totalCorrect = 0, totalIncorrect = 0, totalStudyMinutes = 0, videoMinutes = 0;
        const studyDays = new Set<string>();

        filteredLogs.forEach(log => {
            const c = Math.max(0, parseInt(String(log.correct), 10) || 0);
            const inc = Math.max(0, parseInt(String(log.incorrect), 10) || 0);
            totalCorrect += c;
            totalIncorrect += inc;
            const logStudyTime = parseTimeToMinutes(log.time);
            totalStudyMinutes += logStudyTime;
            studyDays.add(log.date);
            
            if (log.category.includes('Vídeoaulas')) {
                videoMinutes += logStudyTime;
            }
        });

        const totalQuestions = Number(totalCorrect) + Number(totalIncorrect);
        const overallPerformance = totalQuestions > 0 ? (Number(totalCorrect) / totalQuestions) * 100 : 0;
        const dailyAverage = studyDays.size > 0 ? totalStudyMinutes / studyDays.size : 0;
        
        let firstDate = new Date(), lastDate = new Date();
        if (studyDays.size > 0) {
            const dates = Array.from(studyDays).map(d => parseDate(d));
            firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
            lastDate = new Date(Math.max(...dates.map(d => d.getTime())));
        }
        const totalDaysInRange = studyDays.size > 1 ? ((lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24)) + 1 : studyDays.size;
        const consistency = totalDaysInRange > 0 ? (studyDays.size / totalDaysInRange) * 100 : 0;

        // Syllabus Progress
        let totalTopics = 0;
        let completedTopics = 0;
        plansToAggregate.forEach(plan => {
            plan.disciplines.forEach(disc => {
                const topics = disc.topicsList || [];
                totalTopics += topics.length;
                completedTopics += topics.filter(t => t.status === 'Concluído').length;
            });
        });
        const syllabusProgress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

        const byTopic: Record<string, any> = {};

        plansToAggregate.forEach(plan => {
            plan.disciplines.forEach(disc => {
                if (activeFilters.disciplineName && disc.name !== activeFilters.disciplineName) return;
                if (!byTopic[disc.name]) {
                    byTopic[disc.name] = { 
                        name: disc.name, 
                        color: disc.color || '#8884d8', 
                        topics: {}, 
                        totalStudyMinutes: 0,
                        hasActivity: false,
                        originalDisciplines: [] as { planId: string; disciplineId: string }[],
                    };
                }
                byTopic[disc.name].originalDisciplines.push({ planId: plan.id, disciplineId: disc.id });
                if (disc.topicsList) {
                    const orderedRawTopics = sortTopics(disc.topicsList).map(t => ({
                        ...t,
                        isSubtopic: t.isSubtopic ?? detectSubtopicFromLine(t.name),
                        cleanName: t.cleanName ?? (stripTopicPrefix(t.name) || t.name.trim()),
                    }));
                    const numberedTopics = computeHierarchicalNumbers(orderedRawTopics);
                    let currentParentKey: string | null = null;

                    numberedTopics.forEach((t) => {
                        const topicKey = t.name;
                        const isSubtopic = Boolean(t.isSubtopic);
                        const displayNumber = t.displayNumber || '';
                        const cleanName = t.cleanName || stripTopicPrefix(t.name) || t.name.trim();

                        if (!isSubtopic) {
                            currentParentKey = topicKey;
                        }
                        const parentTopicId = isSubtopic ? (currentParentKey || undefined) : undefined;

                        if (activeFilters.topicName && t.name !== activeFilters.topicName) return;
                        if (!byTopic[disc.name].topics[topicKey]) {
                            byTopic[disc.name].topics[topicKey] = {
                                name: t.name,
                                cleanName,
                                displayNumber,
                                isSubtopic,
                                parentTopicId,
                                orderIndex: Object.keys(byTopic[disc.name].topics).length,
                                correct: 0,
                                incorrect: 0,
                                total: 0,
                                hasActivity: false,
                                planId: plan.id,
                                disciplineId: disc.id,
                                topicId: t.id,
                                status: t.status,
                            };
                        }
                    });
                }
            });
        });

        filteredLogs.forEach(log => {
            const discName = log.disciplineName;
            if (!byTopic[discName]) {
                byTopic[discName] = {
                    name: discName,
                    color: log.disciplineColor || '#8884d8',
                    topics: {},
                    totalStudyMinutes: 0,
                    hasActivity: false,
                    originalDisciplines: [{ planId: log.planId, disciplineId: log.disciplineId }],
                };
            }
            const topicName = log.topic;
            let targetTopicEntry = byTopic[discName].topics[topicName];

            if (!targetTopicEntry) {
                const cleanLogLower = stripTopicPrefix(topicName || '').toLowerCase();
                if (cleanLogLower) {
                    targetTopicEntry =
                        Object.values(byTopic[discName].topics).find(
                            (t: any) =>
                                t.planId === log.planId &&
                                t.disciplineId === log.disciplineId &&
                                (t.cleanName || stripTopicPrefix(t.name)).toLowerCase() === cleanLogLower
                        ) ||
                        Object.values(byTopic[discName].topics).find(
                            (t: any) => (t.cleanName || stripTopicPrefix(t.name)).toLowerCase() === cleanLogLower
                        );
                }
            }

            if (!targetTopicEntry) {
                const isSubtopic = detectSubtopicFromLine(topicName || '');
                const prefixMatch = (topicName || '').trim().match(/^(\d+(?:\.\d+)*\.?)\s+/);
                const extractedPrefix = prefixMatch
                    ? (prefixMatch[1].endsWith('.') ? prefixMatch[1] : `${prefixMatch[1]}.`)
                    : '';
                const cleanName = stripTopicPrefix(topicName || '') || (topicName || '').trim();

                let inferredParentId: string | undefined;
                if (isSubtopic && extractedPrefix) {
                    const parentPrefix = `${extractedPrefix.split('.')[0]}.`;
                    const parentMatch = Object.values(byTopic[discName].topics).find(
                        (t: any) => !t.isSubtopic && t.displayNumber === parentPrefix
                    ) as any;
                    if (parentMatch) {
                        inferredParentId = parentMatch.name;
                    }
                }

                targetTopicEntry = {
                    name: topicName,
                    cleanName,
                    displayNumber: extractedPrefix,
                    isSubtopic,
                    parentTopicId: inferredParentId,
                    orderIndex: Object.keys(byTopic[discName].topics).length,
                    correct: 0,
                    incorrect: 0,
                    total: 0,
                    hasActivity: false,
                    planId: log.planId,
                    disciplineId: log.disciplineId,
                };
                byTopic[discName].topics[topicName] = targetTopicEntry;
            }
            const c = Math.max(0, parseInt(String(log.correct), 10) || 0);
            const inc = Math.max(0, parseInt(String(log.incorrect), 10) || 0);
            targetTopicEntry.correct += c;
            targetTopicEntry.incorrect += inc;
            targetTopicEntry.total += (c + inc);
            targetTopicEntry.hasActivity = true;
            byTopic[discName].totalStudyMinutes += parseTimeToMinutes(log.time);
            byTopic[discName].hasActivity = true;
        });

        const hasPeriodFilter = Boolean(activeFilters.startDate || activeFilters.endDate);
        const hasPerformanceFilter = activeFilters.minPerformance !== '' || activeFilters.maxPerformance !== '';
        const hasOtherLogFilter = Boolean(
            activeFilters.minDuration !== '' ||
            activeFilters.maxDuration !== '' ||
            activeFilters.categories.size > 0 ||
            activeFilters.disciplineName ||
            activeFilters.topicName
        );
        const hasActivityFilter = hasPeriodFilter || hasPerformanceFilter || hasOtherLogFilter;

        const rawTopicPerformanceData: AggregatedDiscipline[] = Object.values(byTopic).map((disc: any) => {
            let topicsArray: AggregatedTopic[] = Object.values(disc.topics).map((topic: any) => ({
                id: topic.name,
                name: topic.name,
                cleanName: topic.cleanName,
                displayNumber: topic.displayNumber,
                isSubtopic: topic.isSubtopic,
                parentTopicId: topic.parentTopicId,
                orderIndex: topic.orderIndex,
                status: topic.status || ('Pendente' as const),
                correct: topic.correct,
                incorrect: topic.incorrect,
                total: topic.total,
                accuracy: topic.total > 0 ? (topic.correct / topic.total) * 100 : 0,
                lastStudied: null,
                hasActivity: Boolean(topic.hasActivity),
                planId: topic.planId,
                disciplineId: topic.disciplineId,
                topicId: topic.topicId,
            }));

            if (hasActivityFilter) {
                topicsArray = topicsArray.filter(t => {
                    if (!t.hasActivity) return false;
                    if (hasPerformanceFilter && t.total === 0) return false;
                    return true;
                });
            }

            const totals = topicsArray.reduce((acc, t) => ({
                correct: (Number(acc.correct) || 0) + (Number(t.correct) || 0),
                incorrect: (Number(acc.incorrect) || 0) + (Number(t.incorrect) || 0),
                total: (Number(acc.total) || 0) + (Number(t.total) || 0),
            }), { correct: 0, incorrect: 0, total: 0 });

            return {
                name: disc.name,
                color: plansToAggregate.flatMap(p => p.disciplines).find(d => d.name === disc.name)?.color || disc.color || '#8884d8',
                topics: topicsArray,
                totalTopics: topicsArray.length,
                completedTopics: 0,
                progress: 0,
                totalCorrect: totals.correct,
                totalIncorrect: totals.incorrect,
                totalQuestions: totals.total,
                accuracy: totals.total > 0 ? (totals.correct / totals.total) * 100 : 0,
                totalStudyMinutes: disc.totalStudyMinutes,
                originalDisciplines: disc.originalDisciplines || [],
                hasActivity: Boolean(disc.hasActivity),
            };
        });

        const chartDisciplineData = rawTopicPerformanceData.map(d => ({
            name: d.name,
            minutes: d.totalStudyMinutes,
            color: d.color,
        }));

        const hasAnyActiveQuestionDiscipline = rawTopicPerformanceData.some(d => d.hasActivity && d.totalQuestions > 0);
        const tableDisciplines = hasPerformanceFilter
            ? rawTopicPerformanceData.filter(d => d.hasActivity && d.totalQuestions > 0)
            : hasPeriodFilter
            ? rawTopicPerformanceData.filter(d =>
                  d.hasActivity &&
                  (d.totalQuestions > 0 || (activeFilters.categories.size > 0 && !hasAnyActiveQuestionDiscipline))
              )
            : hasOtherLogFilter
            ? rawTopicPerformanceData.filter(d => d.hasActivity)
            : rawTopicPerformanceData;

        const topicPerformanceData = sortAggregatedDisciplines(tableDisciplines, sortOrder);

        return {
            overallPerformance, totalCorrect, totalIncorrect, totalStudyMinutes, dailyAverage,
            studyDaysCount: studyDays.size, totalDaysInRange, consistency,
            topicPerformanceData, chartDisciplineData, totalTopics, completedTopics, syllabusProgress, videoMinutes
        };
    }, [plans, activeFilters, sortOrder, selectedFilterPlanIds]);

    const handleApplyFilters = (filters: Filters) => {
        setActiveFilters(filters);
        if (filters.planId) {
            onSelectPlans([filters.planId]);
        } else if (activeFilters.planId || (selectedFilterPlanIds.length === 1 && selectedFilterPlanIds[0] !== 'all')) {
            onSelectPlans(['all']);
        }
        setIsFilterModalOpen(false);
    };

    const handleClearFilters = () => {
        setActiveFilters(initialFilters);
        onSelectPlans(['all']);
    };

    const handleQuickAddLog = (disc: AggregatedDiscipline, topic: AggregatedTopic) => {
        if (!onAddLogForTopic) {
            onAddLogRequest();
            return;
        }

        const candidatePlanId = topic.planId || disc.originalDisciplines?.[0]?.planId;
        const candidateDiscId = topic.disciplineId || disc.originalDisciplines?.[0]?.disciplineId;

        let targetPlan = candidatePlanId ? plans.find(p => p.id === candidatePlanId) : undefined;
        let targetDiscipline = targetPlan && candidateDiscId
            ? targetPlan.disciplines.find(d => d.id === candidateDiscId)
            : undefined;

        if (!targetPlan || !targetDiscipline) {
            for (const p of plans) {
                const foundDisc = p.disciplines.find(d => d.name === disc.name);
                if (foundDisc) {
                    targetPlan = p;
                    targetDiscipline = foundDisc;
                    break;
                }
            }
        }

        if (!targetPlan || !targetDiscipline) {
            onAddLogRequest();
            return;
        }

        const cleanTopicName = stripTopicPrefix(topic.name).toLowerCase();
        const matchedTopic = targetDiscipline.topicsList?.find(
            t =>
                (topic.topicId && t.id === topic.topicId) ||
                t.name === topic.name ||
                (cleanTopicName && stripTopicPrefix(t.name).toLowerCase() === cleanTopicName)
        );

        const resolvedTopic: Topic = matchedTopic || {
            id: topic.topicId || '',
            name: topic.name,
            status: topic.status || 'Pendente',
        };

        onAddLogForTopic(targetPlan, targetDiscipline, resolvedTopic);
    };

    return (
        <>
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Estatísticas</h1>
                <div className="flex gap-4">
                    <button onClick={onAddLogRequest} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 transition-colors shadow-lg hover:shadow-emerald-500/50">
                        <PlusCircleIcon className="w-7 h-7" /> Adicionar Estudo
                    </button>
                    <button onClick={() => setIsFilterModalOpen(true)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-md hover:shadow-gray-500/50">
                        <FilterIcon className="w-5 h-5" /> Filtros
                    </button>
                </div>
            </header>
            
            <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
                        <h3 className="font-semibold text-white mb-4">Desempenho Geral</h3>
                        <div className="flex items-center justify-center gap-10 flex-grow">
                            <div className="relative w-40 h-40 flex-shrink-0">
                                 <ResponsiveContainer>
                                    <PieChart>
                                        <Pie 
                                            data={[
                                                {name: 'Corretas', value: statsData.totalCorrect}, 
                                                {name: 'Incorretas', value: statsData.totalIncorrect}
                                            ]} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={55} 
                                            outerRadius={75} 
                                            fill="#8884d8" 
                                            paddingAngle={5}
                                            stroke="none"
                                        >
                                            <Cell fill="#34d399" />
                                            <Cell fill="#EC4899" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-black text-white">{statsData.overallPerformance.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total de Questões</p>
                                    <p className="text-4xl font-black text-white">{statsData.totalCorrect + statsData.totalIncorrect}</p>
                                </div>
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Acertos</p>
                                        <p className="text-2xl font-black text-white">{statsData.totalCorrect}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">Erros</p>
                                        <p className="text-2xl font-black text-white">{statsData.totalIncorrect}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="font-semibold text-white">Tempo Total de Estudo</h3>
                        <p className="text-4xl font-bold text-emerald-400 my-4">{formatTimeHours(statsData.totalStudyMinutes)}</p>
                        <p className="text-sm text-gray-400">{formatTimeHours(statsData.dailyAverage)} por dia estudado (média)</p>
                        <p className="text-sm text-gray-400">Total de {statsData.studyDaysCount} dias estudados</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="font-semibold text-white">Constância nos Estudos</h3>
                        <p className="text-4xl font-bold text-emerald-400 my-4">{statsData.consistency.toFixed(1)}%</p>
                        <p className="text-sm text-gray-400">{statsData.studyDaysCount} dias estudados de {Math.round(statsData.totalDaysInRange)} dias</p>
                        <p className="text-sm text-gray-400">({Math.round(statsData.totalDaysInRange - statsData.studyDaysCount)} dias falhados)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="font-semibold text-white mb-4">Tempo Total de Videoaulas</h3>
                        <p className="text-5xl font-bold text-emerald-400 mb-2">{formatTimeHours(statsData.videoMinutes)}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="font-semibold text-white mb-4">Progresso no Edital</h3>
                        <p className="text-5xl font-bold text-emerald-400 mb-2">{statsData.syllabusProgress.toFixed(1)}%</p>
                        <p className="text-sm text-gray-300 font-semibold">{statsData.completedTopics} tópicos concluídos de {statsData.totalTopics}</p>
                        <p className="text-sm text-gray-500">({statsData.totalTopics - statsData.completedTopics} tópicos pendentes)</p>
                    </div>
                </div>

                {/* GRÁFICO DE TEMPO POR DISCIPLINA */}
                <div className="mb-6">
                    <DisciplineTimeChart data={statsData.chartDisciplineData} />
                </div>

                {/* SEÇÃO TÓPICO X DESEMPENHO */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest">Tópico x Desempenho</h2>
                        <div className="flex items-center gap-3 bg-gray-800 p-1.5 rounded-lg border border-gray-700">
                            <span className="text-[10px] font-bold text-gray-500 uppercase ml-2">Ordenar por:</span>
                            <select 
                                value={sortOrder} 
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="bg-gray-900 border-none text-xs font-bold text-emerald-400 focus:ring-0 rounded cursor-pointer"
                            >
                                <option value="editalOrder">Ordem do edital</option>
                                <option value="worstPerformance">Pior desempenho</option>
                                <option value="bestPerformance">Melhor desempenho</option>
                                <option value="mostQuestions">Mais questões resolvidas</option>
                                <option value="mostCorrect">Mais acertos</option>
                                <option value="mostIncorrect">Mais erros</option>
                            </select>
                        </div>
                    </div>
                    
                    <TopicPerformanceTable data={statsData.topicPerformanceData} sortOrder={sortOrder} onQuickAddLog={handleQuickAddLog} />
                </div>
            </div>
            
            <AdvancedFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
                plans={plans}
                currentFilters={activeFilters}
                selectedPlanIds={selectedFilterPlanIds}
            />
        </>
    );
};

export default StatisticsPage;