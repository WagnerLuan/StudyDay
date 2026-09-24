"use client";

import * as React from 'react';
import { PlayIcon, PauseIcon, PlusIcon, ClockIcon, ChevronDownIcon } from '../constants';

interface FloatingTimerProps {
    displayTime: number;
    isActive: boolean;
    isPaused: boolean;
    isMinimized: boolean;
    disciplineName: string;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onExpand: () => void;
    onToggleMinimize: () => void;
}

const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const FloatingTimer: React.FC<FloatingTimerProps> = ({
    displayTime, isActive, isPaused, isMinimized, disciplineName,
    onPause, onResume, onStop, onExpand, onToggleMinimize
}) => {
    const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const dragOffset = React.useRef({ x: 0, y: 0 });
    const hasMoved = React.useRef(false); // Para distinguir clique de arraste
    const timerRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    // Carregar posição salva
    React.useEffect(() => {
        const savedPos = localStorage.getItem('studyday_timer_position');
        if (savedPos) {
            try {
                setPosition(JSON.parse(savedPos));
            } catch (e) {
                console.error("Erro ao carregar posição do timer", e);
            }
        }
    }, []);

    // Salvar posição ao finalizar arraste
    const savePosition = (pos: { x: number; y: number }) => {
        localStorage.setItem('studyday_timer_position', JSON.stringify(pos));
    };

    const handleStart = (clientX: number, clientY: number, target: HTMLElement) => {
        // No modo expandido, não arrastar se clicar em botões de controle internos
        if (!isMinimized && (target.closest('button') && !target.closest('.drag-handle'))) {
            return;
        }

        const element = isMinimized ? buttonRef.current : timerRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        setIsDragging(true);
        hasMoved.current = false;
    };

    const handleMove = React.useCallback((clientX: number, clientY: number) => {
        if (!isDragging) return;

        const element = isMinimized ? buttonRef.current : timerRef.current;
        if (!element) return;

        let newX = clientX - dragOffset.current.x;
        let newY = clientY - dragOffset.current.y;

        // Limites da tela (margem de 8px)
        const margin = 8;
        const maxX = window.innerWidth - element.offsetWidth - margin;
        const maxY = window.innerHeight - element.offsetHeight - margin;

        newX = Math.max(margin, Math.min(newX, maxX));
        newY = Math.max(margin, Math.min(newY, maxY));

        // Se moveu mais de 5 pixels, consideramos como arraste
        if (Math.abs(newX - (position?.x || 0)) > 5 || Math.abs(newY - (position?.y || 0)) > 5) {
            hasMoved.current = true;
        }

        setPosition({ x: newX, y: newY });
    }, [isDragging, isMinimized, position]);

    const handleEnd = React.useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            if (position) savePosition(position);
        }
    }, [isDragging, position]);

    // Listeners globais para movimento fluido
    React.useEffect(() => {
        if (isDragging) {
            const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
            const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
            const onEnd = () => handleEnd();

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onEnd);

            return () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onEnd);
                window.removeEventListener('touchmove', onTouchMove);
                window.removeEventListener('touchend', onEnd);
            };
        }
    }, [isDragging, handleMove, handleEnd]);

    if (!isActive) return null;

    const commonStyles: React.CSSProperties = position ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        margin: 0,
        zIndex: 100, // Aumentado para ficar sobre tudo
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab'
    } : {};

    if (isMinimized) {
        return (
            <button
                ref={buttonRef}
                onClick={(e) => {
                    // Só alterna se não foi um arraste
                    if (!hasMoved.current) {
                        onToggleMinimize();
                    }
                }}
                onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.target as HTMLElement)}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement)}
                style={commonStyles}
                className={`fixed bottom-6 right-6 bg-emerald-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-50 border-2 border-white/20 transition-transform hover:scale-110 ${!isDragging ? 'animate-bounce-slow' : ''}`}
                title="Expandir Cronômetro"
            >
                <ClockIcon className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-white"></span>
            </button>
        );
    }

    return (
        <div 
            ref={timerRef}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.target as HTMLElement)}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement)}
            style={commonStyles}
            className="fixed bottom-6 right-6 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl z-50 p-4 w-64 transform transition-all animate-fade-in"
        >
            <div className="flex justify-between items-center mb-2 drag-handle cursor-grab active:cursor-grabbing">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest truncate max-w-[140px] select-none">
                    {disciplineName || 'Estudando...'}
                </span>
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} 
                    className="text-gray-500 hover:text-white p-1"
                >
                    <ChevronDownIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex flex-col items-center gap-3">
                <p className="text-3xl font-mono font-bold text-white tracking-tighter select-none">
                    {formatTime(displayTime)}
                </p>

                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); isPaused ? onResume() : onPause(); }}
                        className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-600 transition-colors"
                    >
                        {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onStop(); }}
                        className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
                        title="Finalizar e Registrar"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExpand(); }}
                        className="text-xs font-bold text-gray-400 hover:text-emerald-400 transition-colors ml-2"
                    >
                        ABRIR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FloatingTimer;