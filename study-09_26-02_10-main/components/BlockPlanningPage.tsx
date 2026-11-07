import * as React from 'react';
import { StudyPlan, Discipline, StudyBlock } from '../types';
import { PlusIcon, ArrowLeftIcon, ArrowRightIcon, CalendarIcon, TrashIcon } from '../constants';
import StudyBlockCard from './StudyBlockCard';
import AddBlockModal from './AddBlockModal';
import BlockDetailModal from './BlockDetailModal';
import PlanFilter from './PlanFilter';
import BlockExcelImportModal from './BlockExcelImportModal';
import { ParsedBlockImport, downloadBlockExcelTemplate } from '../src/utils/excelBlockUtils';

interface BlockPlanningPageProps {
    plans: StudyPlan[];
    blocks: StudyBlock[];
    onSaveBlock: (block: Partial<StudyBlock>, repeatDays?: number[]) => Promise<void>;
    onDeleteBlock: (blockId: string) => Promise<void>;
    onCompleteBlock: (block: StudyBlock, date: string) => void;
    onClearWeek: (blockIds: string[]) => Promise<void>;
    onImportBlocks?: (blocks: Partial<StudyBlock>[], mode: 'append' | 'replace', existingWeekBlockIds?: string[]) => Promise<void>;
    selectedFilterPlanIds: string[];
    onSelectPlans: (planIds: string[]) => void;
}

const BlockPlanningPage: React.FC<BlockPlanningPageProps> = ({
    plans,
    blocks,
    onSaveBlock,
    onDeleteBlock,
    onCompleteBlock,
    onClearWeek,
    onImportBlocks,
    selectedFilterPlanIds,
    onSelectPlans
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
    const [selectedDay, setSelectedDay] = React.useState(1);
    const [selectedDateStr, setSelectedDateStr] = React.useState('');
    const [activeBlock, setActiveBlock] = React.useState<StudyBlock | null>(null);
    
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        return new Date(d.setDate(diff));
    };

    const startOfWeek = React.useMemo(() => {
        const start = getStartOfWeek(currentDate);
        start.setHours(0, 0, 0, 0);
        return start;
    }, [currentDate]);

    const weekDays = React.useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [startOfWeek]);

    const formatDateRange = () => {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString('pt-BR', options)} - ${endOfWeek.toLocaleDateString('pt-BR', options)}`;
    };

    const navigateWeek = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    const goToToday = () => setCurrentDate(new Date());

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setCurrentDate(new Date(e.target.value + 'T12:00:00'));
        }
    };

    const handleAddClick = (dayId: number, dateStr: string) => {
        setSelectedDay(dayId);
        setSelectedDateStr(dateStr);
        setActiveBlock(null);
        setIsAddModalOpen(true);
    };

    const handleCardClick = (block: StudyBlock) => {
        setActiveBlock(block);
        setSelectedDay(block.day_of_week);
        const dateForDay = weekDays.find(d => d.getDay() === block.day_of_week);
        if (dateForDay) {
            setSelectedDateStr(dateForDay.toISOString().split('T')[0]);
        }
        setIsDetailModalOpen(true);
    };

    const getDiscipline = (id: string, blockName?: string) => {
        if (blockName?.startsWith('⭐ ')) {
            return {
                id: id,
                name: blockName.replace('⭐ ', ''),
                color: '#8B5CF6',
                studiedTopics: 0,
                totalTopics: 0,
                resolvedQuestions: 0
            } as Discipline;
        }
        return plans.flatMap(p => p.disciplines).find(d => d.id === id);
    };

    const isBlockCompletedOnDate = (block: StudyBlock, date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const disc = getDiscipline(block.discipline_id, block.name);
        if (!disc || !disc.historyLogs) return false;
        
        return disc.historyLogs.some(log => {
            const [day, month, year] = log.date.split('/');
            const logDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            return logDateStr === dateStr;
        });
    };

    const days = [
        { id: 1, name: 'Segunda' },
        { id: 2, name: 'Terça' },
        { id: 3, name: 'Quarta' },
        { id: 4, name: 'Quinta' },
        { id: 5, name: 'Sexta' },
        { id: 6, name: 'Sábado' },
        { id: 0, name: 'Domingo' },
    ];

    const isActiveBlockCompleted = React.useMemo(() => {
        if (!activeBlock) return false;
        const dateForActiveDay = weekDays.find(d => d.getDay() === activeBlock.day_of_week);
        return dateForActiveDay ? isBlockCompletedOnDate(activeBlock, dateForActiveDay) : false;
    }, [activeBlock, weekDays, blocks, plans]);

    const isActiveBlockMissed = React.useMemo(() => {
        if (!activeBlock || isActiveBlockCompleted) return false;
        const dateForActiveDay = weekDays.find(d => d.getDay() === activeBlock.day_of_week);
        if (!dateForActiveDay) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const blockDate = new Date(dateForActiveDay);
        blockDate.setHours(0, 0, 0, 0);
        
        return blockDate < today;
    }, [activeBlock, weekDays, isActiveBlockCompleted]);

    const filteredBlocks = React.useMemo(() => {
        if (selectedFilterPlanIds.includes('all')) return blocks;
        return blocks.filter(b => {
            if (b.plan_id && selectedFilterPlanIds.includes(b.plan_id)) return true;
            // Fallback: find the discipline's plan_id
            const disc = getDiscipline(b.discipline_id, b.name);
            if (disc) {
                const plan = plans.find(p => p.disciplines.some(d => d.id === disc.id));
                if (plan && selectedFilterPlanIds.includes(plan.id)) return true;
            }
            return false;
        });
    }, [blocks, selectedFilterPlanIds, plans]);

    const currentWeekBlockIds = React.useMemo(() => {
        const ids: string[] = [];
        days.forEach((day, index) => {
            const dateForDay = weekDays[index];
            const dateStr = dateForDay.toISOString().split('T')[0];
            
            const dayBlocks = filteredBlocks.filter(b => {
                if (b.day_of_week !== day.id) return false;
                if (b.specific_date) {
                    return b.specific_date === dateStr;
                }
                if (b.created_at) {
                    const createdAtDate = new Date(b.created_at);
                    createdAtDate.setHours(0, 0, 0, 0);
                    const currentDayDate = new Date(dateForDay);
                    currentDayDate.setHours(0, 0, 0, 0);
                    return currentDayDate >= createdAtDate;
                }
                return true;
            });
            dayBlocks.forEach(b => ids.push(b.id));
        });
        return ids;
    }, [filteredBlocks, days, weekDays]);

    const handleClearWeekRequest = () => {
        const blockIdsToClear = [...currentWeekBlockIds];

        if (blockIdsToClear.length === 0) {
            alert("Não há blocos planejados para limpar nesta semana.");
            return;
        }

        if (confirm(`Deseja realmente apagar todos os ${blockIdsToClear.length} blocos planejados para esta semana? Esta ação não pode ser desfeita.`)) {
            onClearWeek(blockIdsToClear);
        }
    };

    const handleConfirmImport = async (parsedBlocks: ParsedBlockImport[], mode: 'append' | 'replace') => {
        if (!onImportBlocks) {
            alert('Função de importação não configurada.');
            return;
        }

        const blocksToPersist: Partial<StudyBlock>[] = parsedBlocks.map(blk => {
            // Se veio data explícita na planilha (ex: 2026-11-09), utiliza-a; senão calcula com base na semana exibida
            let specificDate = blk.dateStr;
            if (!specificDate) {
                const matchingDayDate = weekDays.find(d => d.getDay() === blk.dayOfWeek);
                specificDate = matchingDayDate ? matchingDayDate.toISOString().split('T')[0] : undefined;
            }

            // Horário com início e fim (ex: 20:00–20:50) ou início simples
            const formattedTime = blk.timeRange || blk.startTime;

            return {
                plan_id: blk.planId,
                discipline_id: blk.disciplineId,
                topic_id: blk.topicId,
                topic_name: blk.topicName,
                name: blk.name,
                type: blk.categories,
                day_of_week: blk.dayOfWeek,
                duration_minutes: blk.durationMinutes,
                start_time: formattedTime,
                specific_date: specificDate,
            };
        });

        await onImportBlocks(blocksToPersist, mode, currentWeekBlockIds);
    };

    const handleCopyBlock = (block: StudyBlock, targetDate: string) => {
        // Create a copy of the block with the new target date.
        // The day_of_week must match the target date so the block shows up
        // in the correct column (blocks are filtered by day_of_week + specific_date).
        const targetDayOfWeek = new Date(targetDate + 'T12:00:00').getDay();
        const newBlock: Partial<StudyBlock> = {
            ...block,
            id: undefined, // Let backend generate new id
            day_of_week: targetDayOfWeek,
            specific_date: targetDate,
            last_completed_date: undefined,
        };

        // Save the new block, which will trigger fetchPlans in App.tsx
        onSaveBlock(newBlock);
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Planejamento por Blocos</h1>
                    <p className="text-gray-400 mt-1">Organize sua rotina semanal de estudos.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gray-800 p-2 sm:p-2.5 rounded-xl border border-gray-700 shadow-lg w-full xl:w-auto">
                    {/* [ ← SEMANA 02 nov. - 08 nov. → ] */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer" title="Semana anterior">
                            <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="flex flex-col items-center px-2 sm:px-3 min-w-[140px] sm:min-w-[170px] select-none">
                            <span className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest">Semana</span>
                            <span className="text-xs sm:text-sm font-bold text-white">{formatDateRange()}</span>
                        </div>
                        <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer" title="Próxima semana">
                            <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {/* Divisor vertical */}
                    <div className="hidden sm:block h-6 sm:h-7 w-px bg-gray-700 mx-0.5 sm:mx-1 flex-shrink-0"></div>

                    {/* [ Hoje ] [ 📅 ] */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={goToToday} className="px-2.5 sm:px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer" title="Ir para a semana atual">
                            Hoje
                        </button>
                        <div className="relative group">
                            <input type="date" onChange={handleDateSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <button className="p-1.5 sm:p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all cursor-pointer" title="Escolher data no calendário">
                                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Divisor vertical */}
                    <div className="hidden sm:block h-6 sm:h-7 w-px bg-gray-700 mx-0.5 sm:mx-1 flex-shrink-0"></div>

                    {/* [ 📥 Baixar Modelo ] [ 📤 Importar Semana (Excel) ] */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => downloadBlockExcelTemplate(plans)}
                            className="px-2.5 sm:px-3 py-1.5 bg-gray-700/80 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold rounded-lg transition-all border border-emerald-500/20 flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                            title="Baixar planilha modelo do Excel (.xlsx)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>Baixar Modelo</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            title="Importar rotina semanal de estudos via Excel (.xlsx)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span>Importar Semana (Excel)</span>
                        </button>
                    </div>

                    {/* Divisor vertical */}
                    <div className="hidden sm:block h-6 sm:h-7 w-px bg-gray-700 mx-0.5 sm:mx-1 flex-shrink-0"></div>

                    {/* [ 🗑️ Limpar Semana ] */}
                    <div className="flex items-center flex-shrink-0">
                        <button 
                            onClick={handleClearWeekRequest}
                            className="px-2.5 sm:px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white text-xs font-bold rounded-lg transition-all border border-red-600/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            title="Limpar todos os blocos da semana atual"
                        >
                            <TrashIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Limpar Semana</span>
                        </button>
                    </div>
                </div>
            </header>

            <PlanFilter plans={plans} selectedPlanIds={selectedFilterPlanIds} onSelectPlans={onSelectPlans} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {days.map((day, index) => {
                    const dateForDay = weekDays[index];
                    const dateStr = dateForDay.toISOString().split('T')[0];
                    const [todayD, todayM, todayY] = new Date()
                        .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                        .split('/');
                    const todayBrasiliaStr = `${todayY}-${todayM.padStart(2, '0')}-${todayD.padStart(2, '0')}`;
                    const isToday = todayBrasiliaStr === dateStr;

                    const dayBlocks = filteredBlocks
                        .filter(b => {
                            if (b.day_of_week !== day.id) return false;
                            if (b.specific_date) {
                                return b.specific_date === dateStr;
                            }
                            if (b.created_at) {
                                const createdAtDate = new Date(b.created_at);
                                createdAtDate.setHours(0, 0, 0, 0);
                                const currentDayDate = new Date(dateForDay);
                                currentDayDate.setHours(0, 0, 0, 0);
                                return currentDayDate >= createdAtDate;
                            }
                            return true;
                        })
                        .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));

                    return (
                        <div key={day.id} className={`flex flex-col rounded-2xl border transition-all min-h-[600px] shadow-inner ${
                            isToday ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20' : 'bg-gray-800/30 border-gray-700'
                        }`}>
                            <div className={`p-4 border-b flex justify-between items-center rounded-t-2xl ${
                                isToday ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gray-800 border-gray-700'
                            }`}>
                                <div className="flex flex-col">
                                    <h3 className={`font-black uppercase text-[10px] tracking-widest ${isToday ? 'text-emerald-400' : 'text-gray-400'}`}>
                                        {day.name}
                                    </h3>
                                    <span className="text-xs font-bold text-white">{dateForDay.getDate()} {dateForDay.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                </div>
                                <button onClick={() => handleAddClick(day.id, dateStr)} className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all shadow-lg hover:scale-110">
                                    <PlusIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <div className="p-3 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
                                {dayBlocks.map(block => {
                                    const disc = getDiscipline(block.discipline_id, block.name);
                                    if (!disc) return null;
                                    
                                    const isCompleted = isBlockCompletedOnDate(block, dateForDay);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const blockDate = new Date(dateForDay);
                                    blockDate.setHours(0, 0, 0, 0);
                                    const isMissed = !isCompleted && blockDate < today;

                                    return (
                                        <StudyBlockCard 
                                            key={block.id} 
                                            block={block} 
                                            discipline={disc}
                                            isCompletedOnDate={isCompleted}
                                            isMissed={isMissed}
                                            onClick={() => handleCardClick(block)}
                                            onComplete={() => onCompleteBlock(block, dateStr)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <AddBlockModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={async (data, repeatDays) => {
                    await onSaveBlock(data, repeatDays);
                    setIsAddModalOpen(false);
                }}
                plans={plans}
                dayOfWeek={selectedDay}
                selectedDateStr={selectedDateStr}
                blockToEdit={activeBlock}
            />

            <BlockDetailModal 
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                block={activeBlock}
                discipline={activeBlock ? getDiscipline(activeBlock.discipline_id, activeBlock.name) || null : null}
                isCompleted={isActiveBlockCompleted}
                isMissed={isActiveBlockMissed}
                onEdit={() => {
                    setIsDetailModalOpen(false);
                    setIsAddModalOpen(true);
                }}
                onDelete={async () => {
                    if (activeBlock) {
                        await onDeleteBlock(activeBlock.id);
                        setIsDetailModalOpen(false);
                        setActiveBlock(null);
                    }
                }}
                onComplete={() => {
                    if (activeBlock) {
                        const dateForActiveDay = weekDays.find(d => d.getDay() === activeBlock.day_of_week) || new Date();
                        onCompleteBlock(activeBlock, dateForActiveDay.toISOString().split('T')[0]);
                        setIsDetailModalOpen(false);
                    }
                }}
                onCopy={handleCopyBlock}
            />

            <BlockExcelImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                plans={plans}
                currentWeekBlockCount={currentWeekBlockIds.length}
                onConfirmImport={handleConfirmImport}
            />
        </div>
    );
};

export default BlockPlanningPage;