import * as React from 'react';
import { StudyPlan } from '../types';
import { EditIcon, TrashIcon, PlusCircleIcon } from '../constants';
import DisciplineCard from './DisciplineCard';
import { ExcelImportModal } from './ExcelImportModal';
import { exportPlanToExcel, downloadExcelTemplate, ParsedDisciplineImport } from '../src/utils/excelPlanUtils';

const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

const PlanHeader: React.FC<{ 
    plan: StudyPlan; 
    onEdit: () => void; 
    onAddDiscipline: () => void; 
    onDelete: () => void;
    onOpenImport: () => void;
    onExportExcel: () => void;
    onDownloadTemplate: () => void;
}> = ({ 
    plan, 
    onEdit, 
    onAddDiscipline, 
    onDelete, 
    onOpenImport, 
    onExportExcel, 
    onDownloadTemplate 
}) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row items-start gap-6">
        <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-gray-700 rounded-lg overflow-hidden shadow-md">
            <img src={plan.image || 'https://i.imgur.com/g0QcApU.png'} alt={plan.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-grow flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4 w-full">
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
            <div className="flex flex-wrap items-center gap-2.5 mt-4 xl:mt-0">
                <button onClick={onEdit} className="p-2 text-gray-400 hover:text-white transition-colors" title="Editar Plano"><EditIcon className="w-5 h-5" /></button>
                <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Excluir Plano"><TrashIcon className="w-5 h-5" /></button>
                
                {/* Botão Baixar Modelo */}
                <button
                    onClick={onDownloadTemplate}
                    className="bg-gray-700/80 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-gray-600/70 shadow-xs cursor-pointer"
                    title="Baixar planilha modelo de exemplo para importação"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-emerald-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    <span>Baixar Modelo</span>
                </button>

                {/* Botão Exportar Excel */}
                <button
                    onClick={onExportExcel}
                    className="bg-gray-700/80 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors border border-gray-600 shadow-xs cursor-pointer"
                    title="Exportar disciplinas e tópicos deste plano para arquivo Excel (.xlsx)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-emerald-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Exportar Excel</span>
                </button>

                {/* Botão Importar Excel */}
                <button
                    onClick={onOpenImport}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    title="Importar disciplinas e tópicos de planilha Excel (.xlsx)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Importar Excel</span>
                </button>

                {/* Botão Nova Disciplina */}
                <button 
                    onClick={onAddDiscipline}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors justify-center text-xs shadow-xs cursor-pointer"
                >
                    <PlusCircleIcon className="w-4 h-4" />
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

const PlanDetailPage: React.FC<{ 
    plan: StudyPlan; 
    onEdit: () => void; 
    onAddDiscipline: () => void; 
    onDeletePlan: () => void; 
    onDeleteDiscipline: (planId: string, disciplineId: string) => void; 
    onViewDiscipline: (planId: string, disciplineId: string) => void; 
    onEditDiscipline: (planId: string, disciplineId: string) => void; 
    onImportDisciplines?: (planId: string, disciplines: ParsedDisciplineImport[], mode: 'append' | 'replace') => Promise<void>;
}> = ({ 
    plan, 
    onEdit, 
    onAddDiscipline, 
    onDeletePlan, 
    onDeleteDiscipline, 
    onViewDiscipline, 
    onEditDiscipline,
    onImportDisciplines
}) => {
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

    return (
        <div className="space-y-8">
            <PlanHeader 
                plan={plan} 
                onEdit={onEdit} 
                onAddDiscipline={onAddDiscipline} 
                onDelete={onDeletePlan}
                onOpenImport={() => setIsImportModalOpen(true)}
                onExportExcel={() => exportPlanToExcel(plan)}
                onDownloadTemplate={() => downloadExcelTemplate()}
            />
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

            <ExcelImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                planName={plan.name}
                existingDisciplinesCount={plan.disciplines.length}
                onConfirmImport={async (disciplines, mode) => {
                    if (onImportDisciplines) {
                        await onImportDisciplines(plan.id, disciplines, mode);
                    }
                }}
            />
        </div>
    );
};

export default PlanDetailPage;