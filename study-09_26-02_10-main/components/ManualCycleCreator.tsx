import * as React from 'react';
import { Discipline, StudySession } from '../types';
import { PlusIcon, TrashIcon } from '../constants';

interface ManualCycleCreatorProps {
    allDisciplines: (Discipline & { planId: string; planName: string; })[];
    onBack: () => void;
    onSave: (sessions: StudySession[], weeklyHours: number) => void;
}

const ManualCycleCreator: React.FC<ManualCycleCreatorProps> = ({ allDisciplines, onBack, onSave }) => {
    const [weeklyHours, setWeeklyHours] = React.useState(20);
    const [sessions, setSessions] = React.useState<StudySession[]>([]);
    
    // Form state for adding a new session
    const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<string>('');
    const [sessionDuration, setSessionDuration] = React.useState<number>(60);

    const uniqueDisciplines = React.useMemo(() => {
        const seen = new Set<string>();
        return allDisciplines.filter(d => {
            if (seen.has(d.id)) return false;
            seen.add(d.id);
            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [allDisciplines]);
    
    const handleAddSession = () => {
        if (!selectedDisciplineId || sessionDuration <= 0) {
            alert("Selecione uma disciplina e uma duração válida.");
            return;
        }
        
        const discipline = uniqueDisciplines.find(d => d.id === selectedDisciplineId);
        if (!discipline) return;
        
        const newSession: StudySession = {
            id: `manual-session-${new Date().getTime()}`,
            disciplineName: discipline.name,
            disciplineColor: discipline.color,
            totalTime: sessionDuration,
            studiedTime: 0,
            status: 'Pendente',
            planId: discipline.planId,
            disciplineId: discipline.id,
        };
        
        setSessions(prev => [...prev, newSession]);
        // Reset form
        setSelectedDisciplineId('');
        setSessionDuration(60);
    };
    
    const handleRemoveSession = (sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
    };

    const totalPlannedMinutes = React.useMemo(() => sessions.reduce((sum, s) => sum + s.totalTime, 0), [sessions]);
    const weeklyMinutes = weeklyHours * 60;
    const remainingMinutes = weeklyMinutes - totalPlannedMinutes;

    const formatMinutes = (mins: number) => {
        const hours = Math.floor(Math.abs(mins) / 60);
        const minutes = Math.abs(mins) % 60;
        const sign = mins < 0 ? "-" : "";
        return `${sign}${hours}h ${minutes}min`;
    };

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-5xl mx-auto my-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Criação de Ciclo Manual</h2>
                <p className="text-gray-400 mb-8">Adicione sessões de estudo para montar seu ciclo semanal.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Panel: Add Session & Summary */}
                <div className="flex flex-col gap-6">
                    <div className="bg-gray-900/50 p-6 rounded-lg">
                        <h3 className="text-xl font-bold mb-4 text-white">Adicionar Sessão</h3>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Disciplina</label>
                                <select
                                    value={selectedDisciplineId}
                                    onChange={e => setSelectedDisciplineId(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="" disabled>Selecione uma matéria</option>
                                    {uniqueDisciplines.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Duração (minutos)</label>
                                <input
                                    type="number"
                                    min="15"
                                    step="15"
                                    value={sessionDuration}
                                    onChange={e => setSessionDuration(Number(e.target.value))}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <button
                                onClick={handleAddSession}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-500/50"
                                disabled={!selectedDisciplineId || sessionDuration <= 0}
                            >
                                <PlusIcon className="w-5 h-5" />
                                Adicionar
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-900/50 p-6 rounded-lg">
                        <h3 className="text-xl font-bold mb-4 text-white">Resumo Semanal</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-gray-300">Meta de Horas</label>
                                <input
                                    type="number"
                                    value={weeklyHours}
                                    onChange={e => setWeeklyHours(Number(e.target.value))}
                                    className="w-24 bg-gray-700 border border-gray-600 text-right rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex justify-between items-center text-gray-300">
                                <span>Tempo Planejado:</span>
                                <span className="font-bold text-white">{formatMinutes(totalPlannedMinutes)}</span>
                            </div>
                            <div className={`flex justify-between items-center ${remainingMinutes < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                <span>Tempo Restante:</span>
                                <span className="font-bold">{formatMinutes(remainingMinutes)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Session List */}
                <div>
                    <h3 className="text-xl font-bold mb-4 text-white">Sequência de Estudos ({sessions.length})</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg h-[60vh] overflow-y-auto space-y-3">
                         {sessions.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500 text-center">Adicione sua primeira sessão de estudo.</p>
                            </div>
                        ) : (
                            sessions.map((session, index) => (
                                <div key={session.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center animate-fade-in border-l-4" style={{borderColor: session.disciplineColor}}>
                                    <div>
                                        <p className="font-bold text-white">{session.disciplineName}</p>

                                        <p className="text-sm text-gray-400">{session.totalTime} minutos</p>
                                    </div>
                                    <button onClick={() => handleRemoveSession(session.id)} className="text-red-500 hover:text-red-400 p-1 rounded-full">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

             <div className="flex justify-between items-center mt-10">
                <button
                    onClick={onBack}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={() => onSave(sessions, weeklyHours)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-500/50 disabled:cursor-not-allowed"
                    disabled={sessions.length === 0}
                >
                    Salvar Ciclo
                </button>
            </div>
        </div>
    );
};

export default ManualCycleCreator;