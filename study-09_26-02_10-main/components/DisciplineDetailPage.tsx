import * as React from 'react';
import { StudyPlan, Discipline, HistoryLog, Topic, TopicIncidence } from '../types';
import { PlusCircleIcon, LinkIcon, EditIcon, ArrowLeftIcon, CheckIcon } from '../constants';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { StudyLogFormData } from './StudyLogModal';
import { sortTopics } from '../src/utils/topicUtils'; // Importando o novo utilitário de ordenação


const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

const DetailStatCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
        <h3 className="text-gray-400 font-semibold mb-2">{title}</h3>
        <div>{children}</div>
    </div>
);

const HistoryTable: React.FC<{ logs: HistoryLog[], onEdit: (log: HistoryLog) => void, onDelete: (logId: string) => void }> = ({ logs, onEdit, onDelete }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Histórico de Registros</h2>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-700 text-sm text-gray-400 uppercase">
                        <th className="py-3 pr-3">Data</th>
                        <th className="py-3 px-3">Tópico</th>
                        <th className="py-3 px-3">Tempo</th>
                        <th className="py-3 px-3 text-center">Acertos</th>
                        <th className="py-3 px-3 text-center">Erros</th>
                        <th className="py-3 px-3">Páginas</th>
                        <th className="py-3 pl-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id} className="border-b border-gray-700 last:border-b-0">
                            <td className="py-4 pr-3 whitespace-nowrap">{log.date}</td>
                            <td className="py-4 px-3">{log.topic}</td>
                            <td className="py-4 px-3 whitespace-nowrap">{log.time}</td>
                            <td className="py-4 px-3 text-center text-green-400 font-semibold">{log.correct}</td>
                            <td className="py-4 px-3 text-center text-red-400 font-semibold">{log.incorrect}</td>
                            <td className="py-4 px-3">{log.pages}</td>
                            <td className="py-4 pl-3 text-right">
                                <button onClick={() => onEdit(log)} className="text-emerald-400 hover:underline mr-4 text-sm font-semibold">Editar</button>
                                <button onClick={() => onDelete(log.id)} className="text-red-500 hover:underline text-sm font-semibold">Excluir</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const EvolutionChart: React.FC<{ logs: HistoryLog[] }> = ({ logs }) => {
    const [timeframe, setTimeframe] = React.useState<'Diário' | 'Semanal' | 'Mensal'>('Mensal');

    const getStartOfWeek = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const parseTimeToHours = (timeStr: string): number => {
        if (!timeStr || timeStr === '-') return 0;
        let hours = 0;
        let minutes = 0;
        const hourMatch = timeStr.match(/(\d+)h/);
        if (hourMatch) hours = parseInt(hourMatch[1], 10);
        const minMatch = timeStr.match(/(\d+)m/);
        if (minMatch) minutes = parseInt(minMatch[1], 10);
        return hours + minutes / 60;
    };
    
    const parseDate = (dateStr: string): Date => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date('invalid');
    };

    const chartData = React.useMemo(() => {
        if (!logs || logs.length === 0) return { Diário: [], Semanal: [], Mensal: [] };
        
        const validLogs = logs.map(log => ({
            date: parseDate(log.date),
            hours: parseTimeToHours(log.time)
        })).filter(log => !isNaN(log.date.getTime()) && log.hours > 0);

        if (validLogs.length === 0) return { Diário: [], Semanal: [], Mensal: [] };
        
        validLogs.sort((a, b) => a.date.getTime() - b.date.getTime());

        const dataByDay = new Map<string, { dateObj: Date, hours: number }>();
        const dataByWeek = new Map<string, { dateObj: Date, hours: number }>();
        const dataByMonth = new Map<string, { dateObj: Date, hours: number }>();

        validLogs.forEach(log => {
            const dayKey = log.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const currentDay = dataByDay.get(dayKey) || { dateObj: log.date, hours: 0 };
            dataByDay.set(dayKey, { ...currentDay, hours: currentDay.hours + log.hours });
            
            const weekStart = getStartOfWeek(log.date);
            const weekKey = weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const currentWeek = dataByWeek.get(weekKey) || { dateObj: weekStart, hours: 0 };
            dataByWeek.set(weekKey, { ...currentWeek, hours: currentWeek.hours + log.hours });

            const monthKey = log.date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
            const currentMonth = dataByMonth.get(monthKey) || { dateObj: log.date, hours: 0 };
            dataByMonth.set(monthKey, { ...currentMonth, hours: currentMonth.hours + log.hours });
        });

        const formatMapToArray = (map: Map<string, { dateObj: Date, hours: number }>, prefix = '') => {
            return Array.from(map.entries())
                .sort((a, b) => a[1].dateObj.getTime() - b[1].dateObj.getTime())
                .map(([date, data]) => ({
                    date: `${prefix}${date}`,
                    'Tempo de Estudo': parseFloat(data.hours.toFixed(2))
                }));
        };

        return {
            Diário: formatMapToArray(dataByDay),
            Semanal: formatMapToArray(dataByWeek, 'Sem '),
            Mensal: formatMapToArray(dataByMonth),
        };
    }, [logs]);

    const dataForChart = chartData[timeframe];

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Evolução no Tempo</h2>
                <div className="flex items-center bg-gray-900 rounded-lg p-1">
                    {(['Diário', 'Semanal', 'Mensal'] as const).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeframe === tf ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-80">
                {dataForChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dataForChart} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: '#A0AEC0' }} />
                            <YAxis tick={{ fill: '#A0AEC0' }} label={{ value: 'Horas de Estudo', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(30, 41, 59, 0.9)',
                                    border: '1px solid #4A5568',
                                    borderRadius: '0.5rem',
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="Tempo de Estudo" name={`Tempo de Estudo ${timeframe}`} stroke="#34D399" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Nenhum registro de estudo encontrado para esta disciplina.
                    </div>
                )}
            </div>
        </div>
    );
};

