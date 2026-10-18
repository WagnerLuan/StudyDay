import * as React from 'react';
import { StudyPlan } from '../types';

interface PlanejamentoDisciplinePerformanceProps {
    plans: StudyPlan[];
    onNavigate: (page: string) => void;
}

interface DisciplinePerfItem {
    id: string;
    name: string;
    color: string;
    correct: number;
    incorrect: number;
    total: number;
    accuracy: number;
}

const PlanejamentoDisciplinePerformance: React.FC<PlanejamentoDisciplinePerformanceProps> = ({
    plans,
    onNavigate,
}) => {
    const [sortOrder, setSortOrder] = React.useState<'pior' | 'melhor'>('pior');

    // Agrega as disciplinas dos planos filtrados
    const aggregatedDisciplines = React.useMemo(() => {
        const map = new Map<string, DisciplinePerfItem>();

        plans.forEach(plan => {
            (plan.disciplines || []).forEach(disc => {
                const nameKey = (disc.name || '').trim();
                if (!nameKey) return;

                let correct = 0;
                let incorrect = 0;

                if (disc.historyLogs && disc.historyLogs.length > 0) {
                    disc.historyLogs.forEach(log => {
                        correct += Math.max(0, parseInt(String(log.correct), 10) || 0);
                        incorrect += Math.max(0, parseInt(String(log.incorrect), 10) || 0);
                    });
                } else if (disc.performance) {
                    correct = Math.max(0, parseInt(String(disc.performance.correct), 10) || 0);
                    incorrect = Math.max(0, parseInt(String(disc.performance.incorrect), 10) || 0);
                }

                if (map.has(nameKey)) {
                    const existing = map.get(nameKey)!;
                    existing.correct += correct;
                    existing.incorrect += incorrect;
                    existing.total = existing.correct + existing.incorrect;
                    existing.accuracy = existing.total > 0 ? (existing.correct / existing.total) * 100 : 0;
                } else {
                    const total = correct + incorrect;
                    const accuracy = total > 0 ? (correct / total) * 100 : 0;
                    map.set(nameKey, {
                        id: disc.id,
                        name: disc.name,
                        color: disc.color || '#10B981',
                        correct,
                        incorrect,
                        total,
                        accuracy,
                    });
                }
            });
        });

        return Array.from(map.values());
    }, [plans]);

    // Ordenação conforme as regras especificadas
    const sortedDisciplines = React.useMemo(() => {
        return [...aggregatedDisciplines].sort((a, b) => {
            const aHasQuestions = a.total > 0;
            const bHasQuestions = b.total > 0;

            // 1. Disciplinas não iniciadas sempre ao final da lista
            if (aHasQuestions && !bHasQuestions) return -1;
            if (!aHasQuestions && bHasQuestions) return 1;

            // Se nenhuma tiver questões resolvidas, ordenar alfabeticamente
            if (!aHasQuestions && !bHasQuestions) {
                return a.name.localeCompare(b.name, 'pt-BR');
            }

            // 2. Se ambas tiverem questões:
            if (sortOrder === 'pior') {
                // Menor % para maior % (ex: 30%, 68.4%, 90%)
                if (a.accuracy !== b.accuracy) {
                    return a.accuracy - b.accuracy;
                }
            } else {
                // Maior % para menor % (ex: 90%, 68.4%, 30%)
                if (a.accuracy !== b.accuracy) {
                    return b.accuracy - a.accuracy;
                }
            }

            // Critério de desempate: alfabético pelo nome
            return a.name.localeCompare(b.name, 'pt-BR');
        });
    }, [aggregatedDisciplines, sortOrder]);

    const renderBadge = (item: DisciplinePerfItem) => {
        if (item.total === 0) {
            return (
                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-700/80 text-gray-300 border border-gray-600">
                    Não iniciada
                </span>
            );
        }

        if (item.accuracy >= 80) {
            return (
                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                    {item.accuracy.toFixed(1)}%
                </span>
            );
        }

        if (item.accuracy >= 60) {
            return (
                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                    {item.accuracy.toFixed(1)}%
                </span>
            );
        }

        return (
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono">
                {item.accuracy.toFixed(1)}%
            </span>
        );
    };

    if (aggregatedDisciplines.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6 space-y-5">
            {/* Cabeçalho do Card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-700">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Desempenho por Disciplina</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Resumo de acertos e aproveitamento nas questões</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Select de Ordenação */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="discipline-order-select" className="text-xs text-gray-400 font-medium whitespace-nowrap">
                            Ordenar:
                        </label>
                        <select
                            id="discipline-order-select"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'pior' | 'melhor')}
                            className="bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer transition-colors"
                        >
                            <option value="pior">Pior Desempenho</option>
                            <option value="melhor">Melhor Desempenho</option>
                        </select>
                    </div>

                    {/* Link para Estatísticas */}
                    <button
                        onClick={() => onNavigate('estatisticas')}
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold flex items-center gap-1.5 transition-colors group cursor-pointer"
                        title="Ver estatísticas detalhadas"
                    >
                        <span>Ver estatísticas detalhadas</span>
                        <span className="transition-transform group-hover:translate-x-1 font-bold">→</span>
                    </button>
                </div>
            </div>

            {/* Linhas de Disciplina */}
            <div className="divide-y divide-gray-700/60">
                {sortedDisciplines.map(disc => (
                    <div
                        key={disc.name}
                        className="py-3 sm:py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-gray-700/30 rounded-xl transition-colors"
                    >
                        {/* Nome da Disciplina com Bullet colorido */}
                        <div className="flex items-center gap-3 min-w-0">
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: disc.color }}
                            />
                            <span className="font-semibold text-white text-sm sm:text-base tracking-wide truncate">
                                {disc.name}
                            </span>
                        </div>

                        {/* Badge de % e Contador de Questões */}
                        <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                            {renderBadge(disc)}
                            <span className="text-xs sm:text-sm text-gray-400 font-mono">
                                ({disc.correct}/{disc.total} questões)
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlanejamentoDisciplinePerformance;
