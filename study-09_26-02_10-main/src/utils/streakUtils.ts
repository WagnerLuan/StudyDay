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

export function getDaysDiff(fromDateStr: string, toDateStr: string): number {
  const norm1 = normalizeDateToYYYYMMDD(fromDateStr) || fromDateStr;
  const norm2 = normalizeDateToYYYYMMDD(toDateStr) || toDateStr;
  const [y1, m1, d1] = norm1.split('-').map(val => parseInt(val, 10));
  const [y2, m2, d2] = norm2.split('-').map(val => parseInt(val, 10));
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export interface StudyLogEntry {
  date: string; // YYYY-MM-DD
  questions: number;
}

/**
 * LÓGICA DINÂMICA ÚNICA BASEADA NA TABELA DE LOGS (Fonte da Verdade)
 *
 * Recalcula com precisão matemática:
 * - questoes_hoje: soma estrita das questões dos registros de HOJE no fuso de Brasília.
 * - questoes_recorde_diario: agrupa todos os registros por data e obtém o MAX das somas diárias.
 * - sequencia_dias_atual: contagem contínua de dias com estudo até hoje.
 * - sequencia_dias_recorde: maior sequência histórica de dias consecutivos com registros.
 *
 * Todas as operações forçam tipos numéricos estritos (Number / parseInt) para evitar concatenação de strings.
 */
export function recalculateStreakFromEntries(
  entries: StudyLogEntry[],
  _currentMetrics?: Partial<UserStudyStreak>
): UserStudyStreak {
  const today = getTodayAsYYYYMMDDLocal();

  // 1. Filtrar e normalizar todas as entradas válidas restantes com conversão numérica estrita
  const normalizedEntries: { date: string; questions: number }[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    const normDate = normalizeDateToYYYYMMDD(entry.date);
    if (normDate) {
      const q = Math.max(0, parseInt(String(entry.questions), 10) || 0);
      normalizedEntries.push({
        date: normDate,
        questions: q,
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

  // 3. Recálculo das questões de hoje: soma estrita de todos os registros ativos para a data de hoje (Brasília)
  const questoesHoje = normalizedEntries
    .filter(e => e.date === today)
    .reduce((sum, e) => Number(sum) + Number(e.questions), 0);

  // 4. Recálculo de questoes_recorde_diario:
  // Agrupar todos os registros históricos por data, somando as questões de cada dia, e definir o recorde como o valor MÁXIMO obtido entre todas as somas diárias
  const dailyQuestionsMap = new Map<string, number>();
  for (const entry of normalizedEntries) {
    const prev = dailyQuestionsMap.get(entry.date) || 0;
    dailyQuestionsMap.set(entry.date, Number(prev) + Number(entry.questions));
  }

  let questoesRecordeDiario = 0;
  for (const total of dailyQuestionsMap.values()) {
    const numTotal = Number(total) || 0;
    if (numTotal > questoesRecordeDiario) {
      questoesRecordeDiario = numTotal;
    }
  }

  // 5. Coletar datas distintas com estudos registrados
  const distinctDates = Array.from(new Set(normalizedEntries.map(e => e.date)));

  // 6. Recálculo de sequencia_dias_recorde:
  // Maior sequência histórica de dias consecutivos com registros de estudo na base de dados
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
      continue;
    } else {
      currentStreakRun = 1;
    }
  }

  // 7. Recálculo da sequência atual (sequencia_dias_atual):
  // Sequência contínua de dias que possuem ao menos 1 registro de estudo até a data de hoje
  const sortedDatesDesc = [...distinctDates].sort((a, b) => b.localeCompare(a));
  const latestDate = sortedDatesDesc[0];
  const diffFromToday = getDaysDiff(latestDate, today);

  let sequenciaAtual = 0;

  // Se o último dia estudado for hoje (diff === 0) ou ontem (diff === 1), a sequência diária está ativa
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

  // Garantir consistência: recordes históricos >= métricas de hoje
  sequenciaDiasRecorde = Math.max(Number(sequenciaDiasRecorde) || 0, Number(sequenciaAtual) || 0);
  questoesRecordeDiario = Math.max(Number(questoesRecordeDiario) || 0, Number(questoesHoje) || 0);

  return {
    sequencia_dias_atual: Math.max(0, parseInt(String(sequenciaAtual), 10) || 0),
    sequencia_dias_recorde: Math.max(0, parseInt(String(sequenciaDiasRecorde), 10) || 0),
    questoes_hoje: Math.max(0, parseInt(String(questoesHoje), 10) || 0),
    questoes_recorde_diario: Math.max(0, parseInt(String(questoesRecordeDiario), 10) || 0),
    ultimo_dia_estudado: latestDate,
  };
}
