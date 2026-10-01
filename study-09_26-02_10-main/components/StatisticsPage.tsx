import * as React from 'react';
import { StudyPlan, HistoryLog } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PlusCircleIcon, FilterIcon } from '../constants';
import AdvancedFilterModal, { Filters } from './AdvancedFilterModal';
import PlanFilter from './PlanFilter';
import DisciplineTimeChart from './DisciplineTimeChart';

interface StatisticsPageProps {
    plans: StudyPlan[];
    onAddLogRequest: () => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const parseDate = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
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
    startDate: '', endDate: '', minDuration: '', maxDuration: '',
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
    status: 'Concluído' | 'Pendente';
    questionLink?: string;
    completionDate?: string;
    correct: number;
    incorrect: number;
    total: number;
    accuracy: number;
    lastStudied: string | null;
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
};

const sortAggregatedDisciplines = (disciplines: AggregatedDiscipline[], order: string): AggregatedDiscipline[] => {
    const sortedDisciplines = [...disciplines].sort((a, b) => {
        let compareValue = 0;
        switch (order) {
            case 'mostCorrect':
                compareValue = b.totalCorrect - a.totalCorrect;
                break;
            case 'mostIncorrect':
                compareValue = b.totalIncorrect - a.totalIncorrect;
                break;
            case 'mostQuestions':
                compareValue = b.totalQuestions - a.totalQuestions;
                break;
            case 'bestPerformance':
                compareValue = b.accuracy - a.accuracy;
                break;
            case 'worstPerformance':
                compareValue = a.accuracy - b.accuracy;
                break;
            default:
                compareValue = b.accuracy - a.accuracy;
        }
        return compareValue;
    });

    return sortedDisciplines.map(disc => {
        const sortedTopics = [...disc.topics].sort((a, b) => {
            let topicCompareValue = 0;
            switch (order) {
                case 'mostCorrect':
                    topicCompareValue = b.correct - a.correct;
                    break;
                case 'mostIncorrect':
                    topicCompareValue = b.incorrect - a.incorrect;
                    break;
                case 'mostQuestions':
                    topicCompareValue = b.total - a.total;
                    break;
                case 'bestPerformance':
                    topicCompareValue = b.accuracy - a.accuracy;
                    break;
                case 'worstPerformance':
                    topicCompareValue = a.accuracy - b.accuracy;
                    break;
                default:
                    topicCompareValue = b.accuracy - a.accuracy;
            }
            return topicCompareValue;
        });
        return { ...disc, topics: sortedTopics };
    });
};

