import * as React from 'react';
import { StudySession } from '../../types';

export interface TimerState {
    mode: 'cronometro' | 'timer';
    isActive: boolean;
    isPaused: boolean;
    startTime: number | null; // Timestamp de quando iniciou/retomou
    accumulatedTime: number; // Segundos acumulados antes da última pausa
    timerDuration: number; // Duração total para o modo timer
    context: {
        planId: string | null;
        disciplineId: string | null;
        topicId: string | null;
        revisionId?: string;
    };
    isMinimized: boolean;
}

const STORAGE_KEY = 'studyday_timer_state';

const initialState: TimerState = {
    mode: 'cronometro',
    isActive: false,
    isPaused: true,
    startTime: null,
    accumulatedTime: 0,
    timerDuration: 30 * 60,
    context: { planId: null, disciplineId: null, topicId: null },
    isMinimized: false
};

export const useTimer = () => {
    const [state, setState] = React.useState<TimerState>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return initialState;
            }
        }
        return initialState;
    });

    const [displayTime, setDisplayTime] = React.useState(0);

    // Persistir estado sempre que mudar
    React.useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    // Atualizar o tempo de exibição baseado em timestamps
    React.useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        const updateDisplay = () => {
            if (state.isActive && !state.isPaused && state.startTime) {
                const now = Date.now();
                const elapsedSinceStart = Math.floor((now - state.startTime) / 1000);
                const totalElapsed = state.accumulatedTime + elapsedSinceStart;
                
                if (state.mode === 'cronometro') {
                    setDisplayTime(totalElapsed);
                } else {
                    const remaining = Math.max(0, state.timerDuration - totalElapsed);
                    setDisplayTime(remaining);
                    if (remaining === 0) {
                        setState(prev => ({ ...prev, isPaused: true, startTime: null, accumulatedTime: prev.timerDuration }));
                    }
                }
            } else {
                if (state.mode === 'cronometro') {
                    setDisplayTime(state.accumulatedTime);
                } else {
                    setDisplayTime(Math.max(0, state.timerDuration - state.accumulatedTime));
                }
            }
        };

        updateDisplay();
        interval = setInterval(updateDisplay, 1000);
        return () => clearInterval(interval);
    }, [state]);

    const startTimer = (context?: TimerState['context'], mode?: 'cronometro' | 'timer', duration?: number) => {
        setState(prev => ({
            ...prev,
            isActive: true,
            isPaused: false,
            startTime: Date.now(),
            mode: mode || prev.mode,
            timerDuration: duration || prev.timerDuration,
            context: context || prev.context,
            isMinimized: false
        }));
    };

    const pauseTimer = () => {
        if (state.startTime) {
            const now = Date.now();
            const elapsedSinceStart = Math.floor((now - state.startTime) / 1000);
            setState(prev => ({
                ...prev,
                isPaused: true,
                startTime: null,
                accumulatedTime: prev.accumulatedTime + elapsedSinceStart
            }));
        }
    };

    const resumeTimer = () => {
        setState(prev => ({
            ...prev,
            isPaused: false,
            startTime: Date.now()
        }));
    };

    const resetTimer = (newDuration?: number) => {
        setState(prev => ({
            ...prev,
            isActive: false,
            isPaused: true,
            startTime: null,
            accumulatedTime: 0,
            timerDuration: newDuration || prev.timerDuration
        }));
    };

    const stopTimer = () => {
        const finalTime = state.isActive && !state.isPaused && state.startTime 
            ? state.accumulatedTime + Math.floor((Date.now() - state.startTime) / 1000)
            : state.accumulatedTime;
            
        const context = { ...state.context };
        resetTimer();
        return { finalTime, context };
    };

    const setContext = (context: TimerState['context']) => {
        setState(prev => ({ ...prev, context }));
    };

    const setMinimized = (minimized: boolean) => {
        setState(prev => ({ ...prev, isMinimized: minimized }));
    };

    const setMode = (mode: 'cronometro' | 'timer') => {
        setState(prev => ({
            ...prev,
            mode,
            isActive: false,
            isPaused: true,
            startTime: null,
            accumulatedTime: 0
        }));
    };

    return {
        state,
        displayTime,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        stopTimer,
        setContext,
        setMinimized,
        setMode
    };
};