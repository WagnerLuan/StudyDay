import * as React from 'react';
import { Discipline } from '../types';

interface AddDisciplineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (discipline: Partial<Discipline> & { name: string; totalTopics: number; color: string; topicsText?: string; weight: number; }) => void;
    disciplineToEdit?: Discipline | null;
}

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
                <div className="absolute z-10 w-72 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-4">
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
    const [topicsText, setTopicsText] = React.useState('');
    const [selectedColor, setSelectedColor] = React.useState(presetColors[6]);
    const [weight, setWeight] = React.useState<number | string>(1.0);

    React.useEffect(() => {
        if (isOpen) {
            if (disciplineToEdit) {
                setName(disciplineToEdit.name);
                setTopicsText(disciplineToEdit.topicsText || '');
                setSelectedColor(disciplineToEdit.color || presetColors[6]);
                setWeight(disciplineToEdit.weight || 1.0);
            } else {
                // Reset for new discipline
                setName('');
                setTopicsText('');
                setSelectedColor(presetColors[6]);
                setWeight(1.0);
            }
        }
    }, [isOpen, disciplineToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) {
            alert('O nome da disciplina é obrigatório.');
            return;
        }

        const totalTopics = topicsText.split('\n').filter(line => line.trim() !== '').length;

        onSave({
            id: disciplineToEdit?.id,
            name,
            totalTopics,
            color: selectedColor,
            topicsText: topicsText,
            weight: Number(weight) || 1.0,
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-3xl text-white transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-3xl font-bold text-center mb-8">{disciplineToEdit ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
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

                    <div>
                         <label htmlFor="discipline-topics" className="block text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">
                            Tópicos <span className="text-gray-400 font-normal normal-case">(use 2 espaços de indentação para subtópicos)</span>
                        </label>
                        <textarea
                            id="discipline-topics"
                            placeholder="Ex: 1. Direito Constitucional 1.1. Princípios Fundamentais 1.2. Direitos e Garantias Fundamentais"
                            rows={10}
                            value={topicsText}
                            onChange={(e) => setTopicsText(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500 resize-y"
                        ></textarea>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-4 mt-10">
                    <button 
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDisciplineModal;