"use client";

import * as React from 'react';
import { StudyPlan } from '../types';
import { XIcon, ChevronDownIcon, CheckIcon } from '../constants';

interface PlanFilterProps {
    plans: StudyPlan[];
    selectedPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const PlanFilter: React.FC<PlanFilterProps> = ({ plans = [], selectedPlanIds = ['all'], onSelectPlans }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePlan = (planId: string) => {
        if (planId === 'all') {
            onSelectPlans(['all']);
            setIsOpen(false);
            return;
        }

        let newSelected = (selectedPlanIds || []).filter(id => id !== 'all');
        
        if (newSelected.includes(planId)) {
            newSelected = newSelected.filter(id => id !== planId);
            if (newSelected.length === 0) newSelected = ['all'];
        } else {
            newSelected = [...newSelected, planId];
        }
        
        onSelectPlans(newSelected);
    };

    const removePlan = (e: React.MouseEvent, planId: string) => {
        e.stopPropagation();
        let newSelected = (selectedPlanIds || []).filter(id => id !== planId);
        if (newSelected.length === 0) newSelected = ['all'];
        onSelectPlans(newSelected);
    };

    const isAllSelected = (selectedPlanIds || []).includes('all');

    return (
        <div className="mb-6 relative" ref={containerRef}>
            <label className="block text-sm font-bold text-emerald-400 uppercase tracking-wide mb-2">
                Filtrar por Plano
            </label>
            
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[48px] w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-2 focus-within:ring-2 focus-within:ring-emerald-500 cursor-pointer flex flex-wrap gap-2 items-center justify-between transition-all hover:border-gray-500"
            >
                <div className="flex flex-wrap gap-2">
                    {isAllSelected ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider">
                            Todos os Planos
                        </span>
                    ) : (
                        (selectedPlanIds || []).map(id => {
                            const plan = plans.find(p => p.id === id);
                            return (
                                <span key={id} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                    {plan?.name || 'Plano'}
                                    <button onClick={(e) => removePlan(e, id)} className="hover:text-white transition-colors">
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            );
                        })
                    )}
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-h-72 overflow-y-auto custom-scrollbar animate-fade-in">
                    <div 
                        onClick={() => togglePlan('all')}
                        className="px-4 py-3 hover:bg-gray-700 flex items-center justify-between cursor-pointer transition-colors border-b border-gray-700"
                    >
                        <span className={`text-sm font-bold ${isAllSelected ? 'text-emerald-400' : 'text-gray-300'}`}>
                            TODOS OS PLANOS
                        </span>
                        {isAllSelected && <CheckIcon className="w-5 h-5 text-emerald-500" />}
                    </div>
                    
                    {plans.map(plan => (
                        <div 
                            key={plan.id}
                            onClick={() => togglePlan(plan.id)}
                            className="px-4 py-3 hover:bg-gray-700 flex items-center justify-between cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${(selectedPlanIds || []).includes(plan.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
                                    {(selectedPlanIds || []).includes(plan.id) && <CheckIcon className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-sm ${(selectedPlanIds || []).includes(plan.id) ? 'text-white font-bold' : 'text-gray-400'}`}>
                                    {plan.name}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlanFilter;