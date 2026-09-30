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
 * Normaliza qualquer formato de data (ISO com T, DD/MM/YYYY ou YYYY-MM-DD) para YYYY-MM-DD.
 */
export function normalizeDateToYYYYMMDD(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Se já estiver no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Se vier com timestamp ISO (ex: 2026-09-30T15:00:00Z)
  if (trimmed.includes('T')) {
    const isoDate = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  }

  // Se estiver no formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Tentar parse via Date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const day = parsed.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Recalcula a sequência de estudos (streak), a data do último dia estudado,
 * a soma das questões de hoje e os recordes históricos (questões e sequência)
 * a partir dos registros ativos restantes no banco.
 * Considera o fuso horário de Brasília (America/Sao_Paulo).
 */
export function recalculateStreakFromEntries(
  entries: StudyLogEntry[],
  currentMetrics: Partial<UserStudyStreak> = {}
): UserStudyStreak {
  const today = getTodayAsYYYYMMDDLocal();

  // 1. Filtrar e normalizar todas as entradas válidas restantes
  const normalizedEntries: { date: string; questions: number }[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    const normDate = normalizeDateToYYYYMMDD(entry.date);
    if (normDate) {
      normalizedEntries.push({
        date: normDate,
        questions: Math.max(0, Number(entry.questions) || 0),
      });
    }
  }

  // 2. Se não houver nenhum registro ativo restante, todos os recordes e métricas são zerados
  if (normalizedEntries.length === 0) {
    return {
      sequencia_dias_atual: 0,
      sequencia_dias_recorde: 0,
      questoes_hoje: 0,
      questoes_recorde_diario: 0,
      ultimo_dia_estudado: null,
    };
  }

  // 3. Recálculo das questões de hoje: soma de todos os registros ativos para a data de hoje (Brasília)
  const questoesHoje = normalizedEntries
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + e.questions, 0);

  // 4. Recálculo de questoes_recorde_diario:
  // Maior soma diária de questões resolvidas em um único dia (MAX da soma diária de questões) no histórico ativo restante
  const dailyQuestionsMap = new Map<string, number>();
  for (const entry of normalizedEntries) {
    dailyQuestionsMap.set(
      entry.date,
      (dailyQuestionsMap.get(entry.date) || 0) + entry.questions
    );
  }

  let questoesRecordeDiario = 0;
  for (const total of dailyQuestionsMap.values()) {
    if (total > questoesRecordeDiario) {
      questoesRecordeDiario = total;
    }
  }

  // 5. Coletar datas distintas com estudos registrados
  const distinctDates = Array.from(new Set(normalizedEntries.map(e => e.date)));

  // 6. Recálculo de sequencia_dias_recorde:
  // Maior sequência consecutiva de dias de estudo já atingida no histórico ativo restante
  const sortedDatesAsc = [...distinctDates].sort((a, b) => a.localeCompare(b));
  let sequenciaDiasRecorde = 1;
  let currentStreakRun = 1;

  for (let i = 1; i < sortedDatesAsc.length; i++) {
    const prevDate = sortedDatesAsc[i - 1];
    const currDate = sortedDatesAsc[i];
    const diff = getDaysDiff(prevDate, currDate);

    if (diff === 1) {
      currentStreakRun++;
      if (currentStreakRun > sequenciaDiasRecorde) {
        sequenciaDiasRecorde = currentStreakRun;
      }
    } else if (diff === 0) {
      // Mesma data
      continue;
    } else {
      // Quebra na sequência consecutiva de dias
      currentStreakRun = 1;
    }
  }

  // 7. Recálculo da sequência atual (sequencia_dias_atual) e último dia estudado
  const sortedDatesDesc = [...distinctDates].sort((a, b) => b.localeCompare(a));
  const latestDate = sortedDatesDesc[0];
  const diffFromToday = getDaysDiff(latestDate, today);

  let sequenciaAtual = 0;

  // Se o último dia estudado for hoje (diff === 0) ou ontem (diff === 1), a sequência está ativa
  if (diffFromToday === 0 || diffFromToday === 1) {
    sequenciaAtual = 1;
    for (let i = 0; i < sortedDatesDesc.length - 1; i++) {
      if (getDaysDiff(sortedDatesDesc[i + 1], sortedDatesDesc[i]) === 1) {
        sequenciaAtual++;
      } else {
        break;
      }
    }
  } else {
    // Se o último dia estudado for anterior a ontem (diff > 1), a sequência diária foi interrompida
    sequenciaAtual = 0;
  }

  // Garantir consistência: o recorde histórico não pode ser menor que o streak atual
  sequenciaDiasRecorde = Math.max(sequenciaDiasRecorde, sequenciaAtual);
  questoesRecordeDiario = Math.max(questoesRecordeDiario, questoesHoje);

  return {
    sequencia_dias_atual: sequenciaAtual,
    sequencia_dias_recorde: sequenciaDiasRecorde,
    questoes_hoje: questoesHoje,
    questoes_recorde_diario: questoesRecordeDiario,
    ultimo_dia_estudado: latestDate,
  };
}
