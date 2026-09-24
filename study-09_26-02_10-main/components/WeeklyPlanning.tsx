import * as React from 'react';
import { ClockIcon, QuestionMarkCircleIcon, HourglassIcon, CalendarIcon } from '../constants';
import { WeeklyPlanningData } from '../types';

interface WeeklyPlanningProps {
    selectedSubjectsCount: number;
    onBack: () => void;
    onNext: (data: WeeklyPlanningData) => void;
    initialData?: WeeklyPlanningData | null;
}


// FIX: Use unambiguous 3-letter abbreviations for days of the week for better UX.
const WEEK_DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const InfoIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
    <span className="text-emerald-400 mr-3">{icon}</span>
);

const WeeklyPlanning: React.FC<WeeklyPlanningProps> = ({ selectedSubjectsCount, onBack, onNext, initialData }) => {
    const [weeklyHours, setWeeklyHours] = React.useState(initialData?.weeklyHours.toString() || '');
    const [questionGoal, setQuestionGoal] = React.useState(initialData?.questionGoal.toString() || '');
    const [minSession, setMinSession] = React.useState(initialData?.minSession.toString() || '');
    const [maxSession, setMaxSession] = React.useState(initialData?.maxSession.toString() || '');
    const [studyDays, setStudyDays] = React.useState<Set<number>>(
        new Set(initialData?.studyDays.map(day => WEEK_DAYS.indexOf(day)).filter(i => i !== -1) || [])
    );

    const isInitialRender = React.useRef(true);

    React.useEffect(() => {
        // Skip the first calculation on "edit" mode to respect saved values.
        if (isInitialRender.current) {
            isInitialRender.current = false;
            if (initialData) {
                return;
            }
        }

        // On "create" mode OR subsequent changes in "edit" mode, calculate automatically.
        const hours = Number(weeklyHours);
        const days = studyDays.size;
        if (hours > 0 && days > 0 && selectedSubjectsCount > 0) {
            const hoursPerDay = hours / days;
            // Suggest a session duration between 30 and 120 minutes based on hours per day.
            const suggestedDuration = Math.round(Math.max(30, Math.min(120, (hoursPerDay * 60) / 2)));
            setMinSession(String(Math.max(30, suggestedDuration - 15)));
            setMaxSession(String(Math.min(180, suggestedDuration + 30)));
        }
    }, [weeklyHours, studyDays, selectedSubjectsCount, initialData]);


    const handleDayToggle = (dayIndex: number) => {
        const newDays = new Set(studyDays);
        if (newDays.has(dayIndex)) {
            newDays.delete(dayIndex);
        } else {
            newDays.add(dayIndex);
        }
        setStudyDays(newDays);
    };

    const handleNext = () => {
        if (!weeklyHours || !questionGoal || !minSession || !maxSession || studyDays.size === 0) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        onNext({
            weeklyHours: Number(weeklyHours),
            questionGoal: Number(questionGoal),
            minSession: Number(minSession),
            maxSession: Number(maxSession),
            // FIX: Explicitly type 'i' as a number to resolve TypeScript error "Type 'unknown' cannot be used as an index type."
            studyDays: Array.from(studyDays).map((i: number) => WEEK_DAYS[i]),
        });
    };

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-3xl mx-auto my-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Planejamento Semanal</h2>
                <p className="text-gray-400 mb-8">Defina a estrutura do seu ciclo de estudos semanal.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <div>
                        <label className="flex items-center text-sm font-semibold text-gray-300 mb-2">
                            <InfoIcon icon={<ClockIcon />} />
                            Horas Semanais
                            <span className="ml-2 text-gray-500 text-xs font-normal" title="Insira o total de horas que você planeja estudar por semana. Ex: 25 para 25 horas.">
                                (em horas)
                            </span>
                        </label>
                        <input
                            type="number"
                            placeholder="Ex: 25"
                            value={weeklyHours}
                            onChange={(e) => setWeeklyHours(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="flex items-center text-sm font-semibold text-gray-300 mb-2">
                            <InfoIcon icon={<QuestionMarkCircleIcon />} />
                            Meta de Questões
                        </label>
                        <input
                            type="number"
                            placeholder="Ex: 300"
                            value={questionGoal}
                            onChange={(e) => setQuestionGoal(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="flex items-center text-sm font-semibold text-gray-300 mb-2">
                            <InfoIcon icon={<HourglassIcon />} />
                            Duração da Sessão (min)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                placeholder="Min"
                                value={minSession}
                                onChange={(e) => setMinSession(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxSession}
                                onChange={(e) => setMaxSession(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div>
                    <label className="flex items-center text-sm font-semibold text-gray-300 mb-2">
                        <InfoIcon icon={<CalendarIcon />} />
                        Dias de Estudo
                    </label>
                    <div className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
                        {WEEK_DAYS.map((day, index) => (
                            <button
                                key={index}
                                onClick={() => handleDayToggle(index)}
                                className={`w-10 h-10 rounded-full font-bold text-sm transition-colors ${
                                    studyDays.has(index)
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-gray-900 text-gray-400 hover:bg-gray-600'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Summary Box */}
            <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="bg-gray-900/50 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-emerald-400 mb-4">Resumo do seu Planejamento</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-gray-300">
                        <p><strong>Matérias:</strong> {selectedSubjectsCount}</p>
                        <p><strong>Horas/Semana:</strong> {weeklyHours || '0'}h</p>
                        <p><strong>Meta de Questões:</strong> {questionGoal || '0'}</p>
                        <p><strong>Dias de Estudo:</strong> {studyDays.size}</p>
                        <p><strong>Duração da Sessão:</strong> {minSession || '0'}-{maxSession || '0'} min</p>
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
                    onClick={handleNext}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Avançar
                </button>
            </div>
        </div>
    );
};

export default WeeklyPlanning;