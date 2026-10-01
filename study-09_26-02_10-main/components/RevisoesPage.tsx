import * as React from 'react';
import { StudyPlan, Revision } from '../types';
import { PlayIcon, XIcon as CloseIcon, ClockIcon, CheckIcon, XMarkIcon as PerformanceXIcon, PlusCircleIcon, PlusIcon, CalendarIcon, TrashIcon, LinkIcon } from '../constants';
import PlanFilter from './PlanFilter';

interface RevisoesPageProps {
    plans: StudyPlan[];
    onUpdateRevisionStatus: (planId: string, disciplineId: string, revisionId: string, status: Revision['status']) => void;
    onAddLogRequest: () => void;
    onStartStudyForRevision: (revision: Revision) => void;
    onAddLogForRevisionRequest: (revision: Revision) => void;
    onDeleteRevision: (revisionId: string) => void;
    onClearCompletedRevisions: () => void;
    onClearIgnoredRevisions: () => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

// Helper functions for date calculations
const parseDateYYYYMMDD = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
};

const parseDateDDMMYYYY = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    date.setHours(0, 0, 0, 0);
    return date;
};

const getDayDiff = (date1: Date, date2: Date): number => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc1 - utc2) / msPerDay);
};

const formatDiff = (diff: number): string => {
    if (diff === 0) return 'HOJE';
    if (diff === 1) return 'AMANHÃ';
    if (diff > 1) return `DAQUI A ${diff} DIAS`;
    if (diff === -1) return '1 DIA ATRASADO';
    return `${Math.abs(diff)} DIAS ATRASADOS`;
};

