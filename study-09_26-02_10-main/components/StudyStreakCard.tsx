import * as React from 'react';
import { UserStudyStreak } from '../types';
import { getTodayAsYYYYMMDDLocal } from '../src/utils/dateUtils';

interface StudyStreakCardProps {
  streak: UserStudyStreak;
  isLoading?: boolean;
}

export const StudyStreakCard: React.FC<StudyStreakCardProps> = ({ streak, isLoading = false }) => {
  const today = getTodayAsYYYYMMDDLocal();
  const studiedToday = streak?.ultimo_dia_estudado === today;

  const seqAtual = Math.max(0, Number(streak?.sequencia_dias_atual) || 0);
  const seqRecorde = Math.max(0, Number(streak?.sequencia_dias_recorde) || 0);
  const questHoje = Math.max(0, Number(streak?.questoes_hoje) || 0);
  const questRecorde = Math.max(0, Number(streak?.questoes_recorde_diario) || 0);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-500/20 rounded-2xl p-6 shadow-2xl animate-pulse">
        {/* Luz ambiente sutil decorativa de fundo */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-gray-700/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-700/80 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-44 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-60 bg-gray-700/60 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-48 bg-gray-700/50 rounded-full animate-pulse" />
        </div>

        {/* Grid de 4 Métricas Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 relative z-10">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-gray-700/80 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-700 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-700/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
      {/* Luz ambiente sutil decorativa de fundo */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabeçalho da Ofensiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-gray-700/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-2xl">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">Ofensiva de Estudos</h2>
              <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Recordes & Foco
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Consistência diária é o segredo da sua aprovação.
            </p>
          </div>
        </div>

        <div>
          {studiedToday ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              🔥 Ofensiva mantida hoje!
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              ⚡ Estude hoje para manter a chama acesa!
            </div>
          )}
        </div>
      </div>

      {/* Grid de 4 Métricas Visuais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 relative z-10">
        {/* 1. Sequência Atual */}
        <div className="group bg-gray-800/80 hover:bg-gray-800/95 border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-4 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Sequência Atual
            </span>
            <span className="text-lg group-hover:scale-110 transition-transform">🔥</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight">
              {seqAtual}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              {seqAtual === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {seqAtual > 0 
              ? 'Dias seguidos estudando'
              : 'Comece sua sequência hoje!'}
          </p>
        </div>

        {/* 2. Seu Recorde de Dias */}
        <div className="group bg-gray-800/80 hover:bg-gray-800/95 border border-orange-500/20 hover:border-orange-500/40 rounded-xl p-4 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Seu Recorde
            </span>
            <span className="text-lg group-hover:scale-110 transition-transform">🏆</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight">
              {seqRecorde}
            </span>
            <span className="text-xs font-semibold text-gray-400">
              {seqRecorde === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Maior sequência histórica
          </p>
        </div>

        {/* 3. Questões do Dia */}
        <div className="group bg-gray-800/80 hover:bg-gray-800/95 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-4 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Questões do Dia
            </span>
            <span className="text-lg group-hover:scale-110 transition-transform">🎯</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight">
              {questHoje}
            </span>
            <span className="text-xs font-semibold text-gray-400">questões</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Resolvidas hoje
          </p>
        </div>

        {/* 4. Recorde de Questões num Único Dia */}
        <div className="group bg-gray-800/80 hover:bg-gray-800/95 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl p-4 transition-all duration-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Recorde de Questões
            </span>
            <span className="text-lg group-hover:scale-110 transition-transform">⚡</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight">
              {questRecorde}
            </span>
            <span className="text-xs font-semibold text-gray-400">num único dia</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Seu melhor rendimento diário
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudyStreakCard;
