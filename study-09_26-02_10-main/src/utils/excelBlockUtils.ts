import * as XLSX from 'xlsx';
import { StudyPlan, StudyBlock } from '../../types';

export interface ParsedBlockImport {
    dayOfWeek: number; // 0 (Domingo) - 6 (Sábado)
    dayName: string;   // Ex: 'Segunda', 'Terça'
    dateStr?: string;  // Ex: '2026-11-09' (YYYY-MM-DD)
    dateDisplay?: string; // Ex: '09/11/2026'
    planId: string;
    planName: string;
    disciplineId: string;
    disciplineName: string;
    topicId?: string;
    topicName: string;
    durationMinutes: number;
    startTime?: string; // HH:MM
    endTime?: string;   // HH:MM
    timeRange?: string; // Ex: '20:00–20:50'
    categories: string[]; // Ex: ['Teoria']
    name?: string; // Observações ou nome do tópico
    rowNumber: number;
}

export interface BlockImportParseResult {
    blocks: ParsedBlockImport[];
    errors: string[];
    summaryByDay: Record<string, number>;
}

export const VALID_BLOCK_CATEGORIES = [
    'Teoria',
    'Revisão',
    'Questões',
    'Leitura de Lei',
    'Jurisprudência',
    'Vídeoaulas'
];

/**
 * Normaliza o texto removendo acentos e espaços extras para comparação flexível
 */
export const normalizeText = (text: any): string => {
    if (!text || typeof text !== 'string') return '';
    return text
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Converte variações textuais do dia da semana em número (0=Domingo, 1=Segunda ... 6=Sábado)
 */
export const parseDayOfWeek = (rawDay: any): { dayId: number; name: string } | null => {
    if (rawDay === undefined || rawDay === null) return null;

    // Se já for numérico (ex: 0, 1, 2... ou 1-7)
    if (typeof rawDay === 'number' && !isNaN(rawDay)) {
        if (rawDay >= 0 && rawDay <= 6) {
            const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return { dayId: rawDay, name: names[rawDay] };
        }
    }

    const clean = normalizeText(String(rawDay));
    if (!clean) return null;

    if (clean.includes('seg') || clean.startsWith('2')) {
        return { dayId: 1, name: 'Segunda' };
    }
    if (clean.includes('ter') || clean.startsWith('3')) {
        return { dayId: 2, name: 'Terça' };
    }
    if (clean.includes('qua') || clean.startsWith('4')) {
        return { dayId: 3, name: 'Quarta' };
    }
    if (clean.includes('qui') || clean.startsWith('5')) {
        return { dayId: 4, name: 'Quinta' };
    }
    if (clean.includes('sex') || clean.startsWith('6')) {
        return { dayId: 5, name: 'Sexta' };
    }
    if (clean.includes('sab') || clean.startsWith('7')) {
        return { dayId: 6, name: 'Sábado' };
    }
    if (clean.includes('dom') || clean.startsWith('1') || clean === 'domingo') {
        return { dayId: 0, name: 'Domingo' };
    }

    return null;
};

/**
 * Faz a leitura de datas vindas do Excel nos formatos:
 * - Serial number do Excel (ex: 46335)
 * - DD/MM/AAAA ou DD-MM-AAAA
 * - AAAA-MM-DD
 */
export const parseExcelDate = (rawDate: any): { dateStr: string; dateDisplay: string; dayOfWeek: number } | null => {
    if (rawDate === undefined || rawDate === null || rawDate === '') return null;

    // 1. Número serial do Excel
    if (typeof rawDate === 'number') {
        const parsed = XLSX.SSF.parse_date_code(rawDate);
        if (parsed) {
            const y = parsed.y;
            const m = String(parsed.m).padStart(2, '0');
            const d = String(parsed.d).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            const dateObj = new Date(`${dateStr}T12:00:00`);
            return {
                dateStr,
                dateDisplay: `${d}/${m}/${y}`,
                dayOfWeek: dateObj.getDay()
            };
        }
    }

    // 2. String de Data
    const str = String(rawDate).trim();
    if (!str) return null;

    // Formato Brasileiro: DD/MM/AAAA ou DD-MM-AAAA
    const ptMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (ptMatch) {
        let y = parseInt(ptMatch[3], 10);
        if (y < 100) y += 2000;
        const m = ptMatch[2].padStart(2, '0');
        const d = ptMatch[1].padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const dateObj = new Date(`${dateStr}T12:00:00`);
        return {
            dateStr,
            dateDisplay: `${d}/${m}/${y}`,
            dayOfWeek: dateObj.getDay()
        };
    }

    // Formato ISO: AAAA-MM-DD
    const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (isoMatch) {
        const y = isoMatch[1];
        const m = isoMatch[2].padStart(2, '0');
        const d = isoMatch[3].padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const dateObj = new Date(`${dateStr}T12:00:00`);
        return {
            dateStr,
            dateDisplay: `${d}/${m}/${y}`,
            dayOfWeek: dateObj.getDay()
        };
    }

    return null;
};

/**
 * Normaliza e analisa o horário (início e fim) e a duração
 * Suporta formatos:
 * - Intervalo: "20:00–20:50", "20:00 - 20:50", "20:00 as 20:50", "20h00 às 20h50"
 * - Início único: "20:00", "08:00", "8"
 * - Número fracionário do Excel
 */
export const parseTimeAndDuration = (
    rawTime: any, 
    rawDuration: any
): { 
    startTime?: string; 
    endTime?: string; 
    timeRange?: string; 
    durationMinutes: number; 
} => {
    let startTime: string | undefined = undefined;
    let endTime: string | undefined = undefined;
    let durationMinutes = 60;

    // 1. Analisa duração pré-existente
    if (rawDuration !== undefined && rawDuration !== null && String(rawDuration).trim() !== '') {
        const num = parseInt(String(rawDuration).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0) {
            durationMinutes = num;
        }
    }

    // 2. Analisa o horário
    if (rawTime !== undefined && rawTime !== null && String(rawTime).trim() !== '') {
        // Se o Excel importou como fração de dia (ex: 0.5 = 12:00)
        if (typeof rawTime === 'number') {
            const totalMinutes = Math.round(rawTime * 24 * 60);
            const hours = Math.floor(totalMinutes / 60) % 24;
            const minutes = totalMinutes % 60;
            startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } else {
            const str = String(rawTime).trim();

            // Padrão de intervalo: "20:00–20:50", "20:00 - 20:50", "20:00 às 20:50", "20h00 a 20h50"
            const rangeMatch = str.match(/(\d{1,2})[:h](\d{2})\s*(?:[-–—]|às|a)\s*(\d{1,2})[:h](\d{2})/i);
            if (rangeMatch) {
                const h1 = Math.min(23, Math.max(0, parseInt(rangeMatch[1], 10)));
                const m1 = Math.min(59, Math.max(0, parseInt(rangeMatch[2], 10)));
                const h2 = Math.min(23, Math.max(0, parseInt(rangeMatch[3], 10)));
                const m2 = Math.min(59, Math.max(0, parseInt(rangeMatch[4], 10)));

                startTime = `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}`;
                endTime = `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;

                const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                // Se a diferença for válida e positiva, usa a diferença como duração calculada
                if (diff > 0) {
                    durationMinutes = diff;
                }
            } else {
                // Horário de início único (ex: "08:00", "08:30:00")
                const singleMatch = str.match(/^(\d{1,2})[:h](\d{2})/i);
                if (singleMatch) {
                    const h = Math.min(23, Math.max(0, parseInt(singleMatch[1], 10)));
                    const m = Math.min(59, Math.max(0, parseInt(singleMatch[2], 10)));
                    startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                } else if (/^\d{1,2}$/.test(str)) {
                    // Apenas hora redonda ex: "8", "20"
                    const h = Math.min(23, Math.max(0, parseInt(str, 10)));
                    startTime = `${String(h).padStart(2, '0')}:00`;
                }
            }
        }
    }

    // 3. Se temos início e duração, calcula o horário de término se ainda não tiver
    if (startTime && !endTime && durationMinutes > 0) {
        const [h, m] = startTime.split(':').map(Number);
        const endTotal = h * 60 + m + durationMinutes;
        const endH = Math.floor(endTotal / 60) % 24;
        const endM = endTotal % 60;
        endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    const timeRange = startTime && endTime ? `${startTime}–${endTime}` : startTime;

    return {
        startTime,
        endTime,
        timeRange,
        durationMinutes
    };
};

/**
 * Normaliza a categoria informada na planilha ou atribui 'Teoria' como fallback
 */
export const normalizeCategory = (rawCategory: any): string[] => {
    if (!rawCategory) return ['Teoria'];

    const clean = normalizeText(String(rawCategory));
    if (!clean) return ['Teoria'];

    for (const validCat of VALID_BLOCK_CATEGORIES) {
        const normValid = normalizeText(validCat);
        if (clean === normValid || clean.includes(normValid)) {
            return [validCat];
        }
    }

    // Variações comuns
    if (clean.includes('video') || clean.includes('aula')) return ['Vídeoaulas'];
    if (clean.includes('lei') || clean.includes('legislacao')) return ['Leitura de Lei'];
    if (clean.includes('juris') || clean.includes('sumula')) return ['Jurisprudência'];
    if (clean.includes('quest') || clean.includes('exercic')) return ['Questões'];
    if (clean.includes('revis')) return ['Revisão'];
    if (clean.includes('teor')) return ['Teoria'];

    return ['Teoria'];
};

/**
 * Encontra a chave de um objeto a partir de sinônimos/aliases de coluna
 */
const findColumnValue = (row: Record<string, any>, possibleNames: string[]): any => {
    const keys = Object.keys(row);
    for (const name of possibleNames) {
        const targetNorm = normalizeText(name);
        const matchedKey = keys.find(k => {
            const kNorm = normalizeText(k);
            return kNorm === targetNorm || kNorm.includes(targetNorm);
        });
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            const val = row[matchedKey];
            if (typeof val === 'string' && val.trim() === '') continue;
            return val;
        }
    }
    return undefined;
};

/**
 * Faz a leitura e validação estrita do arquivo Excel de Blocos de Estudo
 */
export const parseExcelToStudyBlocks = async (
    file: File,
    userPlans: StudyPlan[]
): Promise<BlockImportParseResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('A planilha enviada não contém nenhuma aba legível.');
                }

                // Usa a primeira aba
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Converte para JSON com cabeçalho
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (rawRows.length === 0) {
                    throw new Error('A planilha selecionada está vazia. Adicione os blocos de estudo e tente novamente.');
                }

                const errors: string[] = [];
                const parsedBlocks: ParsedBlockImport[] = [];
                const summaryByDay: Record<string, number> = {
                    'Segunda': 0,
                    'Terça': 0,
                    'Quarta': 0,
                    'Quinta': 0,
                    'Sexta': 0,
                    'Sábado': 0,
                    'Domingo': 0
                };

                const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

                // Cria índices rápidos para planos e disciplinas do usuário
                const plansNormalized = userPlans.map(p => ({
                    plan: p,
                    normName: normalizeText(p.name)
                }));

                rawRows.forEach((row, index) => {
                    const rowNumber = index + 2; // Linha 1 é o cabeçalho no Excel

                    // Extração dos valores com suporte a sinônimos
                    const rawDate = findColumnValue(row, ['Data', 'Data do Bloco', 'Data Estudo']);
                    const rawDay = findColumnValue(row, ['Dia da Semana', 'Dia', 'Dia Semana']);
                    const rawPlan = findColumnValue(row, ['Plano de Estudo', 'Plano', 'Nome do Plano', 'Concurso']);
                    const rawDiscipline = findColumnValue(row, ['Disciplina', 'Matéria', 'Materia']);
                    const rawTopic = findColumnValue(row, ['Tópico', 'Topico', 'Assunto', 'Conteúdo', 'Conteudo']);
                    const rawDuration = findColumnValue(row, ['Duração (min)', 'Duracao (min)', 'Duração', 'Duracao', 'Tempo (min)', 'Minutos']);
                    const rawTime = findColumnValue(row, ['Horário', 'Horario', 'Horário (Início - Fim)', 'Horario (Inicio - Fim)', 'Hora', 'Início', 'Inicio']);
                    const rawCategory = findColumnValue(row, ['Categoria', 'Tipo', 'Modalidade']);

                    // Se a linha inteira for vazia, desconsidera
                    if (!rawDate && !rawDay && !rawPlan && !rawDiscipline && !rawTopic && !rawDuration && !rawTime) {
                        return;
                    }

                    // Tenta obter a data específica
                    const parsedDate = parseExcelDate(rawDate);

                    // Validação do Dia da Semana (pode vir da coluna 'Dia da Semana' ou inferido da 'Data')
                    let parsedDay = parseDayOfWeek(rawDay);
                    if (!parsedDay && parsedDate) {
                        parsedDay = {
                            dayId: parsedDate.dayOfWeek,
                            name: dayNames[parsedDate.dayOfWeek]
                        };
                    }

                    const missingFields: string[] = [];

                    if (!parsedDay) missingFields.push("'Dia da Semana' (ou 'Data')");
                    if (!rawPlan || String(rawPlan).trim() === '') missingFields.push("'Plano de Estudo'");
                    if (!rawDiscipline || String(rawDiscipline).trim() === '') missingFields.push("'Disciplina'");
                    if (!rawTopic || String(rawTopic).trim() === '') missingFields.push("'Tópico'");

                    // Processa Horário e Duração (se tiver intervalo ex: 20:00–20:50, calcula a duração automaticamente)
                    const timeAndDuration = parseTimeAndDuration(rawTime, rawDuration);

                    if (!timeAndDuration.durationMinutes || timeAndDuration.durationMinutes <= 0) {
                        missingFields.push("'Duração (min)' ou 'Horário'");
                    }

                    if (missingFields.length > 0) {
                        errors.push(`Linha ${rowNumber}: Falta preencher ${missingFields.join(', ')}.`);
                        return;
                    }

                    // Correspondência do Plano de Estudo
                    const planStrNorm = normalizeText(String(rawPlan));
                    const matchedPlanObj = plansNormalized.find(p => p.normName === planStrNorm);

                    if (!matchedPlanObj) {
                        const availablePlansList = userPlans.map(p => `"${p.name}"`).join(', ');
                        errors.push(`Linha ${rowNumber}: Plano "${rawPlan}" não encontrado. Seus planos cadastrados são: ${availablePlansList || 'nenhum plano cadastrado'}.`);
                        return;
                    }

                    const targetPlan = matchedPlanObj.plan;

                    // Correspondência da Disciplina no Plano
                    const discStrNorm = normalizeText(String(rawDiscipline));
                    const matchedDisc = (targetPlan.disciplines || []).find(d => normalizeText(d.name) === discStrNorm);

                    if (!matchedDisc) {
                        const availableDiscs = (targetPlan.disciplines || []).map(d => `"${d.name}"`).join(', ');
                        errors.push(`Linha ${rowNumber}: Disciplina "${rawDiscipline}" não encontrada no plano "${targetPlan.name}". Disciplinas disponíveis: ${availableDiscs || 'nenhuma disciplina cadastrada'}.`);
                        return;
                    }

                    // Tópico correspondente (busca se já existe tópico cadastrado para vincular topic_id)
                    const topicStr = String(rawTopic).trim();
                    const topicStrNorm = normalizeText(topicStr);
                    const matchedTopic = (matchedDisc.topicsList || []).find(t => normalizeText(t.name) === topicStrNorm);

                    const categories = normalizeCategory(rawCategory);

                    parsedBlocks.push({
                        dayOfWeek: parsedDay!.dayId,
                        dayName: parsedDay!.name,
                        dateStr: parsedDate?.dateStr,
                        dateDisplay: parsedDate?.dateDisplay,
                        planId: targetPlan.id,
                        planName: targetPlan.name,
                        disciplineId: matchedDisc.id,
                        disciplineName: matchedDisc.name,
                        topicId: matchedTopic?.id,
                        topicName: topicStr,
                        durationMinutes: timeAndDuration.durationMinutes,
                        startTime: timeAndDuration.startTime,
                        endTime: timeAndDuration.endTime,
                        timeRange: timeAndDuration.timeRange,
                        categories,
                        name: topicStr,
                        rowNumber
                    });

                    if (summaryByDay[parsedDay!.name] !== undefined) {
                        summaryByDay[parsedDay!.name]++;
                    }
                });

                if (parsedBlocks.length === 0 && errors.length === 0) {
                    errors.push('Nenhum bloco de estudo válido encontrado no arquivo.');
                }

                resolve({
                    blocks: parsedBlocks,
                    errors,
                    summaryByDay
                });
            } catch (err: any) {
                reject(err);
            }
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo selecionado. Tente novamente.'));
        };

        reader.readAsArrayBuffer(file);
    });
};

/**
 * Gera e faz download da planilha modelo de Planejamento Semanal por Blocos (.xlsx)
 * Agora inclui Data e Horário com início e fim (ex: 20:00–20:50 | 21:00–21:50)
 */
export const downloadBlockExcelTemplate = (plans?: StudyPlan[]): void => {
    const wb = XLSX.utils.book_new();

    // Obtém exemplos reais caso o usuário já tenha planos cadastrados
    const samplePlan = plans && plans.length > 0 ? plans[0].name : 'GCM MONTE ALEGRE';
    const sampleDisc1 = plans && plans[0]?.disciplines?.[0]?.name ? plans[0].disciplines[0].name : 'ATUALIDADES';
    const sampleTopic1 = plans && plans[0]?.disciplines?.[0]?.topicsList?.[0]?.name 
        ? plans[0].disciplines[0].topicsList[0].name 
        : '1. Conhecimentos marcantes do cenário cultural, político e econômico';

    const sampleDisc2 = plans && plans[0]?.disciplines?.[1]?.name ? plans[0].disciplines[1].name : 'LÍNGUA PORTUGUESA';
    const sampleTopic2 = plans && plans[0]?.disciplines?.[1]?.topicsList?.[0]?.name 
        ? plans[0].disciplines[1].topicsList[0].name 
        : '1. Questões Variadas (Qconcursos/Gramatique/Vídeo resolução)';

    // Calcula as datas da próxima semana como exemplo
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0-6
    const mondayDiff = today.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(mondayDiff));

    const formatDateBR = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const getDateForDay = (offsetDays: number) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + offsetDays);
        return formatDateBR(d);
    };

    const templateRows: any[][] = [
        ['Data', 'Dia da Semana', 'Plano de Estudo', 'Disciplina', 'Tópico', 'Duração (min)', 'Horário', 'Categoria'],
        [getDateForDay(0), 'Segunda', samplePlan, sampleDisc1, sampleTopic1, 50, '20:00–20:50', 'Teoria'],
        [getDateForDay(0), 'Segunda', samplePlan, sampleDisc2, sampleTopic2, 50, '21:00–21:50', 'Questões'],
        [getDateForDay(1), 'Terça', samplePlan, sampleDisc1, 'Nacionalidade e Direitos Políticos', 50, '20:00–20:50', 'Revisão'],
        [getDateForDay(1), 'Terça', samplePlan, sampleDisc2, 'Sintaxe e Concordância Verbal', 50, '21:00–21:50', 'Teoria'],
        [getDateForDay(2), 'Quarta', samplePlan, sampleDisc1, 'Administração Pública (Arts. 37 a 41)', 50, '20:00–20:50', 'Leitura de Lei'],
        [getDateForDay(3), 'Quinta', samplePlan, sampleDisc2, 'Pontuação e Emprego da Crase', 50, '20:00–20:50', 'Vídeoaulas'],
        [getDateForDay(4), 'Sexta', samplePlan, sampleDisc1, sampleTopic1, 50, '20:00–20:50', 'Questões'],
        [getDateForDay(5), 'Sábado', samplePlan, sampleDisc1, 'Revisão Semanal de Artigos', 90, '09:00–10:30', 'Revisão'],
        [getDateForDay(6), 'Domingo', samplePlan, sampleDisc2, 'Simulado Geral de Questões', 120, '14:00–16:00', 'Questões'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateRows);

    ws['!cols'] = [
        { wch: 14 }, // Data
        { wch: 16 }, // Dia da Semana
        { wch: 24 }, // Plano de Estudo
        { wch: 28 }, // Disciplina
        { wch: 55 }, // Tópico
        { wch: 15 }, // Duração (min)
        { wch: 18 }, // Horário (ex: 20:00–20:50)
        { wch: 18 }, // Categoria
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rotina Semanal');

    // Aba de orientações e regras
    const guideRows: any[][] = [
        ['ORIENTAÇÕES PARA PREENCHIMENTO DO EXCEL DE BLOCOS SEMANAIS'],
        [''],
        ['1. COLUNAS DA PLANILHA:'],
        ['   - Data (Opcional): Data específica do estudo no formato DD/MM/AAAA (ex: 09/11/2026).'],
        ['   - Dia da Semana (Obrigatório se sem data): Segunda, Terça, Quarta, Quinta, Sexta, Sábado ou Domingo.'],
        ['   - Plano de Estudo (Obrigatório): Nome exato do plano cadastrado no sistema (ex: GCM MONTE ALEGRE, PPPE).'],
        ['   - Disciplina (Obrigatório): Nome exato da disciplina cadastrada no respectivo plano.'],
        ['   - Tópico (Obrigatório): Nome do assunto/tópico do edital ou atividade (não pode ficar em branco).'],
        ['   - Duração (min): Duração em minutos (ex: 50, 60, 90). Pode ser calculada automaticamente se informado o horário início-fim.'],
        ['   - Horário (Opcional): Intervalo início e fim como "20:00–20:50" ou "21:00–21:50", ou apenas início "20:00".'],
        ['   - Categoria (Opcional): Teoria, Revisão, Questões, Leitura de Lei, Jurisprudência, Vídeoaulas (padrão: Teoria).'],
        [''],
        ['2. EXEMPLOS DE HORÁRIOS SUPORTADOS:'],
        ['   - Intervalo com traço: 20:00–20:50 ou 20:00 - 20:50'],
        ['   - Intervalo com texto: 20:00 às 20:50 ou 21h00 a 21h50'],
        ['   - Horário único: 08:00, 14:30'],
        [''],
        ['3. SEUS PLANOS E DISCIPLINAS CADASTRADOS:'],
    ];

    if (plans && plans.length > 0) {
        plans.forEach(p => {
            guideRows.push([`   Plano: "${p.name}"`]);
            (p.disciplines || []).forEach(d => {
                guideRows.push([`     - Disciplina: "${d.name}" (${(d.topicsList || []).length} tópicos cadastrados)`]);
            });
        });
    } else {
        guideRows.push(['   Nenhum plano cadastrado no momento. Cadastre primeiro o seu plano de estudos no sistema.']);
    }

    const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 85 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Instruções');

    const fileName = `Modelo_Importacao_Blocos_Semanais.xlsx`;
    XLSX.writeFile(wb, fileName);
};
