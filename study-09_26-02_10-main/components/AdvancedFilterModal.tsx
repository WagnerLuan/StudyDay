import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { XIcon, BookOpenIcon, QuestionMarkCircleIcon, FileTextIcon, GavelIcon, CalendarIcon, VideoIcon } from '../constants';
import { StudyPlan } from '../types';

export interface Filters {
    planId?: string;
    startDate: string;
    endDate: string;
    minDuration: number | '';
    maxDuration: number | '';
    minPerformance: number | '';
    maxPerformance: number | '';
    categories: Set<string>;
    disciplineName: string;
    topicName: string;
}

interface AdvancedFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: Filters) => void;
    onClear: () => void;
    plans: StudyPlan[];
    currentFilters: Filters;
    selectedPlanIds?: string[];
}

const formatLocalYMD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPeriodRange = (preset: 'thisWeek' | 'last7' | 'last30'): { startDate: string; endDate: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'thisWeek') {
        const day = today.getDay();
        const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
        return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(end) };
    }

    if (preset === 'last7') {
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(today) };
    }

    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
    return { startDate: formatLocalYMD(start), endDate: formatLocalYMD(today) };
};

const FilterCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-700/50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
        {children}
    </div>
);

const CategoryButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isSelected: boolean;
    onClick: () => void;
}> = ({ icon, label, isSelected, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 text-sm font-semibold rounded-lg border-2 transition-colors duration-200 ${
            isSelected
                ? 'bg-emerald-500/20 border-emerald-500 text-white'
                : 'bg-slate-800/50 border-slate-600 text-gray-300 hover:border-slate-500'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const initialFiltersState: Filters = {
    planId: '',
    startDate: '',
    endDate: '',
    minDuration: '',
    maxDuration: '',
    minPerformance: '',
    maxPerformance: '',
    categories: new Set(),
    disciplineName: '',
    topicName: '',
};

const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
    isOpen,
    onClose,
    onApply,
    onClear,
    plans,
    currentFilters,
    selectedPlanIds,
}) => {
    const [filters, setFilters] = React.useState<Filters>(currentFilters);
    const startDateRef = React.useRef<HTMLInputElement>(null);
    const endDateRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!isOpen) return;
        const derivedPlanId =
            currentFilters.planId !== undefined && currentFilters.planId !== ''
                ? currentFilters.planId
                : selectedPlanIds && selectedPlanIds.length === 1 && selectedPlanIds[0] !== 'all'
                ? selectedPlanIds[0]
                : '';

        setFilters({
            ...currentFilters,
            planId: derivedPlanId,
            categories: new Set(currentFilters.categories),
        });
    }, [currentFilters, isOpen, selectedPlanIds]);

    const openDatePicker = (inputRef: React.RefObject<HTMLInputElement | null>) => {
        const el = inputRef.current;
        if (!el) return;
        el.type = 'date';
        el.focus();
        if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
            try {
                (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
            } catch {
                // Ignore if browser restricts programmatic showPicker
            }
        }
    };

    const handleCategoryToggle = (category: string) => {
        const newCategories = new Set(filters.categories);
        if (newCategories.has(category)) {
            newCategories.delete(category);
        } else {
            newCategories.add(category);
        }
        setFilters(prev => ({ ...prev, categories: newCategories }));
    };

    const handleClear = () => {
        setFilters({
            ...initialFiltersState,
            categories: new Set(),
        });
        onClear();
    };

    const scopedPlans = React.useMemo(() => {
        if (filters.planId) {
            return plans.filter(p => p.id === filters.planId);
        }
        return plans;
    }, [plans, filters.planId]);

    const allDisciplines = React.useMemo(() => {
        const disciplineMap = new Map<string, { id: string; name: string }>();
        scopedPlans.forEach(plan => {
            plan.disciplines.forEach(disc => {
                if (!disciplineMap.has(disc.name)) {
                    disciplineMap.set(disc.name, { id: disc.id, name: disc.name });
                }
            });
        });
        return Array.from(disciplineMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [scopedPlans]);

    const handlePlanChange = (newPlanId: string) => {
        const candidatePlans = newPlanId ? plans.filter(p => p.id === newPlanId) : plans;
        const stillHasDiscipline = filters.disciplineName
            ? candidatePlans.some(p => p.disciplines.some(d => d.name === filters.disciplineName))
            : false;

        setFilters(f => ({
            ...f,
            planId: newPlanId,
            disciplineName: stillHasDiscipline ? f.disciplineName : '',
            topicName: stillHasDiscipline ? f.topicName : '',
        }));
    };

    const topicsForSelectedDiscipline = React.useMemo(() => {
        if (!filters.disciplineName) return [];
        const allTopics = new Set<string>();
        scopedPlans.forEach(plan => {
            plan.disciplines
                .filter(d => d.name === filters.disciplineName)
                .forEach(discipline => {
                    if (discipline.topicsList) {
                        discipline.topicsList.forEach(topic => allTopics.add(topic.name));
                    }
                });
        });
        return Array.from(allTopics).sort();
    }, [filters.disciplineName, scopedPlans]);

    if (!isOpen) return null;

    const categories = [
        { label: 'Teoria', icon: <BookOpenIcon className="w-5 h-5" /> },
        { label: 'Revisão', icon: <RefreshCw className="w-5 h-5" /> },
        { label: 'Questões', icon: <QuestionMarkCircleIcon className="w-5 h-5" /> },
        { label: 'Leitura de Lei', icon: <FileTextIcon className="w-5 h-5" /> },
        { label: 'Jurisprudência', icon: <GavelIcon className="w-5 h-5" /> },
        { label: 'Vídeoaulas', icon: <VideoIcon className="w-5 h-5" /> },
    ];

    const thisWeekRange = getPeriodRange('thisWeek');
    const last7Range = getPeriodRange('last7');
    const last30Range = getPeriodRange('last30');

    const isThisWeekActive = filters.startDate === thisWeekRange.startDate && filters.endDate === thisWeekRange.endDate;
    const isLast7Active = filters.startDate === last7Range.startDate && filters.endDate === last7Range.endDate;
    const isLast30Active = filters.startDate === last30Range.startDate && filters.endDate === last30Range.endDate;

    const isCritPerfActive = filters.maxPerformance === 60 && filters.minPerformance === '';
    const isWarnPerfActive = filters.maxPerformance === 75 && filters.minPerformance === '';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl text-white transform transition-all flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-emerald-400">Filtros Avançados</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><XIcon /></button>
                </header>

                <main className="p-6 space-y-5 overflow-y-auto">
                    <FilterCard title="Plano de Estudo">
                        <select
                            value={filters.planId || ''}
                            onChange={(e) => handlePlanChange(e.target.value)}
                            className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm text-white"
                        >
                            <option value="">Todos os Planos</option>
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                        </select>
                    </FilterCard>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FilterCard title="Período">
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setFilters(f => ({ ...f, ...thisWeekRange }))}
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            isThisWeekActive
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                : 'bg-slate-800/70 border-slate-600 text-gray-300 hover:border-slate-500'
                                        }`}
                                    >
                                        Esta Semana
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilters(f => ({ ...f, ...last7Range }))}
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            isLast7Active
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                : 'bg-slate-800/70 border-slate-600 text-gray-300 hover:border-slate-500'
                                        }`}
                                    >
                                        Últimos 7 dias
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilters(f => ({ ...f, ...last30Range }))}
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            isLast30Active
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                : 'bg-slate-800/70 border-slate-600 text-gray-300 hover:border-slate-500'
                                        }`}
                                    >
                                        Últimos 30 dias
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        ref={startDateRef}
                                        type={filters.startDate ? 'date' : 'text'}
                                        placeholder="dd/mm/aaaa"
                                        onFocus={(e) => (e.target.type = 'date')}
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                        value={filters.startDate}
                                        onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                                        className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm pr-9 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => openDatePicker(startDateRef)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        title="Selecionar data inicial"
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        ref={endDateRef}
                                        type={filters.endDate ? 'date' : 'text'}
                                        placeholder="dd/mm/aaaa"
                                        onFocus={(e) => (e.target.type = 'date')}
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                        value={filters.endDate}
                                        onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                                        className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm pr-9 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => openDatePicker(endDateRef)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        title="Selecionar data final"
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </FilterCard>

                        <FilterCard title="Duração (minutos)">
                            <div className="flex items-center gap-3">
                                <input type="number" placeholder="Mínimo" value={filters.minDuration} onChange={e => setFilters(f => ({ ...f, minDuration: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm" />
                                <input type="number" placeholder="Máximo" value={filters.maxDuration} onChange={e => setFilters(f => ({ ...f, maxDuration: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm" />
                            </div>
                        </FilterCard>

                        <FilterCard title="Desempenho (%)">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <input type="number" placeholder="Mínimo" value={filters.minPerformance} onChange={e => setFilters(f => ({ ...f, minPerformance: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm" />
                                    <input type="number" placeholder="Máximo" value={filters.maxPerformance} onChange={e => setFilters(f => ({ ...f, maxPerformance: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm" />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setFilters(f => ({ ...f, minPerformance: '', maxPerformance: 60 }))}
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            isCritPerfActive
                                                ? 'bg-red-500/20 border-red-500 text-red-300'
                                                : 'bg-slate-800/70 border-slate-600 text-gray-300 hover:border-red-500/60'
                                        }`}
                                    >
                                        &lt; 60% (Crítico)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilters(f => ({ ...f, minPerformance: '', maxPerformance: 75 }))}
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            isWarnPerfActive
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                                : 'bg-slate-800/70 border-slate-600 text-gray-300 hover:border-amber-500/60'
                                        }`}
                                    >
                                        &lt; 75% (Atenção)
                                    </button>
                                </div>
                            </div>
                        </FilterCard>
                    </div>

                    <FilterCard title="Categoria">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {categories.map(cat => (
                                <CategoryButton
                                    key={cat.label}
                                    icon={cat.icon}
                                    label={cat.label}
                                    isSelected={filters.categories.has(cat.label)}
                                    onClick={() => handleCategoryToggle(cat.label)}
                                />
                            ))}
                        </div>
                    </FilterCard>

                    <FilterCard title="Disciplina e Tópico">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select value={filters.disciplineName} onChange={e => setFilters(f => ({ ...f, disciplineName: e.target.value, topicName: '' }))} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm">
                                <option value="">Selecione a Disciplina</option>
                                {allDisciplines.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                            <select value={filters.topicName} onChange={e => setFilters(f => ({ ...f, topicName: e.target.value }))} disabled={!filters.disciplineName} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm disabled:bg-slate-700/50 disabled:cursor-not-allowed">
                                <option value="">Selecione o Tópico</option>
                                {topicsForSelectedDiscipline.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                            </select>
                        </div>
                    </FilterCard>
                </main>

                <footer className="p-4 flex justify-end gap-4 border-t border-slate-700">
                    <button type="button" onClick={handleClear} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Limpar</button>
                    <button type="button" onClick={() => onApply(filters)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Aplicar</button>
                </footer>
            </div>
        </div>
    );
};

export default AdvancedFilterModal;