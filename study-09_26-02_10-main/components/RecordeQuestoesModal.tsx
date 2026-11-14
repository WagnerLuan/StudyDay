import * as React from 'react';
import { XIcon, ClockIcon, QuestionMarkCircleIcon, BookIcon, CheckIcon, XMarkIcon } from '../constants';

export interface RecordDaySession {
    id: string;
    disciplineName: string;
    disciplineColor: string;
    topic: string;
    questions: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    minutes: number;
    sourceType: 'estudo' | 'simulado';
}

export interface RecordDayDetails {
    dateStr: string; // YYYY-MM-DD
    totalQuestions: number;
    totalCorrect: number;
    totalIncorrect: number;
    accuracy: number;
    totalMinutes: number;
    sessions: RecordDaySession[];
}

interface RecordeQuestoesModalProps {
    isOpen: boolean;
    onClose: () => void;
    recordData: RecordDayDetails | null;
    recordCount: number;
    planName?: string | null;
}

const formatStudyTime = (minutes: number): string => {
    if (!minutes || minutes < 1) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
};

const formatFullPortugueseDate = (dateStr: string): string => {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const getAccuracyBadgeClasses = (accuracy: number): string => {
    if (accuracy >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (accuracy >= 60) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
};

const RecordeQuestoesModal: React.FC<RecordeQuestoesModalProps> = ({
    isOpen,
    onClose,
    recordData,
    recordCount,
    planName,
}) => {
    if (!isOpen) return null;

    const hasRecord = Boolean(recordData && recordData.totalQuestions > 0 && recordCount > 0);
    const displayedTotalQuestions = recordData?.totalQuestions || recordCount || 0;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 border border-gray-700/80 rounded-2xl shadow-2xl w-full max-w-2xl text-white flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-5 sm:p-6 flex justify-between items-start gap-4 border-b border-gray-700/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xl">
                            ⚡
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold text-white">Detalhes do Recorde Diário</h2>
                                {planName && (
                                    <span className="text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                        {planName}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Seu dia com maior volume de questões resolvidas
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
                        aria-label="Fechar modal"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="p-5 sm:p-6 overflow-y-auto space-y-6">
                    {!hasRecord ? (
                        <div className="bg-gray-900/50 border border-gray-700/60 rounded-xl p-8 text-center space-y-3">
                            <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
                                🎯
                            </div>
                            <h3 className="text-lg font-bold text-white">
                                Nenhuma questão registrada ainda
                            </h3>
                            <p className="text-sm text-gray-400 max-w-md mx-auto">
                                Registre seu primeiro estudo com questões resolvidas ou realize um simulado para começar a construir seu recorde diário!
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* 1. Resumo do Dia Recorde */}
                            <div className="bg-gray-900/60 border border-cyan-500/25 rounded-xl p-5 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700/60 pb-3">
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                                            Data do Recorde
                                        </span>
                                        <p className="text-base sm:text-lg font-bold text-white capitalize mt-0.5">
                                            {formatFullPortugueseDate(recordData!.dateStr)}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                                        🏆 {displayedTotalQuestions} {displayedTotalQuestions === 1 ? 'questão' : 'questões'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-gray-800/80 border border-gray-700/60 rounded-lg p-3">
                                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                            Total
                                        </span>
                                        <p className="text-xl font-black text-white mt-1">
                                            {displayedTotalQuestions}
                                        </p>
                                        <span className="text-[11px] text-gray-400">questões</span>
                                    </div>

                                    <div className="bg-gray-800/80 border border-gray-700/60 rounded-lg p-3">
                                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                            Desempenho
                                        </span>
                                        <p className="text-xl font-black text-emerald-400 mt-1">
                                            {recordData!.accuracy.toFixed(1)}%
                                        </p>
                                        <span className="text-[11px] text-gray-400">aproveitamento</span>
                                    </div>

                                    <div className="bg-gray-800/80 border border-gray-700/60 rounded-lg p-3">
                                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                            Acertos / Erros
                                        </span>
                                        <div className="flex items-center gap-2 mt-1.5 text-sm font-bold">
                                            <span className="inline-flex items-center gap-1 text-emerald-400">
                                                <CheckIcon className="w-3.5 h-3.5" />
                                                {recordData!.totalCorrect}
                                            </span>
                                            <span className="text-gray-600">/</span>
                                            <span className="inline-flex items-center gap-1 text-pink-400">
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                                {recordData!.totalIncorrect}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-gray-400">respostas</span>
                                    </div>

                                    <div className="bg-gray-800/80 border border-gray-700/60 rounded-lg p-3">
                                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                            Tempo Estudado
                                        </span>
                                        <p className="text-xl font-black text-white mt-1 flex items-center gap-1.5">
                                            <ClockIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                            {formatStudyTime(recordData!.totalMinutes)}
                                        </p>
                                        <span className="text-[11px] text-gray-400">no dia</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Assuntos / Sessões Relacionadas */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                                        Assuntos / Sessões Relacionadas ({recordData!.sessions.length})
                                    </h3>
                                </div>

                                <div className="space-y-2.5">
                                    {recordData!.sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="bg-gray-900/50 border border-gray-700/60 rounded-xl p-4 border-l-4 transition-colors"
                                            style={{ borderLeftColor: session.disciplineColor || '#06b6d4' }}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <BookIcon
                                                            className="w-4 h-4 flex-shrink-0"
                                                            style={{ color: session.disciplineColor || '#06b6d4' }}
                                                        />
                                                        <span className="font-bold text-white text-sm truncate">
                                                            {session.disciplineName}
                                                        </span>
                                                        {session.sourceType === 'simulado' && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                                Simulado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-300 mt-1 ml-6 break-words">
                                                        {session.topic}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3 ml-6 sm:ml-0 flex-shrink-0">
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-200">
                                                            <QuestionMarkCircleIcon className="w-3.5 h-3.5 text-cyan-400" />
                                                            <span>
                                                                {session.questions}{' '}
                                                                {session.questions === 1 ? 'questão' : 'questões'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-400">
                                                            {session.correct} acertos • {session.incorrect} erros
                                                        </p>
                                                    </div>

                                                    {session.questions > 0 ? (
                                                        <span
                                                            className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${getAccuracyBadgeClasses(session.accuracy)}`}
                                                        >
                                                            {session.accuracy.toFixed(1)}%
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-700/70 text-gray-400 border border-gray-600/60">
                                                            —
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </main>

                <footer className="flex justify-end items-center p-4 sm:p-5 border-t border-gray-700/80 bg-gray-800/60">
                    <button
                        type="button"
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

export default RecordeQuestoesModal;
