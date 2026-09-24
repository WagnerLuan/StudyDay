
import * as React from 'react';
import { SubjectPerformance } from '../types';

interface PerformancePanelProps {
  data: SubjectPerformance[];
}

const formatTime = (minutes: number) => {
  if (minutes === 0) return '0h0min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes}min`;
};

const PerformancePanel: React.FC<PerformancePanelProps> = ({ data }) => {
  const getAccuracyBarColor = (acc: number) => {
    if (acc < 70) return 'bg-red-500';
    if (acc < 80) return 'bg-yellow-400';
    return 'bg-green-400';
  };
  
  const getAccuracyTextColor = (acc: number) => {
    if (acc < 70) return 'text-red-500';
    if (acc < 80) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-slate-800 text-white rounded-xl p-6 shadow-lg h-full flex flex-col">
      <h2 className="text-xl font-bold text-white mb-6">Painel de Desempenho</h2>
      <div className="flex-grow overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-800">
            <tr className="border-b border-slate-700">
              <th className="py-3 pr-3 font-semibold text-emerald-400 uppercase text-sm tracking-wider">Disciplina</th>
              <th className="py-3 px-3 font-semibold text-emerald-400 uppercase text-sm tracking-wider text-center">Tempo</th>
              <th className="py-3 px-3 font-semibold text-emerald-400 uppercase text-sm tracking-wider text-center">Questões</th>
              <th className="py-3 pl-3 font-semibold text-emerald-400 uppercase text-sm tracking-wider text-center">Acerto %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((subject, index) => {
              const totalQuestions = subject.correctAnswers + subject.incorrectAnswers;
              const accuracy = totalQuestions > 0 ? (subject.correctAnswers / totalQuestions) * 100 : 0;
              const accuracyBarColor = getAccuracyBarColor(accuracy);

              return (
                <tr key={subject.id} className={index === data.length - 1 ? '' : 'border-b border-slate-700'}>
                  <td className="py-4 pr-3 text-gray-200 font-medium">{subject.name}</td>
                  <td className="py-4 px-3 text-gray-400 text-center whitespace-nowrap">{formatTime(subject.studyTime)}</td>
                  <td className="py-4 px-3 text-center text-gray-400">
                    <span className={subject.correctAnswers > 0 ? 'text-green-400' : 'text-gray-400'}>{subject.correctAnswers}</span>
                    <span className="text-gray-500"> / </span>
                    <span className={subject.incorrectAnswers > 0 ? 'text-red-400' : 'text-gray-400'}>{subject.incorrectAnswers}</span>
                  </td>
                  <td className="py-4 pl-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-20 h-2.5 bg-slate-700 rounded-full">
                         {accuracy > 0 && (
                             <div className={`${accuracyBarColor} h-2.5 rounded-full`} style={{ width: `${accuracy}%` }}></div>
                         )}
                      </div>
                      <span className={`font-semibold w-12 text-right ${getAccuracyTextColor(accuracy)}`}>{accuracy.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformancePanel;
