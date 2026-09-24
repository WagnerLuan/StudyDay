"use client";

import * as React from 'react';
import { Note, Discipline } from '../types';
import { EditIcon, TrashIcon, CalendarIcon, BookIcon, FileTextIcon } from '../constants';

interface NoteCardProps {
    note: Note;
    discipline?: Discipline;
    topicName?: string;
    onEdit: () => void;
    onDelete: () => void;
    onView: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, discipline, topicName, onEdit, onDelete, onView }) => {
    const formattedDate = new Date(note.updated_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
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
        'Questão': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };

    // Strip HTML and sanitize entities for preview
    const plainTextContent = React.useMemo(() => {
        return note.content
            .replace(/<[^>]*>?/gm, ' ') // Remove tags HTML
            .replace(/&nbsp;/g, ' ')    // Substitui espaços não-quebráveis por espaços normais
            .replace(/&/g, '&')     // Corrige outros caracteres comuns
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/\s+/g, ' ')       // Remove espaços múltiplos
            .trim();
    }, [note.content]);

    return (
        <div 
            onClick={onView}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-5 hover:border-emerald-500/50 transition-all group flex flex-col h-full shadow-lg gap-4 cursor-pointer"
        >
            {/* Tag e Ações */}
            <div className="flex justify-between items-start">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${categoryColors[note.category]}`}>
                    {note.category}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                        className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors" 
                        title="Editar"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" 
                        title="Excluir"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Título */}
            <h3 className="text-lg font-bold text-white line-clamp-1">{note.title}</h3>
            
            {/* Vínculos (Disciplina e Assunto) */}
            {(discipline || topicName) && (
                <div className="space-y-1.5">
                    {discipline && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            <BookIcon className="w-3 h-3" />
                            <span className="truncate">{discipline.name}</span>
                        </div>
                    )}
                    {topicName && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                            <FileTextIcon className="w-3 h-3" />
                            <span className="truncate">{topicName}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Descrição Sanitizada */}
            <p className="text-gray-400 text-sm line-clamp-3 flex-grow leading-relaxed">
                {plainTextContent || 'Sem conteúdo...'}
            </p>

            {/* Rodapé */}
            <div className="pt-4 border-t border-gray-700/50">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                    <CalendarIcon className="w-3 h-3" />
                    <span>Editado em {formattedDate}</span>
                </div>
            </div>
        </div>
    );
};

export default NoteCard;