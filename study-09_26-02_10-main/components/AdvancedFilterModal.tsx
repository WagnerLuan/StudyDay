import * as React from 'react';
import { XIcon, BookOpenIcon, RepeatIcon, QuestionMarkCircleIcon, FileTextIcon, GavelIcon, CalendarIcon } from '../constants';
import { StudyPlan } from '../types';

export interface Filters {
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
}

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

const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({ isOpen, onClose, onApply, onClear, plans, currentFilters }) => {
    const [filters, setFilters] = React.useState<Filters>(currentFilters);

    React.useEffect(() => {
        setFilters(currentFilters);
    }, [currentFilters, isOpen]);

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
        setFilters(initialFiltersState); // Reset internal state
        onClear(); // Reset parent state
    };

    const allDisciplines = React.useMemo(() => {
        const disciplineMap = new Map<string, { id: string, name: string }>();
        plans.forEach(plan => {
            plan.disciplines.forEach(disc => {
                if (!disciplineMap.has(disc.name)) {
                    disciplineMap.set(disc.name, { id: disc.id, name: disc.name });
                }
            });
        });
        return Array.from(disciplineMap.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [plans]);


    const topicsForSelectedDiscipline = React.useMemo(() => {
        if (!filters.disciplineName) return [];
        const allTopics = new Set<string>();
        plans.forEach(plan => {
            plan.disciplines
                .filter(d => d.name === filters.disciplineName)
                .forEach(discipline => {
                    if (discipline.topicsList) {
                        discipline.topicsList.forEach(topic => allTopics.add(topic.name));
                    }
                });
        });
        return Array.from(allTopics).sort();
    }, [filters.disciplineName, plans]);

    if (!isOpen) return null;

    const categories = [
        { label: 'Teoria', icon: <BookOpenIcon className="w-5 h-5"/> },
        { label: 'Revisão', icon: <RepeatIcon className="w-5 h-5"/> },
        { label: 'Questões', icon: <QuestionMarkCircleIcon className="w-5 h-5"/> },
        { label: 'Leitura de Lei', icon: <FileTextIcon className="w-5 h-5"/> },
        { label: 'Jurisprudência', icon: <GavelIcon className="w-5 h-5"/> },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl text-white transform transition-all flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-emerald-400">Filtros Avançados</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon /></button>
                </header>

                <main className="p-6 space-y-5 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FilterCard title="Período">
                            <div className="space-y-3">
                                <div className="relative">
                                    <input 
                                        type={filters.startDate ? 'date' : 'text'}
                                        placeholder="dd/mm/aaaa"
                                        onFocus={(e) => (e.target.type = 'date')}
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
                                        value={filters.startDate} 
                                        onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} 
                                        className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm pr-8" 
                                    />
                                    <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                     <input 
                                        type={filters.endDate ? 'date' : 'text'}
                                        placeholder="dd/mm/aaaa"
                                        onFocus={(e) => (e.target.type = 'date')}
                                        onBlur={(e) => { if (!e.target.value) e.target.type = 'text' }}
                                        value={filters.endDate} 
                                        onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} 
                                        className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm pr-8" 
                                    />
                                     <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                            <div className="flex items-center gap-3">
                                <input type="number" placeholder="Mínimo" value={filters.minPerformance} onChange={e => setFilters(f => ({ ...f, minPerformance: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm" />
                                <input type="number" placeholder="Máximo" value={filters.maxPerformance} onChange={e => setFilters(f => ({ ...f, maxPerformance: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full bg-slate-600 border-slate-500 rounded p-2 text-sm" />
                            </div>
                        </FilterCard>
                    </div>

                    <FilterCard title="Categoria">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                    <button onClick={handleClear} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Limpar</button>
                    <button onClick={() => onApply(filters)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Aplicar</button>
                </footer>
            </div>
        </div>
    );
};

export default AdvancedFilterModal;