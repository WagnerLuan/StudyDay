import * as React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Discipline } from '../types';
// FIX: The type 'WeeklyPlanningData' is defined in '../types' and not exported from './WeeklyPlanning'.
import { WeeklyPlanningData, SubjectWeight } from '../types';
import { StarIcon, SparklesIcon } from '../constants';
import CalculateWeightsModal from './CalculateWeightsModal';

interface AdjustWeightsProps {
    selectedDisciplines: (Discipline & { planName: string })[];
    weeklyPlanningData: WeeklyPlanningData;
    onBack: () => void;
    onNext: (weights: SubjectWeight[]) => void;
    initialData?: SubjectWeight[] | null;
}

const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF',
    '#19FFC1', '#C1FF19', '#FFC119', '#19C1FF'
];

const StarRating: React.FC<{ rating: number; onRate: (rating: number) => void }> = ({ rating, onRate }) => {
    return (
        <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => onRate(star)}>
                    <StarIcon 
                        className={`w-6 h-6 transition-colors ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-500'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
};

const AdjustWeights: React.FC<AdjustWeightsProps> = ({ selectedDisciplines, weeklyPlanningData, onBack, onNext, initialData }) => {
    const [weights, setWeights] = React.useState<SubjectWeight[]>(
        initialData || selectedDisciplines.map(d => ({
            id: d.id,
            name: d.name,
            importance: 3,
            knowledge: 3,
            color: d.color
        }))
    );
    const [isCalcModalOpen, setIsCalcModalOpen] = React.useState(false);

    const handleRatingChange = (id: string, type: 'importance' | 'knowledge', rating: number) => {
        setWeights(currentWeights =>
            currentWeights.map(w =>
                w.id === id ? { ...w, [type]: rating } : w
            )
        );
    };
    
    const handleWeightsCalculated = (calculatedWeights: { name: string; importance: number }[]) => {
        setWeights(currentWeights => {
            return currentWeights.map(w => {
                const foundCalc = calculatedWeights.find(cw => cw.name.toLowerCase() === w.name.toLowerCase());
                const newImportance = foundCalc ? Math.max(1, Math.min(5, Math.round(foundCalc.importance))) : w.importance;
                return { ...w, importance: newImportance };
            });
        });
        setIsCalcModalOpen(false);
    };

    const distributionData = React.useMemo(() => {
        const totalWeight = weights.reduce((acc, w) => {
            const importanceWeight = w.importance;
            const knowledgeWeight = 6 - w.knowledge;
            return acc + importanceWeight + knowledgeWeight;
        }, 0);

        if (totalWeight === 0) {
            return weights.map((w, i) => ({
                name: w.name,
                value: 100 / weights.length,
                color: w.color || COLORS[i % COLORS.length]
            }));
        }

        return weights.map((w, i) => {
            const importanceWeight = w.importance;
            const knowledgeWeight = 6 - w.knowledge;
            const combinedWeight = importanceWeight + knowledgeWeight;
            return {
                name: w.name,
                value: (combinedWeight / totalWeight) * 100,
                color: w.color || COLORS[i % COLORS.length]
            };
        });
    }, [weights]);


    return (
        <>
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-6xl mx-auto my-8">
                <div className="text-center relative">
                    <h2 className="text-3xl font-bold mb-2">Ajuste de Peso das Matérias</h2>
                    <p className="text-gray-400 mb-8">Defina a importância e seu conhecimento em cada matéria para balancear o ciclo.</p>
                    <button 
                        onClick={() => setIsCalcModalOpen(true)}
                        className="absolute top-0 right-0 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <SparklesIcon className="w-5 h-5"/>
                        Calcular Pesos por Banca
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                    <div className="bg-gray-900/50 p-4 rounded-lg h-[60vh] overflow-y-auto space-y-4">
                        {weights.map(w => (
                            <div key={w.id} className="bg-gray-700 rounded-lg p-4">
                                <h4 className="font-bold text-white text-lg mb-3">{w.name}</h4>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-300">Importância</span>
                                    <StarRating rating={w.importance} onRate={(r) => handleRatingChange(w.id, 'importance', r)} />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Conhecimento</span>
                                    <StarRating rating={w.knowledge} onRate={(r) => handleRatingChange(w.id, 'knowledge', r)} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <h3 className="text-xl font-bold text-white mb-4">Distribuição do Tempo</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={120}
                                        innerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full mt-4 h-32 overflow-y-auto px-4">
                            {distributionData.map(entry => (
                                <div key={entry.name} className="flex items-center justify-between text-sm py-1">
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                        <span className="text-gray-300">{entry.name}</span>
                                    </div>
                                    <span className="font-semibold text-white">{entry.value.toFixed(2)}%</span>
                                </div>
                            ))}
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
                        onClick={() => onNext(weights)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Gerar Ciclo
                    </button>
                </div>
            </div>
            
            <CalculateWeightsModal
                isOpen={isCalcModalOpen}
                onClose={() => setIsCalcModalOpen(false)}
                disciplines={selectedDisciplines}
                onWeightsCalculated={handleWeightsCalculated}
            />
        </>
    );
};

export default AdjustWeights;