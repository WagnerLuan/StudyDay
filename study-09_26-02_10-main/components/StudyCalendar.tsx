import * as React from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, XMarkIcon } from '../constants';
import { HistoryLog } from '../types';
import { parseDate, formatDateToYYYYMMDD } from '../src/utils/dateUtils';

interface StudyCalendarProps {
    studyLogsByDate: Map<string, { totalMinutes: number; logs: HistoryLog[] }>;
    onDayClick: (date: Date) => void;
}

const StudyCalendar: React.FC<StudyCalendarProps> = ({ studyLogsByDate, onDayClick }) => {
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const numDaysInMonth = lastDayOfMonth.getDate();

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.

    const days = [];
    // Fill leading empty days
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
    }

    // Fill days of the month
    for (let i = 1; i <= numDaysInMonth; i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const isToday = (date: Date | null) => {
        if (!date) return false; // Adiciona verificação de nulo aqui
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-700 text-gray-300">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-700 text-gray-300">
                    <ArrowRightIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="font-bold text-emerald-400">{day}</div>
                ))}
                {days.map((day, index) => (
                    <div
                        key={index}
                        className={`p-2 rounded-lg flex items-center justify-center cursor-pointer relative
                                    ${day ? 'hover:bg-gray-700' : ''}
                                    ${isToday(day) ? 'border-2 border-emerald-500' : ''}
                                    ${day && studyLogsByDate.has(formatDateToYYYYMMDD(day)) ? 'bg-green-900/30' : (day ? 'bg-red-900/30' : '')}
                                    ${day ? 'text-white' : 'text-gray-600'}
                                `}
                        onClick={() => day && onDayClick(day)}
                    >
                        {day ? (
                            <>
                                <span>{day.getDate()}</span>
                                {studyLogsByDate.has(formatDateToYYYYMMDD(day)) ? (
                                    <CheckIcon className="w-4 h-4 text-green-400 absolute bottom-1 right-1" />
                                ) : (
                                    day && <XMarkIcon className="w-4 h-4 text-red-400 absolute bottom-1 right-1" />
                                )}
                            </>
                        ) : ''}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudyCalendar;