import * as React from 'react';
import { XIcon, ClockIcon, BookIcon, QuestionMarkCircleIcon } from '../constants';
import { HistoryLog } from '../types';
import { parseTimeToMinutes } from '../src/utils/timeUtils'; // UPDATED IMPORT PATH

interface DailyStudyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date | null;
    dailyLogs: HistoryLog[];
}

const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0min';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
};

const DailyStudyDetailModal: React.FC<DailyStudyDetailModalProps> = ({ isOpen, onClose, selectedDate, dailyLogs }) => {
    if (!isOpen || !selectedDate) return null;

    const totalStudyMinutes = dailyLogs.reduce((sum, log) => sum + parseTimeToMinutes(log.time), 0);
    const formattedDate = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg text-white transform transition-all flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center border-b border-gray-700 pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-emerald-400">{formattedDate}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon /></button>
                </header>

                <main className="flex-grow overflow-y-auto pr-4 space-y-4">
                    <div className="bg-gray-700/50 p-4 rounded-lg flex items-center justify-between">
                        <span className="text-gray-300 font-semibold flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-emerald-400" />
                            Total de Horas Estudadas:
                        </span>
                        <span className="text-xl font-bold text-white">{formatTime(totalStudyMinutes)}</span>
                    </div>

                    {dailyLogs.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Nenhum estudo registrado para este dia.</p>
                    ) : (
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-white mt-6">Detalhes dos Estudos:</h3>
                            {dailyLogs.map((log, index) => (
                                <div key={log.id || index} className="bg-gray-700/50 rounded-lg p-4 border-l-4" style={{ borderColor: (log as any).disciplineColor || '#8884d8' }}>
                                    <p className="font-bold text-white flex items-center gap-2">
                                        <BookIcon className="w-5 h-5" style={{ color: (log as any).disciplineColor || '#8884d8' }} />
                                        {(log as any).disciplineName || 'Disciplina Desconhecida'}
                                    </p>
                                    <p className="text-sm text-gray-400 ml-7">{log.topic}</p>
                                    <div className="flex items-center justify-between text-sm text-gray-300 mt-3 ml-7">
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4" /> {log.time}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <QuestionMarkCircleIcon className="w-4 h-4" /> {(Number(log.correct) || 0) + (Number(log.incorrect) || 0)} questões ({Number(log.correct) || 0} certas)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                <footer className="flex justify-end items-center mt-6 pt-4 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default DailyStudyDetailModal;