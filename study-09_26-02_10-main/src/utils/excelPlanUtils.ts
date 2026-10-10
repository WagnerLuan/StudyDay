import * as XLSX from 'xlsx';
import { StudyPlan, TopicIncidence } from '../../types';

export interface ParsedTopicImport {
    name: string;
    incidence: TopicIncidence;
}

export interface ParsedDisciplineImport {
    name: string;
    topics: string[];
    topicsWithMetadata: ParsedTopicImport[];
    topicsText: string;
    color: string;
    weight: number;
}

export const PRESET_DISCIPLINE_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#EF4444', // Red
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#A855F7', // Violet
    '#84CC16', // Lime
    '#D946EF', // Fuchsia
    '#0EA5E9', // Sky
];

/**
 * Normaliza o valor de incidência lido do Excel para os valores suportados pelo sistema:
 * - 'Muito Alta'
 * - 'Alta'
 * - 'Média' (Padrão/Fallback)
 * - 'Baixa'
 * - 'Muito Baixa'
 */
export const normalizeIncidence = (val: any): TopicIncidence => {
    if (!val || typeof val !== 'string') return 'Média';
    const clean = val.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (clean === 'MUITO ALTA' || clean === 'MUITO_ALTA' || clean === 'VERY HIGH') return 'Muito Alta';
    if (clean === 'ALTA' || clean === 'HIGH') return 'Alta';
    if (clean === 'MEDIA' || clean === 'MEDIUM' || clean === 'MODERADA') return 'Média';
    if (clean === 'MUITO BAIXA' || clean === 'MUITO_BAIXA' || clean === 'VERY LOW') return 'Muito Baixa';
    if (clean === 'BAIXA' || clean === 'LOW') return 'Baixa';

    return 'Média';
};

/**
 * Normaliza o nome da disciplina retirando prefixos e pontuações comuns
 */
const cleanDisciplineName = (rawName: string): string => {
    let name = rawName.trim();
    // Remove prefixos comuns como "Disciplina:", "Matéria:", "Assunto / tópico do edital -"
    name = name.replace(/^(?:assunto\s*\/\s*t[oó]pico(?:\s*do\s*edital)?|edital\s*verticalizado|disciplina|mat[eé]ria)\s*[-:–—]\s*/i, '');
    name = name.replace(/^[-:–—\s]+|[-:–—\s]+$/g, '');
    return name.trim();
};

/**
 * Detecta se uma string ou linha representa o cabeçalho de uma disciplina
 */
const extractDisciplineFromHeader = (text: string): string | null => {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();
    if (!clean) return null;

    // Padrão 1: "Assunto / tópico do edital - [NOME]" ou "Assunto / Tópico - [NOME]" ou variações
    const matchPrefix = clean.match(/(?:assunto\s*\/\s*t[oó]pico(?:\s*do\s*edital)?|edital\s*verticalizado|disciplina|mat[eé]ria)\s*[-:–—]\s*(.+)/i);
    if (matchPrefix && matchPrefix[1]?.trim()) {
        return cleanDisciplineName(matchPrefix[1]);
    }

    // Padrão 2: "[NOME] - Assunto / tópico do edital"
    const matchSuffix = clean.match(/^([^-–—:]+)\s*[-:–—]\s*(?:assunto\s*\/\s*t[oó]pico|edital\s*verticalizado)/i);
    if (matchSuffix && matchSuffix[1]?.trim()) {
        return cleanDisciplineName(matchSuffix[1]);
    }

    // Padrão 3: Linhas que começam com "DISCIPLINA:" ou "MATÉRIA:"
    const matchColon = clean.match(/^(?:disciplina|mat[eé]ria)\s*:\s*(.+)/i);
    if (matchColon && matchColon[1]?.trim()) {
        return cleanDisciplineName(matchColon[1]);
    }

    return null;
};

/**
 * Verifica se a linha é um cabeçalho de colunas comum (ex: Nº | Assunto / tópico | Incidência)
 */
const isTableColumnsHeader = (rowValues: string[]): boolean => {
    const combined = rowValues.join(' ').toLowerCase();
    const hasNumberCol = /\b(nº|n[uú]mero|item|ordem|#)\b/.test(combined);
    const hasTopicCol = /\b(assunto|t[oó]pico|conte[uú]do|descri[cç][aã]o|mat[eé]ria)\b/.test(combined);
    return hasTopicCol && (hasNumberCol || /\b(incid[eê]ncia|status|revis[aã]o|teoria)\b/.test(combined));
};

/**
 * Formata um array de tópicos brutos no formato numerado '1. Tópico A\n2. Tópico B'
 */
export const formatTopicsToNumberedText = (topics: string[]): string => {
    return topics.map((t, idx) => {
        const trimmed = t.trim();
        // Se já começa com numeração (ex: "1.", "1.1.", "2.3"), preserva
        if (/^\s*\d+(\.\d+)*\./.test(trimmed)) {
            return trimmed;
        }
        return `${idx + 1}. ${trimmed}`;
    }).join('\n');
};

/**
 * Processa um arquivo Excel (.xlsx / .xls) e extrai disciplinas, tópicos e incidências
 */
export const parseExcelToPlanDisciplines = async (file: File): Promise<ParsedDisciplineImport[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('A planilha está vazia ou não contém abas legíveis.');
    }

    const disciplinesMap = new Map<string, ParsedTopicImport[]>();

    // Varrer cada aba do arquivo
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        // Converter em matriz 2D (array de linhas)
        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rawRows || rawRows.length === 0) continue;

        // 1. Verificar se a planilha é no formato tabular clássico:
        // Colunas "Nº", "Disciplina", "Tópico" e opcional "Incidência"
        let discColIndex = -1;
        let topicColIndex = -1;
        let itemColIndex = -1;
        let incColIndex = -1;
        let headerRowIndex = -1;

        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
            const row = rawRows[r].map(cell => String(cell || '').trim().toLowerCase());
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (/\b(disciplina|mat[eé]ria)\b/.test(cell) && discColIndex === -1) {
                    discColIndex = c;
                }
                if (/\b(assunto|t[oó]pico|conte[uú]do)\b/.test(cell) && topicColIndex === -1) {
                    topicColIndex = c;
                }
                if (/\b(nº|n[uú]mero|item|#)\b/.test(cell) && itemColIndex === -1) {
                    itemColIndex = c;
                }
                if (/\b(incid[eê]ncia|import[aâ]ncia|prioridade|relev[aâ]ncia)\b/.test(cell) && incColIndex === -1) {
                    incColIndex = c;
                }
            }
            if (discColIndex !== -1 && topicColIndex !== -1) {
                headerRowIndex = r;
                break;
            }
        }

        // Se encontrou formato tabular com colunas explícitas "Disciplina" e "Tópico":
        if (discColIndex !== -1 && topicColIndex !== -1) {
            for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                const rawDisc = String(row[discColIndex] || '').trim();
                const rawTopic = String(row[topicColIndex] || '').trim();
                const rawItem = itemColIndex !== -1 ? String(row[itemColIndex] || '').trim() : '';
                const rawIncidence = incColIndex !== -1 ? row[incColIndex] : undefined;

                if (!rawDisc || !rawTopic) continue;

                const discName = cleanDisciplineName(rawDisc);
                if (!discName) continue;

                let topicText = rawTopic;
                if (rawItem && !/^\s*\d+(\.\d+)*\./.test(rawTopic)) {
                    topicText = `${rawItem.replace(/\.$/, '')}. ${rawTopic}`;
                }

                const incidence = normalizeIncidence(rawIncidence);

                if (!disciplinesMap.has(discName)) {
                    disciplinesMap.set(discName, []);
                }
                disciplinesMap.get(discName)!.push({
                    name: topicText,
                    incidence,
                });
            }
            continue; // Próxima aba
        }

        // 2. Processar pelo formato de Edital Verticalizado por Seções/Blocos
        let currentDiscipline: string | null = null;
        let blockIncColIndex = -1;

        // Se o nome da aba indicar uma disciplina específica
        const isGenericSheet = /^(sheet\d*|planilha\d*|edital|resumo|dados|capa|menu)$/i.test(sheetName.trim());
        if (!isGenericSheet && workbook.SheetNames.length > 1) {
            currentDiscipline = cleanDisciplineName(sheetName);
            if (!disciplinesMap.has(currentDiscipline)) {
                disciplinesMap.set(currentDiscipline, []);
            }
        }

        for (let r = 0; r < rawRows.length; r++) {
            const row = rawRows[r].map(c => String(c ?? '').trim());
            // Linha vazia
            if (row.every(c => c === '')) continue;

            const nonEmpties = row.filter(c => c !== '');
            const firstCell = nonEmpties[0] || '';
            const fullRowText = nonEmpties.join(' - ');

            // Checar se é cabeçalho de disciplina
            const foundDiscipline = extractDisciplineFromHeader(firstCell) || extractDisciplineFromHeader(fullRowText);
            if (foundDiscipline) {
                currentDiscipline = foundDiscipline;
                blockIncColIndex = -1; // resetar detecção de coluna para a nova seção
                if (!disciplinesMap.has(currentDiscipline)) {
                    disciplinesMap.set(currentDiscipline, []);
                }
                continue;
            }

            // Checar se a primeira célula é toda em maiúsculas com comprimento razoável
            // Ex: "LÍNGUA PORTUGUESA", "DIREITO CONSTITUCIONAL"
            if (
                nonEmpties.length <= 3 &&
                firstCell.length >= 3 &&
                firstCell.length <= 60 &&
                firstCell === firstCell.toUpperCase() &&
                !/^\d/.test(firstCell) &&
                !isTableColumnsHeader(nonEmpties) &&
                !/\b(status|revis[aã]o|quest[oõ]es|teoria|nº|data|total|incid[eê]ncia)\b/i.test(firstCell)
            ) {
                const nextRow = rawRows[r + 1] ? rawRows[r + 1].map(c => String(c ?? '').trim()) : [];
                if (isTableColumnsHeader(nextRow) || nonEmpties.length === 1) {
                    currentDiscipline = cleanDisciplineName(firstCell);
                    blockIncColIndex = -1;
                    if (!disciplinesMap.has(currentDiscipline)) {
                        disciplinesMap.set(currentDiscipline, []);
                    }
                    continue;
                }
            }

            // Se for linha de cabeçalho de colunas (ex: "Nº | Assunto | Incidência")
            if (isTableColumnsHeader(nonEmpties)) {
                // Identificar em qual coluna está o cabeçalho de Incidência dentro da seção
                for (let c = 0; c < row.length; c++) {
                    if (/\b(incid[eê]ncia|import[aâ]ncia|prioridade|relev[aâ]ncia)\b/i.test(row[c])) {
                        blockIncColIndex = c;
                        break;
                    }
                }
                continue;
            }

            // Se estamos dentro de uma disciplina, coletar o tópico e incidência
            if (currentDiscipline) {
                let topicStr = '';
                let detectedIncidence: TopicIncidence | null = null;

                // Se identificamos coluna de incidência no cabeçalho do bloco
                if (blockIncColIndex !== -1 && row[blockIncColIndex]) {
                    detectedIncidence = normalizeIncidence(row[blockIncColIndex]);
                }

                // Identificar incidência explicitamente nos valores das células da linha
                const remainingCells: string[] = [];
                for (let i = 0; i < nonEmpties.length; i++) {
                    const cellVal = nonEmpties[i];
                    const cleanUpper = cellVal.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    if (!detectedIncidence && ['MUITO ALTA', 'ALTA', 'MEDIA', 'BAIXA', 'MUITO BAIXA'].includes(cleanUpper)) {
                        detectedIncidence = normalizeIncidence(cellVal);
                    } else {
                        remainingCells.push(cellVal);
                    }
                }

                // Montar o texto do tópico
                if (remainingCells.length >= 2 && /^\d+(\.\d+)*\.?$/.test(remainingCells[0])) {
                    const num = remainingCells[0].replace(/\.$/, '');
                    const desc = remainingCells.slice(1).join(' - ');
                    topicStr = `${num}. ${desc}`;
                } else if (remainingCells.length >= 1) {
                    topicStr = remainingCells.join(' - ');
                }

                // Filtrar linhas irrelevantes ou de rodapé
                if (
                    topicStr &&
                    topicStr.length >= 2 &&
                    !/^(total|resumo|subtotal|observa[cç][aã]o|legenda):?/i.test(topicStr)
                ) {
                    disciplinesMap.get(currentDiscipline)!.push({
                        name: topicStr,
                        incidence: detectedIncidence || 'Média', // Fallback obrigatório: 'Média'
                    });
                }
            }
        }
    }

    // Montar resultado final
    const result: ParsedDisciplineImport[] = [];
    let colorIndex = 0;

    disciplinesMap.forEach((topicsWithMeta, discName) => {
        // Remove tópicos duplicados preservando a incidência do primeiro encontrado
        const seenNames = new Set<string>();
        const uniqueTopics: ParsedTopicImport[] = [];

        for (const t of topicsWithMeta) {
            const cleanName = t.name.trim();
            if (cleanName && !seenNames.has(cleanName)) {
                seenNames.add(cleanName);
                uniqueTopics.push({
                    name: cleanName,
                    incidence: t.incidence,
                });
            }
        }

        if (uniqueTopics.length > 0 && discName.length > 0) {
            const color = PRESET_DISCIPLINE_COLORS[colorIndex % PRESET_DISCIPLINE_COLORS.length];
            colorIndex++;

            const topicNames = uniqueTopics.map(t => t.name);

            result.push({
                name: discName,
                topics: topicNames,
                topicsWithMetadata: uniqueTopics,
                topicsText: formatTopicsToNumberedText(topicNames),
                color,
                weight: 1,
            });
        }
    });

    if (result.length === 0) {
        throw new Error(
            'Nenhuma disciplina e tópico válidos foram identificados na planilha. ' +
            'Certifique-se de que a planilha contenha as colunas "Nº", "Disciplina", "Tópico" e "Incidência" ' +
            'ou cabeçalhos no formato "Assunto / tópico do edital - [NOME_DA_DISCIPLINA]".'
        );
    }

    return result;
};

/**
 * Exporta as disciplinas, tópicos e incidências de um plano para arquivo Excel (.xlsx)
 * Estrutura conforme solicitado: Nº, Disciplina, Tópico e Incidência.
 */
export const exportPlanToExcel = (plan: StudyPlan): void => {
    const wb = XLSX.utils.book_new();

    // 1. Aba Principal Conforme Requisito: Colunas Nº, Disciplina, Tópico e Incidência
    const tableRows: any[][] = [
        ['Nº', 'Disciplina', 'Tópico', 'Incidência', 'Status']
    ];

    let globalIndex = 1;

    plan.disciplines.forEach(disc => {
        const topics = disc.topicsList && disc.topicsList.length > 0
            ? disc.topicsList
            : (disc.topicsText ? disc.topicsText.split('\n').filter(Boolean).map((t, i) => ({ id: `${i}`, name: t, status: 'Pendente' as const, incidence: 'Média' as TopicIncidence })) : []);

        topics.forEach((top) => {
            let cleanTopicName = top.name.replace(/^\s*\d+(\.\d+)*\.\s*/, '').trim();
            if (!cleanTopicName) cleanTopicName = top.name;

            tableRows.push([
                globalIndex++,
                disc.name,
                cleanTopicName,
                top.incidence || 'Média',
                top.status === 'Concluído' ? 'Concluído' : 'Pendente',
            ]);
        });
    });

    const wsTable = XLSX.utils.aoa_to_sheet(tableRows);
    wsTable['!cols'] = [
        { wch: 8 },  // Nº
        { wch: 28 }, // Disciplina
        { wch: 65 }, // Tópico
        { wch: 16 }, // Incidência
        { wch: 14 }, // Status
    ];
    XLSX.utils.book_append_sheet(wb, wsTable, 'Edital Verticalizado');

    // 2. Aba formatada por Blocos/Seções de Disciplinas com Incidência
    const blockRows: any[][] = [];
    blockRows.push([`PLANO DE ESTUDOS: ${plan.name.toUpperCase()}`]);
    if (plan.edital || plan.cargo) {
        blockRows.push([`Edital: ${plan.edital || '-'} | Cargo: ${plan.cargo || '-'}`]);
    }
    blockRows.push([]);

    plan.disciplines.forEach(disc => {
        blockRows.push([`Assunto / tópico do edital - ${disc.name.toUpperCase()}`]);
        blockRows.push(['Nº', 'Assunto / Tópico do Edital', 'Incidência', 'Status']);

        const topics = disc.topicsList && disc.topicsList.length > 0
            ? disc.topicsList
            : (disc.topicsText ? disc.topicsText.split('\n').filter(Boolean).map((t, i) => ({ id: `${i}`, name: t, status: 'Pendente' as const, incidence: 'Média' as TopicIncidence })) : []);

        topics.forEach((top, idx) => {
            let cleanTopicName = top.name.replace(/^\s*\d+(\.\d+)*\.\s*/, '').trim();
            if (!cleanTopicName) cleanTopicName = top.name;

            blockRows.push([
                idx + 1,
                cleanTopicName,
                top.incidence || 'Média',
                top.status === 'Concluído' ? 'Concluído' : 'Pendente',
            ]);
        });

        blockRows.push([]);
    });

    const wsBlocks = XLSX.utils.aoa_to_sheet(blockRows);
    wsBlocks['!cols'] = [
        { wch: 8 },  // Nº
        { wch: 65 }, // Assunto / Tópico
        { wch: 16 }, // Incidência
        { wch: 14 }, // Status
    ];
    XLSX.utils.book_append_sheet(wb, wsBlocks, 'Edital por Blocos');

    // Sanitizar nome do arquivo
    const sanitizedName = plan.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Edital_Verticalizado_${sanitizedName}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
};

/**
 * Gera e faz download da planilha modelo de Edital Verticalizado com Incidência
 */
export const downloadExcelTemplate = (): void => {
    const wb = XLSX.utils.book_new();

    // 1. Aba Modelo Tabular com Colunas: Nº, Disciplina, Tópico e Incidência
    const tableTemplateRows: any[][] = [
        ['Nº', 'Disciplina', 'Tópico', 'Incidência'],
        [1, 'LÍNGUA PORTUGUESA', 'Compreensão e interpretação de textos de gêneros variados.', 'MUITO ALTA'],
        [2, 'LÍNGUA PORTUGUESA', 'Reconhecimento de tipos e gêneros textuais.', 'MÉDIA'],
        [3, 'LÍNGUA PORTUGUESA', 'Ortografia oficial e acentuação gráfica.', 'MÉDIA'],
        [4, 'LÍNGUA PORTUGUESA', 'Emprego das classes de palavras: substantivo, pronome, verbo, preposição.', 'ALTA'],
        [5, 'LÍNGUA PORTUGUESA', 'Sintaxe da oração e do período: termos essenciais e integrantes.', 'MUITO ALTA'],
        [6, 'LÍNGUA PORTUGUESA', 'Pontuação e concordância nominal e verbal.', 'ALTA'],
        [7, 'LÍNGUA PORTUGUESA', 'Regência nominal e verbal e emprego do sinal indicativo de crase.', 'MUITO ALTA'],
        [8, 'LÍNGUA PORTUGUESA', 'Semântica: significação das palavras, sinonímia e antonímia.', 'BAIXA'],
        [1, 'DIREITO CONSTITUCIONAL', 'Princípios fundamentais da República Federativa do Brasil (arts. 1º a 4º).', 'ALTA'],
        [2, 'DIREITO CONSTITUCIONAL', 'Direitos e deveres individuais e coletivos (art. 5º da CF/88).', 'MUITO ALTA'],
        [3, 'DIREITO CONSTITUCIONAL', 'Direitos sociais, nacionalidade e direitos políticos (arts. 6º a 16).', 'MÉDIA'],
        [4, 'DIREITO CONSTITUCIONAL', 'Organização político-administrativa do Estado brasileiro (arts. 18 a 36).', 'BAIXA'],
        [5, 'DIREITO CONSTITUCIONAL', 'Administração Pública e servidores públicos (arts. 37 a 41).', 'MUITO ALTA'],
        [6, 'DIREITO CONSTITUCIONAL', 'Poder Legislativo, Poder Executivo e Poder Judiciário: noções gerais.', 'MÉDIA'],
        [1, 'RACIOCÍNIO LÓGICO-MATEMÁTICO', 'Estruturas lógicas, conectivos, tabela-verdade e tautologia.', 'ALTA'],
        [2, 'RACIOCÍNIO LÓGICO-MATEMÁTICO', 'Equivalências lógicas e negação de proposições compostas.', 'MUITO ALTA'],
        [3, 'RACIOCÍNIO LÓGICO-MATEMÁTICO', 'Diagramas lógicos e quantificadores todo, algum e nenhum.', 'MÉDIA'],
        [4, 'RACIOCÍNIO LÓGICO-MATEMÁTICO', 'Razão, proporção e regra de três simples e composta.', 'ALTA'],
        [5, 'RACIOCÍNIO LÓGICO-MATEMÁTICO', 'Porcentagem, acréscimos e descontos sucessivos.', 'MUITO ALTA'],
        [6, 'RACIOCÍNIO LÓGICO-MATEMÁTICO', 'Princípio fundamental da contagem e probabilidade básica.', 'BAIXA'],
        [1, 'INFORMÁTICA', 'Conceitos básicos de hardware, periféricos e memórias.', 'BAIXA'],
        [2, 'INFORMÁTICA', 'Sistemas operacionais Windows 10/11: arquivos, pastas e atalhos.', 'MÉDIA'],
        [3, 'INFORMÁTICA', 'Redes de computadores, Internet, navegação segura e computação em nuvem.', 'ALTA'],
        [4, 'INFORMÁTICA', 'Segurança da informação: vírus, phishing, backup e autenticação em 2 fatores.', 'MUITO ALTA'],
        [5, 'INFORMÁTICA', 'Planilhas eletrônicas (fórmulas e funções principais).', 'MUITO ALTA'],
    ];

    const wsTable = XLSX.utils.aoa_to_sheet(tableTemplateRows);
    wsTable['!cols'] = [
        { wch: 8 },  // Nº
        { wch: 28 }, // Disciplina
        { wch: 75 }, // Tópico
        { wch: 16 }, // Incidência
    ];
    XLSX.utils.book_append_sheet(wb, wsTable, 'Modelo Tabela');

    // 2. Aba Modelo por Blocos de Disciplinas
    const blockTemplateRows: any[][] = [
        ['MODELO DE EDITAL VERTICALIZADO COM INCIDÊNCIA - STUDYDAY'],
        ['Instruções: Valores de Incidência válidos: MUITO ALTA, ALTA, MÉDIA e BAIXA. Células em branco assumem MÉDIA automaticamente.'],
        [],
        ['Assunto / tópico do edital - LÍNGUA PORTUGUESA'],
        ['Nº', 'Assunto / tópico do edital', 'Incidência'],
        [1, 'Compreensão e interpretação de textos de gêneros variados.', 'MUITO ALTA'],
        [2, 'Ortografia oficial e acentuação gráfica.', 'MÉDIA'],
        [3, 'Sintaxe da oração e do período.', 'MUITO ALTA'],
        [4, 'Regência e emprego do sinal de crase.', 'ALTA'],
        [5, 'Semântica e significação das palavras.', 'BAIXA'],
        [],
        ['Assunto / tópico do edital - DIREITO CONSTITUCIONAL'],
        ['Nº', 'Assunto / tópico do edital', 'Incidência'],
        [1, 'Princípios fundamentais da República Federativa do Brasil.', 'ALTA'],
        [2, 'Direitos e deveres individuais e coletivos (art. 5º da CF/88).', 'MUITO ALTA'],
        [3, 'Administração Pública e servidores públicos (arts. 37 a 41).', 'MUITO ALTA'],
        [4, 'Organização dos Poderes: Executivo, Legislativo e Judiciário.', 'MÉDIA'],
    ];

    const wsBlocks = XLSX.utils.aoa_to_sheet(blockTemplateRows);
    wsBlocks['!cols'] = [
        { wch: 8 },
        { wch: 75 },
        { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, wsBlocks, 'Modelo por Blocos');

    XLSX.writeFile(wb, 'Modelo_Importacao_Edital_Com_Incidencia.xlsx');
};
