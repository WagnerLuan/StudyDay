"use client";

import * as React from 'react';
import { StudyBlock, Discipline } from '../types';
import { ClockIcon, CheckIcon, XMarkIcon } from '../constants';

interface StudyBlockCardProps {
    block: StudyBlock;
    discipline: Discipline;
    onClick: () => void;
    onComplete: () => void;
    isCompletedOnDate: boolean;
    isMissed: boolean;
}

const StudyBlockCard: React.FC<StudyBlockCardProps> = ({ block, discipline, onClick, onComplete, isCompletedOnDate, isMissed }) => {
    // Função para limpar e formatar as categorias
    const categories = React.useMemo(() => {
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
    }, [block.type]);

    return (
        <div 
            className={`group relative p-3.5 rounded-xl border-l-[6px] shadow-md transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer flex flex-col gap-2.5 ${
                isCompletedOnDate 
                    ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20' 
                    : isMissed
                        ? 'bg-red-500/10 border-red-500/40 ring-1 ring-red-500/20'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
            style={{ borderLeftColor: discipline.color }}
            onClick={onClick}
        >
            {/* Header: Discipline Name */}
            <div className="flex justify-between items-start gap-2">
                <h4 className={`font-bold text-[13px] leading-tight line-clamp-2 flex-grow ${
                    isCompletedOnDate ? 'text-emerald-400' : isMissed ? 'text-red-400' : 'text-white'
                }`}>
                    {discipline.name}
                </h4>
                {isCompletedOnDate && (
                    <div className="bg-emerald-500 rounded-full p-0.5 shadow-lg shadow-emerald-500/40">
                        <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                )}
                {isMissed && !isCompletedOnDate && (
                    <div className="bg-red-500 rounded-full p-0.5 shadow-lg shadow-red-500/40">
                        <XMarkIcon className="w-3 h-3 text-white" />
                    </div>
                )}
            </div>
            
            {/* Categories as Badges */}
            <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                    <span key={cat} className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider border ${
                        isCompletedOnDate 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : isMissed
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : 'bg-gray-700/50 text-emerald-400 border-emerald-500/20'
                    }`}>
                        {cat}
                    </span>
                ))}
            </div>

            {/* Info: Time & Duration */}
            <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-2.5 text-[10px] font-bold text-gray-400">
                    <div className="flex items-center gap-1">
                        <ClockIcon className={`w-3 h-3 ${
                            isCompletedOnDate ? 'text-emerald-400' : isMissed ? 'text-red-400' : 'text-emerald-500'
                        }`} />
                        <span>{block.duration_minutes} min</span>
                    </div>
                    {block.start_time && (
                        <div className={`px-1.5 py-0.5 rounded border ${
                            isCompletedOnDate 
                                ? 'bg-emerald-900/30 border-emerald-500/20 text-emerald-400' 
                                : isMissed
                                    ? 'bg-red-900/30 border-red-500/20 text-red-400'
                                    : 'bg-gray-900/50 border-gray-700 text-gray-300'
                        }`}>
                            {block.start_time}
                        </div>
                    )}
                </div>
                
                {isCompletedOnDate && (
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Concluído</span>
                )}
                {isMissed && !isCompletedOnDate && (
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Não Realizado</span>
                )}
            </div>

            {/* Observation Summary */}
            {block.name && (
                <p className="text-[10px] text-gray-500 italic line-clamp-1 border-t border-gray-700/50 pt-2">
                    {block.name}
                </p>
            )}

            {/* Quick Action: Complete (Visible on Hover) */}
            {!isCompletedOnDate && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onComplete(); }}
                    className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center w-7 h-7 bg-emerald-500 text-white rounded-full shadow-xl hover:bg-emerald-600 transition-all transform hover:scale-110 z-10"
                    title="Concluir Estudo"
                >
                    <CheckIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default StudyBlockCard;