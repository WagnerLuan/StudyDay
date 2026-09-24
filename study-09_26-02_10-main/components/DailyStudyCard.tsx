"use client";

import * as React from 'react';
import Card from './Card';
import { CheckIcon, QuestionMarkCircleIcon } from '../constants';

interface DailyStudyCardProps {
    timeInMinutes: number;
    questions: number;
    accuracy: number;
}

const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h 0min';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}min`;
};

const DailyStudyCard: React.FC<DailyStudyCardProps> = ({ timeInMinutes, questions, accuracy }) => {
    const today = new Date().toLocaleDateString('pt-BR');

    const getAccuracyColor = (acc: number) => {
        if (acc === 0 && questions === 0) return 'text-gray-500';
        if (acc < 70) return 'text-red-500';
        if (acc < 80) return 'text-yellow-400';
        return 'text-green-400';
    };

    return (
        <Card className="h-full flex flex-col justify-between">
            <div>
                <h2 className="text-xl font-bold text-white uppercase">Estudos do Dia</h2>
                <p className="text-gray-400 mt-1">({today})</p>
            </div>
            
            <div className="space-y-6 mt-4">
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Tempo de Estudo</p>
                    <p className="text-5xl font-bold text-emerald-400">{formatTime(timeInMinutes)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <QuestionMarkCircleIcon className="w-3 h-3" /> Questões
                        </p>
                        <p className="text-2xl font-bold text-white">{questions}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                            <CheckIcon className="w-3 h-3" /> Acerto
                        </p>
                        <p className={`text-2xl font-bold ${getAccuracyColor(accuracy)}`}>
                            {questions > 0 ? `${accuracy.toFixed(1)}%` : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default DailyStudyCard;