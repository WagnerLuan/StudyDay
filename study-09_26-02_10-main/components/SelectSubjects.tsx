

import * as React from 'react';
import { Discipline } from '../types';
import { XIcon } from '../constants';

interface SelectSubjectsProps {
    allDisciplines: (Discipline & { planName: string; planId: string; })[];
    onBack: () => void;
    onNext: (selectedDisciplines: (Discipline & { planName: string; planId: string; })[]) => void;
    initialSelectedIds?: Set<string>;
}

const SelectSubjects: React.FC<SelectSubjectsProps> = ({ allDisciplines, onBack, onNext, initialSelectedIds }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(initialSelectedIds || new Set());

    const uniqueDisciplinesByName = React.useMemo(() => {
        const seen = new Set<string>();
        return allDisciplines.filter(d => {
            if (seen.has(d.name)) {
                return false;
            }
            seen.add(d.name);
            return true;
        });
    }, [allDisciplines]);
    
    const filteredDisciplines = React.useMemo(() => {
        return uniqueDisciplinesByName.filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [uniqueDisciplinesByName, searchTerm]);

    const handleToggleSelection = (disciplineId: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(disciplineId)) {
            newSelection.delete(disciplineId);
        } else {
            newSelection.add(disciplineId);
        }
        setSelectedIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredDisciplines.map(d => d.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleRemoveSelected = (disciplineId: string) => {
        const newSelection = new Set(selectedIds);
        newSelection.delete(disciplineId);
        setSelectedIds(newSelection);
    };

    const selectedDisciplines = uniqueDisciplinesByName.filter(d => selectedIds.has(d.id));
    const allVisibleSelected = filteredDisciplines.length > 0 && filteredDisciplines.every(d => selectedIds.has(d.id));

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-5xl mx-auto my-8">
            <div className="text-center relative">
                <h2 className="text-3xl font-bold mb-2">Selecione as Matérias</h2>
                <p className="text-gray-400 mb-8">Clique nas matérias que você deseja incluir no seu novo ciclo de estudos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Available Subjects Panel */}
                <div>
                    <h3 className="text-xl font-bold mb-4">Matérias Disponíveis</h3>
                    <input
                        type="text"
                        placeholder="🔍 Buscar matéria..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                    />
                    <div className="flex items-center mb-4">
                        <input
                            type="checkbox"
                            id="select-all"
                            checked={allVisibleSelected}
                            onChange={handleSelectAll}
                            className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="select-all" className="ml-2 text-gray-300 cursor-pointer">Selecionar Todas</label>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg h-80 overflow-y-auto space-y-2">
                        {filteredDisciplines.map(d => (
                            <div key={d.id} className="bg-gray-700 rounded p-3">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(d.id)}
                                        onChange={() => handleToggleSelection(d.id)}
                                        className="form-checkbox h-5 w-5 bg-gray-600 border-gray-500 rounded text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span className="ml-3 text-gray-200">{d.name}</span>
                                </label>
                            </div>
                        ))}
                         {filteredDisciplines.length === 0 && <p className="text-gray-500 text-center pt-10">Nenhuma matéria encontrada.</p>}
                    </div>
                </div>

                {/* Selected Subjects Panel */}
                <div>
                    <h3 className="text-xl font-bold mb-4">Matérias Selecionadas ({selectedDisciplines.length})</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg h-96 overflow-y-auto space-y-2">
                        {selectedDisciplines.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500 text-center">Nenhuma matéria selecionada ainda.</p>
                            </div>
                        ) : (
                            selectedDisciplines.map(d => (
                                <div key={d.id} className="bg-gray-700 rounded p-3 flex justify-between items-center animate-fade-in">
                                    <span className="text-gray-200">{d.name}</span>
                                    <button onClick={() => handleRemoveSelected(d.id)} className="text-red-500 hover:text-red-400 p-1 rounded-full">
                                        <XIcon />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mt-10">
                <button
                    onClick={onBack}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={() => onNext(selectedDisciplines)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-500/50 disabled:cursor-not-allowed disabled:hover:bg-gray-500/50"
                    disabled={selectedDisciplines.length === 0}
                >
                    Avançar
                </button>
            </div>
        </div>
    );
};

export default SelectSubjects;