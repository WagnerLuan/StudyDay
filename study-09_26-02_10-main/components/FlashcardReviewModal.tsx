"use client";

import * as React from 'react';
import { XIcon, CheckIcon, XMarkIcon, MaximizeIcon, EditIcon, TrashIcon } from '../constants';
import { Flashcard, Deck } from '../types';
import { supabase } from '../src/lib/supabase';
import { showSuccess, showError } from '../src/utils/toast';
import FlashcardEditorModal from './FlashcardEditorModal';

interface FlashcardReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    deck: Deck | null;
    cards: Flashcard[];
    onUpdateCardStatus: (cardId: string, updates: { intervalo_dias: number; proxima_revisao: string; status: 'pendente' | 'realizado' }) => Promise<void>;
}

const FlashcardReviewModal: React.FC<FlashcardReviewModalProps> = ({ isOpen, onClose, deck, cards, onUpdateCardStatus }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [showAnswer, setShowAnswer] = React.useState(false);
    const [isFinishing, setIsFinishing] = React.useState(false);
    const [isFocusMode, setIsFocusMode] = React.useState(false);
    
    const [sessionCards, setSessionCards] = React.useState<Flashcard[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setSessionCards(cards);
            setCurrentIndex(0);
            setShowAnswer(false);
            setIsFinishing(false);
            setIsFocusMode(false);
        }
    }, [isOpen, cards]);

    // Lógica de Bloqueio de Scroll e Teclas de Atalho
    React.useEffect(() => {
        if (isOpen && isFocusMode) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFocusMode) {
                setIsFocusMode(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFocusMode, isOpen]);

    if (!isOpen || !deck) return null;

    const currentCard = sessionCards[currentIndex];

    const handleNext = async (success: boolean) => {
        if (currentCard) {
            const currentInterval = currentCard.intervalo_dias || 1;
            const easeFactor = currentCard.fator_facilidade || 2.5;
            
            let newInterval = 1;
            let nextReviewDate = new Date();

            if (success) {
                // Acertei: Multiplica o intervalo_dias atual pelo fator_facilidade
                newInterval = Math.max(1, Math.floor(currentInterval * easeFactor));
                nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
            } else {
                // Errei: Reseta o card atualizando intervalo_dias = 1 e proxima_revisao para amanhã
                newInterval = 1;
                nextReviewDate.setDate(nextReviewDate.getDate() + 1);
            }

            await onUpdateCardStatus(currentCard.id, {
                intervalo_dias: newInterval,
                proxima_revisao: nextReviewDate.toISOString(),
                status: success ? 'realizado' : 'pendente'
            });
        }

        if (currentIndex < sessionCards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowAnswer(false);
        } else {
            setIsFinishing(true);
        }
    };

    const handleDeleteCard = async () => {
        if (!currentCard) return;
        if (!confirm("Tem certeza que deseja excluir este card permanentemente?")) return;

        try {
            const { error } = await supabase.from('flashcards').delete().eq('id', currentCard.id);
            if (error) throw error;

            showSuccess("Card excluído!");
            const newSessionCards = sessionCards.filter(c => c.id !== currentCard.id);
            setSessionCards(newSessionCards);

            if (newSessionCards.length === 0) {
                setIsFinishing(true);
            } else if (currentIndex >= newSessionCards.length) {
                setCurrentIndex(newSessionCards.length - 1);
                setShowAnswer(false);
            } else {
                setShowAnswer(false);
            }
        } catch (e: any) {
            showError("Erro ao excluir card: " + e.message);
        }
    };

    const handleSaveEdit = async (updatedData: Partial<Flashcard>) => {
        if (!currentCard) return;
        try {
            const { error } = await supabase
                .from('flashcards')
                .update({ ...updatedData, updated_at: new Date().toISOString() })
                .eq('id', currentCard.id);
            
            if (error) throw error;

            showSuccess("Card updated!");
            setSessionCards(prev => prev.map(c => 
                c.id === currentCard.id ? { ...c, ...updatedData } : c
            ));
            setIsEditModalOpen(false);
        } catch (e: any) {
            showError("Erro ao atualizar card: " + e.message);
        }
    };

    if (sessionCards.length === 0 || isFinishing) {
        return (
            <div className="fixed inset-0 bg-gray-900 z-[9999] flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckIcon className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest">Sessão Concluída!</h2>
                    <p className="text-gray-400">Você revisou todos os cards pendentes deste baralho.</p>
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
                    >
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div 
                className={`fixed inset-0 bg-gray-900 flex flex-col transition-all duration-500 ${
                    isFocusMode ? 'z-[9999] p-0' : 'z-[60]'
                }`}
                style={{ backgroundColor: '#111827' }}
            >
                <header className={`p-6 flex justify-between items-center border-b border-gray-800 transition-all duration-300 ${isFocusMode ? 'opacity-0 h-0 p-0 overflow-hidden border-none' : 'opacity-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: deck.color }} />
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">{deck.name}</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                Card {currentIndex + 1} de {sessionCards.length}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 mr-4 border-r border-gray-700 pr-4">
                            <button 
                                onClick={() => setIsEditModalOpen(true)}
                                className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
                                title="Editar Card"
                            >
                                <EditIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={handleDeleteCard}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Excluir Card"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <button 
                            onClick={() => setIsFocusMode(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <MaximizeIcon className="w-3.5 h-3.5" />
                            Modo Foco
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {isFocusMode && (
                    <button 
                        onClick={() => setIsFocusMode(false)}
                        className="fixed top-6 right-6 z-[10000] p-3 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-all backdrop-blur-sm border border-gray-700"
                        title="Sair do Modo Foco (Esc)"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                )}

                <main className={`flex-grow flex items-center justify-center p-6 overflow-y-auto transition-all duration-500 ${isFocusMode ? 'bg-gray-900' : ''}`}>
                    <div className="max-w-[800px] w-full mx-auto space-y-8">
                        <div className="bg-gray-800 rounded-3xl border-2 border-gray-700 p-10 shadow-2xl min-h-[250px] flex flex-col">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 block text-center border-b border-gray-700/50 pb-2">Frente</span>
                            <div 
                                className="text-lg md:text-xl text-white text-left leading-relaxed prose prose-invert max-w-none overflow-y-auto max-h-[50vh] custom-scrollbar pr-2"
                                dangerouslySetInnerHTML={{ __html: currentCard?.front_html || '' }}
                            />
                        </div>

                        {showAnswer ? (
                            <div className="bg-gray-800/50 rounded-3xl border-2 border-emerald-500/30 p-10 shadow-2xl min-h-[250px] flex flex-col animate-fade-in">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 block text-center border-b border-blue-500/20 pb-2">Verso</span>
                                <div 
                                    className="text-lg md:text-xl text-gray-200 text-left leading-relaxed prose prose-invert max-w-none overflow-y-auto max-h-[50vh] custom-scrollbar pr-2"
                                    dangerouslySetInnerHTML={{ __html: currentCard?.back_html || '' }}
                                />
                            </div>
                        ) : (
                            <button 
                                onClick={() => setShowAnswer(true)}
                                className="w-full py-12 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 rounded-3xl text-gray-400 font-black uppercase tracking-[0.3em] transition-all group shadow-xl"
                            >
                                <span className="group-hover:text-white transition-colors">Mostrar Resposta</span>
                            </button>
                        )}
                    </div>
                </main>

                <footer className={`p-8 border-t border-gray-800 bg-gray-900/50 transition-all duration-300 ${isFocusMode && !showAnswer ? 'opacity-0 h-0 p-0 overflow-hidden border-none' : 'opacity-100'}`}>
                    {showAnswer ? (
                        <div className="max-w-md mx-auto grid grid-cols-2 gap-6">
                            <button 
                                onClick={() => handleNext(false)}
                                className="flex flex-col items-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 rounded-2xl transition-all group"
                            >
                                <XMarkIcon className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-black text-red-500 uppercase tracking-widest">Errei</span>
                            </button>
                            <button 
                                onClick={() => handleNext(true)}
                                className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/30 rounded-2xl transition-all group"
                            >
                                <CheckIcon className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Acertei</span>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            Pense na resposta antes de revelar o verso
                        </div>
                    )}
                </footer>
            </div>

            {currentCard && (
                <FlashcardEditorModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveEdit}
                    cardToEdit={currentCard}
                    decks={[deck]}
                    initialDeckId={deck.id}
                />
            )}
        </>
    );
};

export default FlashcardReviewModal;