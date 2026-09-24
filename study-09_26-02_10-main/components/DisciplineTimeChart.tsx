"use client";

import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DisciplineTimeChartProps {
    data: { name: string; minutes: number; color: string }[];
}

const DisciplineTimeChart: React.FC<DisciplineTimeChartProps> = ({ data }) => {
    // Prepara os dados: converte para horas e ordena do maior para o menor
    const chartData = React.useMemo(() => {
        return data
            .filter(d => d.minutes > 0)
            .map(d => ({
                ...d,
                hours: parseFloat((d.minutes / 60).toFixed(1))
            }))
            .sort((a, b) => b.hours - a.hours);
    }, [data]);

    // Calcula a altura dinâmica: 50px por barra para dar mais respiro vertical
    const dynamicHeight = Math.max(400, chartData.length * 50);

    if (chartData.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-[400px] flex items-center justify-center">
                <p className="text-gray-500">Sem dados de tempo para exibir o gráfico.</p>
            </div>
        );
    }

    return (
        <div 
            className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col transition-all" 
            style={{ height: `${dynamicHeight}px` }}
        >
            <h3 className="font-semibold text-white mb-6 uppercase text-xs tracking-widest">Tempo de Estudo por Disciplina (Horas)</h3>
            <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={chartData} 
                        layout="vertical" 
                        margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ 
                                fill: '#9CA3AF', 
                                fontSize: 10, 
                                fontWeight: 700,
                                width: 220 // Limita a largura do texto para forçar quebra se necessário, mas com mais espaço
                            }} 
                            width={230} // Aumentado de 150 para 230 para acomodar nomes longos
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ 
                                backgroundColor: '#1F2937', 
                                border: '1px solid #374151', 
                                borderRadius: '8px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            labelStyle={{ color: '#F3F4F6', fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}
                            itemStyle={{ fontSize: '12px', color: '#34D399', fontWeight: 'bold' }}
                            formatter={(value: number) => [`${value}h`, 'Tempo Total']}
                        />
                        <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={24}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DisciplineTimeChart;