const TopicPerformanceTable: React.FC<{ data: AggregatedDiscipline[] }> = ({ data }) => {
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

    const toggleExpand = (name: string) => {
        const newSet = new Set(expanded);
        newSet.has(name) ? newSet.delete(name) : newSet.add(name);
        setExpanded(newSet);
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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {data.map(disc => (
                            <React.Fragment key={disc.name}>
                                <tr className="bg-gray-800/40 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => toggleExpand(disc.name)}>
                                    <td className="p-4 align-middle font-bold text-white flex items-center gap-3">
                                        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${expanded.has(disc.name) ? 'rotate-180' : ''}`} />
                                        <span className="text-sm uppercase tracking-tight">{disc.name}</span>
                                    </td>
                                    <td className="p-4 text-center text-gray-300 font-mono text-[17px]">{disc.totalCorrect}</td>
                                    <td className="p-4 text-center text-gray-300 font-mono text-[17px]">{disc.totalIncorrect}</td>
                                    <td className="p-4 text-center text-blue-400 font-mono text-[17px]">{disc.totalQuestions}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-block min-w-[60px] px-2 py-1 rounded text-[14px] font-black font-mono ${getPerfColor(disc.accuracy)}`}>
                                            {disc.accuracy.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                                {expanded.has(disc.name) && disc.topics.map((topic: AggregatedTopic) => (
                                    <tr key={topic.id} className="bg-gray-900/30 text-xs border-l-4 border-emerald-500/20">
                                        <td className="py-3 px-4 pl-12 text-gray-400 italic align-middle">{topic.name}</td>
                                        <td className="py-3 px-4 text-center text-gray-500 font-mono text-[15px]">{topic.correct}</td>
                                        <td className="py-3 px-4 text-center text-gray-500 font-mono text-[15px]">{topic.incorrect}</td>
                                        <td className="py-3 px-4 text-center text-gray-500 font-mono text-[15px]">{topic.total}</td>
                                        <td className="py-3 px-4 text-center">
                                             <span className={`inline-block min-w-[50px] px-1.5 py-0.5 rounded text-[13px] font-bold font-mono ${getPerfColor(topic.accuracy)}`}>
                                                {topic.accuracy.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatisticsPage: React.FC<StatisticsPageProps> = ({ plans, onAddLogRequest, selectedFilterPlanIds, onSelectPlans }) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = React.useState(false);
    const [activeFilters, setActiveFilters] = React.useState<Filters>(initialFilters);
    const [sortOrder, setSortOrder] = React.useState<string>(() => localStorage.getItem('topicPerformanceSortOrder') || 'bestPerformance');

    React.useEffect(() => {
        localStorage.setItem('topicPerformanceSortOrder', sortOrder);
    }, [sortOrder]);

    const statsData = React.useMemo(() => {
        const plansToAggregate = selectedFilterPlanIds.includes('all')
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));

        const allLogs: (HistoryLog & { disciplineName: string, disciplineColor: string })[] = [];
        plansToAggregate.forEach(plan => {
            plan.disciplines.forEach(disc => {
                if (disc.historyLogs) {
                    allLogs.push(...disc.historyLogs.map(log => ({ ...log, disciplineName: disc.name, disciplineColor: disc.color })));
                }
            });
        });

        const filteredLogs = allLogs.filter(log => {
            const logDate = parseDate(log.date);
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
            const totalQuestions = log.correct + log.incorrect;
            if (totalQuestions > 0) {
                 const performance = (log.correct / totalQuestions) * 100;
                 if (activeFilters.minPerformance !== '' && performance < activeFilters.minPerformance) return false;
                 if (activeFilters.maxPerformance !== '' && performance > activeFilters.maxPerformance) return false;
            } else if (activeFilters.minPerformance !== '' || activeFilters.maxPerformance !== '') return false;
            return true;
        });

        let totalCorrect = 0, totalIncorrect = 0, totalStudyMinutes = 0, videoMinutes = 0;
        const studyDays = new Set<string>();

        filteredLogs.forEach(log => {
            totalCorrect += log.correct;
            totalIncorrect += log.incorrect;
            const logStudyTime = parseTimeToMinutes(log.time);
            totalStudyMinutes += logStudyTime;
            studyDays.add(log.date);
            
            if (log.category.includes('Vídeoaulas')) {
                videoMinutes += logStudyTime;
            }
        });

        const totalQuestions = totalCorrect + totalIncorrect;
        const overallPerformance = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
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

        const byTopic = filteredLogs.reduce((acc, log) => {
            const discName = log.disciplineName;
            if (!acc[discName]) acc[discName] = { name: discName, topics: {}, totalStudyMinutes: 0 };
            const topicName = log.topic;
            if (!acc[discName].topics[topicName]) acc[discName].topics[topicName] = { name: topicName, correct: 0, incorrect: 0, total: 0 };
            acc[discName].topics[topicName].correct += log.correct;
            acc[discName].topics[topicName].incorrect += log.incorrect;
            acc[discName].topics[topicName].total += log.correct + log.incorrect;
            acc[discName].totalStudyMinutes += parseTimeToMinutes(log.time);
            return acc;
        }, {} as any);

        const rawTopicPerformanceData: AggregatedDiscipline[] = Object.values(byTopic).map((disc: any) => {
            const topicsArray: AggregatedTopic[] = Object.values(disc.topics).map((topic: any) => ({
                id: topic.name,
                name: topic.name,
                status: 'Pendente',
                correct: topic.correct,
                incorrect: topic.incorrect,
                total: topic.total,
                accuracy: topic.total > 0 ? (topic.correct / topic.total) * 100 : 0,
                lastStudied: null,
            }));

            const totals = topicsArray.reduce((acc, t) => ({
                correct: acc.correct + t.correct,
                incorrect: acc.incorrect + t.incorrect,
                total: acc.total + t.total,
            }), { correct: 0, incorrect: 0, total: 0 });

            return {
                name: disc.name,
                color: plansToAggregate.flatMap(p => p.disciplines).find(d => d.name === disc.name)?.color || '#8884d8',
                topics: topicsArray,
                totalTopics: topicsArray.length,
                completedTopics: 0,
                progress: 0,
                totalCorrect: totals.correct,
                totalIncorrect: totals.incorrect,
                totalQuestions: totals.total,
                accuracy: totals.total > 0 ? (totals.correct / totals.total) * 100 : 0,
                totalStudyMinutes: disc.totalStudyMinutes,
                originalDisciplines: [],
            };
        });

        const topicPerformanceData = sortAggregatedDisciplines(rawTopicPerformanceData, sortOrder);

        return {
            overallPerformance, totalCorrect, totalIncorrect, totalStudyMinutes, dailyAverage,
            studyDaysCount: studyDays.size, totalDaysInRange, consistency,
            topicPerformanceData, totalTopics, completedTopics, syllabusProgress, videoMinutes
        };
    }, [plans, activeFilters, sortOrder, selectedFilterPlanIds]);

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
                <DisciplineTimeChart 
                    data={statsData.topicPerformanceData.map(d => ({
                        name: d.name,
                        minutes: d.totalStudyMinutes,
                        color: d.color
                    }))} 
                />

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
                                <option value="bestPerformance">Melhor desempenho</option>
                                <option value="worstPerformance">Pior desempenho</option>
                                <option value="mostQuestions">Mais questões</option>
                                <option value="mostCorrect">Mais acertos</option>
                                <option value="mostIncorrect">Mais erros</option>
                            </select>
                        </div>
                    </div>
                    
                    <TopicPerformanceTable data={statsData.topicPerformanceData} />
                </div>
            </div>
            
            <AdvancedFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={(filters) => { setActiveFilters(filters); setIsFilterModalOpen(false); }}
                onClear={() => setActiveFilters(initialFilters)}
                plans={plans}
                currentFilters={activeFilters}
            />
        </>
    );
};

export default StatisticsPage;