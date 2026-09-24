"use client";

import * as React from 'react';
import { Note, StudyPlan, NoteCategory } from '../types';
import { PlusCircleIcon, ChevronDownIcon } from '../constants';
import NoteCard from './NoteCard';
import NoteEditorModal from './NoteEditorModal';
import ViewNoteModal from './ViewNoteModal';
import { supabase } from '../src/lib/supabase';
import { showSuccess, showError } from '../src/utils/toast';

// Adicionando ícone de busca localmente
const SearchIconLocal = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

interface NotesPageProps {
    plans: StudyPlan[];
    userId: string;
}

type SortOption = 'recent' | 'oldest' | 'az';

const NotesPage: React.FC<NotesPageProps> = ({ plans, userId }) => {
    const [notes, setNotes] = React.useState<Note[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortBy, setSortBy] = React.useState<SortOption>('recent');
    const [selectedPlanId, setSelectedPlanId] = React.useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = React.useState('');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [noteToEdit, setNoteToEdit] = React.useState<Note | null>(null);
    
    // Estados para visualização rápida
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [noteToView, setNoteToView] = React.useState<Note | null>(null);

    const fetchNotes = React.useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId);
        
        if (error) {
            showError("Erro ao carregar notas: " + error.message);
        } else {
            setNotes(data || []);
        }
        setIsLoading(false);
    }, [userId]);

    React.useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleSaveNote = async (noteData: Partial<Note>) => {
        const isUpdate = !!noteData.id;
        const payload = {
            ...noteData,
            user_id: userId,
            updated_at: new Date().toISOString(),
        };

        if (!isUpdate) {
            (payload as any).created_at = new Date().toISOString();
        }

        const { error } = isUpdate 
            ? await supabase.from('notes').update(payload).eq('id', noteData.id).select().single()
            : await supabase.from('notes').insert(payload).select().single();

        if (error) {
            showError("Erro ao salvar nota: " + error.message);
        } else {
            showSuccess(isUpdate ? "Anotação atualizada!" : "Anotação criada!");
            fetchNotes();
            setIsModalOpen(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta anotação?")) return;

        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) {
            showError("Erro ao excluir: " + error.message);
        } else {
            showSuccess("Anotação excluída!");
            fetchNotes();
        }
    };

    const handleViewNote = (note: Note) => {
        setNoteToView(note);
        setIsViewModalOpen(true);
    };

    // Disciplinas disponíveis baseadas no plano selecionado
    const availableDisciplines = React.useMemo(() => {
        if (!selectedPlanId) {
            return plans.flatMap(p => p.disciplines.map(d => ({ ...d, planName: p.name })));
        }
        const plan = plans.find(p => p.id === selectedPlanId);
        return plan ? plan.disciplines.map(d => ({ ...d, planName: plan.name })) : [];
    }, [plans, selectedPlanId]);

    const filteredAndSortedNotes = React.useMemo(() => {
        let result = notes.filter(n => 
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.content.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Filtro por Plano
        if (selectedPlanId) {
            const planDisciplineIds = new Set(plans.find(p => p.id === selectedPlanId)?.disciplines.map(d => d.id) || []);
            result = result.filter(n => n.discipline_id && planDisciplineIds.has(n.discipline_id));
        }

        // Filtro por Disciplina
        if (selectedDisciplineId) {
            result = result.filter(n => n.discipline_id === selectedDisciplineId);
        }

        switch (sortBy) {
            case 'recent':
                result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
                break;
            case 'az':
                result.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }

        return result;
    }, [notes, searchTerm, sortBy, selectedPlanId, selectedDisciplineId, plans]);

    const getDiscipline = (id?: string) => {
        if (!id) return undefined;
        return plans.flatMap(p => p.disciplines).find(d => d.id === id);
    };

    const getTopicName = (disciplineId?: string, topicId?: string) => {
        if (!disciplineId || !topicId) return undefined;
        const disc = getDiscipline(disciplineId);
        return disc?.topicsList?.find(t => t.id === topicId)?.name;
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest">Meu Caderno</h1>
                    <p className="text-gray-400 mt-1">Suas anotações e resumos de estudo em um só lugar.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    {/* Busca */}
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            <SearchIconLocal />
                        </div>
                        <input 
                            type="text"
                            placeholder="Buscar anotação..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                    </div>

                    {/* Filtro por Plano */}
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                        <select 
                            value={selectedPlanId}
                            onChange={e => {
                                setSelectedPlanId(e.target.value);
                                setSelectedDisciplineId(''); // Reseta disciplina ao mudar plano
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Todos os Planos</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <ChevronDownIcon className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Filtro por Disciplina */}
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                        <select 
                            value={selectedDisciplineId}
                            onChange={e => setSelectedDisciplineId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Todas as Matérias</option>
                            {availableDisciplines.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name} {!selectedPlanId && `(${d.planName})`}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <ChevronDownIcon className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Ordenação */}
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-40">
                        <select 
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as SortOption)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="recent">Mais Recentes</option>
                            <option value="oldest">Mais Antigas</option>
                            <option value="az">Ordem A-Z</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <ChevronDownIcon className="w-4 h-4" />
                        </div>
                    </div>

                    <button 
                        onClick={() => { setNoteToEdit(null); setIsModalOpen(true); }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 w-full sm:w-auto justify-center"
                    >
                        <PlusCircleIcon className="w-6 h-6" />
                        NOVA ANOTAÇÃO
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredAndSortedNotes.length === 0 ? (
                <div className="bg-gray-800 rounded-2xl p-12 text-center border border-gray-700 border-dashed">
                    <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhuma anotação encontrada</p>
                    <button 
                        onClick={() => { setNoteToEdit(null); setIsModalOpen(true); }}
                        className="text-emerald-400 text-xs font-black uppercase tracking-widest mt-4 hover:text-emerald-300 transition-colors"
                    >
                        Criar minha primeira nota
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAndSortedNotes.map(note => (
                        <NoteCard 
                            key={note.id}
                            note={note}
                            discipline={getDiscipline(note.discipline_id)}
                            topicName={getTopicName(note.discipline_id, note.topic_id)}
                            onEdit={() => { setNoteToEdit(note); setIsModalOpen(true); }}
                            onDelete={() => handleDeleteNote(note.id)}
                            onView={() => handleViewNote(note)}
                        />
                    ))}
                </div>
            )}

            <NoteEditorModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveNote}
                noteToEdit={noteToEdit}
                plans={plans}
            />

            <ViewNoteModal 
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                note={noteToView}
                discipline={getDiscipline(noteToView?.discipline_id)}
            />
        </div>
    );
};

export default NotesPage;