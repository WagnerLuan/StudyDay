"use client";

import * as React from 'react';
import { XIcon, CheckIcon } from '../constants';
import { Note, NoteCategory, StudyPlan, Discipline, Topic } from '../types';
import RichTextEditor from './RichTextEditor';

interface NoteEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: Partial<Note>) => void;
    noteToEdit?: Note | null;
    plans: StudyPlan[];
}

const CATEGORIES: NoteCategory[] = ['Livre', 'Disciplina', 'Revisão', 'Erros', 'Resumo', 'Questão'];

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ isOpen, onClose, onSave, noteToEdit, plans }) => {
    const [title, setTitle] = React.useState('');
    const [content, setContent] = React.useState('');
    const [category, setCategory] = React.useState<NoteCategory>('Livre');
    const [selectedPlanFilterId, setSelectedPlanFilterId] = React.useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = React.useState('');
    const [selectedTopicId, setSelectedTopicId] = React.useState('');

    const allDisciplines = React.useMemo(() => {
        return plans.flatMap(p => p.disciplines.map(d => ({ ...d, planId: p.id, planName: p.name })));
    }, [plans]);

    const filteredDisciplines = React.useMemo(() => {
        if (!selectedPlanFilterId) return allDisciplines;
        return allDisciplines.filter(d => d.planId === selectedPlanFilterId);
    }, [selectedPlanFilterId, allDisciplines]);

    const selectedDiscipline = React.useMemo(() => {
        return allDisciplines.find(d => d.id === selectedDisciplineId);
    }, [selectedDisciplineId, allDisciplines]);

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (noteToEdit) {
                setTitle(noteToEdit.title);
                setContent(noteToEdit.content);
                setCategory(noteToEdit.category);
                
                // Tentar encontrar o plano da disciplina vinculada para pré-selecionar o filtro
                const disc = allDisciplines.find(d => d.id === noteToEdit.discipline_id);
                setSelectedPlanFilterId(disc?.planId || '');
                
                setSelectedDisciplineId(noteToEdit.discipline_id || '');
                setSelectedTopicId(noteToEdit.topic_id || '');
            } else {
                setTitle('');
                setContent('');
                setCategory('Livre');
                setSelectedPlanFilterId('');
                setSelectedDisciplineId('');
                setSelectedTopicId('');
            }
        }
    }, [isOpen, noteToEdit, allDisciplines]);

    const handleSave = () => {
        if (!title.trim()) {
            alert('O título é obrigatório.');
            return;
        }
        
        onSave({
            id: noteToEdit?.id,
            title,
            content,
            category,
            discipline_id: selectedDisciplineId || undefined,
            topic_id: selectedTopicId || undefined,
        });
        
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl text-white transform transition-all flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest">
                        {noteToEdit ? 'Editar Anotação' : 'Nova Anotação'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Título</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Ex: Resumo de Atos Administrativos"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value as NoteCategory)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Filtrar por Plano (Opcional)</label>
                            <select
                                value={selectedPlanFilterId}
                                onChange={e => { setSelectedPlanFilterId(e.target.value); setSelectedDisciplineId(''); setSelectedTopicId(''); }}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">Todos os Planos</option>
                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Vincular Disciplina (Opcional)</label>
                            <select
                                value={selectedDisciplineId}
                                onChange={e => { setSelectedDisciplineId(e.target.value); setSelectedTopicId(''); }}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">Nenhuma</option>
                                {filteredDisciplines.map(d => <option key={d.id} value={d.id}>{d.name} ({d.planName})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Vincular Tópico (Opcional)</label>
                            <select
                                value={selectedTopicId}
                                onChange={e => setSelectedTopicId(e.target.value)}
                                disabled={!selectedDisciplineId}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                            >
                                <option value="">Nenhum</option>
                                {selectedDiscipline?.topicsList?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Conteúdo</label>
                        <RichTextEditor value={content} onChange={setContent} placeholder="Escreva suas anotações aqui..." />
                    </div>
                </main>

                <footer className="p-6 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                        <CheckIcon className="w-5 h-5" />
                        SALVAR E SAIR
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default NoteEditorModal;