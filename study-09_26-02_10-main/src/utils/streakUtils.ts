import { UserStudyStreak } from '../../types';
import { getTodayAsYYYYMMDDLocal } from './dateUtils';
import { supabase } from '../lib/supabase';

export const DEFAULT_STREAK: UserStudyStreak = {
  sequencia_dias_atual: 0,
  sequencia_dias_recorde: 0,
  questoes_hoje: 0,
  questoes_recorde_diario: 0,
  ultimo_dia_estudado: null,
};

/**
 * Retorna a diferença em dias entre duas datas no formato YYYY-MM-DD.
 */
export function getDaysDiff(fromDateStr: string, toDateStr: string): number {
  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = toDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Normaliza qualquer formato de data (YYYY-MM-DD, ISO string, DD/MM/YYYY) para YYYY-MM-DD.
 */
export function normalizeDateString(dateVal: any): string | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // YYYY-MM-DD...
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // DD/MM/YYYY...
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split(' ')[0].split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // ISO fallback
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // Ignore error
  }

  return null;
}

export interface StudyLogEntry {
  date: string; // YYYY-MM-DD
  questions: number;
  planId?: string;
}

/**
 * Recalcula com precisão matemática as métricas da Ofensiva de Estudos
 * baseando-se ESTRITAMENTE nos registros reais existentes no sistema (fonte única da verdade).
 *
 * Regras:
 * • Sequência atual: quantidade de dias consecutivos em que houve estudo, considerando os registros reais.
 *   - Se estudou hoje: sequência ativa terminando hoje.
 *   - Se não estudou hoje mas estudou ontem: sequência conquistada até ontem permanece ativa hoje.
 *   - Se último estudo foi anterior a ontem: sequência zerada (0).
 * • Recorde: maior sequência histórica de dias consecutivos com estudo entre todos os registros.
 * • Questões do dia: soma das questões registradas na data de HOJE (fuso de Brasília).
 * • Recorde de questões: maior quantidade de questões registradas em um único dia.
 *
 * Se todos os estudos forem excluídos ou não houver registros, todos os valores retornam a 0.
 */
export function recalculateStreakFromEntries(entries: StudyLogEntry[]): UserStudyStreak {
  const today = getTodayAsYYYYMMDDLocal();

  // 1. Agrupar questões por data (YYYY-MM-DD)
  const dateMap = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.date) continue;
    const normalizedDate = normalizeDateString(entry.date);
    if (!normalizedDate) continue;

    const q = Math.max(0, Number(entry.questions) || 0);
    dateMap.set(normalizedDate, (dateMap.get(normalizedDate) || 0) + q);
  }

  // Se não há registros de estudo no banco de dados, tudo é zero
  if (dateMap.size === 0) {
    return {
      sequencia_dias_atual: 0,
      sequencia_dias_recorde: 0,
      questoes_hoje: 0,
      questoes_recorde_diario: 0,
      ultimo_dia_estudado: null,
    };
  }

  // 2. Questões do dia (HOJE)
  const questoes_hoje = dateMap.get(today) || 0;

  // 3. Recorde de questões num único dia (máximo diário histórico entre os registros existentes)
  let maxQuestionsInSingleDay = 0;
  for (const q of dateMap.values()) {
    if (q > maxQuestionsInSingleDay) {
      maxQuestionsInSingleDay = q;
    }
  }
  const questoes_recorde_diario = maxQuestionsInSingleDay;

  // 4. Todas as datas com estudo ordenadas em ordem cronológica crescente
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));
  const ultimo_dia_estudado = sortedDates[sortedDates.length - 1];

  // 5. Recorde de sequência (maior sequência histórica de dias consecutivos)
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = getDaysDiff(sortedDates[i - 1], sortedDates[i]);
    if (diff === 1) {
      currentConsecutive++;
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
      }
    } else if (diff > 1) {
      currentConsecutive = 1;
    }
  }

  // 6. Sequência atual (dias consecutivos até hoje ou ontem)
  const pastAndTodayDates = sortedDates.filter(d => d <= today);
  let sequencia_dias_atual = 0;

  if (pastAndTodayDates.length > 0) {
    const latestPastOrToday = pastAndTodayDates[pastAndTodayDates.length - 1];
    const diffFromToday = getDaysDiff(latestPastOrToday, today);

    // Se estudou hoje (diff === 0) ou ontem (diff === 1), a sequência está ativa
    if (diffFromToday === 0 || diffFromToday === 1) {
      let streak = 1;
      for (let i = pastAndTodayDates.length - 1; i > 0; i--) {
        const diff = getDaysDiff(pastAndTodayDates[i - 1], pastAndTodayDates[i]);
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
      sequencia_dias_atual = streak;
    } else {
      // Último estudo foi antes de ontem: sequência zerada
      sequencia_dias_atual = 0;
    }
  }

  // O recorde histórico nunca pode ser menor que a sequência atual
  const sequencia_dias_recorde = Math.max(maxConsecutive, sequencia_dias_atual);

  return {
    sequencia_dias_atual,
    sequencia_dias_recorde,
    questoes_hoje,
    questoes_recorde_diario,
    ultimo_dia_estudado,
  };
}

