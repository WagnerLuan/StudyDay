"use client";

import * as React from 'react';
import { XIcon, CheckIcon, PlusIcon } from '../constants';
import { Exam } from '../types';

interface AddExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (exam: Omit<Exam, 'id' | 'user_id'> & { id?: string }) => Promise<void>;
    examToEdit?: Exam | null;
}

const PREDICTED_EXAMS = [
    { name: 'PC-DF (Agente)', board: 'Cebraspe', position: 'Agente de Polícia' },
    { name: 'PF (Agente)', board: 'Cebraspe', position: 'Agente Federal' },
    { name: 'PRF', board: 'Cebraspe', position: 'Policial Rodoviário Federal' },
    { name: 'TSE Unificado', board: 'Cebraspe', position: 'Técnico Judiciário' },
    { name: 'CNU', board: 'Cesgranrio', position: 'Bloco 8' },
];

const AddExamModal: React.FC<AddExamModalProps> = ({ isOpen, onClose, onSave, examToEdit }) => {
    const [activeTab, setActiveTab] = React.useState<'predicted' | 'custom'>('predicted');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [formData, setFormData] = React.useState({
        name: '',
        board: '',
        position: '',
        phase: 'Objetiva',
        date: ''
    });

    React.useEffect(() => {
        if (isOpen) {
            if (examToEdit) {
                setFormData({
                    name: examToEdit.name,
                    board: examToEdit.board || '',
                    position: examToEdit.position || '',
                    phase: examToEdit.phase || 'Objetiva',
                    date: examToEdit.date
                });
                setActiveTab('custom');
            } else {
                setFormData({
                    name: '',
                    board: '',
                    position: '',
                    phase: 'Objetiva',
                    date: ''
                });
                setActiveTab('predicted');
            }
            setSearchTerm('');
        }
    }, [isOpen, examToEdit]);

    if (!isOpen) return null;

    const filteredPredicted = PREDICTED_EXAMS.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.board.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectPredicted = (exam: typeof PREDICTED_EXAMS[0]) => {
        setFormData({
            ...formData,
            name: exam.name,
            board: exam.board,
            position: exam.position
        });
        setActiveTab('custom');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.date) {
            alert('Nome e Data são obrigatórios.');
            return;
        }
        await onSave({ ...formData, id: examToEdit?.id });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg text-white transform transition-all overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest">
                        {examToEdit ? 'Editar Prova' : 'Adicionar Prova'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                {!examToEdit && (
                    <div className="flex border-b border-gray-700">
                        <button 
                            onClick={() => setActiveTab('predicted')}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'predicted' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Provas Previstas
                        </button>
                        <button 
                            onClick={() => setActiveTab('custom')}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'custom' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Personalizado
                        </button>
                    </div>
                )}

                <main className="p-6">
                    {activeTab === 'predicted' && !examToEdit ? (
                        <div className="space-y-4">
                            <input 
                                type="text"
                                placeholder="Buscar concurso..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                {filteredPredicted.map((exam, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => handleSelectPredicted(exam)}
                                        className="bg-gray-700/30 p-4 rounded-xl border border-gray-700 hover:border-emerald-500/50 hover:bg-gray-700/50 cursor-pointer transition-all group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{exam.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{exam.board} • {exam.position}</p>
                                            </div>
                                            <PlusIcon className="w-4 h-4 text-gray-600 group-hover:text-emerald-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Nome do Concurso</label>
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Ex: PC-DF"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Banca</label>
                                    <input 
                                        type="text" 
                                        value={formData.board}
                                        onChange={e => setFormData({...formData, board: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Ex: Cebraspe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Cargo</label>
                                    <input 
                                        type="text" 
                                        value={formData.position}
                                        onChange={e => setFormData({...formData, position: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Ex: Agente"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Fase</label>
                                    <select 
                                        value={formData.phase}
                                        onChange={e => setFormData({...formData, phase: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option>Objetiva</option>
                                        <option>Discursiva</option>
                                        <option>Oral</option>
                                        <option>TAF</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Data da Prova</label>
                                    <input 
                                        type="date" 
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4 flex items-center justify-center gap-2"
                            >
                                <CheckIcon className="w-5 h-5" />
                                {examToEdit ? 'SALVAR ALTERAÇÕES' : 'SALVAR PROVA'}
                            </button>
                        </form>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AddExamModal;