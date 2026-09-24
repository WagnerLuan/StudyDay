"use client";

import * as React from 'react';
import { XIcon, CheckIcon } from '../constants';
import { Flashcard, Deck } from '../types';
import RichTextEditor from './RichTextEditor';

interface FlashcardEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (card: Partial<Flashcard>) => void;
    cardToEdit?: Flashcard | null;
    decks: Deck[];
    initialDeckId?: string;
}

const FlashcardEditorModal: React.FC<FlashcardEditorModalProps> = ({ isOpen, onClose, onSave, cardToEdit, decks, initialDeckId }) => {
    const [deckId, setDeckId] = React.useState('');
    const [frontHtml, setFrontHtml] = React.useState('');
    const [backHtml, setBackHtml] = React.useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (cardToEdit) {
                setDeckId(cardToEdit.deck_id);
                setFrontHtml(cardToEdit.front_html);
                setBackHtml(cardToEdit.back_html);
            } else {
                setDeckId(initialDeckId || (decks.length > 0 ? decks[0].id : ''));
                setFrontHtml('');
                setBackHtml('');
            }
        }
    }, [isOpen, cardToEdit, decks, initialDeckId]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!deckId) {
            alert('Selecione um baralho.');
            return;
        }
        if (!frontHtml.trim() || !backHtml.trim()) {
            alert('Frente e verso são obrigatórios.');
            return;
        }
        onSave({
            id: cardToEdit?.id,
            deck_id: deckId,
            front_html: frontHtml,
            back_html: backHtml,
            status: cardToEdit?.status || 'pendente'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[100] p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl text-white transform transition-all flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest">
                        {cardToEdit ? 'Editar Flashcard' : 'Novo Flashcard'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-8 custom-scrollbar flex-grow">
                    <div>
                        <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Baralho</label>
                        <select
                            value={deckId}
                            onChange={e => setDeckId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="" disabled>Selecione um baralho</option>
                            {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-8">
                        <div className="space-y-2 w-full">
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest">Frente (Pergunta)</label>
                            <RichTextEditor value={frontHtml} onChange={setFrontHtml} placeholder="Digite a pergunta ou conceito..." />
                        </div>
                        <div className="space-y-2 w-full">
                            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest">Verso (Resposta)</label>
                            <RichTextEditor value={backHtml} onChange={setBackHtml} placeholder="Digite a resposta ou explicação..." />
                        </div>
                    </div>
                </main>

                <footer className="p-6 border-t border-gray-700 flex justify-end gap-4 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                        <CheckIcon className="w-5 h-5" />
                        SALVAR CARD
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default FlashcardEditorModal;