import * as React from 'react';
import { StudyPlan } from '../types';
import { EditIcon, TrashIcon, PlusCircleIcon } from '../constants';
import DisciplineCard from './DisciplineCard';

const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

const PlanHeader: React.FC<{ plan: StudyPlan; onEdit: () => void; onAddDiscipline: () => void; onDelete: () => void; }> = ({ plan, onEdit, onAddDiscipline, onDelete }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row items-start gap-6">
        <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-gray-700 rounded-lg overflow-hidden shadow-md">
            <img src={plan.image || 'https://i.imgur.com/g0QcApU.png'} alt={plan.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-grow flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            {/* Text content */}
            <div>
                <h1 className="text-3xl font-bold text-emerald-400">{plan.name}</h1>
                <div className="flex flex-wrap items-center text-gray-400 mt-1 gap-x-4 gap-y-1">
                    {plan.edital && <span><strong>Edital:</strong> {plan.edital}</span>}
                    {plan.cargo && <span><strong>Cargo:</strong> {plan.cargo}</span>}
                    <span><strong>Disciplinas:</strong> {plan.subjects}</span>
                    <span><strong>Tópicos:</strong> {plan.topics}</span>
                </div>
                {plan.observacoes && (
                    <p className="text-gray-400 mt-2">
                        <strong>Observações:</strong> {plan.observacoes}
                    </p>
                )}
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-4 md:mt-0">
                <button onClick={onEdit} className="p-2 text-gray-400 hover:text-white transition-colors" title="Editar Plano"><EditIcon className="w-5 h-5" /></button>
                <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Excluir Plano"><TrashIcon className="w-5 h-5" /></button>
                <button 
                    onClick={onAddDiscipline}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-8 rounded-lg flex items-center gap-2 transition-colors justify-center"
                >
                    <PlusCircleIcon />
                    <span>Nova Disciplina</span>
                </button>
            </div>
        </div>
    </div>
);

const StatsBar: React.FC<{ plan: StudyPlan }> = ({ plan }) => {
    const getPerformanceColor = (performance: number) => {
        if (performance < 70) return 'text-red-500';
        if (performance < 80) return 'text-yellow-400';
        return 'text-green-400';
    };

    return (
        <div className="grid grid-cols-3 gap-px bg-gray-700 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-gray-800 p-4 text-center">
                <p className="text-3xl font-bold text-white">{formatTime(plan.totalHoursStudied)}</p>
                <p className="text-sm text-gray-400">Horas Estudadas</p>
            </div>
            <div className="bg-gray-800 p-4 text-center">
                <p className="text-3xl font-bold text-white">{plan.totalQuestionsResolved}</p>
                <p className="text-sm text-gray-400">Questões Resolvidas</p>
            </div>
            <div className="bg-gray-800 p-4 text-center">
                <p className={`text-3xl font-bold ${getPerformanceColor(plan.overallPerformance)}`}>{plan.overallPerformance}%</p>
                <p className="text-sm text-gray-400">Desempenho</p>
            </div>
        </div>
    );
};

const PlanDetailPage: React.FC<{ plan: StudyPlan; onEdit: () => void; onAddDiscipline: () => void; onDeletePlan: () => void; onDeleteDiscipline: (planId: string, disciplineId: string) => void; onViewDiscipline: (planId: string, disciplineId: string) => void; onEditDiscipline: (planId: string, disciplineId: string) => void; }> = ({ plan, onEdit, onAddDiscipline, onDeletePlan, onDeleteDiscipline, onViewDiscipline, onEditDiscipline }) => {
    return (
        <div className="space-y-8">
            <PlanHeader plan={plan} onEdit={onEdit} onAddDiscipline={onAddDiscipline} onDelete={onDeletePlan} />
            <StatsBar plan={plan} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plan.disciplines.map(discipline => (
                    <DisciplineCard 
                        key={discipline.id} 
                        discipline={discipline} 
                        planName={plan.name} 
                        onDelete={() => onDeleteDiscipline(plan.id, discipline.id)}
                        onView={() => onViewDiscipline(plan.id, discipline.id)}
                        onEdit={() => onEditDiscipline(plan.id, discipline.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default PlanDetailPage;