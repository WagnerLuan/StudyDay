import * as React from 'react';
import { StudyPlan } from '../types';
import DisciplineCard from './DisciplineCard';
import { BookOpenIcon, QuestionMarkCircleIcon, TrendingUpIcon } from '../constants';
import PlanFilter from './PlanFilter';

const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

const getPerformanceColor = (performance: number) => {
    if (performance < 70) return 'text-red-500';
    if (performance < 80) return 'text-yellow-400';
    return 'text-green-400';
};

const StatItem: React.FC<{ icon: React.ReactNode; value: string; label: string; valueColor?: string }> = ({ icon, value, label, valueColor = 'text-white' }) => (
    <div className="bg-gray-800 p-6 text-center">
        <div className="text-emerald-400 w-10 h-10 mx-auto mb-2 flex items-center justify-center">{icon}</div>
        <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
        <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
);

const StatsBar: React.FC<{ stats: { totalHours: number; totalQuestions: number; performance: number } }> = ({ stats }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-700 rounded-xl overflow-hidden shadow-lg">
        <StatItem icon={<BookOpenIcon />} value={formatTime(stats.totalHours)} label="Total de Horas Estudadas" valueColor="text-emerald-400" />
        <StatItem icon={<QuestionMarkCircleIcon />} value={stats.totalQuestions.toString()} label="Total de Questões Resolvidas" valueColor="text-emerald-400" />
        <StatItem icon={<TrendingUpIcon />} value={`${stats.performance}%`} label="Desempenho Geral" valueColor={getPerformanceColor(stats.performance)} />
    </div>
);

interface DisciplinesPageProps {
    plans: StudyPlan[];
    onViewDiscipline: (planId: string, disciplineId: string) => void;
    onEditDiscipline: (planId: string, disciplineId: string) => void;
    onDeleteDiscipline: (planId: string, disciplineId: string) => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const DisciplinesPage: React.FC<DisciplinesPageProps> = ({ plans, onViewDiscipline, onEditDiscipline, onDeleteDiscipline, selectedFilterPlanIds, onSelectPlans }) => {
    const allDisciplines = React.useMemo(() => plans.flatMap(plan => 
        plan.disciplines.map(discipline => ({
            ...discipline,
            planId: plan.id,
            planName: plan.name,
        }))
    ), [plans]);

    const filteredDisciplines = React.useMemo(() => {
        if (selectedFilterPlanIds.includes('all')) {
            return allDisciplines;
        }
        return allDisciplines.filter(d => selectedFilterPlanIds.includes(d.planId));
    }, [selectedFilterPlanIds, allDisciplines]);
    
    const aggregatedStats = React.useMemo(() => {
        let totalMinutes = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0;

        filteredDisciplines.forEach(d => {
            totalMinutes += d.studyTimeInMinutes || 0;
            totalCorrect += d.performance?.correct || 0;
            totalIncorrect += d.performance?.incorrect || 0;
        });
        
        const totalQuestions = totalCorrect + totalIncorrect;
        const performance = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        
        return {
            totalHours: totalMinutes,
            totalQuestions,
            performance: parseFloat(performance.toFixed(1)),
        };
    }, [filteredDisciplines]);


    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Todas as Matérias</h1>
                    <p className="text-gray-400 mt-1">Veja uma visão geral de todas as disciplinas de seus planos de estudo.</p>
                </div>
            </header>

            <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />
            
            <StatsBar stats={aggregatedStats} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDisciplines.map(discipline => (
                    <DisciplineCard 
                        key={`${discipline.planId}-${discipline.id}`}
                        discipline={discipline} 
                        planName={discipline.planName}
                        onView={() => onViewDiscipline(discipline.planId, discipline.id)}
                        onEdit={() => onEditDiscipline(discipline.planId, discipline.id)}
                        onDelete={() => onDeleteDiscipline(discipline.planId, discipline.id)}
                    />
                ))}
                 {filteredDisciplines.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-800 rounded-lg">
                        <p className="text-gray-400">Nenhuma disciplina encontrada para o filtro selecionado.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DisciplinesPage;