import * as React from 'react';
import Card from './Card';
import StatCard from './StatCard';
import PerformancePanel from './PerformanceChart';
import ProgressBar from './ProgressBar';
import WeeklyStudyChart from './WeeklyStudyChart';
import DailyStudyCard from './DailyStudyCard';
import { StudyPlan, SubjectPerformance, HistoryLog, WeeklyStudy, Exam } from '../types';
import RecentActivities from './RecentActivities';
import StudyCalendar from './StudyCalendar';
import DailyStudyDetailModal from './DailyStudyDetailModal';
import { parseDate, formatDateToYYYYMMDD } from '../src/utils/dateUtils';
import PlanFilter from './PlanFilter';
import GreetingCard from './GreetingCard';
import ExamCountdownCard from './ExamCountdownCard';
import StudyStreakCard from './StudyStreakCard';
import { UserStudyStreak } from '../types';

type AugmentedHistoryLog = HistoryLog & {
    disciplineName: string;
    disciplineColor: string;
};

const formatTime = (minutes: number) => {
    if (!minutes || minutes < 1) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
};


interface DashboardProps {
    plans: StudyPlan[];
    exams: Exam[];
    userName: string;
    onAddExam: () => void;
    onEditExam: (exam: Exam) => void;
    onDeleteExam: (examId: string) => void;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
    streak?: UserStudyStreak;
    isStreakLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ plans, exams, userName, onAddExam, onEditExam, onDeleteExam, selectedFilterPlanIds, onSelectPlans, streak, isStreakLoading = false }) => {
    const [isDailyDetailModalOpen, setIsDailyDetailModalOpen] = React.useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = React.useState<Date | null>(null);

    const dashboardData = React.useMemo(() => {

        // Filter plans based on selectedFilterPlanIds
        const plansToAggregate = selectedFilterPlanIds.includes('all')
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));

        // Total Stats
        const totalStudyMinutes = plansToAggregate.reduce((sum, plan) => sum + plan.totalHoursStudied, 0);
        const totalDisciplines = plansToAggregate.reduce((sum, plan) => sum + plan.subjects, 0);
        const totalTopics = plansToAggregate.reduce((sum, plan) => sum + plan.topics, 0);
        const motivation = "Continue firme, cada dia conta!";

        // All Logs
        const allLogs: AugmentedHistoryLog[] = plansToAggregate.flatMap(plan =>
            plan.disciplines.flatMap(disc =>
                (disc.historyLogs || []).map(log => ({
                    ...log,
                    disciplineName: disc.name,
                    disciplineColor: disc.color,
                }))
            )
        );
        
        allLogs.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

        // Daily Study
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parseTimeToMinutes = (timeStr: string): number => {
            if (!timeStr || timeStr === '-') return 0;
            let hours = 0, minutes = 0;
            const hMatch = timeStr.match(/(\d+)h/);
            const mMatch = timeStr.match(/(\d+)m/);
            if (hMatch) hours = parseInt(hMatch[1], 10);
            if (mMatch) minutes = parseInt(mMatch[1], 10);
            return hours * 60 + minutes;
        };
        
        const todayLogs = allLogs.filter(log => parseDate(log.date).getTime() === today.getTime());
        const dailyStudyTime = todayLogs.reduce((sum, log) => sum + parseTimeToMinutes(log.time), 0);
        const dailyCorrect = todayLogs.reduce((sum, log) => sum + (log.correct || 0), 0);
        const dailyIncorrect = todayLogs.reduce((sum, log) => sum + (log.incorrect || 0), 0);
        const dailyQuestions = dailyCorrect + dailyIncorrect;
        const dailyAccuracy = dailyQuestions > 0 ? (dailyCorrect / dailyQuestions) * 100 : 0;
            
        // Weekly Chart Data
        const weeklyStudyDataMap = new Map<string, { time: number; questions: number }>();
        const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
        const todayIndex = new Date().getDay();
        const orderedDayNames = [...dayNames.slice(todayIndex + 1), ...dayNames.slice(0, todayIndex + 1)];
        
        orderedDayNames.forEach(day => weeklyStudyDataMap.set(day, { time: 0, questions: 0 }));

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 6);
        last7Days.setHours(0,0,0,0);

        allLogs
          .filter(log => parseDate(log.date) >= last7Days)
          .forEach(log => {
              const dayName = dayNames[parseDate(log.date).getDay()];
              const current = weeklyStudyDataMap.get(dayName)!;
              current.time += parseTimeToMinutes(log.time);
              current.questions += log.correct + log.incorrect;
              weeklyStudyDataMap.set(dayName, current);
          });

        const weeklyStudy: WeeklyStudy[] = orderedDayNames.map(day => ({
            day,
            time: weeklyStudyDataMap.get(day)?.time || 0,
            questions: weeklyStudyDataMap.get(day)?.questions || 0
        }));

        // Performance Panel Data
        const performanceDataMap = new Map<string, { studyTime: number; correctAnswers: number; incorrectAnswers: number }>();
        plansToAggregate.forEach(plan => {
            plan.disciplines.forEach(disc => {
                const existing = performanceDataMap.get(disc.name) || { studyTime: 0, correctAnswers: 0, incorrectAnswers: 0 };
                existing.studyTime += disc.studyTimeInMinutes || 0;
                existing.correctAnswers += disc.performance?.correct || 0;
                existing.incorrectAnswers += disc.performance?.incorrect || 0;
                performanceDataMap.set(disc.name, existing);
            });
        });
        const performanceData: SubjectPerformance[] = Array.from(performanceDataMap.entries()).map(([name, data], index) => ({
            id: `perf-${index}`,
            name,
            ...data
        })).sort((a,b) => b.studyTime - a.studyTime);

        // Syllabus Progress
        let completedTopics = 0;
        let totalSyllabusTopics = 0;
        plansToAggregate.forEach(plan => {
            plan.disciplines.forEach(disc => {
                const topics = disc.topicsList || [];
                totalSyllabusTopics += topics.length; 
                completedTopics += topics.filter(t => t.status === 'Concluído').length;
            });
        });
        const syllabusPercentage = totalSyllabusTopics > 0 ? (completedTopics / totalSyllabusTopics) * 100 : 0;
        
        // Recent Activities
        const recentActivities = allLogs.slice(0, 5);

        // Calendar Data Aggregation
        const studyLogsByDate = new Map<string, { totalMinutes: number; logs: AugmentedHistoryLog[] }>();
        allLogs.forEach(log => {
            const dateKey = formatDateToYYYYMMDD(parseDate(log.date));
            const current = studyLogsByDate.get(dateKey) || { totalMinutes: 0, logs: [] };
            current.totalMinutes += parseTimeToMinutes(log.time);
            current.logs.push(log);
            studyLogsByDate.set(dateKey, current);
        });


        return {
            totalStudyMinutes,
            totalDisciplines,
            totalTopics,
            motivation,
            dailyStudyTime,
            dailyQuestions,
            dailyAccuracy,
            weeklyStudy,
            performanceData,
            completedTopics,
            totalSyllabusTopics,
            syllabusPercentage,
            recentActivities,
            studyLogsByDate,
        };
    }, [plans, selectedFilterPlanIds]);

    const handleDayClick = (date: Date) => {
        setSelectedDateForModal(date);
        setIsDailyDetailModalOpen(true);
    };

    const dailyLogsForModal = selectedDateForModal 
        ? dashboardData.studyLogsByDate.get(formatDateToYYYYMMDD(selectedDateForModal))?.logs || []
        : [];

    const effectiveStreak: UserStudyStreak = React.useMemo(() => {
        const base = streak || {
            sequencia_dias_atual: 0,
            sequencia_dias_recorde: 0,
            questoes_hoje: 0,
            questoes_recorde_diario: 0,
            ultimo_dia_estudado: null,
        };
        const todayQuestions = dashboardData.dailyQuestions;
        const currentToday = Math.max(base.questoes_hoje || 0, todayQuestions);
        const recordQuestions = Math.max(base.questoes_recorde_diario || 0, currentToday);
        return {
            ...base,
            questoes_hoje: currentToday,
            questoes_recorde_diario: recordQuestions,
        };
    }, [streak, dashboardData.dailyQuestions]);

  return (
    <>
        <header>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">Bem-vindo(a) de volta! Aqui está seu progresso.</p>
        </header>

        <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

        <div className="space-y-6">
            {/* Nova Linha: Saudação e Calendário de Provas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GreetingCard userName={userName} />
                <ExamCountdownCard 
                    exams={exams} 
                    onAddClick={onAddExam} 
                    onEditClick={onEditExam}
                    onDeleteClick={onDeleteExam}
                />
            </div>

            {/* Bloco de Métricas Visuais: Ofensiva de Estudos */}
            <StudyStreakCard streak={effectiveStreak} isLoading={isStreakLoading} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                <StatCard title="Tempo total de estudo" value={formatTime(dashboardData.totalStudyMinutes)} />
                <StatCard title="Total de Disciplinas" value={`${dashboardData.totalDisciplines}`} />
                <StatCard title="Total de Tópicos" value={`${dashboardData.totalTopics}`} />
                <Card>
                    <div className="flex flex-col justify-center h-full">
                        <p className="text-lg font-medium text-gray-300">"{dashboardData.motivation}"</p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <WeeklyStudyChart data={dashboardData.weeklyStudy} />
                </div>
                <div className="flex flex-col">
                    <DailyStudyCard 
                        timeInMinutes={dashboardData.dailyStudyTime} 
                        questions={dashboardData.dailyQuestions}
                        accuracy={dashboardData.dailyAccuracy}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-1">
                    <StudyCalendar 
                        studyLogsByDate={dashboardData.studyLogsByDate} 
                        onDayClick={handleDayClick} 
                    />
                </div>
                <div className="lg:col-span-1">
                    <div className="space-y-6">
                        <Card>
                            <h2 className="text-xl font-semibold text-white mb-4">Progresso no Edital</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <ProgressBar percentage={dashboardData.syllabusPercentage} />
                                </div>
                                <span className="font-bold text-lg text-emerald-400">{dashboardData.syllabusPercentage.toFixed(1)}%</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">{dashboardData.completedTopics} de {dashboardData.totalSyllabusTopics} tópicos concluídos.</p>
                        </Card>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <RecentActivities activities={dashboardData.recentActivities} />
            </div>
        </div>

        <DailyStudyDetailModal
            isOpen={isDailyDetailModalOpen}
            onClose={() => setIsDailyDetailModalOpen(false)}
            selectedDate={selectedDateForModal}
            dailyLogs={dailyLogsForModal}
        />
    </>
  );
};

export default Dashboard;