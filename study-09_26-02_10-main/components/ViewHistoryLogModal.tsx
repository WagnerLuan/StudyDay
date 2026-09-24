import * as React from 'react';
import { HistoryLog } from '../types';
import { XIcon, CalendarIcon, ClockIcon, BookIcon, CheckIcon, XMarkIcon, FileTextIcon, PercentIcon } from '../constants';

// Adicionando ícone de comentário localmente já que não está no constants.tsx
const MessageSquareIconLocal = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);

interface ViewHistoryLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: (HistoryLog & { disciplineName: string; disciplineColor: string }) | null;
}

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color?: string }> = ({ icon, label, value, color = "text-white" }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-1">
            {icon}
            <span>{label}</span>
        </div>
        <p className={`text-lg font-semibold break-words ${color}`}>{value || 'Não informado'}</p>
    </div>
);

const ViewHistoryLogModal: React.FC<ViewHistoryLogModalProps> = ({ isOpen, onClose, log }) => {
    if (!isOpen || !log) return null;

    const totalQuestions = (log.correct || 0) + (log.incorrect || 0);
    const accuracy = totalQuestions > 0 ? ((log.correct / totalQuestions) * 100).toFixed(1) : '0.0';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl text-white transform transition-all flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 flex justify-between items-center border-b border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-emerald-400">Detalhes do Estudo</h2>
                        <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: log.disciplineColor }}></span>
                            {log.disciplineName}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-6">
                    <div className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-emerald-500">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-1">Tópico Estudado</h3>
                        <p className="text-xl font-bold text-white">{log.topic}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem icon={<CalendarIcon className="w-4 h-4" />} label="Data" value={log.date} />
                        <DetailItem icon={<BookIcon className="w-4 h-4" />} label="Categoria" value={log.category} />
                        <DetailItem icon={<ClockIcon className="w-4 h-4" />} label="Tempo de Estudo" value={log.time} />
                        <DetailItem 
                            icon={<PercentIcon className="w-4 h-4" />} 
                            label="Desempenho" 
                            value={`${accuracy}% (${log.correct} de ${totalQuestions})`} 
                            color={Number(accuracy) >= 70 ? "text-green-400" : "text-red-400"}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <DetailItem icon={<CheckIcon className="w-4 h-4" />} label="Acertos" value={log.correct} color="text-green-400" />
                        <DetailItem icon={<XMarkIcon className="w-4 h-4" />} label="Erros" value={log.incorrect} color="text-red-400" />
                    </div>

                    <DetailItem icon={<FileTextIcon className="w-4 h-4" />} label="Material Utilizado" value={log.material || 'Não informado'} />
                    
                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-1">
                            <MessageSquareIconLocal />
                            <span>Comentários</span>
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap italic">
                            {log.comments || 'Não informado'}
                        </p>
                    </div>
                </main>

                <footer className="p-6 border-t border-gray-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-8 rounded-lg transition-colors shadow-lg"
                    >
                        Fechar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ViewHistoryLogModal;