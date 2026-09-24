"use client";

import * as React from 'react';
import { XIcon, CheckIcon } from '../constants';
import { StudyPlan, Discipline, StudyBlock } from '../types';

interface AddBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (block: Partial<StudyBlock>, repeatDays?: number[]) => void;
    plans: StudyPlan[];
    dayOfWeek: number;
    selectedDateStr: string; // Nova prop: data do dia clicado
    blockToEdit?: StudyBlock | null;
}

const CATEGORIES = ['Teoria', 'Revisão', 'Questões', 'Leitura de Lei', 'Jurisprudência', 'Vídeoaulas'];
const WEEK_DAYS = [
    { id: 1, name: 'Seg' },
    { id: 2, name: 'Ter' },
    { id: 3, name: 'Qua' },
    { id: 4, name: 'Qui' },
    { id: 5, name: 'Sex' },
    { id: 6, name: 'Sáb' },
    { id: 0, name: 'Dom' },
];

const SPECIAL_OPTIONS = [
    { id: 'special_revisao', name: 'Revisão Geral' },
    { id: 'special_todas', name: 'Todas as Disciplinas' }
];

const AddBlockModal: React.FC<AddBlockModalProps> = ({ isOpen, onClose, onSave, plans, dayOfWeek, selectedDateStr, blockToEdit }) => {
    const [selectedPlanId, setSelectedPlanId] = React.useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = React.useState('');
    const [selectedTopicId, setSelectedTopicId] = React.useState('');
    const [duration, setDuration] = React.useState(60);
    const [startTime, setStartTime] = React.useState('');
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>(['Teoria']);
    const [observations, setObservations] = React.useState('');
    const [repeatDays, setRepeatDays] = React.useState<number[]>([]);

    const allDisciplines = React.useMemo(() => {
        return plans.flatMap(p => p.disciplines.map(d => ({ ...d, planId: p.id, planName: p.name })));
    }, [plans]);

    const filteredDisciplines = React.useMemo(() => {
        if (!selectedPlanId) return allDisciplines;
        return allDisciplines.filter(d => d.planId === selectedPlanId);
    }, [selectedPlanId, allDisciplines]);

    const selectedDiscipline = React.useMemo(() => {
        return allDisciplines.find(d => d.id === selectedDisciplineId);
    }, [allDisciplines, selectedDisciplineId]);

    const availableTopics = React.useMemo(() => {
        return selectedDiscipline?.topicsList || [];
    }, [selectedDiscipline]);

    React.useEffect(() => {
        if (isOpen) {
            if (blockToEdit) {
                const disc = allDisciplines.find(d => d.id === blockToEdit.discipline_id);
                setSelectedPlanId(disc?.planId || '');
                
                if (blockToEdit.name?.startsWith('⭐ ')) {
                    const specialName = blockToEdit.name.replace('⭐ ', '');
                    const foundSpecial = SPECIAL_OPTIONS.find(opt => opt.name === specialName);
                    setSelectedDisciplineId(foundSpecial?.id || blockToEdit.discipline_id);
                    setObservations('');
                } else {
                    setSelectedDisciplineId(blockToEdit.discipline_id);
                    setObservations(blockToEdit.name || '');
                }

                setSelectedTopicId(blockToEdit.topic_id || '');
                setDuration(blockToEdit.duration_minutes);
                setStartTime(blockToEdit.start_time || '');
                
                if (Array.isArray(blockToEdit.type)) {
                    setSelectedCategories(blockToEdit.type);
                } else if (typeof blockToEdit.type === 'string') {
                    try {
                        const parsed = JSON.parse(blockToEdit.type);
                        setSelectedCategories(Array.isArray(parsed) ? parsed : [blockToEdit.type]);
                    } catch (e) {
                        setSelectedCategories(blockToEdit.type.split(',').map(c => c.trim()));
                    }
                } else {
                    setSelectedCategories(['Teoria']);
                }
                
                setRepeatDays([]); 
            } else {
                setSelectedPlanId(plans.length > 0 ? plans[0].id : '');
                setSelectedDisciplineId('');
                setSelectedTopicId('');
                setDuration(60);
                setStartTime('');
                setSelectedCategories(['Teoria']);
                setObservations('');
                setRepeatDays([]);
            }
        }
    }, [isOpen, blockToEdit, plans, allDisciplines]);

    if (!isOpen) return null;

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const toggleRepeatDay = (dayId: number) => {
        setRepeatDays(prev => 
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        );
    };

    const handleDisciplineChange = (disciplineId: string) => {
        setSelectedDisciplineId(disciplineId);
        setSelectedTopicId('');
    };

    const handleSave = () => {
        if (!selectedDisciplineId) {
            alert('Selecione uma disciplina ou opção especial.');
            return;
        }
        if (selectedCategories.length === 0) {
            alert('Selecione pelo menos uma categoria.');
            return;
        }

        const isSpecial = SPECIAL_OPTIONS.some(opt => opt.id === selectedDisciplineId);
        let finalDisciplineId = selectedDisciplineId;
        let finalName = observations;
        let finalTopicId = selectedTopicId;
        let finalTopicName = undefined;

        if (isSpecial) {
            const specialOpt = SPECIAL_OPTIONS.find(opt => opt.id === selectedDisciplineId);
            finalName = `⭐ ${specialOpt?.name}`;
            const firstDiscInPlan = filteredDisciplines[0];
            if (firstDiscInPlan) {
                finalDisciplineId = firstDiscInPlan.id;
            }
            finalTopicId = undefined;
        } else if (selectedTopicId) {
            const topic = availableTopics.find(t => t.id === selectedTopicId);
            finalTopicName = topic?.name;
        }

        const isRecurring = repeatDays.length > 0;

        onSave({
            id: blockToEdit?.id,
            discipline_id: finalDisciplineId,
            topic_id: finalTopicId || undefined,
            topic_name: finalTopicName,
            plan_id: selectedPlanId || undefined,
            duration_minutes: duration,
            start_time: startTime || undefined,
            type: selectedCategories,
            name: finalName,
            day_of_week: dayOfWeek,
            specific_date: blockToEdit ? (blockToEdit.specific_date || undefined) : (isRecurring ? undefined : (selectedDateStr || undefined))
        }, repeatDays);
    };

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg text-white transform transition-all" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-emerald-400">{blockToEdit ? 'Editar Bloco' : 'Novo Bloco'} - {dayNames[dayOfWeek]}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon /></button>
                </header>

                <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Plano de Estudo</label>
                        <select 
                            value={selectedPlanId} 
                            onChange={e => setSelectedPlanId(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="">Todos os Planos</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Disciplina / Atividade</label>
                        <select 
                            value={selectedDisciplineId} 
                            onChange={e => handleDisciplineChange(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="" disabled>Selecione uma opção</option>
                            
                            <optgroup label="Opções Especiais">
                                {SPECIAL_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                            </optgroup>

                            <optgroup label="Matérias do Plano">
                                {filteredDisciplines.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.planName})</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {!selectedDisciplineId.startsWith('special') && (
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Tópico (Opcional)</label>
                            <select 
                                value={selectedTopicId} 
                                onChange={e => setSelectedTopicId(e.target.value)}
                                disabled={!selectedDisciplineId || availableTopics.length === 0}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                            >
                                <option value="">Sem tópico específico</option>
                                {availableTopics.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Duração (minutos)</label>
                            <input 
                                type="number" 
                                value={duration} 
                                onChange={e => setDuration(Number(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Horário (Opcional)</label>
                            <input 
                                type="time" 
                                value={startTime} 
                                onChange={e => setStartTime(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Categorias</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => toggleCategory(cat)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                        selectedCategories.includes(cat)
                                            ? 'bg-emerald-500/20 border-emerald-500 text-white'
                                            : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                                    }`}
                                >
                                    <span>{cat}</span>
                                    {selectedCategories.includes(cat) && <CheckIcon className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!blockToEdit && (
                        <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-700">
                            <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Repetir em outros dias?</label>
                            <p className="text-[10px] text-gray-400 mb-3 italic">Selecione dias abaixo para tornar este bloco **recorrente** (semanal). Se não selecionar nada, ele será criado apenas para o dia {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR')}.</p>
                            <div className="flex justify-between gap-1">
                                {WEEK_DAYS.map(day => (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => toggleRepeatDay(day.id)}
                                        className={`w-10 h-10 rounded-full text-[10px] font-black transition-all border-2 ${
                                            repeatDays.includes(day.id)
                                                ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                                                : 'bg-gray-800 border-gray-600 text-gray-500 hover:border-gray-400'
                                        }`}
                                    >
                                        {day.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Observações</label>
                        <textarea 
                            value={observations} 
                            onChange={e => setObservations(e.target.value)}
                            placeholder={selectedDisciplineId.startsWith('special') ? "Observações sobre a atividade..." : "Ex: Focar em princípios fundamentais..."}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none text-sm"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm">Cancelar</button>
                    <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-8 rounded-lg transition-colors text-sm shadow-lg shadow-emerald-500/20">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default AddBlockModal;