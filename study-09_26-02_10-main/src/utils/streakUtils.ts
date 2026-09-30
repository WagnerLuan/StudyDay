import { UserStudyStreak } from '../../types';
import { getTodayAsYYYYMMDDLocal } from './dateUtils';

export const DEFAULT_STREAK: UserStudyStreak = {
  sequencia_dias_atual: 0,
  sequencia_dias_recorde: 0,
  questoes_hoje: 0,
  questoes_recorde_diario: 0,
  ultimo_dia_estudado: null,
};

/**
 * Normaliza qualquer formato de data (ISO com T, DD/MM/YYYY ou YYYY-MM-DD) para YYYY-MM-DD.
 */
export function normalizeDateToYYYYMMDD(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes('T')) {
    const isoDate = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const day = parsed.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function getDaysDiff(fromDateStr: string, toDateStr: string): number {
  const norm1 = normalizeDateToYYYYMMDD(fromDateStr) || fromDateStr;
  const norm2 = normalizeDateToYYYYMMDD(toDateStr) || toDateStr;
  const [y1, m1, d1] = norm1.split('-').map(val => Number(val) || 0);
  const [y2, m2, d2] = norm2.split('-').map(val => Number(val) || 0);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export interface StudyLogEntry {
  date: string; // YYYY-MM-DD
  questions: number;
}

/**
 * FUNÇÃO DE CÁLCULO BASEADA NOS REGISTROS REAIS (Single Source of Truth)
 *
 * 1. Não lê valores antigos de 'sequencia_dias_recorde' ou 'questoes_recorde_diario'.
 * 2. a) questoes_hoje: SUM(questoes) onde data = HOJE (fuso América/São_Paulo).
 *    b) questoes_recorde_diario: GROUP BY data_estudo, SUM(questoes) -> Math.max() de todos os dias.
 *       Se não houver histórico, retorne o total de hoje.
 *    c) sequencia_dias_atual: Sequência ininterrupta de dias até hoje que possuem ao menos 1 registro.
 *    d) sequencia_dias_recorde: Maior bloco de dias consecutivos registrados no histórico.
 *       Se o streak atual for maior, utilize o streak atual.
 * 3. Sanitização de Tipos: Aplica Number(valor) || 0 em todas as variáveis numéricas.
 */
export function recalculateStreakFromEntries(
  entries: StudyLogEntry[]
): UserStudyStreak {
  const today = getTodayAsYYYYMMDDLocal();

  // 1. Filtrar e sanitizar entradas reais com Number() || 0 obrigatório
  const sanitizedEntries: { date: string; questions: number }[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    const normDate = normalizeDateToYYYYMMDD(entry.date);
    if (normDate) {
      sanitizedEntries.push({
        date: normDate,
        questions: Math.max(0, Number(entry.questions) || 0),
      });
    }
  }

  // a) questoes_hoje: SUM(questoes) onde data = HOJE (fuso América/São_Paulo)
  let questoesHoje = 0;
  for (const entry of sanitizedEntries) {
    if (entry.date === today) {
      questoesHoje = (Number(questoesHoje) || 0) + (Number(entry.questions) || 0);
    }
  }
  questoesHoje = Math.max(0, Number(questoesHoje) || 0);

  // b) questoes_recorde_diario: GROUP BY data_estudo, SUM(questoes) -> Pegue o Math.max() de todos os dias.
  // Se não houver histórico, retorne o total de hoje.
  const dailyQuestionsMap = new Map<string, number>();
  for (const entry of sanitizedEntries) {
    const currentDaySum = Number(dailyQuestionsMap.get(entry.date)) || 0;
    dailyQuestionsMap.set(entry.date, currentDaySum + (Number(entry.questions) || 0));
  }

  let maxDailyQuestions = 0;
  for (const daySum of dailyQuestionsMap.values()) {
    const numSum = Number(daySum) || 0;
    if (numSum > maxDailyQuestions) {
      maxDailyQuestions = numSum;
    }
  }

  // Se não houver histórico, retorne o total de hoje
  let questoesRecordeDiario = dailyQuestionsMap.size > 0 ? maxDailyQuestions : questoesHoje;
  if (questoesHoje > questoesRecordeDiario) {
    questoesRecordeDiario = questoesHoje;
  }
  questoesRecordeDiario = Math.max(0, Number(questoesRecordeDiario) || 0);

  // Coleta de datas distintas com ao menos 1 registro de estudo
  const distinctDates = Array.from(new Set(sanitizedEntries.map(e => e.date)));

  if (distinctDates.length === 0) {
    return {
      sequencia_dias_atual: 0,
      sequencia_dias_recorde: 0,
      questoes_hoje: 0,
      questoes_recorde_diario: 0,
      ultimo_dia_estudado: null,
    };
  }

  // c) sequencia_dias_atual: Sequência ininterrupta de dias até hoje que possuem ao menos 1 registro
  const sortedDatesDesc = [...distinctDates].sort((a, b) => b.localeCompare(a));
  const latestDate = sortedDatesDesc[0];
  const diffFromToday = getDaysDiff(latestDate, today);

  let sequenciaAtual = 0;
  if (diffFromToday === 0 || diffFromToday === 1) {
    sequenciaAtual = 1;
    for (let i = 0; i < sortedDatesDesc.length - 1; i++) {
      if (getDaysDiff(sortedDatesDesc[i + 1], sortedDatesDesc[i]) === 1) {
        sequenciaAtual = (Number(sequenciaAtual) || 0) + 1;
      } else {
        break;
      }
    }
  } else {
    sequenciaAtual = 0;
  }
  sequenciaAtual = Math.max(0, Number(sequenciaAtual) || 0);

  // d) sequencia_dias_recorde: Maior bloco de dias consecutivos registrados no histórico.
  // Se o streak atual for maior, utilize o streak atual.
  const sortedDatesAsc = [...distinctDates].sort((a, b) => a.localeCompare(b));
  let maxBlock = 1;
  let currentBlock = 1;

  for (let i = 1; i < sortedDatesAsc.length; i++) {
    const diff = getDaysDiff(sortedDatesAsc[i - 1], sortedDatesAsc[i]);
    if (diff === 1) {
      currentBlock = (Number(currentBlock) || 0) + 1;
      if (currentBlock > maxBlock) {
        maxBlock = currentBlock;
      }
    } else if (diff === 0) {
      continue;
    } else {
      currentBlock = 1;
    }
  }

  let sequenciaDiasRecorde = maxBlock;
  if (sequenciaAtual > sequenciaDiasRecorde) {
    sequenciaDiasRecorde = sequenciaAtual;
  }
  sequenciaDiasRecorde = Math.max(0, Number(sequenciaDiasRecorde) || 0);

  return {
    sequencia_dias_atual: sequenciaAtual,
    sequencia_dias_recorde: sequenciaDiasRecorde,
    questoes_hoje: questoesHoje,
    questoes_recorde_diario: questoesRecordeDiario,
    ultimo_dia_estudado: latestDate,
  };
}
