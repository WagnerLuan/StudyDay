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
        setDisciplines(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const handleRemoveDiscipline = (id: string) => {
        setDisciplines(prev => prev.filter(d => d.id !== id));
    };

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
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon /></button>
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

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th className="p-2 w-2/5">Disciplina</th>
                                    <th className="p-2 text-center">Peso</th>
                                    <th className="p-2 text-center">Qtd.</th>
                                    <th className="p-2 text-center">Certas</th>
                                    <th className="p-2 text-center">Erradas</th>
                                    <th className="p-2 text-center">Brancas</th>
                                    <th className="p-2 text-center">Pontos</th>
                                    <th className="p-2 text-center">Aprov.</th>
                                    <th className="p-2 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disciplines.map(d => {
                                    const pontos = d.weight * d.correctAnswers;
                                    const aproveitamento = d.totalQuestions > 0 ? (d.correctAnswers / d.totalQuestions) * 100 : 0;
                                    return (
                                        <tr key={d.id} className="border-b border-gray-700">
                                            <td className="p-1 font-semibold">{d.name}</td>
                                            <td className="p-1"><input type="number" value={d.weight} onChange={e => handleDisciplineChange(d.id, 'weight', Number(e.target.value))} className="w-16 bg-gray-700 text-center p-2 rounded-md border border-gray-600"/></td>
                                            <td className="p-1"><input type="number" value={d.totalQuestions} onChange={e => handleDisciplineChange(d.id, 'totalQuestions', Number(e.target.value))} className="w-16 bg-gray-700 text-center p-2 rounded-md border border-gray-600"/></td>
                                            <td className="p-1"><input type="number" value={d.correctAnswers} onChange={e => handleDisciplineChange(d.id, 'correctAnswers', Number(e.target.value))} className="w-16 bg-green-900/50 text-green-300 text-center p-2 rounded-md border border-green-700"/></td>
                                            <td className="p-1"><input type="number" value={d.incorrectAnswers} onChange={e => handleDisciplineChange(d.id, 'incorrectAnswers', Number(e.target.value))} className="w-16 bg-red-900/50 text-red-300 text-center p-2 rounded-md border border-red-700"/></td>
                                            <td className="p-1"><input type="number" value={d.blankAnswers} onChange={e => handleDisciplineChange(d.id, 'blankAnswers', Number(e.target.value))} className="w-16 bg-gray-700 text-center p-2 rounded-md border border-gray-600"/></td>
                                            <td className="p-1 text-center font-bold text-yellow-400">{pontos}</td>
                                            <td className="p-1 text-center font-bold">{aproveitamento.toFixed(0)}%</td>
                                            <td className="p-1 text-center">
                                                <button onClick={() => handleRemoveDiscipline(d.id)} className="text-red-500 hover:text-red-400 p-1 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
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