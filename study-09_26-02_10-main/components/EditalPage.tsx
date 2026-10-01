import * as React from 'react';
import { StudyPlan, Discipline, Topic, HistoryLog, Revision, TopicIncidence } from '../types';
import { PlusCircleIcon, CheckIcon, XMarkIcon, PencilIcon, PercentIcon, LinkIcon, EditIcon, ChevronDownIcon, FilterIcon } from '../constants';
import ProgressBar from './ProgressBar';
import { formatDateToDisplay, parseDate } from '../src/utils/dateUtils';
import { sortTopics } from '../src/utils/topicUtils';
import PlanFilter from './PlanFilter';
import RevisionSummaryPanel from './RevisionSummaryPanel';
import IncidenceSelector, { INCIDENCE_CONFIG, INCIDENCE_LEVELS } from './IncidenceSelector';

type RevisionStatus = 'late' | 'on-time' | null;

type AggregatedTopic = Topic & {
    originalPlanId: string;
    originalDisciplineId: string;
    correct: number;
    incorrect: number;
    total: number;
    accuracy: number;
    lastStudied: string | null;
    revisionStatus: RevisionStatus;
    weight?: number;
}

type AggregatedDiscipline = {
    name: string;
    color: string;
    weight: number;
    topics: AggregatedTopic[];
    totalTopics: number;
    completedTopics: number;
    progress: number;
    totalCorrect: number;
    totalIncorrect: number;
    totalQuestions: number;
    accuracy: number;
    originalDisciplines: { planId: string, disciplineId: string }[];
    revisionStatus: RevisionStatus;
};

const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-400';
    if (accuracy >= 65) return 'text-yellow-400';
    return 'text-red-500';
};

const RevisionIndicator: React.FC<{ status: RevisionStatus }> = ({ status }) => {
    if (!status) return null;
    const color = status === 'late' ? 'bg-red-500' : 'bg-green-500';
    const label = status === 'late' ? 'Revisão Atrasada' : 'Revisão Agendada';
    return (
        <div 
            className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm flex-shrink-0 animate-pulse`} 
            title={label}
        />
    );
};

const TopicsTable: React.FC<{
    topics: AggregatedTopic[];
    onUpdateTopic: (planId: string, disciplineId: string, topicId: string, updates: Partial<Topic>, silent?: boolean) => void;
    onAddLog: (plan: StudyPlan, discipline: Discipline, topic: Topic) => void;
    plans: StudyPlan[];
    sortOrder: 'asc' | 'desc' | 'original';
    onToggleSort: () => void;
}> = ({ topics, onUpdateTopic, onAddLog, plans, sortOrder, onToggleSort }) => {
    
    const [editingTopicIdForLink, setEditingTopicIdForLink] = React.useState<string | null>(null);
    const [linkInput, setLinkInput] = React.useState('');

    const handleAddOrEditLinkClick = (topic: AggregatedTopic) => {
        setEditingTopicIdForLink(topic.id);
        setLinkInput(topic.questionLink || '');
    };

    const handleCancelLinkEdit = () => {
        setEditingTopicIdForLink(null);
        setLinkInput('');
    };

    const handleSaveLink = () => {
        if (editingTopicIdForLink) {
            const topic = topics.find(t => t.id === editingTopicIdForLink);
            if (topic) {
                onUpdateTopic(topic.originalPlanId, topic.originalDisciplineId, topic.id, { questionLink: linkInput });
            }
            handleCancelLinkEdit();
        }
    };
    
    const handleCheckboxChange = (topic: AggregatedTopic) => {
        const newStatus = topic.status === 'Concluído' ? 'Pendente' : 'Concluído';
        onUpdateTopic(topic.originalPlanId, topic.originalDisciplineId, topic.id, { status: newStatus });
    };

    const handleAddLogClick = (topic: AggregatedTopic) => {
        const plan = plans.find(p => p.id === topic.originalPlanId);
        const discipline = plan?.disciplines.find(d => d.id === topic.originalDisciplineId);
        if (plan && discipline) {
            onAddLog(plan, discipline, topic);
        }
    };

    const handleUpdateIncidence = (topic: AggregatedTopic, newIncidence: TopicIncidence) => {
        onUpdateTopic(topic.originalPlanId, topic.originalDisciplineId, topic.id, { incidence: newIncidence }, true);
    };

    const sortedTopics = React.useMemo(() => {
        if (sortOrder === 'original') return topics;
        return [...topics].sort((a, b) => {
            const weightA = INCIDENCE_CONFIG[a.incidence || 'Média'].weight;
            const weightB = INCIDENCE_CONFIG[b.incidence || 'Média'].weight;
            return sortOrder === 'desc' ? weightB - weightA : weightA - weightB;
        });
    }, [topics, sortOrder]);

    return (
        <div className="bg-gray-900/50 p-4">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs align-middle">
                        <th className="py-2 pr-2 w-2/5">Tópico</th>
                        <th className="py-2 px-2 text-center cursor-pointer hover:text-white transition-colors" onClick={onToggleSort}>
                            Incidência {sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : ''}
                        </th>
                        <th className="py-2 px-2 text-center"><CheckIcon className="w-5 h-5 text-green-400 mx-auto" /></th>
                        <th className="py-2 px-2 text-center"><XMarkIcon className="w-5 h-5 text-red-400 mx-auto" /></th>
                        <th className="py-2 px-2 text-center"><PencilIcon className="w-5 h-5 text-blue-400 mx-auto" /></th>
                        <th className="py-2 px-2 text-center"><PercentIcon className="w-5 h-5 text-white mx-auto" /></th>
                        <th className="py-2 px-2 text-center">Último Estudo</th>
                        <th className="py-2 px-2 text-center">Questões</th>
                        <th className="py-2 pl-2 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTopics.map(topic => (
                        <tr key={topic.id} className={`border-b border-gray-700 last:border-b-0 ${topic.status === 'Concluído' ? 'bg-emerald-900/30' : ''}`}>
                            <td className="py-3 pr-2 flex items-center gap-3 whitespace-normal break-words" style={{ paddingLeft: topic.name.startsWith('  ') ? '2rem' : '0' }}>
                                <input
                                    type="checkbox"
                                    checked={topic.status === 'Concluído'}
                                    onChange={() => handleCheckboxChange(topic)}
                                    className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
                                />
                                <div className="flex items-center gap-2">
                                    <span className={topic.status === 'Concluído' ? 'text-gray-400 line-through' : 'text-gray-200'}>
                                        {topic.name}
                                    </span>
                                    <RevisionIndicator status={topic.revisionStatus} />
                                </div>
                            </td>
                            <td className="py-3 px-2 text-center">
                                <IncidenceSelector 
                                    value={topic.incidence} 
                                    onSelect={(val) => handleUpdateIncidence(topic, val)} 
                                />
                            </td>
                            <td className="py-3 px-2 text-center text-green-400 font-semibold">{topic.correct}</td>
                            <td className="py-3 px-2 text-center text-red-400 font-semibold">{topic.incorrect}</td>
                            <td className="py-3 px-2 text-center text-blue-400 font-semibold">{topic.total}</td>
                            <td className={`py-3 px-2 text-center font-bold ${getAccuracyColor(topic.accuracy)}`}>{topic.accuracy}%</td>
                            <td className="py-3 px-2 text-center text-gray-400">{topic.lastStudied || '-'}</td>
                             <td className="py-3 px-2 text-center">
                                {editingTopicIdForLink === topic.id ? (
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="url"
                                            value={linkInput}
                                            onChange={(e) => setLinkInput(e.target.value)}
                                            className="bg-gray-700 border border-gray-600 text-gray-300 rounded-md px-2 py-1 text-xs w-full"
                                            autoFocus
                                        />
                                        <button onClick={handleSaveLink} className="text-green-400 text-xs font-bold">OK</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        {topic.questionLink ? (
                                            <>
                                                <a href={topic.questionLink} target="_blank" rel="noopener noreferrer" className="text-emerald-400"><LinkIcon className="w-5 h-5" /></a>
                                                <button onClick={() => handleAddOrEditLinkClick(topic)} className="text-gray-400"><EditIcon className="w-4 h-4" /></button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleAddOrEditLinkClick(topic)} className="bg-emerald-600 text-white p-1.5 rounded-full"><PlusCircleIcon className="w-5 h-5" /></button>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td className="py-3 pl-2 text-right">
                                <button className="bg-emerald-600 text-white p-1.5 rounded-full" onClick={() => handleAddLogClick(topic)}>
                                    <PlusCircleIcon className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const DisciplineRow: React.FC<{ 
    discipline: AggregatedDiscipline,
    onUpdateTopic: (planId: string, disciplineId: string, topicId: string, updates: Partial<Topic>, silent?: boolean) => void;
    onAddLog: (plan: StudyPlan, discipline: Discipline, topic: Topic) => void;
    plans: StudyPlan[];
    sortOrder: 'asc' | 'desc' | 'original';
    onToggleSort: () => void;
}> = ({ discipline, onUpdateTopic, onAddLog, plans, sortOrder, onToggleSort }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
        <div className={`bg-gray-800 rounded-lg overflow-visible border-2 transition-all ${
            discipline.revisionStatus === 'late' ? 'border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'border-transparent'
        }`}>
            <div
                className="flex items-center p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="w-1.5 h-6 rounded-full mr-4" style={{ backgroundColor: discipline.color }}></div>
                <div className="font-bold text-white flex-grow flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            {discipline.name}
                            <RevisionIndicator status={discipline.revisionStatus} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Peso: {Number.isInteger(discipline.weight) ? discipline.weight.toFixed(1) : discipline.weight}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-bold px-3 py-1.5 rounded-md bg-gray-900/50">
                        <span className="text-green-400">{discipline.totalCorrect}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-red-400">{discipline.totalIncorrect}</span>
                        <span className="text-gray-400 mx-1">|</span>
                        <span className={`font-bold ${getAccuracyColor(discipline.accuracy)}`}>{discipline.accuracy}%</span>
                    </div>
                    <div className="w-24 flex items-center gap-2">
                        <div className="flex-grow bg-gray-700 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${discipline.progress}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-300">{discipline.progress}%</span>
                    </div>
                    <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isExpanded && (
                <TopicsTable 
                    topics={discipline.topics} 
                    onUpdateTopic={onUpdateTopic} 
                    onAddLog={onAddLog} 
                    plans={plans} 
                    sortOrder={sortOrder}
                    onToggleSort={onToggleSort}
                />
            )}
        </div>
    );
}

interface EditalPageProps {
    plans: StudyPlan[];
    onUpdateTopic: (planId: string, disciplineId: string, topicId: string, updates: Partial<Topic>, silent?: boolean) => void;
    onAddLog: (plan: StudyPlan, discipline: Discipline, topic: Topic) => void;
    onGenericAddLog: () => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const EditalPage: React.FC<EditalPageProps> = ({ plans, onUpdateTopic, onAddLog, onGenericAddLog, selectedFilterPlanIds, onSelectPlans }) => {
    const [incidenceFilter, setIncidenceFilter] = React.useState<TopicIncidence | 'Todas'>('Todas');
    const [weightFilter, setWeightFilter] = React.useState<number | 'Todas'>('Todas');
    const [disciplineSortOrder, setDisciplineSortOrder] = React.useState<'name' | 'weightDesc'>('name');
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc' | 'original'>('original');

    const handleToggleSort = () => {
        setSortOrder(prev => {
            if (prev === 'original') return 'desc';
            if (prev === 'desc') return 'asc';
            return 'original';
        });
    };
    
    const plansToAggregate = React.useMemo(() => {
        return selectedFilterPlanIds.includes('all')
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));
    }, [plans, selectedFilterPlanIds]);

    // 1. Obtenção Dinâmica dos Pesos:
    // Extraia os valores únicos da propriedade peso/weight de disciplinas e tópicos cadastrados e ordene de forma decrescente
    const availableWeights = React.useMemo(() => {
        const weightsSet = new Set<number>();
        const targetPlans = plansToAggregate.length > 0 ? plansToAggregate : plans;

        targetPlans.forEach(plan => {
            (plan.disciplines || []).forEach(disc => {
                const rawDiscWeight = (disc as any).peso !== undefined && (disc as any).peso !== null
                    ? (disc as any).peso
                    : (disc.weight !== undefined && disc.weight !== null ? disc.weight : undefined);

                if (rawDiscWeight !== undefined && rawDiscWeight !== null) {
                    const num = Number(rawDiscWeight);
                    if (!isNaN(num)) {
                        weightsSet.add(num);
                    }
                }

                // Check topics in case topics have individual weights/pesos
                (disc.topicsList || []).forEach((topic: any) => {
                    const rawTopicWeight = topic.peso !== undefined && topic.peso !== null
                        ? topic.peso
                        : (topic.weight !== undefined && topic.weight !== null ? topic.weight : undefined);

                    if (rawTopicWeight !== undefined && rawTopicWeight !== null) {
                        const tNum = Number(rawTopicWeight);
                        if (!isNaN(tNum)) {
                            weightsSet.add(tNum);
                        }
                    }
                });
            });
        });

        // Fallback to all plans if current filter returned no weights
        if (weightsSet.size === 0 && plans.length > 0) {
            plans.forEach(plan => {
                (plan.disciplines || []).forEach(disc => {
                    const rawDiscWeight = (disc as any).peso !== undefined && (disc as any).peso !== null
                        ? (disc as any).peso
                        : (disc.weight !== undefined && disc.weight !== null ? disc.weight : undefined);
                    if (rawDiscWeight !== undefined && rawDiscWeight !== null) {
                        const num = Number(rawDiscWeight);
                        if (!isNaN(num)) {
                            weightsSet.add(num);
                        }
                    }
                });
            });
        }

        // Ordene esses valores de forma decrescente (ex: 3.0, 2.5, 1.2)
        return Array.from(weightsSet).sort((a, b) => b - a);
    }, [plansToAggregate, plans]);

    // Reset weight filter if the selected weight is no longer present
    React.useEffect(() => {
        if (weightFilter !== 'Todas') {
            const exists = availableWeights.some(w => Math.abs(w - weightFilter) < 0.0001);
            if (!exists && availableWeights.length > 0) {
                setWeightFilter('Todas');
            }
        }
    }, [availableWeights, weightFilter]);

    const aggregatedData = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        const parseDateYYYYMMDD = (dateStr: string): Date => {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            date.setHours(0, 0, 0, 0);
            return date;
        };

        const disciplineMap = new Map<string, Omit<AggregatedDiscipline, 'topics' | 'revisionStatus'> & { topics: AggregatedTopic[], revisionStatus: RevisionStatus }>();
        const allLogs: (HistoryLog & {planId: string, disciplineId: string})[] = [];
        const allRevisions: Revision[] = [];

        plansToAggregate.forEach(plan => {
            plan.disciplines.forEach(disc => {
                if (disc.historyLogs) {
                    allLogs.push(...disc.historyLogs.map(log => ({ ...log, planId: plan.id, disciplineId: disc.id })));
                }
                if (disc.revisions) {
                    allRevisions.push(...disc.revisions);
                }

                const discWeight = (disc as any).peso !== undefined && (disc as any).peso !== null
                    ? Number((disc as any).peso)
                    : (disc.weight !== undefined && disc.weight !== null ? Number(disc.weight) : 1.0);

                if (!disciplineMap.has(disc.name)) {
                    disciplineMap.set(disc.name, {
                        name: disc.name,
                        color: disc.color,
                        weight: discWeight,
                        topics: [],
                        totalTopics: 0,
                        completedTopics: 0,
                        progress: 0,
                        totalCorrect: 0,
                        totalIncorrect: 0,
                        totalQuestions: 0,
                        accuracy: 0,
                        originalDisciplines: [],
                        revisionStatus: null
                    });
                }

                const aggDisc = disciplineMap.get(disc.name)!;
                aggDisc.originalDisciplines.push({ planId: plan.id, disciplineId: disc.id });
                
                (disc.topicsList || []).forEach(topic => {
                    const topicWeight = (topic as any).peso !== undefined && (topic as any).peso !== null
                        ? Number((topic as any).peso)
                        : ((topic as any).weight !== undefined && (topic as any).weight !== null 
                            ? Number((topic as any).weight) 
                            : discWeight);

                    aggDisc.topics.push({
                        ...topic,
                        originalPlanId: plan.id,
                        originalDisciplineId: disc.id,
                        correct: 0,
                        incorrect: 0,
                        total: 0,
                        accuracy: 0,
                        lastStudied: null,
                        revisionStatus: null,
                        incidence: topic.incidence || 'Média',
                        weight: topicWeight
                    });
                });
            });
        });

        let lateCount = 0;
        let todayCount = 0;
        let upcomingCount = 0;
        let masteredCount = 0;

        const incidenceCounts = {
            'Muito Alta': 0,
            'Alta': 0,
            'Média': 0,
            'Baixa': 0,
            'Muito Baixa': 0
        };

        const finalDisciplines = Array.from(disciplineMap.values()).map(aggDisc => {
            let topicArray = sortTopics(aggDisc.topics);
            
            // Apply incidence filter
            if (incidenceFilter !== 'Todas') {
                topicArray = topicArray.filter(t => t.incidence === incidenceFilter);
            }

            // Apply weight filter to topics
            if (weightFilter !== 'Todas') {
                topicArray = topicArray.filter(t => {
                    const tWeight = t.weight !== undefined ? t.weight : aggDisc.weight;
                    return Math.abs(tWeight - weightFilter) < 0.0001;
                });
            }

            let discRevisionStatus: RevisionStatus = null;
            
            topicArray.forEach(topic => {
                const topicLogs = allLogs.filter(log => log.topic === topic.name && log.disciplineId === topic.originalDisciplineId);
                topic.correct = topicLogs.reduce((sum, log) => sum + (log.correct || 0), 0);
                topic.incorrect = topicLogs.reduce((sum, log) => sum + (log.incorrect || 0), 0);
                topic.total = topic.correct + topic.incorrect;
                topic.accuracy = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0;
                
                incidenceCounts[topic.incidence || 'Média']++;

                // Mastered Topics: 80%+ accuracy and 25+ questions
                if (topic.accuracy >= 80 && topic.total >= 25) {
                    masteredCount++;
                }

                // Calculate Topic Revision Status
                const topicRevisions = allRevisions.filter(r => r.topicName === topic.name && r.disciplineId === topic.originalDisciplineId && r.status === 'Programada');
                if (topicRevisions.length > 0) {
                    const hasLate = topicRevisions.some(r => parseDateYYYYMMDD(r.dueDate) < today);
                    topic.revisionStatus = hasLate ? 'late' : 'on-time';
                    
                    // Update Discipline Revision Status
                    if (topic.revisionStatus === 'late') {
                        discRevisionStatus = 'late';
                    } else if (topic.revisionStatus === 'on-time' && discRevisionStatus !== 'late') {
                        discRevisionStatus = 'on-time';
                    }
                }

                let mostRecentDate: Date | null = null;
                if (topicLogs.length > 0) {
                    const mostRecentLog = topicLogs.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())[0];
                    mostRecentDate = parseDate(mostRecentLog.date);
                }
                if (topic.status === 'Concluído' && topic.completionDate) {
                    const completionDate = new Date(topic.completionDate + 'T00:00:00'); 
                    if (!mostRecentDate || completionDate.getTime() > mostRecentDate.getTime()) {
                        mostRecentDate = completionDate;
                    }
                }
                if (mostRecentDate) {
                    topic.lastStudied = formatDateToDisplay(mostRecentDate.toISOString().split('T')[0]);
                }
            });

            const totalCorrect = topicArray.reduce((sum, t) => sum + t.correct, 0);
            const totalIncorrect = topicArray.reduce((sum, t) => sum + t.incorrect, 0);
            const totalQuestions = totalCorrect + totalIncorrect;
            const completedTopics = topicArray.filter(t => t.status === 'Concluído').length;
            
            return {
                ...aggDisc,
                topics: topicArray,
                totalTopics: topicArray.length,
                completedTopics,
                progress: topicArray.length > 0 ? Math.round((completedTopics / topicArray.length) * 100) : 0,
                totalCorrect,
                totalIncorrect,
                totalQuestions,
                accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
                originalDisciplines: [],
                revisionStatus: discRevisionStatus
            };
        }).filter(d => {
            // Hide disciplines with no topics after filtering
            if (d.topics.length === 0) return false;
            // Apply weight filter
            if (weightFilter !== 'Todas') {
                const matchesDisc = Math.abs(d.weight - weightFilter) < 0.0001;
                const hasMatchingTopics = d.topics.some(t => {
                    const tWeight = t.weight !== undefined ? t.weight : d.weight;
                    return Math.abs(tWeight - weightFilter) < 0.0001;
                });
                if (!matchesDisc && !hasMatchingTopics) return false;
            }
            return true;
        });

        // Calculate summary counts from all revisions
        allRevisions.forEach(r => {
            if (r.status !== 'Programada') return;
            const dueDate = parseDateYYYYMMDD(r.dueDate);
            if (dueDate < today) {
                lateCount++;
            } else if (r.dueDate === todayStr) {
                todayCount++;
            } else if (dueDate <= threeDaysFromNow) {
                upcomingCount++;
            }
        });

        const overallTotalTopics = finalDisciplines.reduce((sum, d) => sum + d.totalTopics, 0);
        const overallCompletedTopics = finalDisciplines.reduce((sum, d) => sum + d.completedTopics, 0);
        
        // Apply discipline sorting
        const sortedDisciplines = [...finalDisciplines].sort((a, b) => {
            if (disciplineSortOrder === 'weightDesc') {
                if (b.weight !== a.weight) return b.weight - a.weight;
            }
            return a.name.localeCompare(b.name);
        });

        return {
            disciplines: sortedDisciplines,
            overallTotalTopics,
            overallCompletedTopics,
            overallProgress: overallTotalTopics > 0 ? Math.round((overallCompletedTopics / overallTotalTopics) * 100) : 0,
            lateCount,
            todayCount,
            upcomingCount,
            masteredCount,
            incidenceCounts
        };
    }, [plansToAggregate, incidenceFilter, weightFilter, disciplineSortOrder]);


    return (
        <>
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Edital Verticalizado</h1>
                <button
                    onClick={onGenericAddLog}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 transition-colors w-full sm:w-auto justify-center shadow-lg hover:shadow-emerald-500/50"
                >
                    <PlusCircleIcon className="w-7 h-7" />
                    <span>Adicionar Estudo</span>
                </button>
            </header>

            <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

            <div className="space-y-8">
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-sm font-bold text-gray-300 uppercase">Progresso no Edital</h2>
                        <span className="text-2xl font-bold text-white">{aggregatedData.overallProgress}%</span>
                    </div>
                    <ProgressBar percentage={aggregatedData.overallProgress} />
                    <p className="text-sm text-gray-400 mt-2">{aggregatedData.overallCompletedTopics} de {aggregatedData.overallTotalTopics} Tópicos concluídos</p>
                </div>

                <RevisionSummaryPanel 
                    lateCount={aggregatedData.lateCount}
                    todayCount={aggregatedData.todayCount}
                    upcomingCount={aggregatedData.upcomingCount}
                    masteredCount={aggregatedData.masteredCount}
                />

                {/* Weight Filter & Discipline Sort */}
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-64">
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">Filtrar por Peso</label>
                        <div className="relative">
                            <select 
                                value={weightFilter} 
                                onChange={(e) => setWeightFilter(e.target.value === 'Todas' ? 'Todas' : Number(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="Todas">Todos os Pesos</option>
                                {availableWeights.map((w) => (
                                    <option key={w} value={w}>
                                        Peso {Number.isInteger(w) ? w.toFixed(1) : w}
                                    </option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                    <div className="w-full md:w-64">
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">Ordenar Disciplinas</label>
                        <div className="relative">
                            <select 
                                value={disciplineSortOrder} 
                                onChange={(e) => setDisciplineSortOrder(e.target.value as any)}
                                className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                            >
                                <option value="name">Nome (A-Z)</option>
                                <option value="weightDesc">Maior peso primeiro</option>
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Incidence Summary & Filter */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <button 
                        onClick={() => setIncidenceFilter('Todas')}
                        className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center text-center ${incidenceFilter === 'Todas' ? 'bg-emerald-500/20 border-emerald-500 shadow-lg' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'}`}
                    >
                        <span className="text-2xl font-black text-white mb-1">Σ</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Todas</span>
                    </button>
                    {(['Muito Alta', 'Alta', 'Média', 'Baixa'] as const).map(level => (
                        <button 
                            key={level}
                            onClick={() => setIncidenceFilter(level)}
                            className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center text-center ${incidenceFilter === level ? 'bg-emerald-500/20 border-emerald-500 shadow-lg' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'}`}
                        >
                            <span className="text-2xl font-black mb-1">{INCIDENCE_CONFIG[level].icon}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${INCIDENCE_CONFIG[level].text}`}>{level}</span>
                            <span className="text-xs font-bold text-gray-500 mt-1">{aggregatedData.incidenceCounts[level]} tópicos</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {aggregatedData.disciplines.map(discipline => (
                        <DisciplineRow 
                            key={discipline.name} 
                            discipline={discipline} 
                            onUpdateTopic={onUpdateTopic} 
                            onAddLog={onAddLog} 
                            plans={plans} 
                            sortOrder={sortOrder}
                            onToggleSort={handleToggleSort}
                        />
                    ))}
                    {aggregatedData.disciplines.length === 0 && (
                        <div className="bg-gray-800 rounded-lg p-12 text-center">
                            <p className="text-gray-400">Nenhuma disciplina ou tópico encontrado com os filtros selecionados.</p>
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};

export default EditalPage;