const INCIDENCE_LEVELS: TopicIncidence[] = ['Muito Alta', 'Alta', 'Média', 'Baixa', 'Muito Baixa'];

const INCIDENCE_CONFIG = {
    'Muito Alta': { color: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/30', bg: 'bg-red-500/10', weight: 5 },
    'Alta': { color: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500/30', bg: 'bg-orange-500/10', weight: 4 },
    'Média': { color: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', weight: 3 },
    'Baixa': { color: 'bg-green-500', text: 'text-green-500', border: 'border-green-500/30', bg: 'bg-green-500/10', weight: 2 },
    'Muito Baixa': { color: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30', bg: 'bg-gray-500/10', weight: 1 },
};

const IncidenceBadge: React.FC<{ incidence?: TopicIncidence; onClick?: () => void }> = ({ incidence = 'Média', onClick }) => {
    const config = INCIDENCE_CONFIG[incidence];
    return (
        <button 
            onClick={onClick}
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${config.bg} ${config.text} ${config.border} transition-all hover:scale-105 active:scale-95`}
        >
            {incidence}
        </button>
    );
};

const VerticalSyllabus: React.FC<{ 
    topics: Topic[]; 
    onUpdateTopic: (planId: string, disciplineId: string, topicId: string, updates: Partial<Topic>) => void;
    onAddLog: (topic: Topic) => void;
    plan: StudyPlan; // Adicionado para passar o plano
    discipline: Discipline; // Adicionado para passar a disciplina
}> = ({ topics, onUpdateTopic, onAddLog, plan, discipline }) => {
    const [editingTopicId, setEditingTopicId] = React.useState<string | null>(null);
    const [linkInput, setLinkInput] = React.useState('');
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc' | 'original'>('original');

    const handleToggleSort = () => {
        setSortOrder(prev => {
            if (prev === 'original') return 'desc';
            if (prev === 'desc') return 'asc';
            return 'original';
        });
    };

    const sortedTopics = React.useMemo(() => {
        let baseTopics = sortTopics(topics);
        if (sortOrder === 'original') return baseTopics;
        return [...baseTopics].sort((a, b) => {
            const weightA = INCIDENCE_CONFIG[a.incidence || 'Média'].weight;
            const weightB = INCIDENCE_CONFIG[b.incidence || 'Média'].weight;
            return sortOrder === 'desc' ? weightB - weightA : weightA - weightB;
        });
    }, [topics, sortOrder]);

    const handleAddOrEditClick = (topic: Topic) => {
        setEditingTopicId(topic.id);
        setLinkInput(topic.questionLink || '');
    };

    const handleCancel = () => {
        setEditingTopicId(null);
        setLinkInput('');
    };

    const handleSave = () => {
        if (editingTopicId) {
            onUpdateTopic(plan.id, discipline.id, editingTopicId, { questionLink: linkInput });
            handleCancel();
        }
    };

    const handleCycleIncidence = (topic: Topic) => {
        const currentIndex = INCIDENCE_LEVELS.indexOf(topic.incidence || 'Média');
        const nextIndex = (currentIndex + 1) % INCIDENCE_LEVELS.length;
        const nextIncidence = INCIDENCE_LEVELS[nextIndex];
        onUpdateTopic(plan.id, discipline.id, topic.id, { incidence: nextIncidence });
    };
    
    return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
         <h2 className="text-xl font-bold text-white mb-4">Edital Verticalizado</h2>
         <table className="w-full text-left">
            <thead>
                 <tr className="border-b border-gray-700 text-sm text-gray-400 uppercase">
                    <th className="py-3 pr-3 w-2/5">Tópico</th>
                    <th className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors" onClick={handleToggleSort}>
                        Incidência {sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : ''}
                    </th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Questões</th>
                    <th className="py-3 pl-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                {sortedTopics.map(topic => (
                    <tr key={topic.id} className="border-b border-gray-700 last:border-b-0">
                        <td className="py-3 pr-3 whitespace-normal break-words" style={{ paddingLeft: topic.name.startsWith('  ') ? '2rem' : '0' }}>
                            {topic.name.trim()}
                        </td>
                        <td className="py-3 px-3 text-center">
                            <IncidenceBadge incidence={topic.incidence} onClick={() => handleCycleIncidence(topic)} />
                        </td>
                        <td className="py-3 px-3 text-center">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                topic.status === 'Concluído' 
                                ? 'bg-green-500 text-green-900' 
                                : 'bg-red-500 text-red-900'
                            }`}>
                                {topic.status}
                            </span>
                        </td>
                        <td className="py-3 px-3">
                            {editingTopicId === topic.id ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="url"
                                        value={linkInput}
                                        onChange={(e) => setLinkInput(e.target.value)}
                                        placeholder="Cole o link aqui"
                                        className="bg-gray-700 border border-gray-600 text-gray-300 rounded-md px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                                    />
                                    <button onClick={handleSave} className="text-green-400 hover:text-green-300 text-xs font-bold whitespace-nowrap">Salvar</button>
                                    <button onClick={handleCancel} className="text-red-400 hover:text-red-300 text-xs font-bold">X</button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    {topic.questionLink ? (
                                        <>
                                            <a href={topic.questionLink} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300" title="Abrir link de questões" aria-label="Abrir link de questões">
                                                <LinkIcon className="w-5 h-5" />
                                            </a>
                                            <button onClick={() => handleAddOrEditClick(topic)} className="text-gray-400 hover:text-white" title="Editar link de questões" aria-label="Editar link de questões">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleAddOrEditClick(topic)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-full transition-colors" title="Adicionar link de questões" aria-label="Adicionar link de questões">
                                            <PlusCircleIcon className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </td>
                        <td className="py-3 pl-3 text-right">
                            <button className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-full transition-colors" onClick={() => onAddLog(topic)} title="Adicionar registro de estudo" aria-label={`Adicionar registro para ${topic.name}`}>
                                <PlusCircleIcon className="w-6 h-6" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
    );
};


const DisciplineDetailPage: React.FC<{ 
    discipline: Discipline, 
    plan: StudyPlan,
    onUpdateTopic: (planId: string, disciplineId: string, topicId: string, updates: Partial<Topic>) => void;
    onAddLog: (plan: StudyPlan, discipline: Discipline, topic: Topic) => void;
    onEditLog: (plan: StudyPlan, discipline: Discipline, log: HistoryLog) => void;
    onDeleteLog: (planId: string, disciplineId: string, logId: string) => void;
    onBack: () => void;
}> = ({ discipline, plan, onUpdateTopic, onAddLog, onEditLog, onDeleteLog, onBack }) => {
    
    const performancePercentage = discipline.performance && (discipline.performance.correct + discipline.performance.incorrect) > 0 
        ? (discipline.performance.correct / (discipline.performance.correct + discipline.performance.incorrect)) * 100 
        : 0;
    
    const progressPercentage = discipline.topicsList && discipline.topicsList.length > 0 
        ? (discipline.studiedTopics / discipline.topicsList.length) * 100 
        : 0;
    
    const handleTopicUpdate = (topicId: string, updates: Partial<Topic>) => {
        onUpdateTopic(plan.id, discipline.id, topicId, updates);
    };

    const handleOpenLogModal = (topic: Topic) => {
        onAddLog(plan, discipline, topic);
    };

    const getPerformanceColor = (performance: number) => {
        if (performance < 70) return 'text-red-500';
        if (performance < 80) return 'text-yellow-400';
        return 'text-green-400';
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">{discipline.name}</h1>
                <div className="flex items-center gap-4">
                     <button className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                        onClick={onBack}
                     >
                        <ArrowLeftIcon />
                        <span>Voltar</span>
                    </button>
                     <div className="bg-gray-800 px-4 py-2 rounded-lg font-semibold">{plan.name}</div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <DetailStatCard title="Tempo de Estudo">
                    <p className="text-4xl font-bold text-emerald-400">{formatTime(discipline.studyTimeInMinutes || 0)}</p>
                </DetailStatCard>
                <DetailStatCard title="Desempenho">
                    {discipline.performance && (
                        <>
                            <p className="text-lg"><span className="font-bold text-green-400">{discipline.performance.correct}</span> acertos</p>
                            <p className="text-lg"><span className="font-bold text-red-400">{discipline.performance.incorrect}</span> erros</p>
                            <p className={`text-2xl font-bold mt-1 ${getPerformanceColor(performancePercentage)}`}>{performancePercentage.toFixed(0)}%</p>
                        </>
                    )}
                </DetailStatCard>
                <DetailStatCard title="Progresso no Edital">
                    <p className="text-lg"><span className="font-bold text-white">{discipline.studiedTopics}</span> tópicos concluídos</p>
                    <p className="text-lg"><span className="font-bold text-gray-400">{ (discipline.topicsList?.length || 0) - discipline.studiedTopics }</span> tópicos pendentes</p>
                     <p className="text-2xl font-bold text-emerald-400 mt-1">{progressPercentage.toFixed(0)}%</p>
                </DetailStatCard>
                <DetailStatCard title="Páginas Lidas">
                    <p className="text-lg"><span className="font-bold text-white">{discipline.pagesRead?.speed.toFixed(1)}</span> páginas/hora</p>
                    <p className="text-4xl font-bold text-emerald-400 mt-1">{discipline.pagesRead?.count || 0}</p>
                </DetailStatCard>
            </div>
            
            <HistoryTable 
                logs={discipline.historyLogs || []} 
                onEdit={(log) => onEditLog(plan, discipline, log)}
                onDelete={(logId) => onDeleteLog(plan.id, discipline.id, logId)}
            />
            <EvolutionChart logs={discipline.historyLogs || []} />
            <VerticalSyllabus 
                topics={discipline.topicsList || []} 
                onUpdateTopic={onUpdateTopic} 
                onAddLog={handleOpenLogModal}
                plan={plan} // Passando o plano
                discipline={discipline} // Passando a disciplina
            />
        </div>
    );
};

export default DisciplineDetailPage;