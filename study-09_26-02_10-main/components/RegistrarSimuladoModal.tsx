import * as React from 'react';
import { Simulado, SimuladoDiscipline, StudyPlan } from '../types';
import { XIcon, TrashIcon } from '../constants';

interface RegistrarSimuladoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (simulado: Omit<Simulado, 'id'> & { id?: string }) => void;
    plans: StudyPlan[];
    simuladoToEdit?: Simulado | null;
}

const RegistrarSimuladoModal: React.FC<RegistrarSimuladoModalProps> = ({ isOpen, onClose, onSave, plans, simuladoToEdit }) => {
    const [planId, setPlanId] = React.useState('');
    const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [name, setName] = React.useState('');
    const [examStyle, setExamStyle] = React.useState<'Múltipla Escolha' | 'Certo/Errado'>('Múltipla Escolha');
    const [examBoard, setExamBoard] = React.useState('');
    const [timeSpent, setTimeSpent] = React.useState('00:00:00');
    const [disciplines, setDisciplines] = React.useState<SimuladoDiscipline[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            if (simuladoToEdit) {
                setPlanId(simuladoToEdit.plan_id);
                setDate(simuladoToEdit.date);
                setName(simuladoToEdit.name);
                setExamStyle(simuladoToEdit.examStyle);
                setExamBoard(simuladoToEdit.examBoard);
                setTimeSpent(simuladoToEdit.timeSpent);
                setDisciplines(simuladoToEdit.disciplines);
            } else {
                setPlanId(plans.length > 0 ? plans[0].id : '');
                setDate(new Date().toISOString().split('T')[0]);
                setName('');
                setExamStyle('Múltipla Escolha');
                setExamBoard('');
                setTimeSpent('00:00:00');
                setDisciplines([]);
            }
        }
    }, [isOpen, simuladoToEdit, plans]);

    // Carregar disciplinas automaticamente ao selecionar um plano
    React.useEffect(() => {
        if (planId && !simuladoToEdit) {
            const selectedPlan = plans.find(p => p.id === planId);
            if (selectedPlan) {
                const planDisciplines: SimuladoDiscipline[] = selectedPlan.disciplines.map((d, index) => ({
                    id: `disc-${index}-${Date.now()}`,
                    name: d.name,
                    weight: 1,
                    totalQuestions: 0,
                    correctAnswers: 0,
                    incorrectAnswers: 0,
                    blankAnswers: 0
                }));
                setDisciplines(planDisciplines);
            }
        }
    }, [planId, plans, simuladoToEdit]);

    const handleDisciplineChange = (id: string, field: keyof SimuladoDiscipline, value: string | number) => {
        const val = value === '' ? 0 : Number(value);
        setDisciplines(prev => prev.map(d => d.id === id ? { ...d, [field]: isNaN(val) ? 0 : val } : d));
    };

    const handleRemoveDiscipline = (id: string) => {
        setDisciplines(prev => prev.filter(d => d.id !== id));
    };

    // Cálculo em tempo real dos totais acumulados de todas as disciplinas
    const totals = React.useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalBlank = 0;
        let totalPoints = 0;
        let maxPossiblePoints = 0;
        let hasCustomWeights = false;

        disciplines.forEach(d => {
            const weight = Number(d.weight) || 0;
            if (weight !== 1) hasCustomWeights = true;
            const q = Number(d.totalQuestions) || 0;
            const c = Number(d.correctAnswers) || 0;
            const i = Number(d.incorrectAnswers) || 0;
            const b = Number(d.blankAnswers) || 0;

            totalQuestions += q;
            totalCorrect += c;
            totalIncorrect += i;
            totalBlank += b;
            totalPoints += weight * c;
            maxPossiblePoints += weight * q;
        });

        // Aproveitamento geral com tratamento estrito de divisão por zero
        let performance = 0;
        if (hasCustomWeights && maxPossiblePoints > 0) {
            performance = (totalPoints / maxPossiblePoints) * 100;
        } else if (totalQuestions > 0) {
            performance = (totalCorrect / totalQuestions) * 100;
        }

        return {
            totalQuestions,
            totalCorrect,
            totalIncorrect,
            totalBlank,
            totalPoints,
            performance: isNaN(performance) ? 0 : performance
        };
    }, [disciplines]);

    const handleSave = () => {
        if (!planId) {
            alert('Selecione um plano de estudo.');
            return;
        }
        if (!name.trim()) {
            alert('Informe o nome do simulado.');
            return;
        }
        onSave({ 
            id: simuladoToEdit?.id,
            plan_id: planId, 
            date, 
            name, 
            examStyle, 
            examBoard, 
            timeSpent, 
            disciplines 
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl text-white transform transition-all flex flex-col max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b border-gray-700 bg-gray-900/50 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-emerald-400">{simuladoToEdit ? 'Editar Simulado' : 'Registrar Novo Simulado'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer"><XIcon /></button>
                </header>

                <main className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Plano de Estudo</label>
                            <select 
                                value={planId} 
                                onChange={e => setPlanId(e.target.value)} 
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"
                                disabled={!!simuladoToEdit}
                            >
                                <option value="" disabled>Selecione um plano</option>
                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Nome do Simulado</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Simulado 01 - PC-SP" className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"/>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-400 uppercase">Estilo de Prova</label>
                             <select value={examStyle} onChange={e => setExamStyle(e.target.value as any)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500">
                                <option>Múltipla Escolha</option>
                                <option>Certo/Errado</option>
                             </select>
                        </div>
                         <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Banca</label>
                            <input type="text" value={examBoard} onChange={e => setExamBoard(e.target.value)} placeholder="Ex: FGV" className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"/>
                        </div>
                         <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Tempo Gasto</label>
                            <input type="text" value={timeSpent} onChange={e => setTimeSpent(e.target.value)} placeholder="HH:MM:SS" className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"/>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[55vh] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900/40 relative">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-gray-900 sticky top-0 z-10 border-b border-gray-700 shadow-xs">
                                <tr>
                                    <th className="p-3 w-2/5 font-semibold text-gray-300">Disciplina</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Peso</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Qtd.</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Certas</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Erradas</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Brancas</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Pontos</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Aprov.</th>
                                    <th className="p-3 text-center font-semibold text-gray-300">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/60">
                                {disciplines.map(d => {
                                    const weight = Number(d.weight) || 0;
                                    const totalQ = Number(d.totalQuestions) || 0;
                                    const correctQ = Number(d.correctAnswers) || 0;
                                    const pontos = weight * correctQ;
                                    const aproveitamento = totalQ > 0 ? (correctQ / totalQ) * 100 : 0;
                                    return (
                                        <tr key={d.id} className="hover:bg-gray-750/50 transition-colors">
                                            <td className="p-2.5 font-semibold text-white">{d.name}</td>
                                            <td className="p-2 text-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={d.weight} 
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => handleDisciplineChange(d.id, 'weight', e.target.value)} 
                                                    className="w-16 bg-gray-700 text-center p-2 rounded-md border border-gray-600 focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={d.totalQuestions} 
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => handleDisciplineChange(d.id, 'totalQuestions', e.target.value)} 
                                                    className="w-16 bg-gray-700 text-center p-2 rounded-md border border-gray-600 focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={d.correctAnswers} 
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => handleDisciplineChange(d.id, 'correctAnswers', e.target.value)} 
                                                    className="w-16 bg-green-950/60 text-green-300 text-center p-2 rounded-md border border-green-700 focus:ring-1 focus:ring-green-500"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={d.incorrectAnswers} 
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => handleDisciplineChange(d.id, 'incorrectAnswers', e.target.value)} 
                                                    className="w-16 bg-red-950/60 text-red-300 text-center p-2 rounded-md border border-red-700 focus:ring-1 focus:ring-red-500"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    value={d.blankAnswers} 
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => handleDisciplineChange(d.id, 'blankAnswers', e.target.value)} 
                                                    className="w-16 bg-gray-700 text-center p-2 rounded-md border border-gray-600 focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="p-2 text-center font-bold text-yellow-400">{pontos}</td>
                                            <td className="p-2 text-center font-bold text-white">{aproveitamento.toFixed(0)}%</td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => handleRemoveDiscipline(d.id)} className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Remover disciplina"><TrashIcon className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {disciplines.length > 0 && (
                                <tfoot className="sticky bottom-0 z-20 bg-gray-900 border-t-2 border-emerald-500 shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
                                    <tr className="bg-gray-900">
                                        <td className="p-3 font-extrabold text-white text-sm uppercase tracking-wider bg-gray-900">
                                            TOTAL GERAL
                                        </td>
                                        <td className="p-3 text-center text-gray-400 font-semibold bg-gray-900">
                                            -
                                        </td>
                                        <td className="p-3 text-center bg-gray-900">
                                            <span className="inline-block min-w-16 px-2.5 py-1.5 bg-gray-800 text-white font-bold text-sm rounded-md border border-gray-600 shadow-inner">
                                                {totals.totalQuestions}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center bg-gray-900">
                                            <span className="inline-block min-w-16 px-2.5 py-1.5 bg-green-950/70 text-green-300 font-bold text-sm rounded-md border border-green-700/70 shadow-inner">
                                                {totals.totalCorrect}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center bg-gray-900">
                                            <span className="inline-block min-w-16 px-2.5 py-1.5 bg-red-950/70 text-red-300 font-bold text-sm rounded-md border border-red-700/70 shadow-inner">
                                                {totals.totalIncorrect}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center bg-gray-900">
                                            <span className="inline-block min-w-16 px-2.5 py-1.5 bg-gray-800 text-gray-300 font-bold text-sm rounded-md border border-gray-600 shadow-inner">
                                                {totals.totalBlank}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-extrabold text-yellow-400 text-base bg-gray-900">
                                            {totals.totalPoints}
                                        </td>
                                        <td className="p-3 text-center bg-gray-900">
                                            <span className="inline-block px-3 py-1.5 bg-emerald-500/20 text-emerald-400 font-black text-sm rounded-md border border-emerald-500/50 shadow-sm">
                                                {totals.totalQuestions > 0 ? (totals.performance % 1 === 0 ? totals.performance.toFixed(0) : totals.performance.toFixed(1)) : 0}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-center bg-gray-900"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        {disciplines.length === 0 && (
                            <p className="text-center text-gray-500 py-8">Selecione um plano para carregar as disciplinas.</p>
                        )}
                    </div>
                </main>

                <footer className="p-4 flex justify-end gap-4 border-t border-gray-700 bg-gray-900/50 rounded-b-xl">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Salvar Simulado</button>
                </footer>
            </div>
        </div>
    );
};

export default RegistrarSimuladoModal;