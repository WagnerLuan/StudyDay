
import * as React from 'react';
import { Discipline } from '../types';

interface ViewDisciplineModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: { discipline: Discipline; planName: string } | null;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-700 last:border-b-0">
        <span className="text-gray-400">{label}</span>
        <span className={`font-semibold text-white ${color || ''}`}>{value}</span>
    </div>
);

const ViewDisciplineModal: React.FC<ViewDisciplineModalProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const { discipline, planName } = data;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg text-white transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold">{discipline.name}</h2>
                    <span 
                        className="w-8 h-8 rounded-full border-2 border-gray-600"
                        style={{ backgroundColor: discipline.color }}
                    ></span>
                </div>
                
                <div className="space-y-2">
                    <DetailRow label="Plano de Estudo" value={planName} />
                    <DetailRow label="Tópicos Totais" value={discipline.totalTopics} />
                    <DetailRow label="Tópicos Estudados" value={discipline.studiedTopics} color="text-emerald-400" />
                    <DetailRow label="Questões Resolvidas" value={discipline.resolvedQuestions} />
                </div>
                
                <div className="flex justify-end mt-8">
                    <button 
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewDisciplineModal;
