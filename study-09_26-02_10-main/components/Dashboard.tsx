import * as React from 'react';
import Card from './Card';
import StatCard from './StatCard';
import PerformancePanel from './PerformanceChart';
import ProgressBar from './ProgressBar';
import WeeklyStudyChart from './WeeklyStudyChart';
import DailyStudyCard from './DailyStudyCard';
import { StudyPlan, SubjectPerformance, HistoryLog, WeeklyStudy, Exam, Simulado, Revision } from '../types';
import RecentActivities from './RecentActivities';
import StudyCalendar from './StudyCalendar';
import DailyStudyDetailModal from './DailyStudyDetailModal';
import { parseDate, formatDateToYYYYMMDD, getTodayAsYYYYMMDDLocal } from '../src/utils/dateUtils';
import PlanFilter from './PlanFilter';
import GreetingCard from './GreetingCard';
import ExamCountdownCard from './ExamCountdownCard';
import StudyStreakCard from './StudyStreakCard';
import { UserStudyStreak } from '../types';
import { recalculateStreakFromEntries, normalizeDateString, StudyLogEntry } from '../src/utils/streakUtils';
import { PendingRevisionsHeaderBadge, UpcomingRevisionsCard, PendingRevisionsDrawer } from './PendingRevisionsAlert';

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
    simulados?: Simulado[];
    onNavigate?: (page: string) => void;
    onStartStudyForRevision?: (revision: Revision) => void;
    onAddLogForRevisionRequest?: (revision: Revision) => void;
    onCompleteRevision?: (revision: Revision) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    plans, 
    exams, 
    userName, 
    onAddExam, 
    onEditExam, 
    onDeleteExam, 
    selectedFilterPlanIds, 
    onSelectPlans, 
    streak, 
    isStreakLoading = false,
    simulados = [],
    onNavigate,
    onStartStudyForRevision,
    onAddLogForRevisionRequest,
    onCompleteRevision
}) => {
    const [isDailyDetailModalOpen, setIsDailyDetailModalOpen] = React.useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = React.useState<Date | null>(null);
    const [isRevisionsDrawerOpen, setIsRevisionsDrawerOpen] = React.useState(false);

    const isAllSelected = selectedFilterPlanIds.includes('all');

    const revisionsData = React.useMemo(() => {
        const todayStr = getTodayAsYYYYMMDDLocal();
        const selectedPlans = isAllSelected
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));

        const today: Revision[] = [];
        const overdue: Revision[] = [];

        selectedPlans.forEach(plan => {
            (plan.disciplines || []).forEach(discipline => {
                (discipline.revisions || []).forEach(rev => {
                    if (rev.status === 'Programada') {
                        if (rev.dueDate === todayStr) {
                            today.push(rev);
                        } else if (rev.dueDate < todayStr) {
                            overdue.push(rev);
                        }
                    }
                });
            });
        });

        overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        today.sort((a, b) => a.disciplineName.localeCompare(b.disciplineName));

        const parts = todayStr.split('-');
        const ddmm = parts.length === 3 ? `${parts[2]}/${parts[1]}` : '';

        return {
            todayList: today,
            overdueList: overdue,
            todayCount: today.length,
            overdueCount: overdue.length,
            totalPending: today.length + overdue.length,
            todayDDMM: ddmm,
        };
    }, [plans, selectedFilterPlanIds, isAllSelected]);

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

    const selectedPlanName = React.useMemo(() => {
        if (isAllSelected) return null;
        if (selectedFilterPlanIds.length === 1) {
            const p = plans.find(plan => plan.id === selectedFilterPlanIds[0]);
            return p?.name || null;
        }
        return `${selectedFilterPlanIds.length} planos`;
    }, [plans, selectedFilterPlanIds, isAllSelected]);

    // Cálculo dinâmico das métricas da Ofensiva de Estudos considerando exclusivamente o(s) plano(s) selecionado(s)
    const effectiveStreak: UserStudyStreak = React.useMemo(() => {
        const plansToAggregate = isAllSelected
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));

        const planStudyEntries: StudyLogEntry[] = [];

        // 1. Registros das disciplinas dos planos selecionados
        plansToAggregate.forEach(plan => {
            (plan.disciplines || []).forEach(disc => {
                (disc.historyLogs || []).forEach(log => {
                    const rawOrDate = (log as any).rawDate || log.date;
                    const dateStr = normalizeDateString(rawOrDate);
                    if (dateStr) {
                        const q = (Number(log.correct) || 0) + (Number(log.incorrect) || 0);
                        planStudyEntries.push({
                            date: dateStr,
                            questions: q,
                            planId: plan.id,
                        });
                    }
                });
            });
        });

        // 2. Simulados vinculados aos planos selecionados
        (simulados || []).forEach(s => {
            const belongsToPlan = isAllSelected || (s.plan_id && selectedFilterPlanIds.includes(s.plan_id));
            if (belongsToPlan) {
                const dateStr = normalizeDateString(s.date);
                if (dateStr) {
                    const q = (s.disciplines || []).reduce((acc: number, d: any) => {
                        const discQ = d.totalQuestions !== undefined && d.totalQuestions !== null
                            ? Number(d.totalQuestions)
                            : (Number(d.correctAnswers) || 0) + (Number(d.incorrectAnswers) || 0) + (Number(d.blankAnswers) || 0);
                        return acc + (Number(discQ) || 0);
                    }, 0);
                    planStudyEntries.push({
                        date: dateStr,
                        questions: q,
                        planId: s.plan_id,
                    });
                }
            }
        });

        // 3. Recálculo das 4 métricas com base estrita nos registros do plano selecionado
        const calculated = recalculateStreakFromEntries(planStudyEntries);

        // Se "Todos os Planos" estiver selecionado, preserva os recordes históricos globais
        if (isAllSelected && streak) {
            return {
                sequencia_dias_atual: calculated.sequencia_dias_atual,
                sequencia_dias_recorde: Math.max(calculated.sequencia_dias_recorde, streak.sequencia_dias_recorde || 0),
                questoes_hoje: calculated.questoes_hoje,
                questoes_recorde_diario: Math.max(calculated.questoes_recorde_diario, streak.questoes_recorde_diario || 0),
                ultimo_dia_estudado: calculated.ultimo_dia_estudado || streak.ultimo_dia_estudado,
            };
        }

        // Se um plano específico estiver selecionado:
        // Identificar se este plano é o detentor dos recordes históricos do usuário
        if (!isAllSelected && streak && plansToAggregate.length === 1) {
            const currentPlanId = plansToAggregate[0].id;

            // Encontrar qual plano possui mais registros de estudo no histórico
            let maxPlanId: string | null = null;
            let maxPlanEntryCount = -1;

            plans.forEach(p => {
                let count = 0;
                (p.disciplines || []).forEach(d => {
                    count += (d.historyLogs || []).length;
                });
                if (count > maxPlanEntryCount) {
                    maxPlanEntryCount = count;
                    maxPlanId = p.id;
                }
            });

            // Se este plano for o plano principal (ou o único plano cadastrado)
            if (maxPlanId === currentPlanId || plans.length === 1) {
                return {
                    sequencia_dias_atual: calculated.sequencia_dias_atual,
                    sequencia_dias_recorde: Math.max(calculated.sequencia_dias_recorde, streak.sequencia_dias_recorde || 0),
                    questoes_hoje: calculated.questoes_hoje,
                    questoes_recorde_diario: Math.max(calculated.questoes_recorde_diario, streak.questoes_recorde_diario || 0),
                    ultimo_dia_estudado: calculated.ultimo_dia_estudado || streak.ultimo_dia_estudado,
                };
            }
        }

        return calculated;
    }, [plans, simulados, selectedFilterPlanIds, isAllSelected, streak]);

  return (
    <>
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 mt-1">Bem-vindo(a) de volta! Aqui está seu progresso.</p>
            </div>

            {/* 1. Notificação no Topo (Header Badge) */}
            <PendingRevisionsHeaderBadge 
                todayCount={revisionsData.todayCount}
                overdueCount={revisionsData.overdueCount}
                totalPending={revisionsData.totalPending}
                onClick={() => setIsRevisionsDrawerOpen(true)}
            />
        </header>

        <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

        <div className="space-y-6">
            {/* Linha: Saudação e Calendário de Provas */}
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
            <StudyStreakCard streak={effectiveStreak} isLoading={isStreakLoading} planName={selectedPlanName} />

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

            {/* 2. Card de Destaque: Próximas Revisões (Abaixo das métricas) */}
            <UpcomingRevisionsCard 
                todayCount={revisionsData.todayCount}
                overdueCount={revisionsData.overdueCount}
                totalPending={revisionsData.totalPending}
                onClickDetails={() => setIsRevisionsDrawerOpen(true)}
            />

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

        {/* 3 e 4. Painel de Detalhes Lateral: Revisões do dia & Ação rápida */}
        <PendingRevisionsDrawer
            isOpen={isRevisionsDrawerOpen}
            onClose={() => setIsRevisionsDrawerOpen(false)}
            todayList={revisionsData.todayList}
            overdueList={revisionsData.overdueList}
            todayCount={revisionsData.todayCount}
            overdueCount={revisionsData.overdueCount}
            totalPending={revisionsData.totalPending}
            todayDDMM={revisionsData.todayDDMM}
            onNavigateToRevisoes={() => {
                setIsRevisionsDrawerOpen(false);
                if (onNavigate) onNavigate('revisoes');
            }}
            onStartStudyForRevision={(rev) => {
                setIsRevisionsDrawerOpen(false);
                if (onStartStudyForRevision) onStartStudyForRevision(rev);
            }}
            onAddLogForRevisionRequest={(rev) => {
                setIsRevisionsDrawerOpen(false);
                if (onAddLogForRevisionRequest) onAddLogForRevisionRequest(rev);
            }}
            onCompleteRevision={(rev) => {
                if (onCompleteRevision) onCompleteRevision(rev);
            }}
        />
    </>
  );
};

export default Dashboard;