import * as React from 'react';
import { Discipline, StudyPlan, Topic, HistoryLog } from '../types';
import MultiSelectCategory from './MultiSelectCategory';

export interface StudyLogFormData {
    date: Date;
    category: string;
    studyTime: string; // HH:MM:SS
    material?: string;
    isTheoryFinished: boolean;
    isReviewScheduled?: boolean;
    reviewDays?: number;
    questionsCorrect: number;
    questionsIncorrect: number;
    pagesStart?: number;
    pagesEnd?: number;
    videoTitle?: string;
    videoStart?: string; // HH:MM:SS
    videoEnd?: string; // HH:MM:SS
    comments?: string;
    countInPlan: boolean;
    addToBlockPlanning?: boolean;
}

interface StudyLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { logData: StudyLogFormData, disciplineId: string, topicId: string }) => void;
    plan: StudyPlan | null;
    discipline: Discipline | null;
    topic?: Topic | null;
    logToEdit?: HistoryLog | null;
    initialStudyTime?: string;
    initialCategory?: string;
    revisionId?: string;
    completionDate?: string;
}

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">{label}</label>
        <input {...props} className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500 disabled:bg-gray-800 disabled:text-gray-500" />
    </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">{label}</label>
        <select {...props} className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
            {children}
        </select>
    </div>
);

const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
     <label className="flex items-center space-x-3 cursor-pointer">
        <input type="checkbox" {...props} className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 rounded text-emerald-500 focus:ring-emerald-500" />
        <span className="text-gray-300">{label}</span>
    </label>
);

