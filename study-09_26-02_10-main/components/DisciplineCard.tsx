import * as React from 'react';
import { Discipline } from '../types';
import { EditIcon, TrashIcon, EyeIcon } from '../constants';

// Function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ActionButton: React.FC<{ icon: React.ReactNode; tooltip: string; onClick?: (e: React.MouseEvent) => void; className?: string, 'aria-label': string }> = ({ icon, tooltip, onClick, className, 'aria-label': ariaLabel }) => (
    <div className="relative group flex flex-col items-center">
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
            }}
            className={`w-12 h-12 rounded-full bg-gray-900 bg-opacity-70 flex items-center justify-center text-white hover:bg-opacity-90 transition-all duration-200 ${className}`}
            aria-label={ariaLabel}
            title={tooltip}
        >
            {icon}
        </button>
         <div className="absolute -bottom-10 w-auto min-w-max px-3 py-1.5 text-sm font-semibold text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            {tooltip}
        </div>
    </div>
);

interface DisciplineCardProps {
    discipline: Discipline;
    planName: string;
    onDelete: () => void;
    onView: () => void;
    onEdit: () => void;
}


const DisciplineCard: React.FC<DisciplineCardProps> = ({ discipline, planName, onDelete, onView, onEdit }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between border-l-4 relative overflow-hidden"
            style={{ borderColor: discipline.color }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`transition-opacity duration-300 ${isHovered ? 'opacity-10' : 'opacity-100'}`}>
                <div>
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-white leading-tight">{discipline.name}</h3>
                         <span className="bg-emerald-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">{planName}</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center mt-6">
                    <div>
                        <p className="text-2xl font-bold text-white">{discipline.studiedTopics}</p>
                        <p className="text-xs text-gray-400">Tópicos Estudados</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{discipline.totalTopics}</p>
                        <p className="text-xs text-gray-400">Tópicos Totais</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{discipline.resolvedQuestions}</p>
                        <p className="text-xs text-gray-400">Questões Resolvidas</p>
                    </div>
                </div>
            </div>

            {isHovered && (
                <div 
                    className="absolute inset-0 flex items-center justify-center gap-4 opacity-100 transition-opacity duration-300"
                    style={{ backgroundColor: hexToRgba(discipline.color, 0.85) }}
                >
                    <ActionButton icon={<EyeIcon className="w-6 h-6" />} onClick={onView} tooltip="Visualizar" aria-label="Visualizar disciplina" />
                    <ActionButton icon={<EditIcon className="w-6 h-6" />} onClick={onEdit} tooltip="Editar" aria-label="Editar disciplina" />
                    <ActionButton icon={<TrashIcon className="w-6 h-6" />} onClick={onDelete} tooltip="Excluir" className="text-red-500 hover:text-red-400" aria-label="Excluir disciplina" />
                </div>
            )}
        </div>
    );
};

export default DisciplineCard;