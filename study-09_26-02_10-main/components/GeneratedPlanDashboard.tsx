import * as React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { GeneratedCycle, StudySession } from '../types';
import { RestartIcon, EditIcon, TrashIcon, ClockIcon, PlayIcon, PlusIcon } from '../constants';


interface AlgorithmSuggestionProps {
    criteria: {
        accuracy: number;
        frequency: number;
        lastStudiedDays: number;
        userRelevance: number;
    }
}

const InfoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AlgorithmSuggestion: React.FC<AlgorithmSuggestionProps> = ({ criteria }) => {
    return (
        <div className="bg-purple-900/30 border border-purple-700/50 text-purple-200 p-3 rounded-lg mt-2 text-[10px]">
            <h5 className="font-bold mb-1 flex items-center">
                <InfoIcon />
                Sugestão do Algoritmo
            </h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p><strong>Acertos:</strong> {criteria.accuracy.toFixed(0)}%</p>
                <p><strong>Frequência:</strong> {criteria.frequency}x</p>
                <p><strong>Último Estudo:</strong> {criteria.lastStudiedDays} dias</p>
                <p><strong>Relevância:</strong> {criteria.userRelevance}</p>
            </div>
        </div>
    );
};


const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
};

const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${String(hours).padStart(2, '0')}h${String(remainingMinutes).padStart(2, '0')}min`;
};

const Header: React.FC<{ 
    planName: string;
    onEdit: () => void; 
    onRemove: () => void; 
    onStartNextCycle: () => void; 
    isCycleCompleted: boolean; 
}> = ({ planName, onEdit, onRemove, onStartNextCycle, isCycleCompleted }) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
        <div>
            <h2 className="text-2xl font-bold text-white">{planName}</h2>
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Ciclo de Estudos Ativo</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <button 
                onClick={onStartNextCycle}
                disabled={!isCycleCompleted}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:bg-gray-500/50 disabled:cursor-not-allowed text-sm">
                <RestartIcon className="w-4 h-4" />
                Próximo Ciclo
            </button>
            <button onClick={onEdit} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm">
                <EditIcon className="w-4 h-4" />
                Editar
            </button>
            <button onClick={onRemove} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm">
                <TrashIcon className="w-4 h-4" />
                Remover
            </button>
        </div>
    </div>
);

const StudySequenceList: React.FC<{ 
    sessions: StudySession[]; 
    title: string; 
    onRegisterManualStudy: (planId: string, disciplineId: string) => void;
    onStartStudy: (session: StudySession) => void;
}> = ({ sessions, title, onRegisterManualStudy, onStartStudy }) => (
    <div className="bg-gray-800 p-4 rounded-xl shadow-lg h-[600px] flex flex-col">
        <h3 className="font-bold text-lg text-white mb-4 px-2">{title}</h3>
        <div className="flex-grow overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {sessions.map(session => {
                const progress = session.totalTime > 0 ? (session.studiedTime / session.totalTime) * 100 : 0;
                const isCompleted = session.status === 'Concluído';

                return (
                    <div key={session.id} className="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-3 border-l-4 transition-all" style={{ borderColor: session.disciplineColor }}>
                        <div className="flex justify-between items-center mb-1.5">
                            <h4 className={`font-bold text-sm ${isCompleted ? 'text-gray-400' : 'text-white'}`}>{session.disciplineName}</h4>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                                <span>{formatTime(session.studiedTime)} / {formatTime(session.totalTime)}</span>
                            </div>
                        </div>
                        
                        <div className="w-full bg-gray-800 rounded-full h-1.5 relative overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                    width: `${Math.min(100, progress)}%`, 
                                    backgroundColor: session.disciplineColor,
                                    opacity: isCompleted ? 0.5 : 1
                                }}
                            ></div>
                        </div>

                        <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                                <button 
                                    onClick={() => onStartStudy(session)}
                                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    <PlayIcon className="w-3 h-3"/>
                                    <span>Iniciar</span>
                                </button>
                                <button 
                                    onClick={() => onRegisterManualStudy(session.planId, session.disciplineId)}
                                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors">
                                    <PlusIcon className="w-3 h-3"/>
                                    <span>Registrar Manual</span>
                                </button>
                            </div>
                            {session.suggestionCriteria && (
                                <span className="text-[9px] text-purple-400 font-bold flex items-center gap-1">
                                    <InfoIcon /> IA
                                </span>
                            )}
                        </div>
                        
                        {session.suggestionCriteria && (
                            <div className="hidden group-hover:block">
                                <AlgorithmSuggestion criteria={session.suggestionCriteria} />
                            </div>
                        )}
                    </div>
                );
            })}
             {sessions.length === 0 && <p className="text-gray-500 text-center pt-10 h-full flex items-center justify-center">Nenhum estudo nesta categoria.</p>}
        </div>
    </div>
);

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-900 border border-gray-700 p-3 rounded-xl shadow-2xl z-50 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2 border-b border-gray-800 pb-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: data.color }}></div>
                    <p className="font-black text-white text-[10px] uppercase tracking-widest truncate">{data.name}</p>
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-2">
                        <ClockIcon className="w-3 h-3" />
                        {data.formattedValue}
                    </p>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-tighter">
                        {data.value.toFixed(1)}% do ciclo
                    </p>
                </div>
                {data.isCompleted && (
                    <div className="mt-2 pt-2 border-t border-gray-800">
                        <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                            <span className="text-xs">✓</span> Concluído
                        </p>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

interface GeneratedPlanDashboardProps {
    cycle: GeneratedCycle;
    planName: string;
    onRegisterManualStudy: (planId: string, disciplineId: string) => void;
    onStartStudy: (session: StudySession) => void;
    onEdit: (planId: string) => void;
    onRemove: (planId: string) => void;
    onStartNextCycle: (planId: string) => void;
}

const GeneratedPlanDashboard: React.FC<GeneratedPlanDashboardProps> = ({ cycle, planName, onRegisterManualStudy, onStartStudy, onEdit, onRemove, onStartNextCycle }) => {
    const [activeTab, setActiveTab] = React.useState<'sequence' | 'completed'>('sequence');

    const progressPercent = cycle.weeklyProgress.total > 0 ? (cycle.weeklyProgress.completed / cycle.weeklyProgress.total) * 100 : 0;
    const isCycleCompleted = cycle.studySequence.length === 0;

    const chartData = React.useMemo(() => {
        return cycle.currentCycle.distribution.map(item => {
            const totalPlannedForDisc = [...cycle.studySequence, ...cycle.completedStudies]
                .filter(s => s.disciplineName === item.name)
                .reduce((sum, s) => sum + s.totalTime, 0);
            
            const totalStudiedForDisc = [...cycle.studySequence, ...cycle.completedStudies]
                .filter(s => s.disciplineName === item.name)
                .reduce((sum, s) => sum + s.studiedTime, 0);
            
            const isFullyCompleted = totalStudiedForDisc >= totalPlannedForDisc && totalPlannedForDisc > 0;

            return {
                ...item,
                formattedValue: formatTotalTime((item.value / 100) * cycle.currentCycle.totalTime),
                isCompleted: isFullyCompleted
            };
        });
    }, [cycle]);

    return (
        <div className="space-y-6 bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
            <Header 
                planName={planName}
                onEdit={() => onEdit(cycle.planId)} 
                onRemove={() => onRemove(cycle.planId)} 
                onStartNextCycle={() => onStartNextCycle(cycle.planId)} 
                isCycleCompleted={isCycleCompleted} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Coluna da Esquerda: Stats e Lista de Estudos */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Cards de Estatísticas Compactos */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Ciclos Completos - Compacto */}
                        <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center gap-4 min-w-[180px]">
                            <div className="relative w-12 h-12 flex-shrink-0">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#34D399" strokeWidth="3" strokeDasharray="100, 100" />
                                </svg>
                                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-white">
                                    {cycle.completedCycles}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ciclos</h3>
                                <p className="text-xs font-bold text-white">Completos</p>
                            </div>
                        </div>

                        {/* Progresso da Semana - Alongado */}
                        <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex-grow flex flex-col justify-center">
                            <div className="flex justify-between items-end mb-2">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Progresso Semanal</h3>
                                <p className="text-[10px] font-bold text-emerald-400">
                                    {formatTime(cycle.weeklyProgress.completed * 60)} / {formatTime(cycle.weeklyProgress.total * 60)}
                                </p>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-700" 
                                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Sequência de Estudos */}
                    <div>
                        <div className="border-b border-gray-700 mb-4">
                            <nav className="flex space-x-4">
                                <button onClick={() => setActiveTab('sequence')} className={`py-2 px-4 font-semibold ${activeTab === 'sequence' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}>
                                    Sequência de Estudos
                                </button>
                                <button onClick={() => setActiveTab('completed')} className={`py-2 px-4 font-semibold ${activeTab === 'completed' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}>
                                    Estudos Concluídos
                                </button>
                            </nav>
                        </div>
                        {activeTab === 'sequence' ? (
                            <StudySequenceList sessions={cycle.studySequence} title="Próximos Estudos" onRegisterManualStudy={onRegisterManualStudy} onStartStudy={onStartStudy} />
                        ) : (
                            <StudySequenceList sessions={cycle.completedStudies} title="Concluídos Recentemente" onRegisterManualStudy={onRegisterManualStudy} onStartStudy={onStartStudy} />
                        )}
                    </div>
                </div>

                {/* Coluna da Direita: Gráfico do Ciclo */}
                <div className="lg:col-span-1 lg:sticky lg:top-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center">
                        <h3 className="font-semibold text-gray-300 mb-2">Ciclo Atual</h3>
                        <div className="w-full aspect-square relative max-w-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius="90%"
                                        innerRadius="70%"
                                        fill="#8884d8"
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.color} 
                                                fillOpacity={entry.isCompleted ? 0.4 : 1}
                                                stroke={entry.isCompleted ? entry.color : 'none'}
                                                strokeWidth={entry.isCompleted ? 1 : 0}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center z-0">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</span>
                                <span className="text-xl font-bold text-white leading-tight">{formatTotalTime(cycle.currentCycle.totalTime)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneratedPlanDashboard;