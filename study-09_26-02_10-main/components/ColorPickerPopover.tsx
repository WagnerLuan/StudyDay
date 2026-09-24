"use client";

import * as React from 'react';
import { ChevronDownIcon } from '../constants';

interface ColorPickerPopoverProps {
    onSelectColor: (color: string) => void;
    currentColor: string;
}

const QUICK_COLORS = [
    { name: 'Branco', value: '#FFFFFF' },
    { name: 'Verde', value: '#34D399' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Amarelo', value: '#F59E0B' },
];

// Utilitários de conversão de cor
const hexToRgb = (hex: string) => {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
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
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ onSelectColor, currentColor }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const [hsv, setHsv] = React.useState({ h: 0, s: 100, v: 100 });
    const [openUpwards, setOpenUpwards] = React.useState(false);
    
    const containerRef = React.useRef<HTMLDivElement>(null);
    const saturationRef = React.useRef<HTMLDivElement>(null);
    const hueRef = React.useRef<HTMLDivElement>(null);

    const { r, g, b } = hsvToRgb(hsv);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePopover = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUpwards(spaceBelow < 300); // Abre para cima se houver pouco espaço abaixo
        }
        setIsOpen(!isOpen);
    };

    const handleHsvChange = (newHsv: { h: number; s: number; v: number }) => {
        setHsv(newHsv);
        const newRgb = hsvToRgb(newHsv);
        onSelectColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    };

    const handleSaturationDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = saturationRef.current?.getBoundingClientRect();
        if (!rect) return;

        const move = (moveE: MouseEvent) => {
            const x = Math.max(0, Math.min(moveE.clientX - rect.left, rect.width));
            const y = Math.max(0, Math.min(moveE.clientY - rect.top, rect.height));
            handleHsvChange({ ...hsv, s: (x / rect.width) * 100, v: 100 - (y / rect.height) * 100 });
        };

        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
        move(e.nativeEvent);
    };

    const handleHueDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = hueRef.current?.getBoundingClientRect();
        if (!rect) return;

        const move = (moveE: MouseEvent) => {
            const x = Math.max(0, Math.min(moveE.clientX - rect.left, rect.width));
            handleHsvChange({ ...hsv, h: (x / rect.width) * 360 });
        };

        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
        move(e.nativeEvent);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={togglePopover}
                className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors flex flex-col items-center justify-center min-w-[36px]"
                title="Cor do Texto"
            >
                <span className="text-sm font-black leading-none">A</span>
                <div className="w-4 h-1 mt-0.5 rounded-full" style={{ backgroundColor: currentColor }}></div>
            </button>

            {isOpen && (
                <div 
                    className={`absolute ${openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-3 z-50 min-w-[200px] animate-fade-in`}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {/* Linha 1: Cores Rápidas */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                        {QUICK_COLORS.map(color => (
                            <button
                                key={color.value}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onSelectColor(color.value);
                                    setIsOpen(false);
                                }}
                                className="w-6 h-6 rounded-full border border-gray-600 hover:scale-110 transition-transform shadow-sm"
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                            />
                        ))}
                    </div>

                    {/* Linha 2: Botão Mais Cores */}
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full py-1.5 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-[10px] font-black text-emerald-400 uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-emerald-500/20"
                    >
                        <span>{showAdvanced ? '- Menos cores' : '+ Mais cores'}</span>
                        <ChevronDownIcon className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Seletor Avançado Compacto */}
                    {showAdvanced && (
                        <div className="mt-3 space-y-3 animate-fade-in border-t border-gray-700 pt-3">
                            <div 
                                ref={saturationRef}
                                onMouseDown={handleSaturationDrag}
                                className="w-full h-24 rounded-lg cursor-crosshair relative overflow-hidden"
                                style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
                            >
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, white, transparent)' }} />
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, black, transparent)' }} />
                                <div 
                                    className="absolute w-2.5 h-2.5 rounded-full border border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" 
                                    style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <div 
                                    ref={hueRef}
                                    onMouseDown={handleHueDrag}
                                    className="flex-grow h-2 rounded-full cursor-pointer relative"
                                    style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                                >
                                    <div 
                                        className="absolute w-3 h-3 bg-white rounded-full border border-gray-400 shadow-md transform -translate-x-1/2 -translate-y-1/4 pointer-events-none" 
                                        style={{ left: `${(hsv.h / 360) * 100}%` }}
                                    />
                                </div>
                                <div className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: currentColor }}></div>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { label: 'R', val: r },
                                    { label: 'G', val: g },
                                    { label: 'B', val: b }
                                ].map(item => (
                                    <div key={item.label} className="text-center">
                                        <div className="bg-gray-900 border border-gray-700 rounded py-0.5 text-[10px] font-bold text-gray-300">
                                            {item.val}
                                        </div>
                                        <span className="text-[8px] font-black text-gray-500 uppercase">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ColorPickerPopover;