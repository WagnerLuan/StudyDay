import * as React from 'react';
import { StudySession, StudyPlan } from '../types';
import { PlayIcon, PauseIcon, PlusIcon, RestartIcon, XIcon } from '../constants';

interface StudyTimerModalProps {
    isOpen: boolean;
    onClose: () => void;
    displayTime: number;
    timerState: any;
    plans: StudyPlan[];
    onStart: (context: any, mode: any, duration: number) => void;
    onPause: () => void;
    onResume: () => void;
    onReset: (duration?: number) => void;
    onLog: (elapsedTime: string, disciplineId: string, topicId: string, planId: string, revisionId?: string) => void;
    onUpdateContext: (context: any) => void;
    onSetMode: (mode: 'cronometro' | 'timer') => void;
}

const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const StudyTimerModal: React.FC<StudyTimerModalProps> = ({ 
    isOpen, onClose, displayTime, timerState, plans, 
    onStart, onPause, onResume, onReset, onLog, onUpdateContext, onSetMode
}) => {
    const [timerInput, setTimerInput] = React.useState('30:00');
    
    const allDisciplines = React.useMemo(() => {
        return plans.flatMap(plan => 
            plan.disciplines.map(disc => ({...disc, planId: plan.id, planName: plan.name}))
        );
    }, [plans]);

    const filteredDisciplines = React.useMemo(() => {
        if (!timerState.context.planId) return allDisciplines;
        return allDisciplines.filter(d => d.planId === timerState.context.planId);
    }, [allDisciplines, timerState.context.planId]);

    const selectedDiscipline = React.useMemo(() => 
        allDisciplines.find(d => d.id === timerState.context.disciplineId), 
    [allDisciplines, timerState.context.disciplineId]);

    const availableTopics = React.useMemo(() => selectedDiscipline?.topicsList || [], [selectedDiscipline]);

    if (!isOpen) return null;

    const handleStartClick = () => {
        if (timerState.mode === 'timer') {
            const parts = timerInput.split(':').map(Number);
            let seconds = 0;
            if (parts.length === 2) {
                seconds = (parts[0] || 0) * 60 + (parts[1] || 0);
            } else if (parts.length === 3) {
                seconds = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
            }
            
            if (seconds <= 0) {
                alert('Por favor, insira um tempo válido.');
                return;
            }
            onStart(timerState.context, 'timer', seconds);
        } else {
            onStart(timerState.context, 'cronometro', 0);
        }
    };

    const handleLogClick = () => {
        const { planId, disciplineId, topicId, revisionId } = timerState.context;
        if (!planId || !disciplineId || !topicId) {
            alert('Por favor, selecione um plano, disciplina e tópico.');
            return;
        }
        
        // Calcular o tempo real decorrido para o log
        let actualElapsed = displayTime;
        if (timerState.mode === 'timer') {
            actualElapsed = timerState.timerDuration - displayTime;
        }

        onLog(formatTime(actualElapsed), disciplineId, topicId, planId, revisionId);
    };

    const updateContext = (updates: any) => {
        onUpdateContext({ ...timerState.context, ...updates });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-gray-800/90 border border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-4xl text-white transform transition-all relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XIcon className="w-6 h-6" />
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold truncate pr-4">{selectedDiscipline?.name || 'Sessão de Estudo'}</h2>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <select 
                             value={timerState.context.planId || ''}
                             onChange={(e) => {
                                 const planId = e.target.value;
                                 updateContext({ 
                                     planId: planId || null, 
                                     disciplineId: null, 
                                     topicId: null 
                                 });
                             }}
                            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm max-w-[150px]"
                        >
                             <option value="">Todos os Planos</option>
                             {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select 
                             value={timerState.context.disciplineId || ''}
                             onChange={(e) => {
                                 const disc = allDisciplines.find(d => d.id === e.target.value);
                                 if (disc) {
                                     updateContext({ 
                                         planId: disc.planId, 
                                         disciplineId: disc.id, 
                                         topicId: disc.topicsList?.[0]?.id || null 
                                     });
                                 }
                             }}
                            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm max-w-[180px]"
                        >
                             <option value="" disabled>Disciplina</option>
                             {filteredDisciplines.map(d => (
                                 <option key={d.id} value={d.id}>
                                     {d.name} {!timerState.context.planId && `(${d.planName})`}
                                 </option>
                             ))}
                        </select>
                        <select
                            value={timerState.context.topicId || ''}
                            onChange={(e) => updateContext({ topicId: e.target.value })}
                            disabled={!timerState.context.disciplineId || availableTopics.length === 0}
                            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm max-w-[180px]"
                        >
                            <option value="" disabled>Tópico</option>
                            {availableTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="text-center my-8 relative">
                    <div className="flex justify-center items-center gap-4 mb-6">
                        <button 
                            onClick={() => onSetMode('cronometro')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all ${timerState.mode === 'cronometro' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            CRONÔMETRO
                        </button>
                        <button 
                            onClick={() => onSetMode('timer')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all ${timerState.mode === 'timer' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            TIMER
                        </button>
                    </div>
                    
                    {timerState.mode === 'timer' && !timerState.isActive && (
                         <div className="flex flex-col justify-center items-center mb-6 animate-fade-in">
                            <label className="text-xs font-bold text-emerald-400 uppercase mb-2">Definir Tempo (MM:SS ou HH:MM:SS)</label>
                            <input
                                type="text"
                                value={timerInput}
                                onChange={(e) => setTimerInput(e.target.value)}
                                className="bg-gray-700 border border-gray-600 text-center text-3xl font-mono w-48 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="30:00"
                            />
                        </div>
                    )}
                    
                    <div className="relative inline-block">
                        <p className="text-8xl font-mono font-bold tracking-widest text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                            {formatTime(displayTime)}
                        </p>
                        {timerState.mode === 'timer' && timerState.isActive && (
                            <div className="absolute -bottom-4 left-0 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 transition-all duration-1000" 
                                    style={{ width: `${(displayTime / timerState.timerDuration) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-center items-center gap-6 mt-12">
                     <button 
                        onClick={() => onReset()}
                        className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-gray-600 transition-colors"
                        title="Reiniciar"
                    >
                       <RestartIcon className="w-8 h-8"/>
                    </button>
                    <button 
                        onClick={!timerState.isActive ? handleStartClick : (timerState.isPaused ? onResume : onPause)}
                        className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-600 transition-colors transform hover:scale-105 active:scale-95"
                    >
                        {!timerState.isActive || timerState.isPaused ? <PlayIcon className="w-8 h-8" /> : <PauseIcon className="w-8 h-8" />}
                    </button>
                    <button 
                        onClick={handleLogClick}
                        className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={!timerState.isActive || !timerState.context.topicId}
                        title="Registrar Estudo"
                    >
                       <PlusIcon className="w-8 h-8" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudyTimerModal;