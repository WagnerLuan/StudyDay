"use client";

import * as React from 'react';

interface RevisionSummaryPanelProps {
    lateCount: number;
    todayCount: number;
    upcomingCount: number;
    masteredCount: number;
}

const SummaryCard: React.FC<{ label: string; value: number; colorClass: string; icon?: string }> = ({ label, value, colorClass }) => (
    <div className="bg-gray-800/50 p-4 rounded-xl shadow-md border border-gray-700 flex flex-col items-center justify-center text-center transition-all hover:bg-gray-800">
        <span className={`text-3xl font-black mb-1 ${colorClass}`}>{value}</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{label}</span>
    </div>
);

const RevisionSummaryPanel: React.FC<RevisionSummaryPanelProps> = ({ lateCount, todayCount, upcomingCount, masteredCount }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard 
                label="Revisões Atrasadas" 
                value={lateCount} 
                colorClass="text-red-500" 
            />
            <SummaryCard 
                label="Revisões Hoje" 
                value={todayCount} 
                colorClass="text-emerald-400" 
            />
            <SummaryCard 
                label="Próximas Revisões" 
                value={upcomingCount} 
                colorClass="text-yellow-400" 
            />
            <SummaryCard 
                label="Tópicos Dominados" 
                value={masteredCount} 
                colorClass="text-blue-400" 
            />
        </div>
    );
};

export default RevisionSummaryPanel;