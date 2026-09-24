"use client";

import * as React from 'react';
import { XIcon, ChevronDownIcon, CheckIcon } from '../constants';

interface MultiSelectCategoryProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
}

const MultiSelectCategory: React.FC<MultiSelectCategoryProps> = ({ options, selected, onChange, label }) => {
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

    const toggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const removeOption = (e: React.MouseEvent, option: string) => {
        e.stopPropagation();
        onChange(selected.filter(item => item !== option));
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">{label}</label>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[42px] w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 cursor-pointer flex flex-wrap gap-2 items-center justify-between"
            >
                <div className="flex flex-wrap gap-1.5">
                    {selected.length > 0 ? (
                        selected.map(item => (
                            <span key={item} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                {item}
                                <button onClick={(e) => removeOption(e, item)} className="hover:text-white">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-500 text-sm">Selecione...</span>
                    )}
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {options.map(option => (
                        <div 
                            key={option}
                            onClick={() => toggleOption(option)}
                            className="px-4 py-2.5 hover:bg-gray-700 flex items-center justify-between cursor-pointer transition-colors"
                        >
                            <span className={`text-sm ${selected.includes(option) ? 'text-emerald-400 font-bold' : 'text-gray-300'}`}>
                                {option}
                            </span>
                            {selected.includes(option) && <CheckIcon className="w-4 h-4 text-emerald-500" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MultiSelectCategory;