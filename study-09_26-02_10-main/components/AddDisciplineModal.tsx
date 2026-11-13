import * as React from 'react';
import { Discipline, StructuredTopicItem } from '../types';
import { TrashIcon, PlusIcon } from '../constants';
import {
    computeHierarchicalNumbers,
    formatStructuredTopicsToText,
    hydrateOrderedTopics,
    parseBatchTopicsText,
    stripTopicPrefix,
} from '../src/utils/topicUtils';

interface AddDisciplineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        discipline: Partial<Discipline> & {
            name: string;
            totalTopics: number;
            color: string;
            topicsText?: string;
            weight: number;
            structuredTopics?: StructuredTopicItem[];
        }
    ) => void;
    disciplineToEdit?: Discipline | null;
}

interface EditableTopicCardItem {
    uid: string;
    id?: string;
    originalName?: string;
    cleanName: string;
    isSubtopic: boolean;
}

const createUid = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Color conversion utilities
const hexToRgb = (hex: string) => {
    let r = 0, g = 0, b = 0;
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }
    return { r, g, b };
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const rgbToHsv = ({ r, g, b }: { r: number, g: number, b: number }) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = ({ h, s, v }: { h: number, s: number, v: number }) => {
    s /= 100; v /= 100;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
};

const presetColors = [
    '#EF4444', '#F87171', '#FB923C', '#F97316', '#F59E0B', '#EAB308', '#D97706', '#CA8A04',
    '#A3E635', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
];


