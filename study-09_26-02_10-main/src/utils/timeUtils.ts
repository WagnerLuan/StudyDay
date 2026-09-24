export const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || timeStr === '-') return 0;

    // Tenta formatar HH:MM:SS ou HH:MM (de input type="time" ou timer)
    const colonMatch = timeStr.match(/(\d+):(\d+)(:(\d+))?/);
    if (colonMatch) {
        const hours = parseInt(colonMatch[1], 10) || 0;
        const minutes = parseInt(colonMatch[2], 10) || 0;
        const seconds = parseInt(colonMatch[4], 10) || 0; // colonMatch[4] é segundos se presente
        return hours * 60 + minutes + Math.round(seconds / 60); // Arredonda segundos para o minuto mais próximo
    }

    // Tenta formatar HHh MMm (de logs de histórico ou display formatado)
    let hours = 0, minutes = 0;
    const hMatch = timeStr.match(/(\d+)h/);
    const mMatch = timeStr.match(/(\d+)m/);
    if (hMatch) hours = parseInt(hMatch[1], 10);
    if (mMatch) minutes = parseInt(mMatch[1], 10);
    return hours * 60 + minutes;
};