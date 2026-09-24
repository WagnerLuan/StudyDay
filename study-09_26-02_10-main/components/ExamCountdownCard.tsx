"use client";

import * as React from 'react';
import Card from './Card';
import { PlusIcon, CalendarIcon, EditIcon, TrashIcon } from '../constants';
import { Exam } from '../types';

interface ExamCountdownCardProps {
    exams: Exam[];
    onAddClick: () => void;
    onEditClick: (exam: Exam) => void;
    onDeleteClick: (examId: string) => void;
}

const ExamCountdownCard: React.FC<ExamCountdownCardProps> = ({ exams, onAddClick, onEditClick, onDeleteClick }) => {
    const nextExam = React.useMemo(() => {
        if (exams.length === 0) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return [...exams]
            .filter(e => new Date(e.date + 'T12:00:00') >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    }, [exams]);

    const daysRemaining = React.useMemo(() => {
        if (!nextExam) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const examDate = new Date(nextExam.date + 'T12:00:00');
        const diffTime = examDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [nextExam]);

    return (
        <Card className="h-full relative flex flex-col justify-center border-l-4 border-blue-500 group">
            {nextExam ? (
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-grow">
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Próxima Prova</h3>
                        <p className="text-xl font-bold text-white truncate max-w-[180px]">{nextExam.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-gray-400 text-xs font-bold">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(nextExam.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Ações de Gerenciamento - Visíveis apenas no Hover */}
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button 
                                onClick={onAddClick}
                                className="p-1.5 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                                title="Adicionar Nova Prova"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => onEditClick(nextExam)}
                                className="p-1.5 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                title="Editar Prova Atual"
                            >
                                <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => onDeleteClick(nextExam.id)}
                                className="p-1.5 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                title="Excluir Prova Atual"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Contador de Dias */}
                        <div className="flex flex-col items-center bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20 min-w-[80px]">
                            <span className="text-3xl font-black text-blue-400">{daysRemaining}</span>
                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">Dias</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-2">
                    <p className="text-gray-500 text-sm font-bold">Nenhuma prova agendada</p>
                    <button 
                        onClick={onAddClick}
                        className="text-blue-400 text-xs font-black uppercase tracking-widest mt-2 hover:text-blue-300 flex items-center justify-center gap-2 mx-auto"
                    >
                        <PlusIcon className="w-3 h-3" />
                        Agendar Agora
                    </button>
                </div>
            )}
        </Card>
    );
};

export default ExamCountdownCard;