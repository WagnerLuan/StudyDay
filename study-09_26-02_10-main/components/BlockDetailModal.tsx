"use client";

import * as React from 'react';
import { XIcon, ClockIcon, CalendarIcon, EditIcon, TrashIcon, CheckIcon, XMarkIcon, FileTextIcon, LinkIcon } from '../constants';
import { StudyBlock, Discipline } from '../types';
import CopyBlockModal from './CopyBlockModal';

interface BlockDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    block: StudyBlock | null;
    discipline: Discipline | null;
    isCompleted: boolean;
    isMissed: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onComplete: () => void;
    onCopy: (block: StudyBlock, targetDate: string) => void;
}

const BlockDetailModal: React.FC<BlockDetailModalProps> = ({ isOpen, onClose, block, discipline, isCompleted, isMissed, onEdit, onDelete, onComplete, onCopy }) => {
    const [isCopyModalOpen, setIsCopyModalOpen] = React.useState(false);

    const categories = React.useMemo(() => {
        if (!block) return [];
        let rawType = block.type;
        let parsed: string[] = [];

        if (Array.isArray(rawType)) {
            parsed = rawType;
        } else if (typeof rawType === 'string') {
            if (rawType.startsWith('[') && rawType.endsWith(']')) {
                try {
                    parsed = JSON.parse(rawType);
                } catch (e) {
                    parsed = rawType.replace(/[\[\]"]/g, '').split(',').map(c => c.trim());
                }
            } else {
                parsed = rawType.split(',').map(c => c.trim());
            }
        }
        return parsed.map(c => c.replace(/"/g, '')).filter(c => c !== '');
    }, [block?.type]);

    const topicObj = React.useMemo(() => {
        if (!block || !discipline?.topicsList) return null;
        if (block.topic_id) {
            const found = discipline.topicsList.find(t => t.id === block.topic_id);
            if (found) return found;
        }
        if (block.topic_name) {
            const found = discipline.topicsList.find(t => t.name === block.topic_name);
            if (found) return found;
        }
        return null;
    }, [block, discipline]);

    const topicDisplay = React.useMemo(() => {
        if (topicObj) return topicObj.name;
        if (block?.topic_name) return block.topic_name;
        return null;
    }, [topicObj, block]);

    const questionLink = topicObj?.questionLink;

    if (!isOpen || !block || !discipline) return null;

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    const handleCopyClick = () => {
        setIsCopyModalOpen(true);
    };

    const handleCopyConfirm = (newBlock: Partial<StudyBlock>) => {
        if (newBlock.specific_date) {
            onCopy(block, newBlock.specific_date);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
                <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg text-white transform transition-all overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                    {/* Header with Discipline Color */}
                    <div className="h-3 w-full" style={{ backgroundColor: discipline.color }}></div>
                    
                    <header className="p-6 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black text-white leading-tight">{discipline.name}</h2>
                            <div className="flex items-center gap-2 mt-2 text-emerald-400 font-bold uppercase text-xs tracking-widest">
                                <CalendarIcon className="w-4 h-4" />
                                {dayNames[block.day_of_week]}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </header>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-3 px-6">
                        {isCompleted ? (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                                <CheckIcon className="w-4 h-4" />
                                ESTUDO CONCLUÍDO
                            </div>
                        ) : isMissed ? (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm bg-red-500 text-white shadow-lg shadow-red-500/20">
                                <XMarkIcon className="w-4 h-4" />
                                NÃO REALIZADO
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                PENDENTE
                            </div>
                        )}
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 px-6 mt-4">
                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Duração</p>
                            <div className="flex items-center gap-2 text-xl font-bold text-white">
                                <ClockIcon className="w-5 h-5 text-emerald-500" />
                                {block.duration_minutes} min
                            </div>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Horário</p>
                            <div className="flex items-center gap-2 text-xl font-bold text-white">
                                <ClockIcon className="w-5 h-5 text-blue-500" />
                                {block.start_time || '--:--'}
                            </div>
                        </div>
                    </div>
                    
                    {/* Categories */}
                    <div className="px-6 mt-4">
                        <p className="text-gray-400 text-[10px] font-bold uppercase mb-3 tracking-widest">Categorias de Estudo</p>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <span key={cat} className={`px-4 py-1.5 text-sm font-bold rounded-full border ${
                                    isCompleted 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                    : isMissed
                                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}>
                                    {cat}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Topic Name */}
                    {topicDisplay && (
                        <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700 mx-6 mt-4">
                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1.5 tracking-widest flex items-center gap-1.5">
                                <FileTextIcon className="w-3.5 h-3.5 text-emerald-400" />
                                Tópico de Estudo
                            </p>
                            {questionLink ? (
                                <a 
                                    href={questionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 text-sm font-bold leading-relaxed hover:underline inline-flex items-center gap-2 group/link"
                                >
                                    <span>{topicDisplay}</span>
                                    <LinkIcon className="w-3.5 h-3.5 opacity-80 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                                </a>
                            ) : (
                                <p className="text-emerald-400 text-sm font-bold leading-relaxed">
                                    {topicDisplay}
                                </p>
                            )}
                        </div>
                    )}
                    
                    {/* Observations */}
                    {block.name && (
                        <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700 mx-6 mt-4">
                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-2 tracking-widest">Observações</p>
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                                "{block.name}"
                            </p>
                        </div>
                    )}
                    
                    {/* Footer Actions */}
                    <footer className="p-6 bg-gray-900/50 border-t border-gray-700 flex flex-wrap gap-3 mt-6">
                        {!isCompleted && (
                            <button 
                                onClick={onComplete}
                                className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <CheckIcon className="w-5 h-5" />
                                CONCLUIR ESTUDO
                            </button>
                        )}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={onEdit}
                                className="flex-1 sm:flex-none bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-5 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <EditIcon className="w-5 h-5" />
                                Editar
                            </button>
                            <button 
                                onClick={onDelete}
                                className="flex-1 sm:flex-none bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-bold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 border border-red-600/30"
                            >
                                <TrashIcon className="w-5 h-5" />
                                Excluir
                            </button>
                            <button 
                                onClick={handleCopyClick}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/50"
                            >
                                <CheckIcon className="w-5 h-5" />
                                Copiar Bloco
                            </button>
                        </div>
                    </footer>
                </div>
            </div>

            <CopyBlockModal
                isOpen={isCopyModalOpen}
                onClose={() => setIsCopyModalOpen(false)}
                block={block}
                onConfirm={handleCopyConfirm}
            />
        </>
    );
};

export default BlockDetailModal;