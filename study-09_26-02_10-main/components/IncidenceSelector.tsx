"use client";

import * as React from 'react';
import { TopicIncidence } from '../types';
import { CheckIcon } from '../constants';

export const INCIDENCE_LEVELS: TopicIncidence[] = ['Muito Alta', 'Alta', 'Média', 'Baixa', 'Muito Baixa'];

export const INCIDENCE_CONFIG = {
    'Muito Alta': { color: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/30', bg: 'bg-red-500/10', icon: '🔥', weight: 5 },
    'Alta': { color: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500/30', bg: 'bg-orange-500/10', icon: '🟠', weight: 4 },
    'Média': { color: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', icon: '🟡', weight: 3 },
    'Baixa': { color: 'bg-green-500', text: 'text-green-500', border: 'border-green-500/30', bg: 'bg-green-500/10', icon: '🟢', weight: 2 },
    'Muito Baixa': { color: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30', bg: 'bg-gray-500/10', icon: '⚪', weight: 1 },
};

interface IncidenceSelectorProps {
    value?: TopicIncidence;
    onSelect: (value: TopicIncidence) => void;
}

const IncidenceSelector: React.FC<IncidenceSelectorProps> = ({ value = 'Média', onSelect }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (level: TopicIncidence) => {
        if (level !== value) {
            onSelect(level);
        }
        setIsOpen(false);
    };

    const currentConfig = INCIDENCE_CONFIG[value];

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border} transition-all hover:scale-105 active:scale-95 whitespace-nowrap`}
                title="Alterar Incidência"
            >
                {value}
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-[130px] overflow-hidden animate-fade-in">
                    {INCIDENCE_LEVELS.map((level) => {
                        const config = INCIDENCE_CONFIG[level];
                        const isSelected = level === value;
                        return (
                            <button
                                key={level}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(level);
                                }}
                                className={`w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-gray-700 flex items-center justify-between transition-colors ${config.text} ${isSelected ? 'bg-gray-700/50' : ''}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span>{config.icon}</span>
                                    {level}
                                </span>
                                {isSelected && <CheckIcon className="w-3 h-3" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default IncidenceSelector;