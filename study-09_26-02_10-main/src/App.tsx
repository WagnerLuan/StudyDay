"use client";

import * as React from 'react';
import Sidebar from '../components/Sidebar';
import PlansPage from '../components/PlansPage';
import Dashboard from '../components/Dashboard';
import PlanDetailPage from '../components/PlanDetailPage';
import DisciplineDetailPage from '../components/DisciplineDetailPage';
import CreatePlanModal from '../components/CreatePlanModal';
import AddDisciplineModal from '../components/AddDisciplineModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import StudyLogModal, { StudyLogFormData } from '../components/StudyLogModal';
import { MenuIcon, XIcon, ClockIcon } from '../constants';
import { Discipline, StudyPlan, Topic, HistoryLog, StudySession, Revision, GeneratedCycle, SubjectWeight, WeeklyPlanningData, StudyBlock, Simulado, Exam, Deck, Flashcard, UserStudyStreak } from '../types';
import DisciplinesPage from '../components/DisciplinesPage';
import EditalPage from '../components/EditalPage';
import PlanejamentoPage from '../components/PlanejamentoPage';
import BlockPlanningPage from '../components/BlockPlanningPage';
import StudyTimerModal from '../components/StudyTimerModal';
import FloatingTimer from '../components/FloatingTimer'; 
import { useTimer } from './hooks/useTimer'; 
import { GoogleGenAI, Type } from "@google/genai";
import HistoryPage from '../components/HistoryPage';
import RevisoesPage from '../components/RevisoesPage';
import StatisticsPage from '../components/StatisticsPage';
import SimuladosPage from '../components/SimuladosPage';
import LoginPage from '../components/LoginPage';
import RegisterPage from '../components/RegisterPage';
import ProfileSettingsPage from '../components/ProfileSettingsPage';
import NotesPage from '../components/NotesPage';
import FlashcardsPage from '../components/FlashcardsPage';
import FlashcardReviewModal from '../components/FlashcardReviewModal';
import { useSupabase } from './components/SupabaseProvider';
import { supabase } from './lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from './utils/toast';
import { parseTopicsText } from './utils/topicUtils';
import { parseDate, getTodayAsYYYYMMDDLocal, formatDateToYYYYMMDD } from './utils/dateUtils';
import { parseTimeToMinutes } from './utils/timeUtils';
import { DEFAULT_STREAK, recalculateStreakFromEntries, sincronizarOfensivaUsuario as syncUserStreakFromDB, StudyLogEntry } from './utils/streakUtils';

import EditCycleSessionsModal from '../components/EditCycleSessionsModal';
import ViewHistoryLogModal from '../components/ViewHistoryLogModal';
import AddExamModal from '../components/AddExamModal';

const recalculatePlanStats = (plan: StudyPlan): StudyPlan => {
    let totalPlanMinutes = 0;
    let totalPlanQuestions = 0;
    let totalPlanCorrect = 0;

    const updatedDisciplines = plan.disciplines.map(discipline => {
        const logs = discipline.historyLogs || [];
        let totalDiscMinutes = 0;
        let totalDiscCorrect = 0;
        let totalDiscIncorrect = 0;

        logs.forEach(log => {
            totalDiscMinutes += parseTimeToMinutes(log.time);
            totalDiscCorrect += (log.correct || 0);
            totalDiscIncorrect += (log.incorrect || 0);
        });
        
        const studiedTopicsCount = (discipline.topicsList || []).filter(t => t.status === 'Concluído').length;

        const updatedDiscipline: Discipline = {
            ...discipline,
            totalTopics: (discipline.topicsList || []).length,
            studiedTopics: studiedTopicsCount,
            studyTimeInMinutes: totalDiscMinutes,
            resolvedQuestions: totalPlanQuestions,
            performance: {
                correct: totalDiscCorrect,
                incorrect: totalDiscIncorrect,
            },
        };

        totalPlanMinutes += totalDiscMinutes;
        totalPlanCorrect += totalDiscCorrect;
        totalPlanQuestions += (totalDiscCorrect + totalDiscIncorrect);

        return updatedDiscipline;
    });

    const overallPerformance = totalPlanQuestions > 0 ? (totalPlanCorrect / totalPlanQuestions) * 100 : 0;

    return {
        ...plan,
        disciplines: updatedDisciplines,
        totalHoursStudied: totalPlanMinutes,
        totalQuestionsResolved: totalPlanQuestions,
        overallPerformance: parseFloat(overallPerformance.toFixed(1)),
        subjects: updatedDisciplines.length,
        topics: updatedDisciplines.reduce((sum, d) => sum + d.totalTopics, 0),
    };
};

