import * as React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { WeeklyStudy } from '../types';
import Card from './Card';

interface WeeklyStudyChartProps {
    data: WeeklyStudy[];
}

const WeeklyStudyChart: React.FC<WeeklyStudyChartProps> = ({ data }) => {
    const [view, setView] = React.useState<'time' | 'questions'>('time');

    const chartData = data.map(item => ({
        ...item,
        time: item.time / 60 // Convert minutes to hours for the chart
    }));

    const yAxisFormatter = (value: number) => view === 'time' ? `${value}h` : `${value}`;

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white uppercase">Estudo Semanal</h2>
                <div className="flex items-center bg-gray-900 rounded-lg p-1">
                    <button
                        onClick={() => setView('time')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'time' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        TEMPO
                    </button>
                    <button
                        onClick={() => setView('questions')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'questions' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        QUESTÕES
                    </button>
                </div>
            </div>
            <div className="flex-grow" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#A0AEC0' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={yAxisFormatter} tick={{ fill: '#A0AEC0' }} axisLine={false} tickLine={false} domain={view === 'time' ? [0, 9] : undefined} />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                            contentStyle={{
                                background: 'rgba(30, 41, 59, 0.8)',
                                border: '1px solid #4A5568',
                                borderRadius: '0.5rem',
                                color: '#CBD5E0',
                            }}
                            labelStyle={{ fontWeight: 'bold' }}
                            formatter={(value: number, name: string) => {
                                const formattedValue = view === 'time' 
                                    ? `${Number(value).toFixed(1)}h` 
                                    : value;
                                const label = name === 'time' ? 'Tempo' : 'Questões';
                                return [formattedValue, label];
                            }}
                        />
                        <Bar dataKey={view} fill="#34D399" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default WeeklyStudyChart;