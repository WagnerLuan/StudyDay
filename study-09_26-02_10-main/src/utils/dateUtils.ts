export const formatDateToDisplay = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;

    // Check if it's already in DD/MM/YYYY format
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return dateString;
    }
    
    // Assume YYYY-MM-DD format (from database)
    const date = new Date(dateString + 'T00:00:00'); // Add T00:00:00 to avoid timezone issues
    if (isNaN(date.getTime())) return null; // Invalid date

    return date.toLocaleDateString('pt-BR');
};

export const parseDate = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    date.setHours(0, 0, 0, 0); // Ensure local midnight
    return date;
};

export const getTodayAsYYYYMMDDLocal = (): string => {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(new Date());
    } catch {
        const [day, month, year] = new Date()
            .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            .split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
};

export const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};