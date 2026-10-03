import * as React from 'react';
import { HistoryLog } from '../types';
import { BookIcon, CalendarIcon, QuestionMarkCircleIcon } from '../constants';

type AugmentedHistoryLog = HistoryLog & {
    disciplineName: string;
    disciplineColor: string;
};

interface RecentActivitiesProps {
  activities: AugmentedHistoryLog[];
}

const ActivityCard: React.FC<{ activity: AugmentedHistoryLog }> = ({ activity }) => {
    const correct = Number(activity.correct) || 0;
    const incorrect = Number(activity.incorrect) || 0;
    const totalQuestions = correct + incorrect;

    return (
        <div className="bg-slate-700 rounded-lg relative shadow-lg">
            <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-lg" style={{ backgroundColor: activity.disciplineColor }}></div>
            <div className="p-6 pl-8">
                <div className="flex items-center gap-3 mb-2">
                    <span style={{ color: activity.disciplineColor }}>
                        <BookIcon className="w-5 h-5" />
                    </span>
                    <h3 className="text-xl font-bold text-white">{activity.disciplineName}</h3>
                </div>
                <p className="text-gray-300 mb-4 ml-8">{activity.topic}</p>
                <div className="space-y-2 ml-8">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <CalendarIcon className="w-5 h-5" />
                        <span>Data: {activity.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <BookIcon className="w-5 h-5" />
                        <span>Tempo de Estudo: {activity.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <QuestionMarkCircleIcon className="w-5 h-5" />
                        <span>Questões: {totalQuestions} ({correct} certas)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-white">Últimas Atividades</h2>
            <div className="bg-gray-800 rounded-lg p-8 mt-6 text-center text-gray-500">
                Nenhuma atividade registrada ainda.
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Últimas Atividades</h2>
        <div className="space-y-4">
            {activities.map(activity => (
                <ActivityCard key={activity.id} activity={activity} />
            ))}
        </div>
    </div>
  );
};

export default RecentActivities;