"use client";

import * as React from 'react';
import { XIcon, CheckIcon } from '../constants';
import { Deck } from '../types';

interface CreateDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (deck: Partial<Deck>) => void;
    deckToEdit?: Deck | null;
}

const PRESET_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#EC4899'
];

const CreateDeckModal: React.FC<CreateDeckModalProps> = ({ isOpen, onClose, onSave, deckToEdit }) => {
    const [name, setName] = React.useState('');
    const [color, setColor] = React.useState(PRESET_COLORS[3]);

    React.useEffect(() => {
        if (isOpen) {
            if (deckToEdit) {
                setName(deckToEdit.name);
                setColor(deckToEdit.color);
            } else {
                setName('');
                setColor(PRESET_COLORS[3]);
            }
        }
    }, [isOpen, deckToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) {
            alert('O nome do baralho é obrigatório.');
            return;
        }
        onSave({ id: deckToEdit?.id, name, color });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md text-white transform transition-all" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest">
                        {deckToEdit ? 'Editar Baralho' : 'Novo Baralho'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Nome do Baralho</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Ex: Direito Penal - Parte Geral"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Cor de Identificação</label>
                        <div className="grid grid-cols-5 gap-3">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-full aspect-square rounded-lg border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                </main>

                <footer className="p-6 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                        <CheckIcon className="w-5 h-5" />
                        SALVAR
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CreateDeckModal;