const getOriginalReviewIntervalDays = (dueDateStr: string, originalLogDateStr: string): number | null => {
    try {
        const dueDate = parseDateYYYYMMDD(dueDateStr);
        const originalLogDate = parseDateDDMMYYYY(originalLogDateStr);

        if (isNaN(dueDate.getTime()) || isNaN(originalLogDate.getTime())) {
            return null;
        }
        
        const diffTime = Math.abs(dueDate.getTime() - originalLogDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch (e) {
        console.error("Error calculating original review interval:", e);
        return null;
    }
};

const getTodayYYYYMMDD = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const RevisoesPage: React.FC<RevisoesPageProps> = ({ plans, onUpdateRevisionStatus, onAddLogRequest, onStartStudyForRevision, onAddLogForRevisionRequest, onDeleteRevision, onClearCompletedRevisions, onClearIgnoredRevisions, selectedFilterPlanIds, onSelectPlans }) => {
    const [activeTab, setActiveTab] = React.useState<'PROGRAMADAS' | 'ATRASADAS' | 'IGNORADAS' | 'CONCLUÍDAS'>('PROGRAMADAS');
    const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<string>('all');
    const [selectedDate, setSelectedDate] = React.useState<string>('');

    const plansToUse = React.useMemo(() => {
        return selectedFilterPlanIds.includes('all')
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));
    }, [plans, selectedFilterPlanIds]);

    // Get unique disciplines from current plans for the filter
    const availableDisciplines = React.useMemo(() => {
        const disciplineMap = new Map<string, string>();
        plansToUse.forEach(plan => {
            plan.disciplines.forEach(disc => {
                if (!disciplineMap.has(disc.name)) {
                    disciplineMap.set(disc.name, disc.id);
                }
            });
        });
        return Array.from(disciplineMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [plansToUse]);

    const allRevisions = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const revisions = plansToUse.flatMap(plan =>
            plan.disciplines.flatMap(discipline =>
                (discipline.revisions || []).map(revision => {
                    const dueDate = parseDateYYYYMMDD(revision.dueDate);
                    const diff = getDayDiff(dueDate, today);
                    const isLate = revision.status === 'Programada' && diff < 0;
                    
                    // Find the question link from the topic in the syllabus
                    const topic = discipline.topicsList?.find(t => t.name === revision.topicName);
                    const questionLink = topic?.questionLink;

                    return { ...revision, diff, isLate, questionLink };
                })
            )
        );
        return revisions;
    }, [plansToUse]);

    const filteredAndGroupedRevisions = React.useMemo(() => {
        let filtered = allRevisions;

        // Apply Discipline Filter
        if (selectedDisciplineId !== 'all') {
            // We filter by name to handle cases where the same discipline exists in multiple plans
            const disciplineName = availableDisciplines.find(([name, id]) => id === selectedDisciplineId)?.[0];
            filtered = filtered.filter(r => r.disciplineName === disciplineName);
        }

        // Apply Date Filter
        if (selectedDate) {
            filtered = filtered.filter(r => r.dueDate === selectedDate);
        }

        // Apply Tab Filter
        switch (activeTab) {
            case 'PROGRAMADAS':
                filtered = filtered.filter(r => r.status === 'Programada' && !r.isLate);
                break;
            case 'ATRASADAS':
                filtered = filtered.filter(r => r.status === 'Programada' && r.isLate);
                break;
            case 'IGNORADAS':
                filtered = filtered.filter(r => r.status === 'Ignorada');
                break;
            case 'CONCLUÍDAS':
                filtered = filtered.filter(r => r.status === 'Concluída');
                break;
        }

        const grouped = filtered.reduce((acc, revision) => {
            const groupKey = activeTab === 'CONCLUÍDAS' ? 'REVISÕES FINALIZADAS' : formatDiff(revision.diff);
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(revision);
            return acc;
        }, {} as Record<string, typeof allRevisions>);

        return Object.entries(grouped).sort(([keyA], [keyB]) => {
            if (activeTab === 'CONCLUÍDAS') return 0;
            const diffA = grouped[keyA][0].diff;
            const diffB = grouped[keyB][0].diff;
            return activeTab === 'ATRASADAS' ? diffA - diffB : diffB - diffA;
        });
    }, [allRevisions, activeTab, selectedDisciplineId, availableDisciplines, selectedDate]);

    const TabButton: React.FC<{ label: typeof activeTab }> = ({ label }) => (
        <button
            onClick={() => setActiveTab(label)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors focus:outline-none ${
                activeTab === label
                    ? 'bg-gray-800 text-white border-b-2 border-emerald-500'
                    : 'text-gray-400 hover:text-white'
            }`}
        >
            {label}
        </button>
    );

    const handleClearAll = () => {
        if (confirm('Tem certeza que deseja limpar todo o histórico de revisões concluídas? Esta ação não pode ser desfeita.')) {
            onClearCompletedRevisions();
        }
    };

    const handleClearIgnored = () => {
        if (confirm('Tem certeza que deseja limpar todas as revisões ignoradas? Esta ação não pode ser desfeita.')) {
            onClearIgnoredRevisions();
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Revisões</h1>
                <div className="flex gap-4">
                    {activeTab === 'CONCLUÍDAS' && filteredAndGroupedRevisions.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 border border-red-600/30 transition-all"
                        >
                            <TrashIcon className="w-5 h-5" /> Limpar Tudo
                        </button>
                    )}
                    {activeTab === 'IGNORADAS' && filteredAndGroupedRevisions.length > 0 && (
                        <button
                            onClick={handleClearIgnored}
                            className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 border border-red-600/30 transition-all"
                        >
                            <TrashIcon className="w-5 h-5" /> Limpar Tudo
                        </button>
                    )}
                    <button
                        onClick={onAddLogRequest}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 shadow-lg hover:shadow-emerald-500/50"
                    >
                        <PlusCircleIcon className="w-7 h-7" /> Adicionar Estudo
                    </button>
                </div>
                                </header>

            <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-wrap items-end gap-4 flex-grow">
                    <div className="w-full md:w-64">
                        <label htmlFor="discipline-filter" className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">
                            Filtrar por Disciplina
                        </label>
                        <select
                            id="discipline-filter"
                            value={selectedDisciplineId}
                            onChange={(e) => setSelectedDisciplineId(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">Todas as Disciplinas</option>
                            {availableDisciplines.map(([name, id]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const todayStr = getTodayYYYYMMDD();
                                if (selectedDate === todayStr) {
                                    setSelectedDate(''); // Toggle off if already selected
                                    setActiveTab('PROGRAMADAS');
                                } else {
                                    setSelectedDate(todayStr);
                                    setActiveTab('PROGRAMADAS');
                                }
                            }}
                            className={`px-4 py-2.5 font-bold text-sm rounded-lg transition-colors h-[42px] ${
                                selectedDate === getTodayYYYYMMDD()
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                        >
                            Hoje
                        </button>
                        <div className="relative">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setActiveTab('PROGRAMADAS');
                                }}
                                className="bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm h-[42px] pr-16"
                            />
                            {selectedDate && (
                                <button
                                    onClick={() => setSelectedDate('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold bg-gray-800/80 hover:bg-gray-800 px-1.5 py-0.5 rounded"
                                    title="Limpar data"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-b border-gray-700 flex-shrink-0">
                    <nav className="flex space-x-2">
                        <TabButton label="PROGRAMADAS" />
                        <TabButton label="ATRASADAS" />
                        <TabButton label="IGNORADAS" />
                        <TabButton label="CONCLUÍDAS" />
                    </nav>
                </div>
            </div>

            {filteredAndGroupedRevisions.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-12 text-center">
                    <p className="text-gray-500">Nenhuma revisão encontrada para os filtros aplicados.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredAndGroupedRevisions.map(([groupTitle, revisions]) => (
                        <div key={groupTitle}>
                            <div className="flex items-center gap-4 mb-3">
                                <h2 className="text-lg font-bold text-white">{groupTitle}</h2>
                                <div className="flex-grow h-px bg-emerald-500"></div>
                            </div>
                            <div className="space-y-3">
                                {revisions.map(rev => {
                                    const originalInterval = getOriginalReviewIntervalDays(rev.dueDate, rev.originalLogInfo.date);
                                    const completionDate = rev.updatedAt ? new Date(rev.updatedAt).toLocaleDateString('pt-BR') : null;

                                    return (
                                    <div key={rev.id} className="bg-gray-800 rounded-lg shadow-md p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                {activeTab === 'CONCLUÍDAS' ? (
                                                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                                        <CheckIcon className="w-3 h-3" />
                                                        CONCLUÍDO EM {completionDate}
                                                    </span>
                                                ) : (
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${rev.isLate ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-200'}`}>
                                                        {rev.isLate ? `${Math.abs(rev.diff)} dias` : `${rev.diff} dia${rev.diff !== 1 ? 's' : ''}`}
                                                    </span>
                                                )}
                                                
                                                {activeTab !== 'CONCLUÍDAS' && (
                                                    <>
                                                        <button onClick={() => onStartStudyForRevision(rev)} title="Iniciar" className="w-8 h-8 flex items-center justify-center bg-green-500 rounded-full hover:bg-green-600 transition-colors" aria-label="Iniciar cronômetro para revisão">
                                                            <PlayIcon className="w-5 h-5 text-white" />
                                                        </button>
                                                        <button onClick={() => onAddLogForRevisionRequest(rev)} title="Concluir" className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded-full hover:bg-blue-600 transition-colors" aria-label="Concluir e registrar estudo manual">
                                                            <PlusIcon className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                                {(activeTab === 'IGNORADAS' || activeTab === 'CONCLUÍDAS') ? (
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm('Tem certeza que deseja excluir esta revisão permanentemente?')) {
                                                                onDeleteRevision(rev.id);
                                                            }
                                                        }} 
                                                        title="Excluir Permanentemente" 
                                                        className="w-8 h-8 flex items-center justify-center bg-red-600 rounded-full hover:bg-red-700 transition-colors" 
                                                        aria-label="Excluir revisão permanentemente"
                                                    >
                                                        <TrashIcon className="w-4 h-4 text-white" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => onUpdateRevisionStatus(rev.planId, rev.disciplineId, rev.id, 'Ignorada')} title="Ignorar" className="w-8 h-8 flex items-center justify-center bg-red-500 rounded-full hover:bg-red-600 transition-colors" aria-label="Ignorar revisão">
                                                        <CloseIcon />
                                                    </button>
                                                )}
                                                <span className="font-bold text-white">{rev.disciplineName}</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-700/50 p-3 rounded-md flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-300">
                                                    {rev.originalLogInfo.date} <span className="text-gray-500 mx-2">|</span> {rev.topicName}
                                                </span>
                                                {(rev as any).questionLink && (
                                                    <a 
                                                        href={(rev as any).questionLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded text-xs font-bold transition-colors"
                                                        title="Abrir link de questões"
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                        Questões
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="px-2 py-1 bg-green-800 text-green-300 text-xs rounded">{rev.originalLogInfo.category}</span>
                                                <span className="text-gray-400 flex items-center gap-1">
                                                    <ClockIcon className="w-4 h-4" />{rev.originalLogInfo.time}
                                                </span>
                                                { (rev.originalLogInfo.correct + rev.originalLogInfo.incorrect > 0) &&
                                                    <div className="flex items-center gap-2">
                                                        <CheckIcon className="w-4 h-4 text-green-400"/> <span className="text-green-400">{rev.originalLogInfo.correct}</span>
                                                        <PerformanceXIcon className="w-4 h-4 text-red-400"/> <span className="text-red-400">{rev.originalLogInfo.incorrect}</span>
                                                        <span className="font-bold text-white">
                                                          {((rev.originalLogInfo.correct / (rev.originalLogInfo.correct + rev.originalLogInfo.incorrect)) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                        {originalInterval !== null && (
                                            <div className="mt-3 text-sm text-gray-400 flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4" />
                                                <span>Revisão agendada para {originalInterval} dias após o estudo.</span>
                                            </div>
                                        )}
                                    </div>
                                );})}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RevisoesPage;