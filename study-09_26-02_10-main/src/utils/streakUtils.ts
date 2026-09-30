import { UserStudyStreak } from '../../types';
import { getTodayAsYYYYMMDDLocal } from './dateUtils';

export const DEFAULT_STREAK: UserStudyStreak = {
  sequencia_dias_atual: 0,
  sequencia_dias_recorde: 0,
  questoes_hoje: 0,
  questoes_recorde_diario: 0,
  ultimo_dia_estudado: null,
};

export function getDaysDiff(fromDateStr: string, toDateStr: string): number {
  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = toDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula os novos valores de streak quando o usuário registra uma sessão de estudo ou questões.
 * Regras:
 * - Se ultimo_dia_estudado for ontem, incrementa sequencia_dias_atual em +1.
 * - Se ultimo_dia_estudado for hoje, mantém a sequência.
 * - Se ultimo_dia_estudado for anterior a ontem, reseta sequencia_dias_atual para 1.
 * - Se sequencia_dias_atual > sequencia_dias_recorde, atualize o recorde automaticamente.
 */
export function calculateStreakOnStudy(
  current: UserStudyStreak,
  options: {
    studyDate?: string; // YYYY-MM-DD
    questionsAdded?: number;
  } = {}
): UserStudyStreak {
  const targetDate = options.studyDate || getTodayAsYYYYMMDDLocal();
  const questionsAdded = Math.max(0, options.questionsAdded || 0);

  let newSequenciaAtual = current.sequencia_dias_atual || 0;
  let newQuestoesHoje = current.questoes_hoje || 0;

  if (!current.ultimo_dia_estudado) {
    newSequenciaAtual = 1;
    newQuestoesHoje = questionsAdded;
  } else {
    const diff = getDaysDiff(current.ultimo_dia_estudado, targetDate);

    if (diff === 0) {
      // Mesmo dia: mantém a sequência atual e soma questões
      newSequenciaAtual = Math.max(1, newSequenciaAtual);
      newQuestoesHoje = (current.questoes_hoje || 0) + questionsAdded;
    } else if (diff === 1) {
      // Ontem: incrementa em +1
      newSequenciaAtual = (current.sequencia_dias_atual || 0) + 1;
      newQuestoesHoje = questionsAdded;
    } else if (diff > 1) {
      // Anterior a ontem: reseta para 1
      newSequenciaAtual = 1;
      newQuestoesHoje = questionsAdded;
    } else {
      // Registrando data passada: não altera a sequência de hoje nem zera
      newSequenciaAtual = Math.max(1, newSequenciaAtual);
    }
  }

  const newSequenciaRecorde = Math.max(current.sequencia_dias_recorde || 0, newSequenciaAtual);
  const newQuestoesRecorde = Math.max(current.questoes_recorde_diario || 0, newQuestoesHoje);

  // Apenas avança ultimo_dia_estudado se a data do estudo for mais recente ou igual
  let newUltimoDia = current.ultimo_dia_estudado;
  if (!current.ultimo_dia_estudado || getDaysDiff(current.ultimo_dia_estudado, targetDate) >= 0) {
    newUltimoDia = targetDate;
  }

  return {
    sequencia_dias_atual: newSequenciaAtual,
    sequencia_dias_recorde: newSequenciaRecorde,
    questoes_hoje: newQuestoesHoje,
    questoes_recorde_diario: newQuestoesRecorde,
    ultimo_dia_estudado: newUltimoDia,
  };
}

/**
 * Ajusta visualmente a visualização do streak para o dia de hoje ao abrir o app:
 * Se o último dia for anterior a hoje, questoes_hoje para hoje é 0 (ou o valor de questões já resolvidas hoje).
 */
export function normalizeStreakForToday(streak: UserStudyStreak, questionsDoneTodayFromLogs: number = 0): UserStudyStreak {
  const today = getTodayAsYYYYMMDDLocal();
  const isStudiedToday = streak.ultimo_dia_estudado === today;

  let questoesHoje = isStudiedToday ? (streak.questoes_hoje || 0) : 0;
  if (questionsDoneTodayFromLogs > questoesHoje) {
    questoesHoje = questionsDoneTodayFromLogs;
  }

  const recordeQuestoes = Math.max(streak.questoes_recorde_diario || 0, questoesHoje);

  return {
    ...streak,
    questoes_hoje: questoesHoje,
    questoes_recorde_diario: recordeQuestoes,
  };
}

export interface StudyLogEntry {
  date: string; // YYYY-MM-DD
  questions: number;
}

/**
 * Recalcula a sequência de estudos (streak), a data do último dia estudado
 * e a soma das questões de hoje a partir dos registros ativos restantes no banco.
 * Considera o fuso horário de Brasília (America/Sao_Paulo).
 */
export function recalculateStreakFromEntries(
  entries: StudyLogEntry[],
  currentMetrics: Partial<UserStudyStreak> = {}
): UserStudyStreak {
  const today = getTodayAsYYYYMMDDLocal();

  // 1. Recálculo das questões de hoje: soma de todos os registros ativos para a data de hoje
  const questoesHoje = entries
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + Math.max(0, Number(e.questions) || 0), 0);

  // 2. Coletar datas distintas com estudos registrados
  const distinctDates = Array.from(new Set(entries.map(e => e.date).filter(Boolean)));
  // Ordenar decrescente (mais recente primeiro)
  distinctDates.sort((a, b) => b.localeCompare(a));

  if (distinctDates.length === 0) {
    return {
      sequencia_dias_atual: 0,
      sequencia_dias_recorde: currentMetrics.sequencia_dias_recorde || 0,
      questoes_hoje: 0,
      questoes_recorde_diario: currentMetrics.questoes_recorde_diario || 0,
      ultimo_dia_estudado: null,
    };
  }

  const latestDate = distinctDates[0];
  const diffFromToday = getDaysDiff(latestDate, today);

  let sequenciaAtual = 0;

  // Se o último dia estudado for hoje (diff === 0) ou ontem (diff === 1), a sequência está ativa
  if (diffFromToday === 0 || diffFromToday === 1) {
    sequenciaAtual = 1;
    for (let i = 0; i < distinctDates.length - 1; i++) {
      if (getDaysDiff(distinctDates[i + 1], distinctDates[i]) === 1) {
        sequenciaAtual++;
      } else {
        break;
      }
    }
  } else {
    // Se o último dia estudado for anterior a ontem (diff > 1), a sequência diária foi interrompida
    sequenciaAtual = 0;
  }

  const recordeSequencia = Math.max(currentMetrics.sequencia_dias_recorde || 0, sequenciaAtual);
  const recordeQuestoes = Math.max(currentMetrics.questoes_recorde_diario || 0, questoesHoje);

  return {
    sequencia_dias_atual: sequenciaAtual,
    sequencia_dias_recorde: recordeSequencia,
    questoes_hoje: questoesHoje,
    questoes_recorde_diario: recordeQuestoes,
    ultimo_dia_estudado: latestDate,
  };
}
