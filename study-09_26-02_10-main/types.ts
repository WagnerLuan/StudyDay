export interface SubjectPerformance {
  id: string;
  name: string;
  studyTime: number; // in minutes
  correctAnswers: number;
  incorrectAnswers: number;
}

export interface WeeklyGoal {
  timeGoal: number; // in hours
  timeCompleted: number; // in hours
  questionsDone: number; // in hours
  correctAnswers: number;
}

export interface SyllabusProgress {
  totalTopics: number;
  completedTopics: number;
}

export interface RecentActivity {
  id:string;
  description: string;
  timestamp: string;
}

export interface ScheduledReview {
  id: string;
  subject: string;
  date: string;
}

export interface WeeklyStudy {
    day: string;
    time: number; // in minutes
    questions: number;
}

export interface HistoryLog {
    id: string;
    date: string;
    topic: string;
    time: string;
    correct: number;
    incorrect: number;
    pages: string;
    category: string;
    material?: string;
    comments?: string;
}

export type TopicIncidence = 'Muito Alta' | 'Alta' | 'Média' | 'Baixa' | 'Muito Baixa';

export interface Topic {
    id: string;
    name: string;
    status: 'Concluído' | 'Pendente';
    questionLink?: string;
    completionDate?: string;
    incidence?: TopicIncidence;
}

export interface Revision {
    id: string;
    originalLogId: string;
    topicName: string;
    dueDate: string; // "YYYY-MM-DD"
    status: 'Programada' | 'Ignorada' | 'Concluída';
    disciplineName: string;
    disciplineId: string;
    planId: string;
    disciplineColor: string;
    updatedAt?: string; // ISO string from DB
    originalLogInfo: {
        date: string;
        category: string;
        time: string;
        correct: number;
        incorrect: number;
    };
}


export interface Discipline {
    id: string;
    name: string;
    studiedTopics: number;
    totalTopics: number;
    resolvedQuestions: number;
    color: string; // Now a hex string e.g., '#RRGGBB'
    topicsText?: string;
    weight: number; // Added weight property
    
    // Detailed view properties
    studyTimeInMinutes?: number;
    performance?: { correct: number, incorrect: number };
    pagesRead?: { count: number, speed: number }; // speed in pages/hour
    historyLogs?: HistoryLog[];
    topicsList?: Topic[];
    revisions?: Revision[];
}


export interface StudyPlan {
    id: string;
    name: string;
    image: string | null;
    subjects: number;
    topics: number;
    cargo?: string;
    edital?: string;
    banca?: string;
    observacoes?: string;
    disciplines: Discipline[];
    totalHoursStudied: number; // in minutes
    totalQuestionsResolved: number;
    overallPerformance: number; // as a percentage
}

export interface StudyData {
  totalStudyTime: number; // in hours
  dailyAverage: number; // in hours
  streak: number; // in days
  motivation: string;
  performance: SubjectPerformance[];
  weeklyGoal: WeeklyGoal;
  syllabus: SyllabusProgress;
  recentActivities: RecentActivity[];
  scheduledReviews: ScheduledReview[];
  weeklyStudy: WeeklyStudy[];
  dailyStudyTime: number; // in minutes
}

export interface GeneratedPlanData {
    contestName: string;
    year: string;
    examiningBoard: string;
    position: string;
    summary: string;
    subjects: {
        name: string;
        weight: number;
    }[];
    scheduledRevisions: string[];
    weeklySchedule: {
        day: string;
        activities: string[];
    }[];
}

export interface StudySession {
    id: string;
    disciplineName: string;
    disciplineColor: string;
    topicName?: string;
    totalTime: number; // in minutes
    studiedTime: number; // in minutes
    status: 'Pendente' | 'Concluído';
    planId: string;
    disciplineId: string;
    revisionId?: string;
    historyLogId?: string; // NEW: Link to the history log that completed this session
    suggestionCriteria?: {
        accuracy: number;
        frequency: number;
        lastStudiedDays: number;
        userRelevance: number;
    }
}

