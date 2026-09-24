"use client";

import * as React from 'react';
import { Deck, Flashcard } from '../types';
import { PlusCircleIcon, TrashIcon, EditIcon, PlayIcon, BookIcon } from '../constants';
import { supabase } from '../src/lib/supabase';
import { showSuccess, showError } from '../src/utils/toast';
import CreateDeckModal from './CreateDeckModal';
import FlashcardEditorModal from './FlashcardEditorModal';
import ImportCardsModal from './ImportCardsModal';
import ProgressBar from './ProgressBar';

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);

interface FlashcardsPageProps {
    userId: string;
    onStartReview: (deck: Deck) => void;
}

const FlashcardsPage: React.FC<FlashcardsPageProps> = ({ userId, onStartReview }) => {
    const [decks, setDecks] = React.useState<Deck[]>([]);
    const [flashcards, setFlashcards] = React.useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    const [isDeckModalOpen, setIsDeckModalOpen] = React.useState(false);
    const [deckToEdit, setDeckToEdit] = React.useState<Deck | null>(null);
    const [isCardModalOpen, setIsCardModalOpen] = React.useState(false);
    const [cardToEdit, setCardToEdit] = React.useState<Flashcard | null>(null);
    const [selectedDeckId, setSelectedDeckId] = React.useState<string | undefined>(undefined);
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [decksRes, cardsRes] = await Promise.all([
                supabase.from('decks').select('*').eq('user_id', userId).order('name'),
                supabase.from('flashcards').select('*').eq('user_id', userId)
            ]);

            if (decksRes.error) throw decksRes.error;
            if (cardsRes.error) throw cardsRes.error;

            const cards = cardsRes.data || [];
            const decksWithStats = (decksRes.data || []).map(d => ({
                ...d,
                cardCount: cards.filter(c => c.deck_id === d.id).length,
                pendingCount: cards.filter(c => c.deck_id === d.id && (c.proxima_revisao ? new Date(c.proxima_revisao) <= new Date() : true)).length
            }));

            setDecks(decksWithStats);
            setFlashcards(cards);
        } catch (e: any) {
            showError("Erro ao carregar dados: " + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveDeck = async (deckData: Partial<Deck>) => {
        const isUpdate = !!deckData.id;
        const payload = { ...deckData, user_id: userId };

        const { error } = isUpdate 
            ? await supabase.from('decks').update(payload).eq('id', deckData.id)
            : await supabase.from('decks').insert(payload);

        if (error) showError("Erro ao salvar baralho: " + error.message);
        else {
            showSuccess(isUpdate ? "Baralho atualizado!" : "Baralho criado!");
            fetchData();
        }
    };

    const handleDeleteDeck = async (id: string) => {
        if (!confirm("Excluir este baralho apagará todos os seus cards. Continuar?")) return;
        const { error } = await supabase.from('decks').delete().eq('id', id);
        if (error) showError("Erro ao excluir: " + error.message);
        else {
            showSuccess("Baralho excluído!");
            fetchData();
        }
    };

    const handleSaveCard = async (cardData: Partial<Flashcard>) => {
        const isUpdate = !!cardData.id;
        const payload = { 
            ...cardData, 
            user_id: userId,
            updated_at: new Date().toISOString()
        };

        const { error } = isUpdate 
            ? await supabase.from('flashcards').update(payload).eq('id', cardData.id)
            : await supabase.from('flashcards').insert(payload);

        if (error) showError("Erro ao salvar card: " + error.message);
        else {
            showSuccess(isUpdate ? "Card atualizado!" : "Card criado!");
            fetchData();
        }
    };

    const stats = React.useMemo(() => {
        const totalDecks = decks.length;
        const totalCards = flashcards.length;
        const pending = flashcards.filter(c => c.proxima_revisao ? new Date(c.proxima_revisao) <= new Date() : true).length;
        const completed = totalCards - pending;
        const progress = totalCards > 0 ? (completed / totalCards) * 100 : 0;

        return { totalDecks, totalCards, pending, completed, progress };
    }, [decks, flashcards]);

    return (
        <div className="space-y-8">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest">Flashcards</h1>
                    <p className="text-gray-400 mt-1">Memorize conceitos através de repetição ativa.</p>
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all border border-gray-700"
                    >
                        <UploadIcon />
                        IMPORTAR CARDS
                    </button>
                    <button 
                        onClick={() => { setDeckToEdit(null); setIsDeckModalOpen(true); }}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-black py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        NOVO BARALHO
                    </button>
                    <button 
                        onClick={() => { setCardToEdit(null); setSelectedDeckId(undefined); setIsCardModalOpen(true); }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <PlusCircleIcon className="w-6 h-6" />
                        NOVO FLASHCARD
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center shadow-lg">
                    <p className="text-base font-bold text-gray-400 uppercase tracking-wider mb-2">Baralhos Ativos</p>
                    <p className="text-4xl font-bold text-white">{stats.totalDecks}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center shadow-lg">
                    <p className="text-base font-bold text-blue-400 uppercase tracking-wider mb-2">Total de Cards</p>
                    <p className="text-4xl font-bold text-white">{stats.totalCards}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center shadow-lg">
                    <p className="text-base font-bold text-amber-400 uppercase tracking-wider mb-2">Pendentes</p>
                    <p className="text-4xl font-bold text-white">{stats.pending}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center shadow-lg">
                    <p className="text-base font-bold text-emerald-400 uppercase tracking-wider mb-2">Realizados</p>
                    <p className="text-4xl font-bold text-white">{stats.completed}</p>
                </div>
            </div>

            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-gray-400 uppercase tracking-wider">Progresso de Memorização</h3>
                    <span className="text-4xl font-bold text-emerald-400">{stats.progress.toFixed(1)}%</span>
                </div>
                <ProgressBar percentage={stats.progress} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {decks.map(deck => (
                    <div 
                        key={deck.id}
                        className="bg-gray-800 rounded-3xl border-l-[12px] shadow-2xl p-8 flex flex-col gap-6 group hover:scale-[1.03] transition-all duration-300"
                        style={{ borderLeftColor: deck.color }}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="text-2xl font-black text-white leading-tight group-hover:text-emerald-400 transition-colors">{deck.name}</h3>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setDeckToEdit(deck); setIsDeckModalOpen(true); }} className="p-2 bg-gray-700/50 rounded-lg text-gray-400 hover:text-emerald-400 transition-all"><EditIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleDeleteDeck(deck.id)} className="p-2 bg-gray-700/50 rounded-lg text-gray-400 hover:text-red-500 transition-all"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                            <div className="flex items-center gap-2">
                                <BookIcon className="w-4 h-4" />
                                {deck.cardCount} Cards
                            </div>
                            <div className="flex items-center gap-2 text-amber-400">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                {deck.pendingCount} Pendentes
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-700/50 flex gap-4">
                            <button 
                                onClick={() => { setCardToEdit(null); setSelectedDeckId(deck.id); setIsCardModalOpen(true); }}
                                className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
                            >
                                + Add Card
                            </button>
                            <button 
                                onClick={() => onStartReview(deck)}
                                disabled={deck.pendingCount === 0}
                                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <PlayIcon className="w-4 h-4" />
                                Estudar
                            </button>
                        </div>
                    </div>
                ))}

                {decks.length === 0 && !isLoading && (
                    <div className="col-span-full py-24 text-center bg-gray-800/50 rounded-[40px] border-4 border-dashed border-gray-700">
                        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-lg">Nenhum baralho criado</p>
                        <button 
                            onClick={() => { setDeckToEdit(null); setIsDeckModalOpen(true); }}
                            className="text-emerald-400 text-sm font-black uppercase tracking-widest mt-6 hover:text-emerald-300 transition-all"
                        >
                            Criar meu primeiro baralho
                        </button>
                    </div>
                )}
            </div>

            <CreateDeckModal 
                isOpen={isDeckModalOpen}
                onClose={() => setIsDeckModalOpen(false)}
                onSave={handleSaveDeck}
                deckToEdit={deckToEdit}
            />

            <FlashcardEditorModal 
                isOpen={isCardModalOpen}
                onClose={() => setIsCardModalOpen(false)}
                onSave={handleSaveCard}
                cardToEdit={cardToEdit}
                decks={decks}
                initialDeckId={selectedDeckId}
            />

            <ImportCardsModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                decks={decks}
                userId={userId}
                onImportSuccess={fetchData}
            />
        </div>
    );
};

export default FlashcardsPage;