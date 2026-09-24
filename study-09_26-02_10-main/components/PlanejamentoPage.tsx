import * as React from 'react';
import { Discipline, StudyPlan, StudySession, GeneratedCycle, SubjectWeight, WeeklyPlanningData } from '../types';
import CreateCycleModal from './CreateCycleModal';
import SelectSubjects from './SelectSubjects';
import WeeklyPlanning from './WeeklyPlanning';
import AdjustWeights from './AdjustWeights';
import ManualCycleCreator from './ManualCycleCreator';
import GeneratedPlanDashboard from './GeneratedPlanDashboard';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { PlusCircleIcon } from '../constants';
import PlanFilter from './PlanFilter';

interface PlanejamentoPageProps {
    plans: StudyPlan[];
    onRegisterManualStudy: (planId: string, disciplineId: string) => void;
    onStartStudy: (session: StudySession) => void;
    onNavigate: (page: string) => void;
    generatedCycles: GeneratedCycle[];
    onGenerateCycle: (weights: SubjectWeight[], selectedDisciplines: (Discipline & { planName: string; planId: string; })[], weeklyPlanningData: WeeklyPlanningData) => Promise<void>;
    onSaveManualCycle: (sessions: StudySession[], weeklyHours: number) => Promise<void>;
    onRemoveCycle: (planId: string) => Promise<void>;
    onStartNextCycle: (planId: string) => Promise<void>;
    onEditCycle: (planId: string) => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

type CreationMode = 'guided' | 'manual' | null;
type GuidedStep = 'selectSubjects' | 'weeklyPlanning' | 'adjustWeights';

const PlanejamentoPage: React.FC<PlanejamentoPageProps> = ({
    plans,
    onRegisterManualStudy,
    onStartStudy,
    onNavigate,
    generatedCycles,
    onGenerateCycle,
    onSaveManualCycle,
    onRemoveCycle,
    onStartNextCycle,
    onEditCycle,
    selectedFilterPlanIds,
    onSelectPlans,
}) => {
    const [creationMode, setCreationMode] = React.useState<CreationMode>(null);
    const [guidedStep, setGuidedStep] = React.useState<GuidedStep>('selectSubjects');
    const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = React.useState(false);

    const [selectedDisciplines, setSelectedDisciplines] = React.useState<(Discipline & { planName: string; planId: string; })[]>([]);
    const [weeklyPlanningData, setWeeklyPlanningData] = React.useState<WeeklyPlanningData | null>(null);
    const [subjectWeights, setSubjectWeights] = React.useState<SubjectWeight[] | null>(null);
    
    const [isDeleteCycleModalOpen, setIsDeleteCycleModalOpen] = React.useState(false);
    const [planIdToDelete, setPlanIdToDelete] = React.useState<string | null>(null);

    const allDisciplines = React.useMemo(() => {
        const plansToUse = selectedFilterPlanIds.includes('all')
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));

        return plansToUse.flatMap(plan =>
            plan.disciplines.map(discipline => ({
                ...discipline,
                planId: plan.id,
                planName: plan.name,
            }))
        );
    }, [plans, selectedFilterPlanIds]);

    const filteredCycles = React.useMemo(() => {
        if (selectedFilterPlanIds.includes('all')) return generatedCycles;
        return generatedCycles.filter(c => selectedFilterPlanIds.includes(c.planId));
    }, [generatedCycles, selectedFilterPlanIds]);

    const handleSelectMode = (mode: CreationMode) => {
        setCreationMode(mode);
        setIsCreateCycleModalOpen(false);
        if (mode === 'guided') {
            setGuidedStep('selectSubjects');
        }
    };

    const handleSelectSubjectsNext = (disciplines: (Discipline & { planName: string; planId: string; })[]) => {
        setSelectedDisciplines(disciplines);
        setGuidedStep('weeklyPlanning');
    };

    const handleWeeklyPlanningNext = (data: WeeklyPlanningData) => {
        setWeeklyPlanningData(data);
        setGuidedStep('adjustWeights');
    };

    const handleAdjustWeightsNext = async (weights: SubjectWeight[]) => {
        if (weeklyPlanningData) {
            await onGenerateCycle(weights, selectedDisciplines, weeklyPlanningData);
            setCreationMode(null);
        }
    };

    const handleManualCycleSave = async (sessions: StudySession[], weeklyHours: number) => {
        await onSaveManualCycle(sessions, weeklyHours);
        setCreationMode(null);
    };

    const handleBack = () => {
        if (creationMode === 'manual') {
            setCreationMode(null);
            setIsCreateCycleModalOpen(true);
        } else if (creationMode === 'guided') {
            if (guidedStep === 'adjustWeights') {
                setGuidedStep('weeklyPlanning');
            } else if (guidedStep === 'weeklyPlanning') {
                setGuidedStep('selectSubjects');
            } else if (guidedStep === 'selectSubjects') {
                setCreationMode(null);
                setIsCreateCycleModalOpen(true);
            }
        }
    };

    const handleRemoveCycleRequest = (planId: string) => {
        setPlanIdToDelete(planId);
        setIsDeleteCycleModalOpen(true);
    };

    const handleConfirmRemoveCycle = async () => {
        if (planIdToDelete) {
            await onRemoveCycle(planIdToDelete);
        }
        setIsDeleteCycleModalOpen(false);
        setPlanIdToDelete(null);
    };

    if (allDisciplines.length === 0) {
        return (
            <>
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Planejamento</h1>
                </header>
                <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
                <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-3xl mx-auto my-8 text-white">
                    <h2 className="text-3xl font-bold mb-4">Nenhuma Disciplina Encontrada</h2>
                    <p className="text-gray-400 mb-8 text-center">
                        Para criar um ciclo de estudos, você precisa primeiro adicionar disciplinas aos seus planos.
                    </p>
                    <button
                        onClick={() => onNavigate('plans')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 transition-colors shadow-lg hover:shadow-emerald-500/50"
                    >
                        <PlusCircleIcon className="w-7 h-7" />
                        <span>Adicionar Disciplinas</span>
                    </button>
                </div>
            </>
        );
    }

    if (creationMode === 'manual') {
        return (
            <>
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Planejamento</h1>
                </header>
                <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
                <ManualCycleCreator
                    allDisciplines={allDisciplines}
                    onBack={handleBack}
                    onSave={handleManualCycleSave}
                />
            </>
        );
    }

    if (creationMode === 'guided') {
        switch (guidedStep) {
            case 'selectSubjects':
                return (
                    <>
                        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h1 className="text-3xl font-bold text-white">Planejamento</h1>
                        </header>
                        <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
                        <SelectSubjects
                            allDisciplines={allDisciplines}
                            onBack={handleBack}
                            onNext={handleSelectSubjectsNext}
                            initialSelectedIds={new Set(selectedDisciplines.map(d => d.id))}
                        />
                    </>
                );
            case 'weeklyPlanning':
                return (
                    <>
                        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h1 className="text-3xl font-bold text-white">Planejamento</h1>
                        </header>
                        <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
                        <WeeklyPlanning
                            selectedSubjectsCount={selectedDisciplines.length}
                            onBack={handleBack}
                            onNext={handleWeeklyPlanningNext}
                            initialData={weeklyPlanningData}
                        />
                    </>
                );
            case 'adjustWeights':
                return (
                    <>
                        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h1 className="text-3xl font-bold text-white">Planejamento</h1>
                        </header>
                        <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
                        <AdjustWeights
                            selectedDisciplines={selectedDisciplines}
                            weeklyPlanningData={weeklyPlanningData!}
                            onBack={handleBack}
                            onNext={handleAdjustWeightsNext}
                            initialData={subjectWeights}
                        />
                    </>
                );
        }
    }

    if (filteredCycles.length > 0) {
        return (
            <>
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">Planejamento</h1>
                    {!selectedFilterPlanIds.includes('all') && selectedFilterPlanIds.length === 1 && (
                         <button
                            onClick={() => setIsCreateCycleModalOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-lg">
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>Novo Ciclo</span>
                        </button>
                    )}
                </header>
                <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
                
                <div className="space-y-12">
                    {filteredCycles.map(cycle => {
                        const plan = plans.find(p => p.id === cycle.planId);
                        return (
                            <GeneratedPlanDashboard
                                key={cycle.id}
                                cycle={cycle}
                                planName={plan?.name || 'Plano Desconhecido'}
                                onRegisterManualStudy={onRegisterManualStudy}
                                onStartStudy={onStartStudy}
                                onEdit={onEditCycle}
                                onRemove={handleRemoveCycleRequest}
                                onStartNextCycle={onStartNextCycle}
                            />
                        );
                    })}
                </div>

                <DeleteConfirmationModal
                    isOpen={isDeleteCycleModalOpen}
                    onClose={() => setIsDeleteCycleModalOpen(false)}
                    onConfirm={handleConfirmRemoveCycle}
                    itemType="ciclo"
                />
            </>
        );
    }

    return (
        <>
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Planejamento</h1>
            </header>
            <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
            <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-3xl mx-auto my-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Nenhum Ciclo de Estudos Encontrado</h2>
                <p className="text-gray-400 mb-8 text-center">
                    {selectedFilterPlanIds.includes('all') 
                        ? 'Você ainda não criou nenhum ciclo de estudos. Selecione um plano para começar.'
                        : `Você ainda não criou um ciclo de estudos para os planos selecionados.`}
                </p>
                {!selectedFilterPlanIds.includes('all') && selectedFilterPlanIds.length === 1 && (
                    <button
                        onClick={() => setIsCreateCycleModalOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-3 transition-colors shadow-lg hover:shadow-emerald-500/50"
                    >
                        <PlusCircleIcon className="w-7 h-7" />
                        <span>Criar Novo Ciclo de Estudos</span>
                    </button>
                )}

                <CreateCycleModal
                    isOpen={isCreateCycleModalOpen}
                    onClose={() => setIsCreateCycleModalOpen(false)}
                    onSelectMode={handleSelectMode}
                />
            </div>
        </>
    );
};

export default PlanejamentoPage;