const AdvancedColorPicker: React.FC<{ selectedColor: string; onSelectColor: (color: string) => void; }> = ({ selectedColor, onSelectColor }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const [hsv, setHsv] = React.useState({ h: 0, s: 100, v: 100 });
    const { r, g, b } = hsvToRgb(hsv);

    const saturationValueRef = React.useRef<HTMLDivElement>(null);
    const hueSliderRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        try {
            const newRgb = hexToRgb(selectedColor);
            if (!isNaN(newRgb.r)) {
                 const newHsv = rgbToHsv(newRgb);
                 setHsv(newHsv);
            }
        } catch (e) { console.error("Invalid hex color:", selectedColor); }
    }, [selectedColor]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleHsvChange = (newHsv: { h: number; s: number; v: number; }) => {
        setHsv(newHsv);
        const newRgb = hsvToRgb(newHsv);
        onSelectColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    }
    
    const createDragHandler = (
        ref: React.RefObject<HTMLDivElement>,
        onDrag: (pos: { x: number; y: number }, rect: DOMRect) => void
    ) => (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;

        const handleMouseMove = (moveE: MouseEvent) => {
            onDrag({ x: moveE.clientX, y: moveE.clientY }, rect);
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        onDrag({ x: e.clientX, y: e.clientY }, rect);
    };

    const handleSaturationValueDrag = createDragHandler(saturationValueRef, (pos, rect) => {
        const x = Math.max(0, Math.min(pos.x - rect.left, rect.width));
        const y = Math.max(0, Math.min(pos.y - rect.top, rect.height));
        const s = (x / rect.width) * 100;
        const v = 100 - (y / rect.height) * 100;
        handleHsvChange({ ...hsv, s, v });
    });

    const handleHueDrag = createDragHandler(hueSliderRef, (pos, rect) => {
        const x = Math.max(0, Math.min(pos.x - rect.left, rect.width));
        const h = (x / rect.width) * 360;
        handleHsvChange({ ...hsv, h });
    });
    
    const handleRgbChange = (component: 'r' | 'g' | 'b', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0 || numValue > 255) return;
        const newRgb = { r, g, b, [component]: numValue };
        onSelectColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    };

    return (
        <div className="relative" ref={pickerRef}>
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2 whitespace-nowrap">
                Selecionar uma Cor
            </label>
            <button
                type="button"
                className="w-full h-12 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-3 text-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-nowrap"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="flex items-center whitespace-nowrap">
                    <span className="w-5 h-5 rounded-sm mr-2 border border-gray-500 shrink-0" style={{ backgroundColor: selectedColor }}></span>
                    <span className="whitespace-nowrap">Selecionar Cor...</span>
                </span>
                <svg className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div className="absolute z-20 w-72 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-4">
                    <div className="grid grid-cols-8 gap-2 mb-4">
                        {presetColors.map(color => (
                            <button
                                key={color}
                                type="button"
                                className={`w-full aspect-square rounded-md border-2 ${selectedColor.toUpperCase() === color ? 'border-emerald-400' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => onSelectColor(color)}
                            />
                        ))}
                    </div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Cor Personalizada</h4>
                    
                    <div 
                        ref={saturationValueRef}
                        onMouseDown={handleSaturationValueDrag}
                        className="w-full h-40 rounded cursor-pointer relative" 
                        style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
                    >
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, white, transparent)' }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, black, transparent)' }} />
                        <div 
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2" 
                            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
                        />
                    </div>

                    <div 
                        ref={hueSliderRef}
                        onMouseDown={handleHueDrag}
                        className="w-full h-4 rounded cursor-pointer relative my-3"
                        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                    >
                        <div 
                             className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/3" 
                             style={{ left: `${(hsv.h / 360) * 100}%`, top: '50%' }}
                        />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                         <div className="w-8 h-8 rounded-md border border-gray-600" style={{ backgroundColor: selectedColor }}></div>
                         <div className="grid grid-cols-3 gap-2 flex-grow">
                            {([
                                { label: 'R', value: r, key: 'r' }, 
                                { label: 'G', value: g, key: 'g' }, 
                                { label: 'B', value: b, key: 'b' }
                            ] as const).map(({label, value, key}) => (
                                <div key={label}>
                                    <input 
                                        type="number" 
                                        value={value} 
                                        onChange={(e) => handleRgbChange(key, e.target.value)}
                                        className="w-full bg-gray-700 text-center rounded-md py-1 px-1 text-sm border border-gray-600" 
                                    />
                                    <p className="text-center text-xs text-gray-400 mt-1">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const AddDisciplineModal: React.FC<AddDisciplineModalProps> = ({ isOpen, onClose, onSave, disciplineToEdit }) => {
    const [name, setName] = React.useState('');
    const [topicItems, setTopicItems] = React.useState<EditableTopicCardItem[]>([]);
    const [selectedColor, setSelectedColor] = React.useState(presetColors[6]);
    const [weight, setWeight] = React.useState<number | string>(1.0);

    // Batch paste mode
    const [isBatchOpen, setIsBatchOpen] = React.useState(false);
    const [batchText, setBatchText] = React.useState('');

    // Drag-and-drop state
    const [dragEnabledUid, setDragEnabledUid] = React.useState<string | null>(null);
    const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

    // Focus management for newly inserted topics
    const [focusUid, setFocusUid] = React.useState<string | null>(null);
    const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    React.useEffect(() => {
        if (isOpen) {
            setIsBatchOpen(false);
            setBatchText('');
            setDraggingIndex(null);
            setDragOverIndex(null);
            setDragEnabledUid(null);
            setFocusUid(null);

            if (disciplineToEdit) {
                setName(disciplineToEdit.name);
                setSelectedColor(disciplineToEdit.color || presetColors[6]);
                setWeight(disciplineToEdit.weight || 1.0);

                if (disciplineToEdit.topicsList && disciplineToEdit.topicsList.length > 0) {
                    const ordered = hydrateOrderedTopics(disciplineToEdit.topicsList, disciplineToEdit.topicsText);
                    setTopicItems(
                        ordered.map((t) => ({
                            uid: t.id || createUid(),
                            id: t.id,
                            originalName: t.name,
                            cleanName: stripTopicPrefix(t.name) || t.name.trim(),
                            isSubtopic: Boolean(t.isSubtopic),
                        }))
                    );
                } else if (disciplineToEdit.topicsText && disciplineToEdit.topicsText.trim() !== '') {
                    const parsed = parseBatchTopicsText(disciplineToEdit.topicsText);
                    setTopicItems(
                        parsed.map((p) => ({
                            uid: createUid(),
                            cleanName: p.cleanName,
                            isSubtopic: p.isSubtopic,
                        }))
                    );
                } else {
                    setTopicItems([]);
                }
            } else {
                // Reset for new discipline
                setName('');
                setTopicItems([]);
                setSelectedColor(presetColors[6]);
                setWeight(1.0);
            }
        }
    }, [isOpen, disciplineToEdit]);

    React.useEffect(() => {
        if (focusUid && inputRefs.current[focusUid]) {
            inputRefs.current[focusUid]?.focus();
            setFocusUid(null);
        }
    }, [focusUid, topicItems]);

    const numberedItems = React.useMemo(
        () => computeHierarchicalNumbers(topicItems),
        [topicItems]
    );

    if (!isOpen) return null;

    const handleTopicNameChange = (uid: string, newValue: string) => {
        setTopicItems((prev) =>
            prev.map((item) => (item.uid === uid ? { ...item, cleanName: newValue } : item))
        );
    };

    const handleToggleSubtopic = (index: number, makeSubtopic: boolean) => {
        if (index === 0 && makeSubtopic) return; // Primeiro tópico não pode ser subtópico
        setTopicItems((prev) =>
            prev.map((item, idx) =>
                idx === index ? { ...item, isSubtopic: makeSubtopic } : item
            )
        );
    };

    const handleInsertAt = (insertIndex: number, isSubtopic = false) => {
        const newUid = createUid();
        const safeSubtopic = insertIndex === 0 ? false : isSubtopic;
        setTopicItems((prev) => {
            const next = [...prev];
            next.splice(insertIndex, 0, {
                uid: newUid,
                cleanName: '',
                isSubtopic: safeSubtopic,
            });
            return next;
        });
        setFocusUid(newUid);
    };

    const handleRemoveAt = (uid: string) => {
        setTopicItems((prev) => {
            const filtered = prev.filter((item) => item.uid !== uid);
            // Garante que o novo primeiro item não fique marcado como subtópico órfão
            if (filtered.length > 0 && filtered[0].isSubtopic) {
                filtered[0] = { ...filtered[0], isSubtopic: false };
            }
            return filtered;
        });
    };

    const handleApplyBatch = (mode: 'append' | 'replace') => {
        const parsed = parseBatchTopicsText(batchText);
        if (parsed.length === 0) {
            setIsBatchOpen(false);
            setBatchText('');
            return;
        }

        const newCards: EditableTopicCardItem[] = parsed.map((p) => ({
            uid: createUid(),
            cleanName: p.cleanName,
            isSubtopic: p.isSubtopic,
        }));

        if (mode === 'replace') {
            setTopicItems(newCards);
        } else {
            setTopicItems((prev) => {
                const combined = [...prev.filter((item) => item.cleanName.trim() !== '' || item.id), ...newCards];
                if (combined.length > 0 && combined[0].isSubtopic) {
                    combined[0] = { ...combined[0], isSubtopic: false };
                }
                return combined;
            });
        }

        setBatchText('');
        setIsBatchOpen(false);
    };

    // Drag & Drop handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        if (draggingIndex === null || draggingIndex === targetIndex) {
            setDraggingIndex(null);
            setDragOverIndex(null);
            setDragEnabledUid(null);
            return;
        }

        setTopicItems((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(draggingIndex, 1);
            updated.splice(targetIndex, 0, moved);
            if (updated.length > 0 && updated[0].isSubtopic) {
                updated[0] = { ...updated[0], isSubtopic: false };
            }
            return updated;
        });

        setDraggingIndex(null);
        setDragOverIndex(null);
        setDragEnabledUid(null);
    };

    const handleDragEnd = () => {
        setDraggingIndex(null);
        setDragOverIndex(null);
        setDragEnabledUid(null);
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert('O nome da disciplina é obrigatório.');
            return;
        }

        const validItems = topicItems
            .map((item) => ({
                ...item,
                cleanName: item.cleanName.trim(),
            }))
            .filter((item) => item.cleanName !== '');

        const numbered = computeHierarchicalNumbers(validItems);
        const topicsText = formatStructuredTopicsToText(validItems);
        const structuredTopics: StructuredTopicItem[] = numbered.map((item, idx) => ({
            id: item.id,
            originalName: item.originalName,
            cleanName: item.cleanName,
            isSubtopic: item.isSubtopic,
            displayNumber: item.displayNumber,
            orderIndex: idx,
        }));

        onSave({
            id: disciplineToEdit?.id,
            name: name.trim(),
            totalTopics: structuredTopics.length,
            color: selectedColor,
            topicsText,
            weight: Number(weight) || 1.0,
            structuredTopics,
        });
    };

    const nonEmptyCount = topicItems.filter((t) => t.cleanName.trim() !== '').length;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-4xl text-white transform transition-all flex flex-col max-h-[92vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 flex-shrink-0">
                    {disciplineToEdit ? 'Editar Disciplina' : 'Nova Disciplina'}
                </h2>

                <div className="space-y-6 flex-1 min-h-0 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 flex-shrink-0">
                        <div className="md:col-span-5">
                            <label htmlFor="discipline-name" className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">
                                Nome da Disciplina
                            </label>
                            <input
                                type="text"
                                id="discipline-name"
                                placeholder="Ex: Direito Constitucional"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-12 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label htmlFor="discipline-weight" className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">
                                Peso da Disciplina
                            </label>
                            <input
                                type="number"
                                id="discipline-weight"
                                step="0.01"
                                min="0.1"
                                placeholder="Ex: 1.0"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full h-12 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <AdvancedColorPicker selectedColor={selectedColor} onSelectColor={setSelectedColor} />
                        </div>
                    </div>

                    {/* Seção da Lista Interativa Estruturada de Tópicos */}
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <span className="block text-xs font-bold text-emerald-400 uppercase tracking-wide">
                                    Tópicos do Edital
                                </span>
                                <span className="text-[11px] font-semibold text-gray-300 bg-gray-700/80 border border-gray-600 px-2 py-0.5 rounded-md">
                                    {nonEmptyCount} {nonEmptyCount === 1 ? 'tópico' : 'tópicos'}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsBatchOpen((prev) => !prev)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                    isBatchOpen
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                        : 'bg-gray-700/70 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600'
                                }`}
                                title="Colar vários tópicos de uma vez (um por linha)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-emerald-400">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Colar em lote</span>
                            </button>
                        </div>

                        {/* Painel rápido "Colar em lote" */}
                        {isBatchOpen && (
                            <div className="mb-3 p-4 bg-gray-900/70 border border-emerald-500/30 rounded-xl space-y-3 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-300">
                                        Cole sua lista abaixo (um tópico por linha). Prefixos antigos (<code className="text-emerald-400">1.</code>, <code className="text-emerald-400">1.1.</code>) serão limpos e subtópicos indentados serão reconhecidos automaticamente.
                                    </p>
                                </div>
                                <textarea
                                    rows={5}
                                    value={batchText}
                                    onChange={(e) => setBatchText(e.target.value)}
                                    placeholder={"1. Estado, governo e administração pública\n  1.1. Conceito e elementos\n2. Organização Administrativa"}
                                    className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500 resize-y"
                                    autoFocus
                                />
                                <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsBatchOpen(false);
                                            setBatchText('');
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    {topicItems.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleApplyBatch('replace')}
                                            className="px-3 py-1.5 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-lg transition-colors cursor-pointer"
                                        >
                                            Substituir lista atual
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleApplyBatch('append')}
                                        className="px-3.5 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer"
                                    >
                                        {topicItems.length > 0 ? 'Adicionar à lista' : 'Converter em cards'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Lista Scrollável de Cards */}
                        <div className="flex-1 min-h-[220px] max-h-[44vh] overflow-y-auto custom-scrollbar bg-gray-900/40 border border-gray-700/80 rounded-xl p-3 space-y-1">
                            {numberedItems.length === 0 ? (
                                <div className="py-10 text-center text-gray-400 text-sm space-y-2">
                                    <p>Nenhum tópico adicionado ainda.</p>
                                    <p className="text-xs text-gray-500">
                                        Clique em <span className="text-emerald-400 font-semibold">+ Adicionar Tópico</span> abaixo ou use <span className="text-emerald-400 font-semibold">Colar em lote</span>.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Botão discreto para inserir na 1ª posição */}
                                    <div className="flex items-center justify-center group py-0.5">
                                        <div className="h-px flex-1 bg-gray-700/40 group-hover:bg-emerald-500/40 transition-colors" />
                                        <button
                                            type="button"
                                            onClick={() => handleInsertAt(0, false)}
                                            className="mx-2 px-2 py-0.5 rounded-full bg-gray-800 hover:bg-emerald-500 text-gray-400 hover:text-white border border-gray-700 hover:border-emerald-400 text-[11px] font-bold flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                                            title="Inserir tópico no início da lista"
                                        >
                                            <PlusIcon className="w-3 h-3" />
                                        </button>
                                        <div className="h-px flex-1 bg-gray-700/40 group-hover:bg-emerald-500/40 transition-colors" />
                                    </div>

                                    {numberedItems.map((item, index) => {
                                        const seqBadge = String(index + 1).padStart(2, '0');
                                        const isDragging = draggingIndex === index;
                                        const isDragOver = dragOverIndex === index && draggingIndex !== index;

                                        return (
                                            <React.Fragment key={item.uid}>
                                                <div
                                                    draggable={dragEnabledUid === item.uid}
                                                    onDragStart={(e) => handleDragStart(e, index)}
                                                    onDragOver={(e) => handleDragOver(e, index)}
                                                    onDrop={(e) => handleDrop(e, index)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                                        item.isSubtopic
                                                            ? 'ml-6 sm:ml-8 border-l-2 border-l-emerald-500/60 bg-gray-800/90'
                                                            : 'bg-gray-800'
                                                    } ${
                                                        isDragOver
                                                            ? 'border-emerald-400 ring-1 ring-emerald-400/60 bg-emerald-950/30'
                                                            : 'border-gray-700 hover:border-gray-600'
                                                    } ${isDragging ? 'opacity-40 scale-[0.99]' : 'opacity-100'}`}
                                                >
                                                    {/* Alça lateral de Drag-and-Drop (⋮⋮) */}
                                                    <button
                                                        type="button"
                                                        onMouseDown={() => setDragEnabledUid(item.uid)}
                                                        onMouseUp={() => setDragEnabledUid(null)}
                                                        className="p-1 text-gray-500 hover:text-emerald-400 cursor-grab active:cursor-grabbing flex-shrink-0 select-none"
                                                        title="Arraste para reordenar"
                                                        aria-label="Reordenar tópico"
                                                    >
                                                        <span className="text-sm font-bold tracking-tighter leading-none">⋮⋮</span>
                                                    </button>

                                                    {/* Badge numérica automática (01, 02, 03...) + preview hierárquico */}
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <span
                                                            className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-1 rounded-md bg-gray-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold tabular-nums"
                                                            title={`Posição na lista: ${seqBadge} | No Edital: ${item.displayNumber}`}
                                                        >
                                                            {seqBadge}
                                                        </span>
                                                        <span
                                                            className={`text-[11px] font-bold tabular-nums min-w-[2.1rem] text-center ${
                                                                item.isSubtopic ? 'text-emerald-300' : 'text-gray-400'
                                                            }`}
                                                            title="Numeração hierárquica no Edital Verticalizado"
                                                        >
                                                            {item.displayNumber}
                                                        </span>
                                                    </div>

                                                    {/* Campo de edição limpo (sem prefixos digitados) */}
                                                    <input
                                                        ref={(el) => {
                                                            inputRefs.current[item.uid] = el;
                                                        }}
                                                        type="text"
                                                        value={item.cleanName}
                                                        onChange={(e) => handleTopicNameChange(item.uid, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleInsertAt(index + 1, item.isSubtopic);
                                                            }
                                                        }}
                                                        placeholder={
                                                            item.isSubtopic
                                                                ? 'Nome do subtópico...'
                                                                : 'Nome do tópico...'
                                                        }
                                                        className="flex-1 min-w-0 bg-gray-700/80 border border-gray-600/80 text-gray-100 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
                                                    />

                                                    {/* Controle de Hierarquia (Subtópicos: ↳ / ↲) */}
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {item.isSubtopic ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleSubtopic(index, false)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-sm font-bold transition-colors cursor-pointer"
                                                                title="Promover a tópico principal (recuar para esquerda)"
                                                                aria-label="Promover a tópico principal"
                                                            >
                                                                ↲
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={index === 0}
                                                                onClick={() => handleToggleSubtopic(index, true)}
                                                                className={`w-7 h-7 flex items-center justify-center rounded-md border text-sm font-bold transition-colors ${
                                                                    index === 0
                                                                        ? 'bg-gray-800/40 text-gray-600 border-gray-700/40 cursor-not-allowed'
                                                                        : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300 hover:text-emerald-300 border-gray-600/80 cursor-pointer'
                                                                }`}
                                                                title={
                                                                    index === 0
                                                                        ? 'O primeiro item deve ser um tópico principal'
                                                                        : 'Transformar em subtópico (recuar)'
                                                                }
                                                                aria-label="Transformar em subtópico"
                                                            >
                                                                ↳
                                                            </button>
                                                        )}

                                                        {/* Botão de exclusão */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAt(item.uid)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                            title="Remover tópico"
                                                            aria-label="Remover tópico"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Botão discreto "+" entre os cards para inserir exatamente nesta posição */}
                                                <div className="flex items-center justify-center group py-0.5">
                                                    <div className="h-px flex-1 bg-gray-700/40 group-hover:bg-emerald-500/40 transition-colors" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInsertAt(index + 1, false)}
                                                        className="mx-2 px-2 py-0.5 rounded-full bg-gray-800 hover:bg-emerald-500 text-gray-400 hover:text-white border border-gray-700 hover:border-emerald-400 text-[11px] font-bold flex items-center gap-1 opacity-55 group-hover:opacity-100 transition-all cursor-pointer"
                                                        title={`Inserir novo tópico na posição ${String(index + 2).padStart(2, '0')}`}
                                                    >
                                                        <PlusIcon className="w-3 h-3" />
                                                    </button>
                                                    <div className="h-px flex-1 bg-gray-700/40 group-hover:bg-emerald-500/40 transition-colors" />
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            )}
                        </div>

                        {/* Botão "+ Adicionar Tópico" ao final da lista */}
                        <div className="mt-3 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => handleInsertAt(topicItems.length, false)}
                                className="w-full py-2.5 px-4 rounded-lg border border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Adicionar Tópico</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-4 mt-6 pt-4 border-t border-gray-700 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors cursor-pointer"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDisciplineModal;