import * as React from 'react';
import { StudyPlan, Revision } from '../types';
import { getTodayAsYYYYMMDDLocal, formatDateToDisplay } from '../src/utils/dateUtils';

interface PendingRevisionsProps {
    plans: StudyPlan[];
    selectedFilterPlanIds: string[];
    onNavigateToRevisoes?: () => void;
    onStartStudyForRevision?: (revision: Revision) => void;
    onAddLogForRevisionRequest?: (revision: Revision) => void;
    onCompleteRevision?: (revision: Revision) => void;
}

const getDaysDiff = (dueDateStr: string, todayStr: string): number => {
    try {
        const [y1, m1, d1] = dueDateStr.split('-').map(Number);
        const [y2, m2, d2] = todayStr.split('-').map(Number);
        const d1Obj = new Date(y1, m1 - 1, d1);
        const d2Obj = new Date(y2, m2 - 1, d2);
        const diffMs = d1Obj.getTime() - d2Obj.getTime();
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
};

// Ícone de Sino com badge
const BellWithBadgeIcon: React.FC<{ count: number; className?: string }> = ({ count, className = "w-5 h-5" }) => (
    <div className="relative flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-amber-400`}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {count > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {count > 99 ? '99+' : count}
            </span>
        )}
    </div>
);

// Ícone de Calendário com Relógio
const CalendarClockIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
        <circle cx="12" cy="15" r="3"></circle>
        <polyline points="12 14 12 15 13.5 15"></polyline>
    </svg>
);

// Ícone de Documento / Matéria
const DocumentTextIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
);

// Ícone de Checklist
const ChecklistIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <polyline points="3 6 4 7 6 5"></polyline>
        <polyline points="3 12 4 13 6 11"></polyline>
        <polyline points="3 18 4 19 6 17"></polyline>
    </svg>
);

// Chevron Right
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

// Check Icon
const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

// Play Icon
const PlayIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
);

// 1. Notificação no Topo (Header Badge)
export const PendingRevisionsHeaderBadge: React.FC<{
    todayCount: number;
    overdueCount: number;
    totalPending: number;
    onClick: () => void;
}> = ({ todayCount, overdueCount, totalPending, onClick }) => {
    const subtitle = totalPending === 0
        ? 'Tudo em dia'
        : `${todayCount} hoje • ${overdueCount} atrasada${overdueCount === 1 ? '' : 's'}`;

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 bg-[#0f172a]/90 hover:bg-[#1e293b] border-2 border-amber-500/70 hover:border-amber-400 rounded-full px-4 py-2 transition-all duration-200 shadow-lg shadow-amber-950/20 group cursor-pointer text-left"
            title="Clique para ver detalhes das revisões pendentes"
        >
            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/40">
                <BellWithBadgeIcon count={totalPending} className="w-4 h-4" />
            </div>

            <div>
                <div className="text-xs sm:text-sm font-bold text-gray-100 group-hover:text-amber-300 transition-colors leading-tight">
                    Revisões pendentes
                </div>
                <div className="text-[11px] text-gray-400 font-medium leading-tight">
                    {subtitle}
                </div>
            </div>

            <ChevronRightIcon className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform ml-1" />
        </button>
    );
};

// 2. Card de Destaque "Próximas Revisões" (Abaixo das métricas)
export const UpcomingRevisionsCard: React.FC<{
    todayCount: number;
    overdueCount: number;
    totalPending: number;
    onClickDetails: () => void;
}> = ({ todayCount, overdueCount, totalPending, onClickDetails }) => {
    return (
        <div className="bg-[#0b1322] border border-rose-500/30 hover:border-rose-500/50 rounded-2xl p-5 shadow-xl transition-all">
            <h3 className="text-base font-bold text-gray-100 mb-3 tracking-wide">
                Próximas Revisões
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Ícone Container */}
                    <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
                        <CalendarClockIcon className="w-6 h-6" />
                    </div>

                    {/* Textos */}
                    <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-200">
                            {totalPending === 0 ? (
                                <>Não há revisões pendentes para <span className="text-emerald-400 font-bold">hoje</span>.</>
                            ) : todayCount > 0 && overdueCount > 0 ? (
                                <>Você tem revisões agendadas para <span className="text-amber-400 font-bold">hoje</span> e algumas <span className="text-rose-400 font-bold">atrasadas</span>.</>
                            ) : todayCount > 0 ? (
                                <>Você tem revisões agendadas para <span className="text-amber-400 font-bold">hoje</span>.</>
                            ) : (
                                <>Você tem revisões <span className="text-rose-400 font-bold">atrasadas</span> pendentes.</>
                            )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {totalPending === 0
                                ? 'Excelente consistência! Seus estudos estão em dia.'
                                : 'Mantenha sua consistência e evite acumular!'}
                        </p>
                    </div>
                </div>

                {/* Botão de Ver Detalhes */}
                <button
                    onClick={onClickDetails}
                    className="self-start sm:self-center bg-[#152033] hover:bg-[#1e2e4a] border border-gray-700/80 hover:border-gray-500 text-gray-200 hover:text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-md group"
                >
                    Ver detalhes
                    <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

// 3. Painel Lateral / Drawer de Detalhes ("Revisões do dia")
export const PendingRevisionsDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    todayList: Revision[];
    overdueList: Revision[];
    todayCount: number;
    overdueCount: number;
    totalPending: number;
    todayDDMM: string;
    onNavigateToRevisoes?: () => void;
    onStartStudyForRevision?: (revision: Revision) => void;
    onAddLogForRevisionRequest?: (revision: Revision) => void;
    onCompleteRevision?: (revision: Revision) => void;
}> = ({
    isOpen,
    onClose,
    todayList,
    overdueList,
    todayCount,
    overdueCount,
    totalPending,
    todayDDMM,
    onNavigateToRevisoes,
    onStartStudyForRevision,
    onAddLogForRevisionRequest,
    onCompleteRevision,
}) => {
    const [selectedRevisionId, setSelectedRevisionId] = React.useState<string | null>(null);

    // Fechar com ESC
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const todayStr = getTodayAsYYYYMMDDLocal();

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop escuro com blur */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            {/* Painel lateral deslizando da direita */}
            <div className="relative z-10 w-full sm:w-[420px] h-full bg-[#0a111e] border-l border-gray-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
                
                {/* Header do Drawer */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800/80 bg-[#0a111e]">
                    <h2 className="text-xl font-bold text-white tracking-wide">
                        Revisões do dia
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800/60 transition-colors"
                        aria-label="Fechar painel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Conteúdo rolável */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    
                    {/* 2 Cards de Resumo no topo do Painel (Verde e Vermelho) */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Card Verde: Revisões Hoje */}
                        <div className="border border-teal-500/40 bg-teal-950/20 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-white leading-none">
                                        {todayCount}
                                    </div>
                                    <div className="text-[11px] font-semibold text-gray-300 mt-1">
                                        {todayCount === 1 ? 'revisão hoje' : 'revisões hoje'}
                                    </div>
                                </div>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-teal-400 shrink-0" />
                        </div>

                        {/* Card Vermelho: Atrasada(s) */}
                        <div className="border border-rose-500/40 bg-rose-950/20 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-white leading-none">
                                        {overdueCount}
                                    </div>
                                    <div className="text-[11px] font-semibold text-gray-300 mt-1">
                                        {overdueCount === 1 ? 'atrasada' : 'atrasadas'}
                                    </div>
                                </div>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-rose-400 shrink-0" />
                        </div>
                    </div>

                    {/* Estado sem revisões */}
                    {totalPending === 0 && (
                        <div className="bg-[#10192a] border border-gray-800 rounded-xl p-6 text-center space-y-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                                ✓
                            </div>
                            <p className="text-sm font-bold text-white">Tudo em dia!</p>
                            <p className="text-xs text-gray-400">
                                Não há revisões pendentes agendadas para hoje ou em atraso para o plano selecionado.
                            </p>
                        </div>
                    )}

                    {/* Seção 1: Revisões de hoje */}
                    {todayList.length > 0 && (
                        <div className="space-y-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                                Revisões de hoje ({todayDDMM})
                            </h3>

                            <div className="space-y-2">
                                {todayList.map(rev => {
                                    const isExpanded = selectedRevisionId === rev.id;

                                    return (
                                        <div
                                            key={rev.id}
                                            className="bg-[#121c2e] hover:bg-[#16233a] border border-gray-700/60 hover:border-teal-500/50 rounded-xl p-3.5 transition-all cursor-pointer group"
                                            onClick={() => setSelectedRevisionId(isExpanded ? null : rev.id)}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* Ícone de documento em caixa teal */}
                                                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                                                        <DocumentTextIcon className="w-4 h-4" />
                                                    </div>

                                                    {/* Disciplina e Tópico */}
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-gray-100 group-hover:text-white truncate">
                                                            {rev.disciplineName}
                                                        </div>
                                                        <div className="text-xs text-gray-400 truncate">
                                                            {rev.topicName}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                                                        Hoje
                                                    </span>
                                                    <ChevronRightIcon className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </div>
                                            </div>

                                            {/* Ações rápidas ao clicar no item */}
                                            {isExpanded && (
                                                <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            if (onAddLogForRevisionRequest) {
                                                                onAddLogForRevisionRequest(rev);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                                                        title="Abrir formulário de estudo para concluir a revisão"
                                                    >
                                                        <CheckIcon className="w-3.5 h-3.5" />
                                                        Concluir
                                                    </button>

                                                    {onStartStudyForRevision && (
                                                        <button
                                                            onClick={() => {
                                                                onClose();
                                                                onStartStudyForRevision(rev);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1e293b] hover:bg-[#334155] text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors border border-gray-700"
                                                            title="Iniciar cronômetro para esta revisão"
                                                        >
                                                            <PlayIcon className="w-3.5 h-3.5 text-emerald-400" />
                                                            Iniciar Estudo
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Seção 2: Revisão atrasada / Revisões atrasadas */}
                    {overdueList.length > 0 && (
                        <div className="space-y-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                                {overdueList.length === 1 ? 'Revisão atrasada' : 'Revisões atrasadas'}
                            </h3>

                            <div className="space-y-2">
                                {overdueList.map(rev => {
                                    const diff = getDaysDiff(rev.dueDate, todayStr);
                                    const daysLate = Math.abs(diff);
                                    const isExpanded = selectedRevisionId === rev.id;

                                    return (
                                        <div
                                            key={rev.id}
                                            className="bg-[#121c2e] hover:bg-[#16233a] border border-rose-500/30 hover:border-rose-500/60 rounded-xl p-3.5 transition-all cursor-pointer group"
                                            onClick={() => setSelectedRevisionId(isExpanded ? null : rev.id)}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* Ícone de documento em caixa rose */}
                                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                                                        <DocumentTextIcon className="w-4 h-4" />
                                                    </div>

                                                    {/* Disciplina e Tópico */}
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-gray-100 group-hover:text-white truncate">
                                                            {rev.disciplineName}
                                                        </div>
                                                        <div className="text-xs text-gray-400 truncate">
                                                            {rev.topicName}
                                                        </div>
                                                        <div className="mt-1">
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block">
                                                                Atrasada há {daysLate} {daysLate === 1 ? 'dia' : 'dias'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <ChevronRightIcon className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </div>

                                            {/* Ações rápidas ao clicar no item */}
                                            {isExpanded && (
                                                <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            if (onAddLogForRevisionRequest) {
                                                                onAddLogForRevisionRequest(rev);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                                                        title="Abrir formulário de estudo para concluir a revisão"
                                                    >
                                                        <CheckIcon className="w-3.5 h-3.5" />
                                                        Concluir
                                                    </button>

                                                    {onStartStudyForRevision && (
                                                        <button
                                                            onClick={() => {
                                                                onClose();
                                                                onStartStudyForRevision(rev);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1e293b] hover:bg-[#334155] text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors border border-gray-700"
                                                            title="Iniciar cronômetro para esta revisão"
                                                        >
                                                            <PlayIcon className="w-3.5 h-3.5 text-emerald-400" />
                                                            Iniciar Estudo
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>

                {/* Botão Inferior: Ver todas as revisões */}
                <div className="p-5 border-t border-gray-800 bg-[#0a111e]">
                    <button
                        onClick={() => {
                            onClose();
                            if (onNavigateToRevisoes) onNavigateToRevisoes();
                        }}
                        className="w-full bg-[#101b2d] hover:bg-[#16253e] border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg group cursor-pointer"
                    >
                        <ChecklistIcon className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                        <span>Ver todas as revisões</span>
                        <ChevronRightIcon className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>

            </div>
        </div>
    );
};

// Componente Unificado padrão para facilitar importação
export const PendingRevisionsAlert: React.FC<PendingRevisionsProps> = ({
    plans,
    selectedFilterPlanIds,
    onNavigateToRevisoes,
    onStartStudyForRevision,
    onAddLogForRevisionRequest,
    onCompleteRevision,
}) => {
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

    const isAllSelected = selectedFilterPlanIds.includes('all');

    const selectedPlans = React.useMemo(() => {
        return isAllSelected
            ? plans
            : plans.filter(p => selectedFilterPlanIds.includes(p.id));
    }, [plans, selectedFilterPlanIds, isAllSelected]);

    const todayStr = getTodayAsYYYYMMDDLocal();

    const { todayList, overdueList, todayCount, overdueCount, totalPending, todayDDMM } = React.useMemo(() => {
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
    }, [selectedPlans, todayStr]);

    return (
        <>
            <UpcomingRevisionsCard
                todayCount={todayCount}
                overdueCount={overdueCount}
                totalPending={totalPending}
                onClickDetails={() => setIsDrawerOpen(true)}
            />

            <PendingRevisionsDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                todayList={todayList}
                overdueList={overdueList}
                todayCount={todayCount}
                overdueCount={overdueCount}
                totalPending={totalPending}
                todayDDMM={todayDDMM}
                onNavigateToRevisoes={onNavigateToRevisoes}
                onStartStudyForRevision={onStartStudyForRevision}
                onAddLogForRevisionRequest={onAddLogForRevisionRequest}
                onCompleteRevision={onCompleteRevision}
            />
        </>
    );
};

export default PendingRevisionsAlert;
