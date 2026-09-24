"use client";

import * as React from 'react';
import { XIcon, CheckIcon, CalendarIcon } from '../constants';
import { StudyBlock } from '../types';
import { formatDateToYYYYMMDD } from '../src/utils/dateUtils';

interface CopyBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    block: StudyBlock | null;
    onConfirm: (newBlock: Partial<StudyBlock>) => void;
}

const CopyBlockModal: React.FC<CopyBlockModalProps> = ({ isOpen, onClose, block, onConfirm }) => {
    const [targetDate, setTargetDate] = React.useState('');

    React.useEffect(() => {
        if (isOpen) {
            setTargetDate('');
        }
    }, [isOpen]);

    if (!isOpen || !block) return null;

    const handleConfirm = () => {
        if (!targetDate) {
            alert('Selecione uma data de destino.');
            return;
        }

        // Copy all original block info, set new specific_date, clear completion tracking
        // Use local date utility to avoid timezone shift from .toISOString()
        const newBlock: Partial<StudyBlock> = {
            ...block,
            id: undefined, // Let backend generate new id
            specific_date: formatDateToYYYYMMDD(new Date(targetDate + 'T00:00:00')),
            last_completed_date: undefined,
        };

        onConfirm(newBlock);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[60] p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md text-white transform transition-all overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-start border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <CalendarIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-black text-white">Copiar Bloco</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="p-6 space-y-4">
                    <p className="text-sm text-gray-400">
                        Selecione a data de destino para criar uma cópia deste bloco. Todas as informações (plano, disciplina, duração, horário, categorias e observações) serão mantidas.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Data de Destino</label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={e => setTargetDate(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                        />
                    </div>
                </main>

                <footer className="p-6 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        Copiar Bloco
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CopyBlockModal;