const applyLogChangeToCycle = (cycle: GeneratedCycle, disciplineId: string, minutesDelta: number, logId: string): GeneratedCycle => {
    const updatedCycle = JSON.parse(JSON.stringify(cycle));
    let remaining = minutesDelta;

    if (minutesDelta > 0) {
        const sessions = [...updatedCycle.studySequence];
        const newlyCompleted: StudySession[] = [];
        let lastAffectedSession: StudySession | null = null;
        
        for (let i = 0; i < sessions.length && remaining > 0; i++) {
            if (sessions[i].disciplineId === disciplineId && sessions[i].status === 'Pendente') {
                const needed = sessions[i].totalTime - sessions[i].studiedTime;
                const added = Math.min(needed, remaining);
                sessions[i].studiedTime += added;
                remaining -= added;
                lastAffectedSession = sessions[i];
                
                if (sessions[i].studiedTime >= sessions[i].totalTime) {
                    sessions[i].status = 'Concluído';
                    sessions[i].historyLogId = logId;
                    newlyCompleted.push(sessions[i]);
                }
            }
        }

        if (remaining > 0) {
            if (lastAffectedSession) {
                lastAffectedSession.studiedTime += remaining;
            } else {
                const lastCompleted = updatedCycle.completedStudies
                    .filter((s: StudySession) => s.disciplineId === disciplineId)
                    .slice(-1)[0];
                if (lastCompleted) {
                    lastCompleted.studiedTime += remaining;
                }
            }
            remaining = 0;
        }
        
        updatedCycle.studySequence = sessions.filter(s => s.status === 'Pendente');
        updatedCycle.completedStudies = [...updatedCycle.completedStudies, ...newlyCompleted];
    } else if (minutesDelta < 0) {
        let toRemove = Math.abs(remaining);
        const completed = [...updatedCycle.completedStudies];
        const restored: StudySession[] = [];
        
        for (let i = completed.length - 1; i >= 0 && toRemove > 0; i--) {
            if (completed[i].disciplineId === disciplineId && completed[i].historyLogId === logId) {
                const amount = completed[i].studiedTime;
                toRemove -= amount;
                completed[i].studiedTime = 0;
                completed[i].status = 'Pendente';
                delete completed[i].historyLogId;
                restored.unshift(completed[i]);
                completed.splice(i, 1);
            }
        }
        
        const pending = [...updatedCycle.studySequence];
        for (let i = pending.length - 1; i >= 0 && toRemove > 0; i--) {
            if (pending[i].disciplineId === disciplineId && pending[i].studiedTime > 0) {
                const amount = Math.min(pending[i].studiedTime, toRemove);
                pending[i].studiedTime -= amount;
                toRemove -= amount;
            }
        }
        
        updatedCycle.completedStudies = completed;
        updatedCycle.studySequence = [...restored, ...pending];
    }

    updatedCycle.weeklyProgress.completed += (minutesDelta / 60);
    return updatedCycle;
};

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState('home');
  const [plans, setPlans] = React.useState<StudyPlan[]>([]);
  const [studyBlocks, setStudyBlocks] = React.useState<StudyBlock[]>([]);
  const [simulados, setSimulados] = React.useState<Simulado[]>([]);
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null);
  const [selectedDisciplineInfo, setSelectedDisciplineInfo] = React.useState<{planId: string, disciplineId: string} | null>(null);
  
  const { session, isLoading: isSupabaseLoading } = useSupabase();
  const isAuthenticated = !!session;
  const [authPage, setAuthPage] = React.useState<'login' | 'register'>('login');
  const [isDataLoading, setIsDataLoading] = React.useState(true);

  const [isPlanModalOpen, setPlanModalOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<StudyPlan | null>(null);
  const [isDisciplineModalOpen, setDisciplineModalOpen] = React.useState(false);
  const [planToAddDisciplineToId, setPlanToAddDisciplineToId] = React.useState<string | null>(null);
  const [editingDiscipline, setEditingDiscipline] = React.useState<{planId: string, discipline: Discipline} | null>(null);
  const [isPlanDeleteModalOpen, setPlanDeleteModalOpen] = React.useState(false);
  const [planToDelete, setPlanToDelete] = React.useState<string | null>(null);
  const [isDisciplineDeleteModalOpen, setDisciplineDeleteModalOpen] = React.useState(false);
  const [disciplineToDelete, setDisciplineToDelete] = React.useState<{planId: string, disciplineId: string} | null>(null);
  const [isLogModalOpen, setLogModalOpen] = React.useState(false);
    const [logModalContext, setLogModalContext] = React.useState<{
      plan: StudyPlan,
      discipline: Discipline | null,
      topic?: Topic | null,
      logToEdit?: HistoryLog | null,
      initialStudyTime?: string,
      initialCategory?: string,
      revisionId?: string,
      blockId?: string,
      completionDate?: string,
      source?: string
    } | null>(null);
  const [isLogDeleteModalOpen, setLogDeleteModalOpen] = React.useState(false);
  const [logToDelete, setLogToDelete] = React.useState<{planId: string, disciplineId: string, logId: string} | null>(null);
  const [isTimerModalOpen, setTimerModalOpen] = React.useState(false);
  const { state: timerState, displayTime, startTimer, pauseTimer, resumeTimer, resetTimer, stopTimer, setContext, setMinimized, setMode } = useTimer();
  const [isViewLogModalOpen, setViewLogModalOpen] = React.useState(false);
  const [logToView, setLogToView] = React.useState<(HistoryLog & { disciplineName: string; disciplineColor: string }) | null>(null);
  const [allCycles, setAllCycles] = React.useState<GeneratedCycle[]>([]);
  const [isEditCycleSessionsModalOpen, setIsEditCycleSessionsModalOpen] = React.useState(false);
  const [planIdToEditCycle, setPlanIdToEditCycle] = React.useState<string | null>(null);
  const [isAddExamModalOpen, setIsAddExamModalOpen] = React.useState(false);
  const [editingExam, setEditingExam] = React.useState<Exam | null>(null);

  const [isFlashcardReviewOpen, setIsFlashcardReviewOpen] = React.useState(false);
  const [activeReviewDeck, setActiveReviewDeck] = React.useState<Deck | null>(null);
  const [allFlashcards, setAllFlashcards] = React.useState<Flashcard[]>([]);

  const [selectedFilterPlanIds, setSelectedFilterPlanIds] = React.useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedFilterPlanIds');
      if (saved) {
          try { return JSON.parse(saved); } catch (e) { return ['all']; }
      }
    }
    return ['all'];
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedFilterPlanIds', JSON.stringify(selectedFilterPlanIds));
    }
  }, [selectedFilterPlanIds]);

  const [userStreak, setUserStreak] = React.useState<UserStudyStreak>(DEFAULT_STREAK);
  const [isStreakLoading, setIsStreakLoading] = React.useState<boolean>(true);

  // Limpeza de resquícios de streak no localStorage (migrado 100% para o Supabase)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('studyday_user_streak');
      } catch (e) {
        // ignore
      }
    }
  }, []);

  /**
   * Função centralizada de sincronização em tempo real da Ofensiva de Estudos.
   * Fonte Única da Verdade: busca todos os registros reais de estudo do Supabase (history_logs e simulados),
   * calcula matematicamente as 4 métricas, persiste na tabela profiles e atualiza o estado React.
   */
  const sincronizarOfensivaUsuario = React.useCallback(async (userId: string) => {
    setIsStreakLoading(true);
    try {
      const synced = await syncUserStreakFromDB(userId);
      setUserStreak(synced);
      return synced;
    } catch (err) {
      console.error("Erro ao sincronizar ofensiva do usuário:", err);
      return DEFAULT_STREAK;
    } finally {
      setIsStreakLoading(false);
    }
  }, []);

  const fetchPlans = React.useCallback(async (userId: string) => {

    setIsDataLoading(true);
    setIsStreakLoading(true);
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('study_plans')
        .select(`*, disciplines (*, topics (*), history_logs (*), revisions (*))`)
        .eq('user_id', userId);

      if (plansError) {
        showError("Erro ao carregar planos: " + plansError.message);
      } else {
        const hydratedPlans: StudyPlan[] = (plansData || []).map((plan: any) => {
          const disciplines: Discipline[] = plan.disciplines.map((disc: any) => ({
            ...disc,
            topicsText: disc.topics_text,
            weight: disc.peso !== undefined && disc.peso !== null
              ? Number(disc.peso)
              : (disc.weight !== undefined && disc.weight !== null ? Number(disc.weight) : 1.0),
            peso: disc.peso !== undefined && disc.peso !== null
              ? Number(disc.peso)
              : (disc.weight !== undefined && disc.weight !== null ? Number(disc.weight) : 1.0),
            topicsList: disc.topics.map((topic: any) => ({
              id: topic.id, 
              name: topic.name, 
              status: topic.status, 
              questionLink: topic.question_link, 
              completionDate: topic.completion_date, 
              incidence: topic.incidence,
              weight: topic.weight !== undefined ? Number(topic.weight) : (topic.peso !== undefined ? Number(topic.peso) : undefined),
              peso: topic.peso !== undefined ? Number(topic.peso) : (topic.weight !== undefined ? Number(topic.weight) : undefined),
            })),
            historyLogs: disc.history_logs.map((log: any) => {
              const [year, month, day] = log.log_date.split('-');
              const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              localDate.setHours(0, 0, 0, 0);
              return {
                id: log.id, date: localDate.toLocaleDateString('pt-BR'), topic: log.topic_name, time: log.study_time,
                correct: log.correct_questions || 0, incorrect: log.incorrect_questions || 0, pages: log.pages,
                category: log.category, material: log.material, comments: log.comments,
                rawDate: log.log_date,
              };
            }),
            revisions: disc.revisions.map((rev: any) => ({
              id: rev.id, originalLogId: rev.original_log_id, topicName: rev.topic_name, dueDate: rev.due_date,
              status: rev.status, disciplineName: rev.discipline_name, disciplineId: rev.discipline_id,
              planId: rev.plan_id, disciplineColor: rev.discipline_color, updatedAt: rev.updated_at, originalLogInfo: rev.original_log_info,
            })),
          }));
          return recalculatePlanStats({ ...plan, disciplines });
        });
        setPlans(hydratedPlans);
      }

      const { data: cyclesData, error: cyclesError } = await supabase.from('generated_cycles').select('*').eq('user_id', userId);
      if (cyclesError) {
        showError("Erro ao carregar ciclos: " + cyclesError.message);
      } else {
        setAllCycles((cyclesData || []).map((cycle: any) => ({ id: cycle.id, ...cycle.cycle_data, planId: cycle.plan_id })));
      }

      const { data: blocksData } = await supabase.from('study_blocks').select('*').eq('user_id', userId);
      setStudyBlocks(blocksData || []);

      const { data: simuladosData } = await supabase.from('simulados').select('*').eq('user_id', userId);
      setSimulados((simuladosData || []).map((s: any) => ({
        id: s.id, plan_id: s.plan_id, date: s.date, name: s.name, examStyle: s.exam_style, examBoard: s.exam_board, timeSpent: s.time_spent, disciplines: s.disciplines
      })));

      const { data: examsData } = await supabase.from('exams').select('*').eq('user_id', userId);
      setExams(examsData || []);

      const { data: cardsData } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId);
      setAllFlashcards(cardsData || []);

      // Sincronizar Ofensiva de Estudos diretamente a partir dos registros reais do Supabase
      try {
        await sincronizarOfensivaUsuario(userId);
      } catch (err) {
        console.error("Erro ao sincronizar streak no fetchPlans:", err);
      }

    } catch (e: any) {

      showError("Erro ao processar dados: " + e.message);
    } finally {
      setIsDataLoading(false);
      setIsStreakLoading(false);
    }
  }, [sincronizarOfensivaUsuario]);

  React.useEffect(() => {
    if (isAuthenticated && session?.user?.id) {
      fetchPlans(session.user.id);
      sincronizarOfensivaUsuario(session.user.id);
    } else if (!isAuthenticated && !isSupabaseLoading) {
      setPlans([]); setAllCycles([]); setStudyBlocks([]); setSimulados([]); setExams([]); setIsDataLoading(false);
      setUserStreak(DEFAULT_STREAK);
    }
  }, [isAuthenticated, isSupabaseLoading, fetchPlans, session?.user?.id, sincronizarOfensivaUsuario]);

  // Sincronização multi-dispositivo do Streak em tempo real via Supabase
  React.useEffect(() => {
    if (!isAuthenticated || !session?.user?.id) return;
    const userId = session.user.id;

    // 1. Escuta mudanças em tempo real na tabela profiles para este usuário
    const profileChannel = supabase
      .channel(`realtime-profile-streak-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.sequencia_dias_atual !== undefined) {
            setUserStreak({
              sequencia_dias_atual: Number(payload.new.sequencia_dias_atual) || 0,
              sequencia_dias_recorde: Number(payload.new.sequencia_dias_recorde) || 0,
              questoes_hoje: Number(payload.new.questoes_hoje) || 0,
              questoes_recorde_diario: Number(payload.new.questoes_recorde_diario) || 0,
              ultimo_dia_estudado: payload.new.ultimo_dia_estudado || null,
            });
          }
        }
      )
      .subscribe();

    // 2. Escuta mudanças em tempo real nas tabelas de estudo para recalcular dinamicamente
    const historyChannel = supabase
      .channel(`realtime-history-logs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'history_logs',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          sincronizarOfensivaUsuario(userId);
        }
      )
      .subscribe();

    const simuladosChannel = supabase
      .channel(`realtime-simulados-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'simulados',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          sincronizarOfensivaUsuario(userId);
        }
      )
      .subscribe();

    // 3. Ao focar na aba/janela (ex: alterou registros no Supabase e retornou ao app)
    const handleWindowFocus = () => {
      sincronizarOfensivaUsuario(userId);
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(simuladosChannel);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isAuthenticated, session?.user?.id, sincronizarOfensivaUsuario]);

  const handleSavePlan = async (planUpdates: Partial<StudyPlan> & { id?: string }) => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    let loadingToastId = showLoading(planUpdates.id ? "Atualizando plano..." : "Criando plano...");
    try {
      if (planUpdates.id) {
        const { error } = await supabase.from('study_plans').update({
          name: planUpdates.name, image: planUpdates.image, cargo: planUpdates.cargo, edital: planUpdates.edital, banca: planUpdates.banca, observacoes: planUpdates.observacoes, updated_at: new Date().toISOString(),
        }).eq('id', planUpdates.id).eq('user_id', userId);
        if (error) throw error;
        showSuccess("Plano atualizado!");
      } else {
        const { error } = await supabase.from('study_plans').insert({
          user_id: userId, name: planUpdates.name || 'Novo Plano', image: planUpdates.image || null, cargo: planUpdates.cargo || '', edital: planUpdates.edital || '', banca: planUpdates.banca || '', observacoes: planUpdates.observacoes || '',
        });
        if (error) throw error;
        showSuccess("Plano criado!");
      }
      fetchPlans(userId);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setPlanModalOpen(false); setEditingPlan(null); }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete || !session?.user?.id) return;
    let loadingToastId = showLoading("Excluindo plano...");
    try {
      const { error } = await supabase.from('study_plans').delete().eq('id', planToDelete).eq('user_id', session.user.id);
      if (error) throw error;
      await syncStreakMetricsFromDatabase(session.user.id);
      showSuccess("Plano excluído!");
      fetchPlans(session.user.id);
      if (selectedPlanId === planToDelete) setSelectedPlanId(null);
      setCurrentPage('plans');
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setPlanDeleteModalOpen(false); setPlanToDelete(null); }
  };

  const handleConfirmDeleteDiscipline = async () => {
    if (!disciplineToDelete || !session?.user?.id) return;
    let loadingToastId = showLoading("Excluindo disciplina...");
    try {
      const { error } = await supabase.from('disciplines').delete().eq('id', disciplineToDelete.disciplineId).eq('user_id', session.user.id);
      if (error) throw error;
      await syncStreakMetricsFromDatabase(session.user.id);
      showSuccess("Disciplina excluída!");
      fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setDisciplineDeleteModalOpen(false); setDisciplineToDelete(null); }
  };

  /**
   * Alias de compatibilidade para sincronizarOfensivaUsuario
   */
  const syncStreakMetricsFromDatabase = sincronizarOfensivaUsuario;

  const handleConfirmDeleteLog = async () => {
    if (!logToDelete || !session?.user?.id) return;
    let loadingToastId = showLoading("Excluindo registro...");
    try {
      const plan = plans.find(p => p.id === logToDelete.planId);
      const disc = plan?.disciplines.find(d => d.id === logToDelete.disciplineId);
      const log = disc?.historyLogs?.find(l => l.id === logToDelete.logId);
      
      if (log) {
        const minutes = parseTimeToMinutes(log.time);
        const cycle = allCycles.find(c => c.planId === logToDelete.planId);
        if (cycle) {
            const updatedCycle = applyLogChangeToCycle(cycle, logToDelete.disciplineId, -minutes, log.id);
            await supabase.from('generated_cycles').update({
                cycle_data: updatedCycle,
                updated_at: new Date().toISOString()
            }).eq('id', cycle.id).eq('user_id', session.user.id);
        }
      }

      // Desfazer sincronização de revisão concluída automaticamente via Planejamento por Blocos ou Conclusão de Revisão
      let linkedRevision: Revision | undefined = undefined;
      for (const p of plans) {
        for (const d of p.disciplines) {
          const found = d.revisions?.find(r => {
            const info = r.originalLogInfo as any;
            return r.status === 'Concluída' && 
                   info?.completed_log_id === logToDelete.logId;
          });
          if (found) {
            linkedRevision = found;
            break;
          }
        }
        if (linkedRevision) break;
      }

      if (linkedRevision) {
        const { completed_log_id, completed_by_block, completed_by_revision, completed_by, ...cleanLogInfo } = (linkedRevision.originalLogInfo as any) || {};
        await supabase.from('revisions').update({
          status: 'Programada',
          updated_at: new Date().toISOString(),
          original_log_info: cleanLogInfo
        }).eq('id', linkedRevision.id).eq('user_id', session.user.id);
      }

      const { error } = await supabase.from('history_logs').delete().eq('id', logToDelete.logId).eq('user_id', session.user.id);
      if (error) throw error;

      // Recalcular métricas de estudo (questões de hoje e último dia estudado) após exclusão
      await syncStreakMetricsFromDatabase(session.user.id);

      showSuccess("Registro excluído!");
      fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setLogDeleteModalOpen(false); setLogToDelete(null); }
  };

  const handleSaveExam = async (examData: Omit<Exam, 'id' | 'user_id'> & { id?: string }) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading(examData.id ? "Atualizando prova..." : "Salvando prova...");
    try {
      if (examData.id) {
        const { error } = await supabase.from('exams').update({
          name: examData.name, board: examData.board, position: examData.position, phase: examData.phase, date: examData.date
        }).eq('id', examData.id).eq('user_id', session.user.id);
        if (error) throw error;
        showSuccess("Prova atualizada!");
      } else {
        const { error } = await supabase.from('exams').insert({ user_id: session.user.id, ...examData });
        if (error) throw error;
        showSuccess("Prova agendada!");
      }
      fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setEditingExam(null); }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!session?.user?.id) return;
    if (!confirm('Tem certeza que deseja remover esta prova?')) return;
    
    let loadingToastId = showLoading("Removendo prova...");
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId).eq('user_id', session.user.id);
      if (error) throw error;
      showSuccess("Prova removida!");
      fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleSaveDiscipline = async (disciplineData: Partial<Discipline> & { name: string; totalTopics: number; color: string; topicsText?: string; weight: number; }) => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    const targetPlanId = editingDiscipline?.planId || planToAddDisciplineToId;
    if (!targetPlanId) return;
    let loadingToastId = showLoading("Salvando disciplina...");
    try {
      if (disciplineData.id) {
        const { error } = await supabase.from('disciplines').update({
          name: disciplineData.name, color: disciplineData.color, topics_text: disciplineData.topicsText, weight: disciplineData.weight, updated_at: new Date().toISOString(),
        }).eq('id', disciplineData.id).eq('user_id', userId);
        if (error) throw error;

        const newTopics = parseTopicsText(disciplineData.topicsText || '');
        const existingTopics = plans.find(p => p.id === targetPlanId)?.disciplines.find(d => d.id === disciplineData.id)?.topicsList || [];
        
        const existingNames = new Set(existingTopics.map(t => t.name));
        const newNames = new Set(newTopics.map(t => t.name));

        const toAdd = newTopics.filter(t => !existingNames.has(t.name));
        if (toAdd.length > 0) {
          await supabase.from('topics').insert(toAdd.map(t => ({
            user_id: userId,
            discipline_id: disciplineData.id,
            name: t.name,
            status: 'Pendente'
          })));
        }

        const toRemoveIds = existingTopics.filter(t => !newNames.has(t.name)).map(t => t.id);
        if (toRemoveIds.length > 0) {
          await supabase.from('topics').delete().in('id', toRemoveIds).eq('user_id', userId);
        }

        showSuccess("Disciplina atualizada!");
      } else {
        const { data: newDisc, error } = await supabase.from('disciplines').insert({
          user_id: userId, plan_id: targetPlanId, name: disciplineData.name, color: disciplineData.color, topics_text: disciplineData.topicsText, weight: disciplineData.weight,
        }).select().single();
        if (error) throw error;
        const topicsList = parseTopicsText(disciplineData.topicsText || '');
        if (topicsList.length > 0) {
          await supabase.from('topics').insert(topicsList.map(t => ({ user_id: userId, discipline_id: newDisc.id, name: t.name, status: t.status })));
        }
        showSuccess("Disciplina criada!");
      }
      fetchPlans(userId);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setDisciplineModalOpen(false); }
  };

  const handleUpdateTopic = async (planId: string, disciplineId: string, topicId: string, updates: Partial<Topic>, silent = false) => {
    if (!session?.user?.id) return;
    let loadingToastId = silent ? null : showLoading("Atualizando tópico...");
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.status) {
        updateData.status = updates.status;
        updateData.completion_date = updates.status === 'Concluído' ? getTodayAsYYYYMMDDLocal() : null;
      }
      if (updates.questionLink !== undefined) updateData.question_link = updates.questionLink || null;
      if (updates.incidence !== undefined) updateData.incidence = updates.incidence;
      
      const { error } = await supabase.from('topics').update(updateData).eq('id', topicId).eq('user_id', session.user.id);
      if (error) throw error;
      showSuccess("Tópico atualizado!");
      fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { if (loadingToastId) dismissToast(loadingToastId); }
  };

  const handleSaveHistoryLog = async (saveData: { logData: StudyLogFormData, disciplineId: string, topicId: string }) => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    const { logData, disciplineId, topicId } = saveData;
    const planId = logModalContext!.plan.id;
    let loadingToastId = showLoading("Registrando estudo...");
    try {
      const newTimeInMinutes = parseTimeToMinutes(logData.studyTime);
      const formattedTime = `${Math.floor(newTimeInMinutes / 60)}h ${newTimeInMinutes % 60}m`;
      const selectedTopic = plans.find(p => p.id === planId)?.disciplines.find(d => d.id === disciplineId)?.topicsList?.find(t => t.id === topicId);

      const logPayload = {
        user_id: userId, discipline_id: disciplineId, topic_name: selectedTopic?.name || logModalContext?.topic?.name || 'Tópico',
        log_date: logData.date.toISOString().split('T')[0], study_time: formattedTime,
        correct_questions: logData.questionsCorrect, incorrect_questions: logData.questionsIncorrect,
        category: logData.category, material: logData.material, comments: logData.comments,
      };

      let logId: string;
      let currentCycle = allCycles.find(c => c.planId === planId);

      if (logModalContext?.logToEdit?.id) {
        const oldLog = logModalContext.logToEdit;
        const oldMinutes = parseTimeToMinutes(oldLog.time);
        const oldDiscipline = plans.find(p => p.id === planId)?.disciplines.find(d => d.historyLogs?.some(l => l.id === oldLog.id));
        const oldDiscId = oldDiscipline?.id || disciplineId;

        if (logData.countInPlan && currentCycle) {
          currentCycle = applyLogChangeToCycle(currentCycle, oldDiscId, -oldMinutes, oldLog.id);
        }
        
        const { error } = await supabase.from('history_logs').update(logPayload).eq('id', oldLog.id).eq('user_id', userId);
        if (error) throw error;
        logId = oldLog.id;
      } else {
        const { data: newLog, error } = await supabase.from('history_logs').insert(logPayload).select().single();
        if (error) throw error;
        logId = newLog.id;
      }

      if (logData.isTheoryFinished) await handleUpdateTopic(planId, disciplineId, topicId, { status: 'Concluído' });
      
      if (logData.isReviewScheduled) {
              const reviewDate = new Date(logData.date);
              reviewDate.setDate(reviewDate.getDate() + (logData.reviewDays || 7));
              await supabase.from('revisions').insert({
                user_id: userId, discipline_id: disciplineId, original_log_id: logId, topic_name: selectedTopic?.name || 'Tópico',
                due_date: reviewDate.toISOString().split('T')[0], status: 'Programada', plan_id: planId,
                discipline_name: plans.find(p => p.id === planId)?.disciplines.find(d => d.id === disciplineId)?.name || 'Disciplina',
                discipline_color: plans.find(p => p.id === planId)?.disciplines.find(d => d.id === disciplineId)?.color || '#8884d8',
                original_log_info: { date: logData.date.toLocaleDateString('pt-BR'), category: logData.category, time: formattedTime, correct: logData.questionsCorrect, incorrect: logData.questionsIncorrect },
              });

              if (logData.addToBlockPlanning) {
                const blockDate = new Date(logData.date);
                blockDate.setDate(blockDate.getDate() + (logData.reviewDays || 7));
                const specificDate = formatDateToYYYYMMDD(blockDate);
                const dayOfWeek = blockDate.getDay();
                const reviewDays = logData.reviewDays || 7;

                await supabase.from('study_blocks').insert({
                  user_id: userId,
                  plan_id: planId,
                  discipline_id: disciplineId,
                  topic_id: topicId,
                  topic_name: selectedTopic?.name,
                  name: `Revisão agendada para ${reviewDays} dias após o estudo.`,
                  type: JSON.stringify(['Revisão']),
                  day_of_week: dayOfWeek,
                  duration_minutes: 60,
                  specific_date: specificDate,
                });
              }
            }

      if (logModalContext?.revisionId) {
        const disc = plans.find(p => p.id === planId)?.disciplines.find(d => d.id === disciplineId);
        const targetRevision = disc?.revisions?.find(r => r.id === logModalContext.revisionId);
        const updatedLogInfo = {
          ...(targetRevision?.originalLogInfo || {}),
          completed_log_id: logId,
          completed_by_revision: true,
          completed_by_block: !!logModalContext.blockId,
          completed_by: logModalContext.blockId ? 'Concluída via Bloco de Estudo' : 'Concluída via Revisão',
          completed_date: logData.date.toISOString().split('T')[0]
        };

        await supabase.from('revisions').update({
          status: 'Concluída',
          updated_at: new Date().toISOString(),
          original_log_info: updatedLogInfo
        }).eq('id', logModalContext.revisionId);
      }

      if (logModalContext?.source === 'edital' && logModalContext?.topic) {
        const topicName = logModalContext.topic.name;
        const studyDate = logData.date.toISOString().split('T')[0];

        const pendingRevisions = plans.flatMap(p =>
          p.disciplines.flatMap(d => (d.revisions || []).filter(r =>
            r.status === 'Programada' && r.topicName === topicName
          ))
        );

        if (pendingRevisions.length > 0) {
          const oldestRevision = [...pendingRevisions].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
          const updatedLogInfo = {
            ...(oldestRevision.originalLogInfo || {}),
            completed_by_edital: true,
            completed_date: studyDate,
            completed_by: 'Concluída pelo Edital'
          };

          await supabase.from('revisions').update({
            status: 'Concluída',
            updated_at: new Date().toISOString(),
            original_log_info: updatedLogInfo
          }).eq('id', oldestRevision.id).eq('user_id', userId);
        }
      }

      if (logModalContext?.blockId) await supabase.from('study_blocks').update({ last_completed_date: logData.date.toISOString().split('T')[0] }).eq('id', logModalContext.blockId);

      if (logData.countInPlan && currentCycle) {
        currentCycle = applyLogChangeToCycle(currentCycle, disciplineId, newTimeInMinutes, logId);
        await supabase.from('generated_cycles').update({
          cycle_data: currentCycle,
          updated_at: new Date().toISOString()
        }).eq('id', currentCycle.id).eq('user_id', userId);
      }

      // Recalcular métricas de estudo (questões de hoje, sequência e último dia)
      await syncStreakMetricsFromDatabase(userId);

      showSuccess("Estudo registrado!");
      fetchPlans(userId);

    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setLogModalOpen(false); }
  };

  const handleGeneratePlanFromUrl = async (url: string) => {
    if (!session?.user?.id) return;
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      showError("Chave de API do Gemini não configurada.");
      return;
    }

    let loadingToastId = showLoading("Analisando edital com IA...");
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Analise o edital no link: ${url}. Crie um plano de estudos estruturado em JSON com: nome do concurso, cargo, banca, e uma lista de disciplinas. Para cada disciplina, liste os tópicos principais.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const data = JSON.parse(response.text || '{}');
        
        const { data: newPlan, error: planError } = await supabase.from('study_plans').insert({
            user_id: session.user.id, name: data.nome_concurso || 'Plano via IA', cargo: data.cargo, banca: data.banca,
        }).select().single();
        
        if (planError) throw planError;

        for (const disc of (data.disciplinas || [])) {
            const { data: newDisc } = await supabase.from('disciplines').insert({
                user_id: session.user.id, plan_id: newPlan.id, name: disc.nome, color: '#34D399', weight: 1.0,
            }).select().single();
            
            if (newDisc && disc.topicos) {
                await supabase.from('topics').insert(disc.topicos.map((t: string) => ({
                    user_id: session.user.id, discipline_id: newDisc.id, name: t, status: 'Pendente', incidence: 'Média'
                })));
            }
        }
        showSuccess("Plano gerado com sucesso!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro ao gerar plano: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleGenerateCycle = async (weights: SubjectWeight[], selectedDisciplines: (Discipline & { planName: string; planId: string; })[], weeklyPlanningData: WeeklyPlanningData) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading("Gerando ciclo otimizado...");
    try {
        const planId = selectedDisciplines[0].planId;
        const totalMinutes = weeklyPlanningData.weeklyHours * 60;
        
        const distribution = weights.map(w => {
            const importanceWeight = w.importance;
            const knowledgeWeight = 6 - w.knowledge;
            const combined = importanceWeight + knowledgeWeight;
            return { name: w.name, value: combined, color: w.color, disciplineId: w.id };
        });

        const totalWeight = distribution.reduce((sum, d) => sum + d.value, 0);
        const finalDistribution = distribution.map(d => ({
            name: d.name, value: (d.value / totalWeight) * 100, color: d.color
        }));

        const studySequence: StudySession[] = [];
        distribution.forEach(d => {
            const discMinutes = (d.value / totalWeight) * totalMinutes;
            const sessionsCount = Math.max(1, Math.round(discMinutes / weeklyPlanningData.maxSession));
            const timePerSession = Math.round(discMinutes / sessionsCount);

            for (let i = 0; i < sessionsCount; i++) {
                studySequence.push({
                    id: `session-${d.disciplineId}-${i}-${Date.now()}`,
                    disciplineName: d.name,
                    disciplineColor: d.color,
                    totalTime: timePerSession,
                    studiedTime: 0,
                    status: 'Pendente',
                    planId: planId,
                    disciplineId: d.disciplineId
                });
            }
        });

        const cycleData: Omit<GeneratedCycle, 'id'> = {
            completedCycles: 0,
            weeklyProgress: { completed: 0, total: weeklyPlanningData.weeklyHours },
            currentCycle: { totalTime: totalMinutes, distribution: finalDistribution },
            studySequence,
            completedStudies: [],
            weights,
            weeklyPlanning: weeklyPlanningData,
            planId
        };

        const { error } = await supabase.from('generated_cycles').insert({
            user_id: session.user.id, plan_id: planId, cycle_data: cycleData
        });

        if (error) throw error;
        showSuccess("Ciclo gerado!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleSaveManualCycle = async (sessions: StudySession[], weeklyHours: number) => {
    if (!session?.user?.id || sessions.length === 0) return;
    let loadingToastId = showLoading("Salvando ciclo manual...");
    try {
        const planId = sessions[0].planId;
        const totalMinutes = sessions.reduce((sum, s) => sum + s.totalTime, 0);
        
        const discMap = new Map<string, { name: string, time: number, color: string }>();
        sessions.forEach(s => {
            const curr = discMap.get(s.disciplineId) || { name: s.disciplineName, time: 0, color: s.disciplineColor };
            curr.time += s.totalTime;
            discMap.set(s.disciplineId, curr);
        });

        const distribution = Array.from(discMap.values()).map(d => ({
            name: d.name, value: (d.time / totalMinutes) * 100, color: d.color
        }));

        const cycleData: Omit<GeneratedCycle, 'id'> = {
            completedCycles: 0,
            weeklyProgress: { completed: 0, total: weeklyHours },
            currentCycle: { totalTime: totalMinutes, distribution },
            studySequence: sessions,
            completedStudies: [],
            weights: [],
            weeklyPlanning: { weeklyHours, questionGoal: 0, minSession: 30, maxSession: 120, studyDays: [] },
            planId
        };

        await supabase.from('generated_cycles').insert({
            user_id: session.user.id, plan_id: planId, cycle_data: cycleData
        });

        showSuccess("Ciclo manual criado!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleSaveEditedCycleSessions = async (updatedSessions: StudySession[]) => {
    if (!planIdToEditCycle || !session?.user?.id) return;
    let loadingToastId = showLoading("Atualizando sessões do ciclo...");
    try {
        const cycle = allCycles.find(c => c.planId === planIdToEditCycle);
        if (!cycle) return;

        const pending = updatedSessions.filter(s => s.status === 'Pendente');
        const completed = updatedSessions.filter(s => s.status === 'Concluído');
        const totalMinutes = updatedSessions.reduce((sum, s) => sum + s.totalTime, 0);

        const discMap = new Map<string, { name: string, time: number, color: string }>();
        updatedSessions.forEach(s => {
            const curr = discMap.get(s.disciplineId) || { name: s.disciplineName, time: 0, color: s.disciplineColor };
            curr.time += s.totalTime;
            discMap.set(s.disciplineId, curr);
        });

        const distribution = Array.from(discMap.values()).map(d => ({
            name: d.name, value: totalMinutes > 0 ? (d.time / totalMinutes) * 100 : 0, color: d.color
        }));

        const updatedCycleData = {
            ...cycle,
            studySequence: pending,
            completedStudies: completed,
            currentCycle: { ...cycle.currentCycle, totalTime: totalMinutes, distribution }
        };

        const { error } = await supabase.from('generated_cycles').update({
            cycle_data: updatedCycleData, updated_at: new Date().toISOString()
        }).eq('id', cycle.id).eq('user_id', session.user.id);

        if (error) throw error;
        showSuccess("Ciclo atualizado!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); setIsEditCycleSessionsModalOpen(false); }
  };

  const handleStartNextCycle = async (planId: string) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading("Iniciando próximo ciclo...");
    try {
        const cycle = allCycles.find(c => c.planId === planId);
        if (!cycle) return;

        const allSessions = [...cycle.completedStudies, ...cycle.studySequence];
        const resetSessions = allSessions.map(s => ({
            ...s,
            studiedTime: 0,
            status: 'Pendente' as const,
            historyLogId: undefined
        }));

        const updatedCycleData = {
            ...cycle,
            completedCycles: cycle.completedCycles + 1,
            weeklyProgress: { ...cycle.weeklyProgress, completed: 0 },
            studySequence: resetSessions,
            completedStudies: []
        };

        const { error } = await supabase.from('generated_cycles').update({
            cycle_data: updatedCycleData,
            updated_at: new Date().toISOString()
        }).eq('id', cycle.id).eq('user_id', session.user.id);

        if (error) throw error;
        showSuccess("Novo ciclo iniciado!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleSaveStudyBlock = async (block: Partial<StudyBlock>, repeatDays?: number[]) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading("Salvando bloco...");
    try {
        let planId = block.plan_id;
        if (!planId && block.discipline_id) {
            const foundPlan = plans.find(p => p.disciplines.some(d => d.id === block.discipline_id));
            if (foundPlan) {
                planId = foundPlan.id;
            }
        }

        const serializedBlock = {
            ...block,
            plan_id: planId,
            type: Array.isArray(block.type) ? JSON.stringify(block.type) : block.type,
            specific_date: block.specific_date === '' ? null : (block.specific_date || null)
        };

        if (block.id) {
            const { id, user_id, created_at, ...updatePayload } = serializedBlock;
            const { error } = await supabase
                .from('study_blocks')
                .update(updatePayload)
                .eq('id', block.id)
                .eq('user_id', session.user.id);
            if (error) throw error;
        } else {
            const blocksToInsert = (repeatDays && repeatDays.length > 0) 
                ? repeatDays.map(day => ({ 
                    ...serializedBlock, 
                    id: crypto.randomUUID(),
                    user_id: session.user.id, 
                    day_of_week: day, 
                    specific_date: null 
                  }))
                : [{ 
                    ...serializedBlock, 
                    id: crypto.randomUUID(),
                    user_id: session.user.id 
                  }];
            const { error } = await supabase
                .from('study_blocks')
                .insert(blocksToInsert as any);
            if (error) throw error;
        }
        showSuccess("Bloco salvo!");
        fetchPlans(session.user.id);
    } catch (e: any) { 
        showError("Erro: " + e.message); 
    } finally { 
        dismissToast(loadingToastId); 
    }
  };

  const handleDeleteStudyBlock = async (blockId: string) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading("Excluindo bloco...");
    try {
        const { error } = await supabase.from('study_blocks').delete().eq('id', blockId).eq('user_id', session.user.id);
        if (error) throw error;
        showSuccess("Bloco removido!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleCompleteStudyBlock = (block: StudyBlock, date: string) => {
    const plan = plans.find(p => p.id === block.plan_id) || plans.find(p => p.disciplines.some(d => d.id === block.discipline_id)) || plans[0];
    const disc = plan?.disciplines.find(d => d.id === block.discipline_id);
    const topic = disc?.topicsList?.find(t => t.id === block.topic_id || t.name === block.topic_name);

    let matchingRevisionId: string | undefined = undefined;
    if (disc?.revisions) {
      const topicName = topic?.name || block.topic_name;
      const pendingRevisions = disc.revisions.filter(r => 
        r.status === 'Programada' && 
        (topicName ? r.topicName === topicName : true)
      );
      
      if (pendingRevisions.length > 0) {
        const exactMatch = block.specific_date 
          ? pendingRevisions.find(r => r.dueDate === block.specific_date)
          : undefined;
        
        matchingRevisionId = exactMatch ? exactMatch.id : pendingRevisions[0].id;
      }
    }

    setLogModalContext({
        plan, 
        discipline: disc || null, 
        topic: topic || null, 
        initialStudyTime: `${Math.floor(block.duration_minutes/60)}:${block.duration_minutes%60}:00`,
        initialCategory: Array.isArray(block.type) ? block.type[0] : block.type, 
        blockId: block.id, 
        revisionId: matchingRevisionId,
        completionDate: date
    });
    setLogModalOpen(true);
  };

  const handleClearWeekBlocks = async (blockIds: string[]) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading("Limpando semana...");
    try {
        const { error } = await supabase.from('study_blocks').delete().in('id', blockIds).eq('user_id', session.user.id);
        if (error) throw error;
        showSuccess("Semana limpa!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleSaveSimulado = async (s: Omit<Simulado, 'id'> & { id?: string }) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading("Salvando simulado...");
    try {
        const payload = {
            user_id: session.user.id,
            plan_id: s.plan_id,
            date: s.date,
            name: s.name,
            exam_style: s.examStyle || (s as any).exam_style,
            exam_board: s.examBoard || (s as any).exam_board || '',
            time_spent: s.timeSpent || (s as any).time_spent || '00:00:00',
            disciplines: s.disciplines
        };
        if (s.id) {
            const { error } = await supabase.from('simulados').update(payload).eq('id', s.id).eq('user_id', session.user.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('simulados').insert(payload);
            if (error) throw error;
        }

        // Recalcular métricas de estudo (questões de hoje e streak) a partir dos registros ativos
        await syncStreakMetricsFromDatabase(session.user.id);

        showSuccess("Simulado salvo!");
        fetchPlans(session.user.id);

    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleDeleteSimulado = async (id: string) => {
    if (!session?.user?.id) return;
    if (!confirm('Excluir este simulado?')) return;
    let loadingToastId = showLoading("Excluindo...");
    try {
        const { error } = await supabase.from('simulados').delete().eq('id', id).eq('user_id', session.user.id);
        if (error) throw error;

        // Recalcular métricas de estudo (questões de hoje e streak) após exclusão
        await syncStreakMetricsFromDatabase(session.user.id);

        showSuccess("Excluído!");
        fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleLogout = async () => {
    let loadingToastId = showLoading("Saindo...");
    try {
      await supabase.auth.signOut();
      showSuccess("Até logo!");
    } catch (e: any) { showError("Erro ao sair: " + e.message); }
    finally { 
      dismissToast(loadingToastId); 
      setPlans([]); 
      setAllCycles([]); 
      setStudyBlocks([]);
      setSimulados([]);
      setExams([]);
      setSelectedPlanId(null);
      setSelectedDisciplineInfo(null);
      setCurrentPage('home');
    }
  };

  const handleUpdateProfile = async (name: string) => {
    if (!session?.user?.id) return;
    let loadingToastId = showLoading("Atualizando perfil...");
    try {
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (authError) throw authError;
      
      const { error: dbError } = await supabase.from('profiles').update({ 
        first_name: name.split(' ')[0], 
        last_name: name.split(' ').slice(1).join(' ') 
      }).eq('id', session.user.id);
      if (dbError) throw dbError;

      showSuccess("Perfil atualizado!");
      fetchPlans(session.user.id);
    } catch (e: any) { showError("Erro: " + e.message); }
    finally { dismissToast(loadingToastId); }
  };

  const handleUpdateFlashcardStatus = async (cardId: string, updates: { intervalo_dias: number; proxima_revisao: string; status: 'pendente' | 'realizado' }) => {
    const { error } = await supabase
        .from('flashcards')
        .update({ 
            intervalo_dias: updates.intervalo_dias,
            proxima_revisao: updates.proxima_revisao,
            status: updates.status,
            updated_at: new Date().toISOString() 
        })
        .eq('id', cardId);
    
    if (error) showError("Erro ao atualizar card: " + error.message);
    else {
        setAllFlashcards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c));
    }
  };

  const handleRecordStudyStreak = async () => {
    if (!session?.user?.id) return;
    await syncStreakMetricsFromDatabase(session.user.id);
  };

  const handleUpdateStreakMetrics = async (updates: Partial<UserStudyStreak>) => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    let loadingToastId = showLoading("Salvando métricas...");
    try {
      const updatedStreak: UserStudyStreak = {
        ...userStreak,
        ...updates,
      };

      const { data: updateData, error } = await supabase.from('profiles').update({
        sequencia_dias_atual: updatedStreak.sequencia_dias_atual,
        sequencia_dias_recorde: updatedStreak.sequencia_dias_recorde,
        questoes_recorde_diario: updatedStreak.questoes_recorde_diario,
        questoes_hoje: updatedStreak.questoes_hoje,
      }).eq('id', userId).select();

      if (error) {
        console.error("Erro ao salvar métricas no Supabase:", error);
        if (error.code === '42703') {
          showError("Colunas ainda não criadas no banco. Execute o script supabase_streaks.sql no SQL Editor do Supabase!");
          return;
        }
        throw error;
      }

      if (!updateData || updateData.length === 0) {
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: userId,
          sequencia_dias_atual: updatedStreak.sequencia_dias_atual,
          sequencia_dias_recorde: updatedStreak.sequencia_dias_recorde,
          questoes_recorde_diario: updatedStreak.questoes_recorde_diario,
          questoes_hoje: updatedStreak.questoes_hoje,
        });
        if (upsertErr) {
          console.error("Erro no upsert de métricas de streak no Supabase:", upsertErr);
          throw upsertErr;
        }
      }

      setUserStreak(updatedStreak);
      showSuccess("Métricas de estudo atualizadas no Supabase com sucesso!");
    } catch (e: any) {
      console.error("Falha ao salvar métricas de streak:", e);
      showError("Erro ao salvar métricas: " + e.message);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const renderPage = () => {
    if (isSupabaseLoading || isDataLoading) return <div className="flex items-center justify-center min-h-screen text-white">Carregando...</div>;
    if (!isAuthenticated) return authPage === 'login' ? <LoginPage onLoginSuccess={() => setCurrentPage('home')} onNavigateToRegister={() => setAuthPage('register')} /> : <RegisterPage onRegisterSuccess={() => setCurrentPage('home')} onNavigateToLogin={() => setAuthPage('login')} />;

    const userName = session?.user?.user_metadata?.full_name || 'Estudante';
    const selectedPlan = plans.find(p => p.id === selectedPlanId);

    switch (currentPage) {
      case 'home': return <Dashboard 
        plans={plans} 
        simulados={simulados} 
        exams={exams} 
        userName={userName} 
        onAddExam={() => { setEditingExam(null); setIsAddExamModalOpen(true); }} 
        onEditExam={(exam) => { setEditingExam(exam); setIsAddExamModalOpen(true); }} 
        onDeleteExam={handleDeleteExam} 
        selectedFilterPlanIds={selectedFilterPlanIds} 
        onSelectPlans={setSelectedFilterPlanIds} 
        streak={userStreak} 
        isStreakLoading={isStreakLoading}
        onNavigate={setCurrentPage}
        onStartStudyForRevision={r => { 
          const plan = plans.find(p => p.id === r.planId);
          const discipline = plan?.disciplines.find(d => d.id === r.disciplineId);
          const topic = discipline?.topicsList?.find(t => t.name === r.topicName);
          startTimer({ planId: r.planId, disciplineId: r.disciplineId, topicId: topic?.id || null, revisionId: r.id }, 'cronometro', 3600); 
          setTimerModalOpen(true); 
        }} 
        onAddLogForRevisionRequest={r => { 
          const plan = plans.find(p => p.id === r.planId)!;
          const discipline = plan.disciplines.find(d => d.id === r.disciplineId)!;
          const topic = discipline.topicsList?.find(t => 
            t.name === r.topicName || 
            t.name.trim().toLowerCase() === r.topicName?.trim().toLowerCase()
          );
          setLogModalContext({ 
            plan, 
            discipline, 
            topic: topic || (r.topicName ? { id: '', name: r.topicName, status: 'Pendente' } : null), 
            revisionId: r.id,
            initialCategory: 'Revisão'
          }); 
          setLogModalOpen(true); 
        }} 
        onCompleteRevision={r => {
          const plan = plans.find(p => p.id === r.planId)!;
          const discipline = plan.disciplines.find(d => d.id === r.disciplineId)!;
          const topic = discipline.topicsList?.find(t => 
            t.name === r.topicName || 
            t.name.trim().toLowerCase() === r.topicName?.trim().toLowerCase()
          );
          setLogModalContext({ 
            plan, 
            discipline, 
            topic: topic || (r.topicName ? { id: '', name: r.topicName, status: 'Pendente' } : null), 
            revisionId: r.id,
            initialCategory: 'Revisão'
          }); 
          setLogModalOpen(true); 
        }}
      />;
      case 'plans': return <PlansPage plans={plans} onCreatePlanRequest={() => { setEditingPlan(null); setPlanModalOpen(true); }} onDeletePlan={id => { setPlanToDelete(id); setPlanDeleteModalOpen(true); }} onViewPlan={id => { setSelectedPlanId(id); setCurrentPage('planDetail'); }} onGeneratePlanFromUrl={handleGeneratePlanFromUrl} />;
      case 'materias': return <DisciplinesPage plans={plans} onViewDiscipline={(pid, did) => { setSelectedDisciplineInfo({ planId: pid, disciplineId: did }); setCurrentPage('disciplineDetail'); }} onEditDiscipline={(pid, did) => { setEditingDiscipline({ planId: pid, discipline: plans.find(p => p.id === pid)!.disciplines.find(d => d.id === did)! }); setDisciplineModalOpen(true); }} onDeleteDiscipline={(pid, did) => { setDisciplineToDelete({ planId: pid, disciplineId: did }); setDisciplineDeleteModalOpen(true); }} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} />;
      case 'edital': return <EditalPage plans={plans} onUpdateTopic={handleUpdateTopic} onAddLog={(p, d, t) => { setLogModalOpen(true); setLogModalContext({ plan: p, discipline: d, topic: t, source: 'edital' }); }} onGenericAddLog={() => { setLogModalContext({ plan: plans[0], discipline: null }); setLogModalOpen(true); }} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} />;
      case 'planejamento': return <PlanejamentoPage plans={plans} onRegisterManualStudy={(pid, did) => { setLogModalContext({ plan: plans.find(p => p.id === pid)!, discipline: plans.find(p => p.id === pid)!.disciplines.find(d => d.id === did)! }); setLogModalOpen(true); }} onStartStudy={s => { startTimer({ planId: s.planId, disciplineId: s.disciplineId, topicId: null }, 'cronometro', s.totalTime * 60); setTimerModalOpen(true); }} onNavigate={setCurrentPage} generatedCycles={allCycles} onGenerateCycle={handleGenerateCycle} onSaveManualCycle={handleSaveManualCycle} onRemoveCycle={async (id) => { await supabase.from('generated_cycles').delete().eq('plan_id', id); await fetchPlans(session!.user.id); }} onStartNextCycle={handleStartNextCycle} onEditCycle={id => { setPlanIdToEditCycle(id); setIsEditCycleSessionsModalOpen(true); }} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} />;
      case 'blocos': return <BlockPlanningPage plans={plans} blocks={studyBlocks} onSaveBlock={handleSaveStudyBlock} onDeleteBlock={handleDeleteStudyBlock} onCompleteBlock={handleCompleteStudyBlock} onClearWeek={handleClearWeekBlocks} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} />;
      case 'caderno': return <NotesPage plans={plans} userId={session!.user.id} />;
      case 'flashcards': return <FlashcardsPage userId={session!.user.id} onStartReview={(deck) => { setActiveReviewDeck(deck); setIsFlashcardReviewOpen(true); }} />;
      case 'historico': return <HistoryPage plans={plans} onAddLogRequest={() => { setLogModalContext({ plan: plans[0], discipline: null }); setLogModalOpen(true); }} onEditLogRequest={(p, d, l) => { setLogModalContext({ plan: p, discipline: d, logToEdit: l }); setLogModalOpen(true); }} onDeleteLogRequest={(pid, did, lid) => { setLogToDelete({ planId: pid, disciplineId: did, logId: lid }); setLogDeleteModalOpen(true); }} onViewLogRequest={l => { setLogToView(l); setViewLogModalOpen(true); }} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} />;
      case 'revisoes': return <RevisoesPage 
        plans={plans} 
        onUpdateRevisionStatus={(pid, did, rid, s) => supabase.from('revisions').update({ status: s }).eq('id', rid).then(() => fetchPlans(session!.user.id))} 
        onAddLogRequest={() => { setLogModalContext({ plan: plans[0], discipline: null }); setLogModalOpen(true); }} 
        onStartStudyForRevision={r => { 
          const plan = plans.find(p => p.id === r.planId);
          const discipline = plan?.disciplines.find(d => d.id === r.disciplineId);
          const topic = discipline?.topicsList?.find(t => t.name === r.topicName);
          startTimer({ planId: r.planId, disciplineId: r.disciplineId, topicId: topic?.id || null, revisionId: r.id }, 'cronometro', 3600); 
          setTimerModalOpen(true); 
        }} 
        onAddLogForRevisionRequest={r => { 
          const plan = plans.find(p => p.id === r.planId)!;
          const discipline = plan.disciplines.find(d => d.id === r.disciplineId)!;
          const topic = discipline.topicsList?.find(t => 
            t.name === r.topicName || 
            t.name.trim().toLowerCase() === r.topicName?.trim().toLowerCase()
          );
          setLogModalContext({ 
            plan, 
            discipline, 
            topic: topic || (r.topicName ? { id: '', name: r.topicName, status: 'Pendente' } : null), 
            revisionId: r.id,
            initialCategory: 'Revisão'
          }); 
          setLogModalOpen(true); 
        }} 
        onDeleteRevision={id => supabase.from('revisions').delete().eq('id', id).then(() => fetchPlans(session!.user.id))}
        onClearCompletedRevisions={() => supabase.from('revisions').delete().eq('status', 'Concluída').then(() => fetchPlans(session!.user.id))}
        onClearIgnoredRevisions={() => supabase.from('revisions').delete().eq('status', 'Ignorada').then(() => fetchPlans(session!.user.id))}
        selectedFilterPlanIds={selectedFilterPlanIds}
        onSelectPlans={setSelectedFilterPlanIds}
      />;
      case 'estatisticas': return <StatisticsPage plans={plans} onAddLogRequest={() => { setLogModalContext({ plan: plans[0], discipline: null }); setLogModalOpen(true); }} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} />;
      case 'simulados': return <SimuladosPage plans={plans} simulados={simulados} onSaveSimulado={handleSaveSimulado} onDeleteSimulado={handleDeleteSimulado} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} />;
      case 'configuracoes': return <ProfileSettingsPage user={session?.user} onUpdateProfile={handleUpdateProfile} userStreak={userStreak} onUpdateStreak={handleUpdateStreakMetrics} />;
      case 'planDetail': return selectedPlan ? <PlanDetailPage plan={selectedPlan} onEdit={() => { setEditingPlan(selectedPlan); setPlanModalOpen(true); }} onDeletePlan={() => { setPlanToDelete(selectedPlan.id); setPlanDeleteModalOpen(true); }} onAddDiscipline={() => { setPlanToAddDisciplineToId(selectedPlan.id); setDisciplineModalOpen(true); }} onDeleteDiscipline={(pid, did) => { setDisciplineToDelete({ planId: pid, disciplineId: did }); setDisciplineDeleteModalOpen(true); }} onViewDiscipline={(pid, did) => { setSelectedDisciplineInfo({ planId: pid, disciplineId: did }); setCurrentPage('disciplineDetail'); }} onEditDiscipline={(pid, did) => { setEditingDiscipline({ planId: pid, discipline: plans.find(p => p.id === pid)!.disciplines.find(d => d.id === did)! }); setDisciplineModalOpen(true); }} /> : null;
      case 'disciplineDetail': 
        const dInfo = selectedDisciplineInfo;
        const dPlan = plans.find(p => p.id === dInfo?.planId);
        const dDisc = dPlan?.disciplines.find(d => d.id === dInfo?.disciplineId);
        return dPlan && dDisc ? <DisciplineDetailPage discipline={dDisc} plan={dPlan} onUpdateTopic={handleUpdateTopic} onAddLog={(p, d, t) => { setLogModalContext({ plan: p, discipline: d, topic: t }); setLogModalOpen(true); }} onEditLog={(p, d, l) => { setLogModalContext({ plan: p, discipline: d, logToEdit: l }); setLogModalOpen(true); }} onDeleteLog={(pid, did, lid) => { setLogToDelete({ planId: pid, disciplineId: did, logId: lid }); setLogDeleteModalOpen(true); }} onBack={() => setCurrentPage('planDetail')} /> : null;
      default: return <Dashboard plans={plans} exams={exams} userName={userName} onAddExam={() => { setEditingExam(null); setIsAddExamModalOpen(true); }} onEditExam={(exam) => { setEditingExam(exam); setIsAddExamModalOpen(true); }} onDeleteExam={handleDeleteExam} selectedFilterPlanIds={selectedFilterPlanIds} onSelectPlans={setSelectedFilterPlanIds} streak={userStreak} isStreakLoading={isStreakLoading} />;
    }
  };


  return (
    <div className="flex min-h-screen bg-gray-900 font-sans">
      {isAuthenticated && <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} onOpenTimer={() => setTimerModalOpen(true)} onLogout={handleLogout} />}
      <main className={`flex-1 ${isAuthenticated ? 'lg:ml-20' : ''}`}>
        {isAuthenticated && (
          <div className="lg:hidden flex items-center p-4 bg-gray-900 shadow-md sticky top-0 z-20">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-3 rounded-lg bg-gray-700 text-gray-300"><MenuIcon className="w-6 h-6" /></button>
            <h1 className="text-xl font-bold text-white ml-4">StudyDay</h1>
          </div>
        )}
        <div className={isAuthenticated ? 'p-4 sm:p-6 lg:p-8' : ''}>{renderPage()}</div>
      </main>
      {isAuthenticated && (
        <>
          <CreatePlanModal isOpen={isPlanModalOpen} onClose={() => setPlanModalOpen(false)} onSave={handleSavePlan} planToEdit={editingPlan} />
          <AddDisciplineModal isOpen={isDisciplineModalOpen} onClose={() => setDisciplineModalOpen(false)} onSave={handleSaveDiscipline} disciplineToEdit={editingDiscipline?.discipline} />
          <DeleteConfirmationModal isOpen={isPlanDeleteModalOpen} onClose={() => setPlanDeleteModalOpen(false)} onConfirm={() => handleConfirmDeletePlan()} itemType="plano" />
          <DeleteConfirmationModal isOpen={isDisciplineDeleteModalOpen} onClose={() => setDisciplineDeleteModalOpen(false)} onConfirm={() => handleConfirmDeleteDiscipline()} itemType="disciplina" />
          <DeleteConfirmationModal isOpen={isLogDeleteModalOpen} onClose={() => setLogDeleteModalOpen(false)} onConfirm={() => handleConfirmDeleteLog()} itemType="registro" />
          {logModalContext && <StudyLogModal isOpen={isLogModalOpen} onClose={() => setLogModalOpen(false)} onSave={handleSaveHistoryLog} plan={logModalContext.plan} discipline={logModalContext.discipline} topic={logModalContext.topic} logToEdit={logModalContext.logToEdit} initialStudyTime={logModalContext.initialStudyTime} initialCategory={logModalContext.initialCategory} revisionId={logModalContext.revisionId} completionDate={logModalContext.completionDate} />}
          <StudyTimerModal isOpen={isTimerModalOpen} onClose={() => setTimerModalOpen(false)} displayTime={displayTime} timerState={timerState} plans={plans} onStart={startTimer} onPause={pauseTimer} onResume={resumeTimer} onReset={resetTimer} onLog={(t, did, tid, pid, rid) => handleSaveHistoryLog({ logData: { date: new Date(), category: 'Teoria', studyTime: t, isTheoryFinished: false, questionsCorrect: 0, questionsIncorrect: 0, countInPlan: true }, disciplineId: did, topicId: tid })} onUpdateContext={setContext} onSetMode={setMode} />
          <FloatingTimer displayTime={displayTime} isActive={timerState.isActive && !isTimerModalOpen} isPaused={timerState.isPaused} isMinimized={timerState.isMinimized} disciplineName={plans.flatMap(p => p.disciplines).find(d => d.id === timerState.context.disciplineId)?.name || ''} onPause={pauseTimer} onResume={resumeTimer} onStop={() => { const { finalTime, context } = stopTimer(); if (context.disciplineId && context.topicId && context.planId) handleSaveHistoryLog({ logData: { date: new Date(), category: 'Teoria', studyTime: `${Math.floor(finalTime/3600)}:${Math.floor((finalTime%3600)/60)}:${finalTime%60}`, isTheoryFinished: false, questionsCorrect: 0, questionsIncorrect: 0, countInPlan: true }, disciplineId: context.disciplineId, topicId: context.topicId }); }} onExpand={() => setTimerModalOpen(true)} onToggleMinimize={() => setMinimized(!timerState.isMinimized)} />
          {planIdToEditCycle && <EditCycleSessionsModal isOpen={isEditCycleSessionsModalOpen} onClose={() => setIsEditCycleSessionsModalOpen(false)} onSave={handleSaveEditedCycleSessions} cycle={allCycles.find(c => c.planId === planIdToEditCycle)!} plans={plans} />}
          <ViewHistoryLogModal isOpen={isViewLogModalOpen} onClose={() => setViewLogModalOpen(false)} log={logToView} />
          <AddExamModal isOpen={isAddExamModalOpen} onClose={() => setIsAddExamModalOpen(false)} onSave={handleSaveExam} examToEdit={editingExam} />
          
          <FlashcardReviewModal 
            isOpen={isFlashcardReviewOpen} 
            onClose={() => setIsFlashcardReviewOpen(false)} 
            deck={activeReviewDeck} 
            cards={allFlashcards.filter(c => c.deck_id === activeReviewDeck?.id && (c.proxima_revisao ? new Date(c.proxima_revisao) <= new Date() : true))} 
            onUpdateCardStatus={handleUpdateFlashcardStatus} 
          />

          <button onClick={() => setTimerModalOpen(true)} className="fixed bottom-8 right-8 bg-emerald-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg z-30"><ClockIcon className="w-8 h-8" /></button>
        </>
      )}
    </div>
  );
};

export default App;