/**
 * Consulta todas as tabelas de registros de estudo reais do usuário no Supabase
 * (history_logs e simulados) e monta a lista de entradas de estudo.
 */
export async function fetchUserStudyEntries(userId: string): Promise<StudyLogEntry[]> {
  const entries: StudyLogEntry[] = [];

  try {
    // 1. Buscar history_logs
    const { data: logs, error: logsError } = await supabase
      .from('history_logs')
      .select('log_date, correct_questions, incorrect_questions')
      .eq('user_id', userId);

    if (logsError) {
      console.error("Erro ao carregar history_logs no fetchUserStudyEntries:", logsError);
    } else if (logs) {
      for (const l of logs) {
        const date = normalizeDateString(l.log_date);
        if (date) {
          const q = (Number(l.correct_questions) || 0) + (Number(l.incorrect_questions) || 0);
          entries.push({ date, questions: q });
        }
      }
    }

    // 2. Buscar simulados
    const { data: sims, error: simsError } = await supabase
      .from('simulados')
      .select('date, disciplines')
      .eq('user_id', userId);

    if (simsError) {
      console.error("Erro ao carregar simulados no fetchUserStudyEntries:", simsError);
    } else if (sims) {
      for (const s of sims) {
        const date = normalizeDateString(s.date);
        if (date) {
          const q = (s.disciplines || []).reduce((acc: number, d: any) => {
            const discQ = d.totalQuestions !== undefined && d.totalQuestions !== null
              ? Number(d.totalQuestions)
              : (Number(d.correctAnswers) || 0) + (Number(d.incorrectAnswers) || 0) + (Number(d.blankAnswers) || 0);
            return acc + (Number(discQ) || 0);
          }, 0);
          entries.push({ date, questions: q });
        }
      }
    }
  } catch (err) {
    console.error("Erro inesperado ao buscar entradas de estudo:", err);
  }

  return entries;
}

/**
 * Função centralizada de sincronização em tempo real da Ofensiva de Estudos.
 *
 * 1. Coleta os registros reais de estudo do Supabase (history_logs e simulados).
 * 2. Recalcula as 4 métricas com precisão matemática a partir do histórico real.
 * 3. Grava o resultado na tabela `profiles` do Supabase.
 * 4. Retorna a resposta confirmada do banco para atualização imediata do estado React.
 */
export async function sincronizarOfensivaUsuario(userId: string): Promise<UserStudyStreak> {
  if (!userId) return DEFAULT_STREAK;

  const entries = await fetchUserStudyEntries(userId);
  const calculated = recalculateStreakFromEntries(entries);

  try {
    // Atualizar no banco Supabase
    const { data: updateData, error: updateErr } = await supabase
      .from('profiles')
      .update({
        sequencia_dias_atual: calculated.sequencia_dias_atual,
        sequencia_dias_recorde: calculated.sequencia_dias_recorde,
        questoes_hoje: calculated.questoes_hoje,
        questoes_recorde_diario: calculated.questoes_recorde_diario,
        ultimo_dia_estudado: calculated.ultimo_dia_estudado,
      })
      .eq('id', userId)
      .select('sequencia_dias_atual, sequencia_dias_recorde, questoes_hoje, questoes_recorde_diario, ultimo_dia_estudado')
      .maybeSingle();

    if (updateErr) {
      console.error("Erro ao atualizar profiles no Supabase:", updateErr);
    }

    if (!updateData && !updateErr) {
      // Caso o registro na tabela profiles ainda não exista
      const { data: upsertData, error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          sequencia_dias_atual: calculated.sequencia_dias_atual,
          sequencia_dias_recorde: calculated.sequencia_dias_recorde,
          questoes_hoje: calculated.questoes_hoje,
          questoes_recorde_diario: calculated.questoes_recorde_diario,
          ultimo_dia_estudado: calculated.ultimo_dia_estudado,
        })
        .select('sequencia_dias_atual, sequencia_dias_recorde, questoes_hoje, questoes_recorde_diario, ultimo_dia_estudado')
        .maybeSingle();

      if (upsertErr) {
        console.error("Erro ao fazer upsert na tabela profiles:", upsertErr);
      }

      if (upsertData) {
        return {
          sequencia_dias_atual: Number(upsertData.sequencia_dias_atual) || 0,
          sequencia_dias_recorde: Number(upsertData.sequencia_dias_recorde) || 0,
          questoes_hoje: Number(upsertData.questoes_hoje) || 0,
          questoes_recorde_diario: Number(upsertData.questoes_recorde_diario) || 0,
          ultimo_dia_estudado: upsertData.ultimo_dia_estudado || null,
        };
      }
    } else if (updateData) {
      return {
        sequencia_dias_atual: Number(updateData.sequencia_dias_atual) || 0,
        sequencia_dias_recorde: Number(updateData.sequencia_dias_recorde) || 0,
        questoes_hoje: Number(updateData.questoes_hoje) || 0,
        questoes_recorde_diario: Number(updateData.questoes_recorde_diario) || 0,
        ultimo_dia_estudado: updateData.ultimo_dia_estudado || null,
      };
    }
  } catch (err) {
    console.error("Erro inesperado ao persistir métricas de streak no Supabase:", err);
  }

  // Fallback seguro caso a escrita no banco encontre erro de conexão
  return calculated;
}
