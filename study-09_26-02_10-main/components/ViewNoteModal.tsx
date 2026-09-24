"use client";

import * as React from 'react';
import { XIcon, CalendarIcon, BookIcon } from '../constants';
import { Note, Discipline } from '../types';

interface ViewNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note | null;
    discipline?: Discipline;
}

const ViewNoteModal: React.FC<ViewNoteModalProps> = ({ isOpen, onClose, note, discipline }) => {
    if (!isOpen || !note) return null;

    const formattedDate = new Date(note.updated_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const categoryColors = {
        'Livre': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        'Disciplina': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'Revisão': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'Erros': 'bg-red-500/20 text-red-400 border-red-500/30',
        'Resumo': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl text-white transform transition-all flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-6 flex justify-between items-start border-b border-gray-700">
                    <div className="space-y-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${categoryColors[note.category]}`}>
                            {note.category}
                        </span>
                        <h2 className="text-2xl font-black text-white leading-tight">
                            {note.title}
                        </h2>
                        <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3 h-3" />
                                Última edição em {formattedDate}
                            </div>
                            {discipline && (
                                <div className="flex items-center gap-1.5 text-blue-400">
                                    <BookIcon className="w-3 h-3" />
                                    {discipline.name}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-8 overflow-y-auto custom-scrollbar text-gray-200 leading-relaxed">
                    <div 
                        className="prose prose-invert max-w-none 
                                   [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 
                                   [&_li]:mb-2 [&_p]:mb-4 [&_strong]:text-white [&_strong]:font-bold
                                   [&_a]:text-emerald-400 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: note.content }} 
                    />
                </main>

                <footer className="p-4 border-t border-gray-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                        Fechar Visualização
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ViewNoteModal;