export interface SubjectWeight {
    id: string;
    name: string;
    importance: number;
    knowledge: number;
    color: string;
}

export interface WeeklyPlanningData {
    weeklyHours: number;
    questionGoal: number;
    minSession: number;
    maxSession: number;
    studyDays: string[];
}

export interface GeneratedCycle {
    id: string; // Adicionado o ID do ciclo
    completedCycles: number;
    weeklyProgress: {
        completed: number; // in hours
        total: number; // in hours
    };
    currentCycle: {
        totalTime: number; // in minutes
        distribution: { name: string; value: number; color: string; }[];
    };
    studySequence: StudySession[];
    completedStudies: StudySession[];
    weights: SubjectWeight[];
    weeklyPlanning: WeeklyPlanningData;
    planId: string; // NEW: Add planId to GeneratedCycle
}

export interface StudyLogFormData {
    date: Date;
    category: string; // Alterado de união para string para suportar multi-seleção (ex: "Teoria, Questões")
    studyTime: string; // HH:MM:SS
    material?: string;
    isTheoryFinished: boolean;
    isReviewScheduled?: boolean;
    reviewDays?: number;
    questionsCorrect: number;
    questionsIncorrect: number;
    pagesStart?: number;
    pagesEnd?: number;
    videoTitle?: string;
    videoStart?: string; // HH:MM:SS
    videoEnd?: string; // HH:MM:SS
    comments?: string;
    countInPlan: boolean;
}

export interface SimuladoDiscipline {
  id: string;
  name: string;
  weight: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  blankAnswers: number;
}

export interface Simulado {
  id: string;
  plan_id: string; // NOVO: Vínculo com o plano
  date: string; // YYYY-MM-DD
  name: string;
  examStyle: 'Múltipla Escolha' | 'Certo/Errado';
  examBoard: string;
  timeSpent: string; // HH:MM:SS
  disciplines: SimuladoDiscipline[];
}

export interface StudyBlock {
    id: string;
    user_id: string;
    plan_id?: string;
    discipline_id?: string;
    topic_id?: string;
    topic_name?: string;
    name?: string; // Usado para observações/título
    type: string | string[]; // Alterado para suportar múltiplas categorias
    day_of_week?: number; // 0-6 (Domingo-Sábado)
    start_time?: string; // HH:mm
    duration_minutes?: number;
    last_completed_date?: string; // YYYY-MM-DD
    specific_date?: string; // YYYY-MM-DD (Nulo para blocos recorrentes)
    created_at?: string;
}

export interface Exam {
    id: string;
    user_id: string;
    name: string;
    date: string; // YYYY-MM-DD
    board?: string;
    position?: string;
    phase?: string;
    created_at?: string;
}

export type NoteCategory = 'Livre' | 'Disciplina' | 'Revisão' | 'Erros' | 'Resumo' | 'Questão';

export interface Note {
    id: string;
    user_id: string;
    title: string;
    content: string;
    category: NoteCategory;
    discipline_id?: string;
    topic_id?: string;
    created_at: string;
    updated_at: string;
}

// --- NOVAS INTERFACES PARA FLASHCARDS ---

export interface Deck {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
    cardCount?: number;
    pendingCount?: number;
}

export interface Flashcard {
    id: string;
    user_id: string;
    deck_id: string;
    front_html: string;
    back_html: string;
    status: 'pendente' | 'realizado';
    created_at: string;
    updated_at: string;
    proxima_revisao?: string;
    intervalo_dias?: number;
    fator_facilidade?: number;
}

// --- SEQUÊNCIA DE ESTUDOS (STREAKS) E RECORDES ---
export interface UserStudyStreak {
    sequencia_dias_atual: number;
    sequencia_dias_recorde: number;
    questoes_hoje: number;
    questoes_recorde_diario: number;
    ultimo_dia_estudado?: string | null; // "YYYY-MM-DD"
}