const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDisplayTimeToInput = (timeStr: string): string => {
    if (!timeStr || timeStr === '-') return '00:00:00';
    let hours = 0;
    let minutes = 0;
    const hourMatch = timeStr.match(/(\d+)h/);
    if (hourMatch) hours = parseInt(hourMatch[1], 10);
    const minMatch = timeStr.match(/(\d+)m/);
    if (minMatch) minutes = parseInt(minMatch[1], 10);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

const CATEGORY_OPTIONS = ['Teoria', 'Revisão', 'Questões', 'Leitura de Lei', 'Jurisprudência', 'Vídeoaulas'];

const initialFormData: Omit<StudyLogFormData, 'date'> & { date: Date | string } = {
  date: new Date(),
  category: 'Teoria',
  studyTime: '00:00:00',
  material: '',
  isTheoryFinished: false,
  isReviewScheduled: false,
  reviewDays: 7,
  questionsCorrect: 0,
  questionsIncorrect: 0,
  pagesStart: 0,
  pagesEnd: 0,
  comments: '',
  countInPlan: true,
  addToBlockPlanning: false,
};


const StudyLogModal: React.FC<StudyLogModalProps> = ({ isOpen, onClose, onSave, plan, discipline: initialDiscipline, topic: initialTopic, logToEdit, initialStudyTime, initialCategory, completionDate }) => {
    const [formData, setFormData] = React.useState<StudyLogFormData>(initialFormData as StudyLogFormData);
    const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<string | null>(initialDiscipline?.id || null);
    const [selectedTopicId, setSelectedTopicId] = React.useState<string | null>(initialTopic?.id || null);

    const availableDisciplines = plan?.disciplines || [];
    const selectedDiscipline = availableDisciplines.find(d => d.id === selectedDisciplineId);
    const availableTopics = selectedDiscipline?.topicsList || [];

    React.useEffect(() => {
        if (isOpen) {
            if (logToEdit) {
                const [dayStr, monthStr, yearStr] = logToEdit.date.split('/');
                const logDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
                logDate.setHours(0, 0, 0, 0);
                
                const pagesMatch = logToEdit.pages?.match(/(\d+)-(\d+)/);

                setFormData({
                    date: logDate,
                    category: logToEdit.category,
                    studyTime: parseDisplayTimeToInput(logToEdit.time),
                    material: logToEdit.material || '',
                    questionsCorrect: logToEdit.correct || 0,
                    questionsIncorrect: logToEdit.incorrect || 0,
                    pagesStart: pagesMatch ? parseInt(pagesMatch[1], 10) : 0,
                    pagesEnd: pagesMatch ? parseInt(pagesMatch[2], 10) : 0,
                    comments: logToEdit.comments || '',
                    isTheoryFinished: false,
                    isReviewScheduled: false,
                    reviewDays: 7,
                    countInPlan: true,
                });
                const disciplineForLog = plan?.disciplines.find(p => p.historyLogs?.some(l => l.id === logToEdit.id));
                setSelectedDisciplineId(disciplineForLog?.id || null);
                const topicForLog = disciplineForLog?.topicsList?.find(t => t.name === logToEdit.topic);
                setSelectedTopicId(topicForLog?.id || null);

            } else {
                let logDate = new Date();
                if (completionDate) {
                    logDate = new Date(completionDate + 'T12:00:00');
                }
                logDate.setHours(0, 0, 0, 0);
                
                setFormData({
                    ...initialFormData,
                    date: logDate,
                    studyTime: initialStudyTime || '00:00:00',
                    category: initialCategory || 'Teoria',
                } as StudyLogFormData);
                setSelectedDisciplineId(initialDiscipline?.id || (availableDisciplines.length > 0 ? availableDisciplines[0].id : null));
                setSelectedTopicId(initialTopic?.id || initialTopic?.name || null);
            }
        }
    }, [isOpen, logToEdit, initialStudyTime, initialCategory, initialDiscipline, initialTopic, plan, availableDisciplines, completionDate]);

    React.useEffect(() => {
        if(selectedDiscipline && !initialTopic && !logToEdit) {
            const pendingTopics = availableTopics.filter(t => t.status === 'Pendente');
            const targetTopic = pendingTopics.length > 0 ? pendingTopics[0] : availableTopics[0];
            setSelectedTopicId(targetTopic?.id || null);
        }
    }, [selectedDisciplineId, isOpen, initialTopic, logToEdit]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (['questionsCorrect', 'questionsIncorrect', 'pagesStart', 'pagesEnd', 'reviewDays'].includes(name)) {
            const numValue = parseInt(value, 10);
            setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : Math.max(0, numValue) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCategoryChange = (selectedCategories: string[]) => {
        setFormData(prev => ({ ...prev, category: selectedCategories.join(', ') }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [yearStr, monthStr, dayStr] = e.target.value.split('-');
        const newDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
        newDate.setHours(0, 0, 0, 0);
        setFormData(prev => ({...prev, date: newDate}));
    };

    const handleSave = () => {
        if (!selectedDisciplineId || !selectedTopicId) {
            alert('Por favor, selecione uma disciplina e um tópico.');
            return;
        }
        if (!formData.category) {
            alert('Por favor, selecione pelo menos uma categoria.');
            return;
        }
        const sanitizedFormData: StudyLogFormData = {
            ...formData,
            questionsCorrect: Math.max(0, Number(formData.questionsCorrect) || 0),
            questionsIncorrect: Math.max(0, Number(formData.questionsIncorrect) || 0),
            pagesStart: Math.max(0, Number(formData.pagesStart) || 0),
            pagesEnd: Math.max(0, Number(formData.pagesEnd) || 0),
            reviewDays: Math.max(1, Number(formData.reviewDays) || 7),
        };
        onSave({ logData: sanitizedFormData, disciplineId: selectedDisciplineId, topicId: selectedTopicId });
    };

    if (!isOpen) return null;

    const selectedCategories = formData.category ? formData.category.split(', ').filter(c => c !== '') : [];

    const renderCategoryFields = () => {
        const hasTheoryOrLaw = selectedCategories.some(c => c === 'Teoria' || c === 'Leitura de Lei');
        const hasVideo = selectedCategories.includes('Vídeoaulas');

        return (
            <>
                {hasTheoryOrLaw && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Página Inicial" type="number" name="pagesStart" value={formData.pagesStart} onChange={handleChange} />
                        <Input label="Página Final" type="number" name="pagesEnd" value={formData.pagesEnd} onChange={handleChange} />
                    </div>
                )}
                {hasVideo && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Título da Videoaula (Opcional)" type="text" name="videoTitle" value={formData.videoTitle} onChange={handleChange} placeholder="Ex: Aula 1 - Introdução" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Início (HH:MM:SS)" type="text" name="videoStart" value={formData.videoStart} onChange={handleChange} placeholder="00:00:00" />
                            <Input label="Fim (HH:MM:SS)" type="text" name="videoEnd" value={formData.videoEnd} onChange={handleChange} placeholder="00:30:00" />
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl text-white transform transition-all max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-center mb-6">{logToEdit ? 'Editar Registro' : 'Registrar Estudo'}</h2>
                
                <div className="overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Disciplina" value={selectedDisciplineId || ''} onChange={e => setSelectedDisciplineId(e.target.value)} disabled={!!initialDiscipline}>
                             {!initialDiscipline && <option value="">Selecione...</option>}
                            {availableDisciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                         <Select label="Tópico" value={selectedTopicId || ''} onChange={e => setSelectedTopicId(e.target.value)} disabled={!selectedDisciplineId}>
                             <option value="">Selecione o Tópico...</option>
                             {availableTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                             {initialTopic && !availableTopics.some(t => t.id === initialTopic.id || t.name === initialTopic.name) && (
                                 <option value={initialTopic.id || initialTopic.name}>{initialTopic.name}</option>
                             )}
                         </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Data" type="date" name="date" value={formatDateForInput(formData.date)} onChange={handleDateChange} />
                        <div className="md:col-span-1">
                            <MultiSelectCategory 
                                label="Categoria"
                                options={CATEGORY_OPTIONS}
                                selected={selectedCategories}
                                onChange={handleCategoryChange}
                            />
                        </div>
                        <Input label="Tempo de Estudo" type="time" name="studyTime" value={formData.studyTime} onChange={handleChange} step="1" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Acertos" type="number" name="questionsCorrect" value={formData.questionsCorrect} onChange={handleChange} />
                        <Input label="Erros" type="number" name="questionsIncorrect" value={formData.questionsIncorrect} onChange={handleChange} />
                    </div>

                    {renderCategoryFields()}

                    <Input label="Material Utilizado (Opcional)" type="text" name="material" value={formData.material} onChange={handleChange} placeholder="Ex: PDF do GranCursos, Videoaula..." />
                    <textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Adicionar comentários (opcional)..." className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500 h-24 resize-none"></textarea>

                    <div className="space-y-3 pt-2">
                         <Checkbox label="Marcar tópico como concluído" name="isTheoryFinished" checked={formData.isTheoryFinished} onChange={handleChange} />
                         <div className="flex items-center gap-4">
                            <Checkbox label="Agendar revisão para este estudo" name="isReviewScheduled" checked={formData.isReviewScheduled} onChange={handleChange} />
                            {formData.isReviewScheduled && (
                                <div className="flex items-center gap-2">
                                    <input type="number" name="reviewDays" value={formData.reviewDays} onChange={handleChange} className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center" />
                                    <span className="text-gray-400">dias</span>
                                </div>
                            )}
                        </div>
                        {formData.isReviewScheduled && (
                            <div className="flex items-center space-x-3 pl-7">
                                <input type="checkbox" name="addToBlockPlanning" checked={formData.addToBlockPlanning} onChange={handleChange} className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 rounded text-emerald-500 focus:ring-emerald-500" />
                                <span className="text-gray-300">Adicionar esta revisão ao Planejamento por Blocos</span>
                            </div>
                        )}
                         <Checkbox label="Contabilizar para o ciclo" name="countInPlan" checked={formData.countInPlan} onChange={handleChange} />
                    </div>
                </div>

                <div className="flex justify-end items-center gap-4 mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 font-bold py-2 px-6 rounded-lg">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default StudyLogModal;