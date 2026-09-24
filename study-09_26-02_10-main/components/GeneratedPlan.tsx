
import * as React from 'react';
import { GeneratedPlanData } from '../types';
import Card from './Card';
import ProgressBar from './ProgressBar';

interface GeneratedPlanProps {
    plan: GeneratedPlanData;
}

const GeneratedPlan: React.FC<GeneratedPlanProps> = ({ plan }) => {
    return (
        <div className="space-y-8 mt-8">
            <header className="bg-gray-800 p-6 rounded-lg shadow-lg">
                 <h2 className="text-2xl font-bold text-white">{plan.contestName} - {plan.year}</h2>
                 <p className="text-amber-400 font-semibold mt-1">{plan.examiningBoard} | Cargo: {plan.position}</p>
            </header>

            <Card>
                <h3 className="text-xl font-bold text-white mb-4">Resumo e Estratégia</h3>
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{plan.summary}</p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Disciplinas e Pesos</h3>
                    <div className="space-y-4">
                        {plan.subjects.sort((a, b) => b.weight - a.weight).map(subject => (
                            <div key={subject.name}>
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-gray-300 font-medium">{subject.name}</span>
                                    <span className="font-bold text-gray-200">{subject.weight.toFixed(1)}%</span>
                                </div>
                                <ProgressBar percentage={subject.weight} />
                            </div>
                        ))}
                    </div>
                </Card>
                <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Revisões Programadas</h3>
                    <ul className="space-y-3 list-disc list-inside text-gray-300">
                        {plan.scheduledRevisions.map((review, index) => (
                            <li key={index}>{review}</li>
                        ))}
                    </ul>
                </Card>
            </div>
            
            <Card>
                 <h3 className="text-xl font-bold text-white mb-4">Cronograma Semanal Sugerido</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                     {plan.weeklySchedule.map(daySchedule => (
                         <div key={daySchedule.day} className="bg-gray-700 p-4 rounded-lg h-full">
                            <h4 className="font-bold text-amber-400 mb-2 border-b border-gray-600 pb-2 text-center">{daySchedule.day.substring(0,3).toUpperCase()}</h4>
                            <ul className="space-y-2 text-sm">
                                {daySchedule.activities.map((activity, index) => (
                                    <li key={index} className="text-gray-300 bg-gray-900/50 p-2 rounded-md">{activity}</li>
                                ))}
                                {daySchedule.activities.length === 0 && <li className="text-gray-500 text-center py-4">Descanso</li>}
                            </ul>
                         </div>
                     ))}
                 </div>
            </Card>
        </div>
    );
};

export default GeneratedPlan;
