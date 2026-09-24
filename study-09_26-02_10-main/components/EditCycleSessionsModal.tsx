import * as React from 'react';
import { StudySession, GeneratedCycle, StudyPlan, Discipline } from '../types';
import { XIcon, ClockIcon, TrashIcon, PlusCircleIcon } from '../constants';

interface EditCycleSessionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedSessions: StudySession[]) => void;
    cycle: GeneratedCycle | null;
    plans: StudyPlan[]; // NEW PROP: Full list of plans
}

const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

const EditCycleSessionsModal: React.FC<EditCycleSessionsModalProps> = ({ isOpen, onClose, onSave, cycle, plans }) => {
    const [editableSessions, setEditableSessions] = React.useState<StudySession[]>([]);
    const [showAddDisciplineSection, setShowAddDisciplineSection] = React.useState(false);
    const [selectedDisciplineToAddId, setSelectedDisciplineToAddId] = React.useState<string>('');

    // --- Mover todos os Hooks para o topo, antes do return condicional ---

    const currentCyclePlan = React.useMemo(() => {
        // Apenas tenta encontrar o plano se 'cycle' estiver definido
        if (!cycle) return null; 
        return plans.find(p => p.id === cycle.planId);
    }, [plans, cycle]); // Depende de 'plans' e 'cycle'

    const allDisciplinesInPlan = React.useMemo(() => currentCyclePlan?.disciplines || [], [currentCyclePlan]);

    const availableDisciplinesToAdd = React.useMemo(() => {
        const existingDisciplineIds = new Set(editableSessions.map(s => s.disciplineId));
        return allDisciplinesInPlan.filter(d => !existingDisciplineIds.has(d.id));
    }, [editableSessions, allDisciplinesInPlan]);

    React.useEffect(() => {
        if (isOpen && cycle) {
            // Combine pending and completed sessions for editing
            const allSessions = [...cycle.studySequence, ...cycle.completedStudies];
            // Sort by discipline name for better organization
            allSessions.sort((a, b) => a.disciplineName.localeCompare(b.disciplineName));
            setEditableSessions(allSessions);
            setShowAddDisciplineSection(false); // Reset add section visibility
            setSelectedDisciplineToAddId(''); // Reset selected discipline for add
        }
    }, [isOpen, cycle]);

    // --- O return condicional agora vem depois de todos os Hooks ---
    if (!isOpen || !cycle) return null;

    const handleTimeChange = (sessionId: string, newTime: number) => {
        setEditableSessions(prev =>
            prev.map(session =>
                session.id === sessionId ? { ...session, totalTime: Math.max(0, newTime) } : session
            )
        );
    };

    const handleAdjustTime = (sessionId: string, adjustment: number) => {
        setEditableSessions(prev =>
            prev.map(session =>
                session.id === sessionId ? { ...session, totalTime: Math.max(0, session.totalTime + adjustment) } : session
            )
        );
    };

    const handleRemoveSession = (sessionId: string) => {
        setEditableSessions(prev => prev.filter(session => session.id !== sessionId));
    };

    const handleSave = () => {
        onSave(editableSessions);
        onClose();
    };

    const totalPlannedMinutes = editableSessions.reduce((sum, s) => sum + s.totalTime, 0);

    const handleAddDiscipline = () => {
        if (!selectedDisciplineToAddId) return;

        const disciplineToAdd = allDisciplinesInPlan.find(d => d.id === selectedDisciplineToAddId);
        if (!disciplineToAdd) return;

        const newSession: StudySession = {
            id: `manual-added-${Date.now()}-${Math.random()}`, // Unique ID for new session
            disciplineName: disciplineToAdd.name,
            disciplineColor: disciplineToAdd.color,
            totalTime: 0, // Starts with 0 minutes as requested
            studiedTime: 0,
            status: 'Pendente',
            planId: cycle.planId,
            disciplineId: disciplineToAdd.id,
        };

        setEditableSessions(prev => [...prev, newSession].sort((a, b) => a.disciplineName.localeCompare(b.disciplineName)));
        setSelectedDisciplineToAddId('');
        setShowAddDisciplineSection(false);
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-3xl text-white transform transition-all flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center border-b border-gray-700 pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-emerald-400">Editar Tempos do Ciclo</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon /></button>
                </header>

                <main className="flex-grow overflow-y-auto pr-4 space-y-4">
                    {editableSessions.length === 0 ? (
                        <p className="text-gray-500 text-center">Nenhuma sessão para editar.</p>
                    ) : (
                        editableSessions.map(session => (
                            <div key={session.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between border-l-4" style={{ borderColor: session.disciplineColor }}>
                                <div className="flex-grow">
                                    <h4 className="font-bold text-white">{session.disciplineName}</h4>
                                    <p className="text-sm text-gray-400">{session.topicName || 'Sessão de Estudo'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleAdjustTime(session.id, -5)}
                                        className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded-md text-sm transition-colors"
                                        aria-label="Diminuir 5 minutos"
                                    >
                                        -5
                                    </button>
                                    <input
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={session.totalTime}
                                        onChange={(e) => handleTimeChange(session.id, Number(e.target.value))}
                                        className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <button
                                        onClick={() => handleAdjustTime(session.id, 5)}
                                        className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded-md text-sm transition-colors"
                                        aria-label="Aumentar 5 minutos"
                                    >
                                        +5
                                    </button>
                                    <span className="text-gray-400">min</span>
                                    <button
                                        onClick={() => handleRemoveSession(session.id)}
                                        className="text-red-500 hover:text-red-400 p-1 rounded-full ml-2"
                                        aria-label="Excluir disciplina do ciclo"
                                        title="Excluir"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add New Discipline Section */}
                    <div className="mt-6 pt-4 border-t border-gray-700">
                        {!showAddDisciplineSection ? (
                            <button
                                onClick={() => setShowAddDisciplineSection(true)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                disabled={availableDisciplinesToAdd.length === 0}
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                Adicionar Disciplina
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <select
                                    value={selectedDisciplineToAddId}
                                    onChange={(e) => setSelectedDisciplineToAddId(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="" disabled>Selecione uma disciplina</option>
                                    {availableDisciplinesToAdd.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowAddDisciplineSection(false)}
                                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddDiscipline}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                        disabled={!selectedDisciplineToAddId}
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        )}
                        {availableDisciplinesToAdd.length === 0 && showAddDisciplineSection && (
                            <p className="text-gray-500 text-center mt-4">Todas as disciplinas do plano já estão no ciclo.</p>
                        )}
                    </div>
                </main>

                <footer className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
                    <p className="text-lg font-bold text-white">Total Planejado: <span className="text-emerald-400">{formatTime(totalPlannedMinutes)}</span></p>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default EditCycleSessionsModal;