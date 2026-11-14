import * as React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeeklyStudy } from '../types';
import Card from './Card';

interface WeeklyStudyChartProps {
    data: WeeklyStudy[];
    dateRangeLabel?: string;
    isCurrentWeek?: boolean;
    onPrevWeek?: () => void;
    onNextWeek?: () => void;
}

const formatMinutesToHoursMins = (minutes: number): string => {
    const safeMinutes = Math.max(0, Math.round(minutes || 0));
    if (safeMinutes === 0) return '0h 0m';
    const h = Math.floor(safeMinutes / 60);
    const m = safeMinutes % 60;
    return `${h}h ${m}m`;
};

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload: {
            day: string;
            fullDate?: string;
            rawMinutes: number;
            questions: number;
        };
    }>;
    view: 'time' | 'questions';
}

const CustomWeeklyTooltip: React.FC<CustomTooltipProps> = ({ active, payload, view }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;

    return (
        <div className="bg-slate-800/95 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs">
            <p className="font-bold text-white mb-1">
                {item.day}{item.fullDate ? ` • ${item.fullDate}` : ''}
            </p>
            <p className="text-emerald-400 font-semibold">
                {view === 'time'
                    ? `Tempo: ${formatMinutesToHoursMins(item.rawMinutes)}`
                    : `Questões: ${item.questions} ${item.questions === 1 ? 'questão' : 'questões'}`}
            </p>
        </div>
    );
};

const WeeklyStudyChart: React.FC<WeeklyStudyChartProps> = ({
    data,
    dateRangeLabel,
    isCurrentWeek = true,
    onPrevWeek,
    onNextWeek,
}) => {
    const [view, setView] = React.useState<'time' | 'questions'>('time');

    const chartData = React.useMemo(
        () =>
            data.map(item => ({
                ...item,
                rawMinutes: item.time,
                time: item.time / 60, // Convert minutes to hours for the chart
            })),
        [data]
    );

    const totalMinutes = React.useMemo(
        () => data.reduce((sum, item) => sum + (Number(item.time) || 0), 0),
        [data]
    );

    const totalQuestions = React.useMemo(
        () => data.reduce((sum, item) => sum + (Number(item.questions) || 0), 0),
        [data]
    );

    const yAxisFormatter = (value: number) => (view === 'time' ? `${value}h` : `${value}`);

    return (
        <Card className="h-full flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white uppercase">Estudo Semanal</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Total:{' '}
                        <span className="text-emerald-400 font-semibold">
                            {view === 'time'
                                ? formatMinutesToHoursMins(totalMinutes)
                                : `${totalQuestions} ${totalQuestions === 1 ? 'questão' : 'questões'}`}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {onPrevWeek && onNextWeek && (
                        <div className="flex items-center gap-0.5 bg-gray-900 border border-gray-700/70 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={onPrevWeek}
                                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                title="Semana anterior"
                                aria-label="Semana anterior"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-gray-200 whitespace-nowrap select-none">
                                <span>{dateRangeLabel}</span>
                                {isCurrentWeek && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        Atual
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onNextWeek}
                                disabled={isCurrentWeek}
                                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                title="Próxima semana"
                                aria-label="Próxima semana"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center bg-gray-900 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setView('time')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'time' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            TEMPO
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('questions')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'questions' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            QUESTÕES
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-grow" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#A0AEC0' }} axisLine={false} tickLine={false} />
                        <YAxis
                            tickFormatter={yAxisFormatter}
                            tick={{ fill: '#A0AEC0' }}
                            axisLine={false}
                            tickLine={false}
                            domain={view === 'time' ? [0, (dataMax: number) => Math.max(9, Math.ceil(dataMax))] : undefined}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                            content={<CustomWeeklyTooltip view={view} />}
                        />
                        <Bar dataKey={view} fill="#34D399" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default WeeklyStudyChart;