import { Topic } from '../../types';

export interface ParsedTopic {
    name: string;
    status: 'Concluído' | 'Pendente';
}

/**
 * Remove prefixos numéricos antigos digitados manualmente no início de um tópico
 * (ex: "1. Estado, governo...", "1.1. Conceito...", "02 - Poderes", "1. 1. Texto").
 * Preserva anos de 4 dígitos (ex: "2024 - Atualidades") e números dentro do texto.
 */
export const stripTopicPrefix = (rawName: string): string => {
    if (!rawName || typeof rawName !== 'string') return '';
    let cleaned = rawName.trim();

    // Remove prefixos numéricos repetidos no início (evita "1. 1. Texto")
    const prefixRegex = /^\s*(?:\d{1,3}(?:\.\d{1,3})+\.?\s*|\d{1,3}\.\s*|\d{1,3}\s*[)\-–—]\s+)/;
    let prev = '';
    while (cleaned !== prev && prefixRegex.test(cleaned)) {
        prev = cleaned;
        const candidate = cleaned.replace(prefixRegex, '').trim();
        // Só aplica se restar conteúdo ou se for exatamente um prefixo isolado
        if (candidate.length > 0 || /^\d+(?:\.\d+)*\.?$/.test(cleaned)) {
            cleaned = candidate;
        } else {
            break;
        }
    }

    return cleaned;
};

/**
 * Detecta se uma linha ou nome de tópico salvo representa um subtópico
 * (seja por recuo de espaços/tabulação ou por numeração hierárquica como "1.1.", "2.3.").
 */
export const detectSubtopicFromLine = (rawLine: string, rawTopicName?: string): boolean => {
    if (rawLine && (/^ {2,}/.test(rawLine) || /^\t/.test(rawLine))) {
        return true;
    }
    const target = (rawLine || rawTopicName || '').trim();
    if (/^\d+\.\d+(?:\.\d+)*\.?(?:\s|$)/.test(target)) {
        return true;
    }
    if (rawTopicName && (/^ {2,}/.test(rawTopicName) || /^\t/.test(rawTopicName))) {
        return true;
    }
    return false;
};

/**
 * Calcula dinamicamente a numeração hierárquica ("1.", "1.1.", "2.", etc.)
 * com base na ordem atual da lista e na flag isSubtopic.
 */
export const computeHierarchicalNumbers = <T extends { isSubtopic?: boolean }>(
    items: T[]
): (T & { displayNumber: string; isSubtopic: boolean })[] => {
    let mainIndex = 0;
    let subIndex = 0;

    return items.map((item) => {
        if (item.isSubtopic && mainIndex > 0) {
            subIndex += 1;
            return {
                ...item,
                isSubtopic: true,
                displayNumber: `${mainIndex}.${subIndex}.`,
            };
        }

        mainIndex += 1;
        subIndex = 0;
        return {
            ...item,
            isSubtopic: false,
            displayNumber: `${mainIndex}.`,
        };
    });
};

/**
 * Converte uma lista estruturada de tópicos em texto formatado para persistência
 * na coluna `disciplines.topics_text` (mantendo ordem e recuo de subtópicos).
 */
export const formatStructuredTopicsToText = (
    items: { cleanName: string; isSubtopic?: boolean }[]
): string => {
    const validItems = items.filter((item) => item.cleanName.trim() !== '');
    const numbered = computeHierarchicalNumbers(validItems);

    return numbered
        .map((item) => {
            const clean = item.cleanName.trim();
            return item.isSubtopic
                ? `  ${item.displayNumber} ${clean}`
                : `${item.displayNumber} ${clean}`;
        })
        .join('\n');
};

/**
 * Converte um bloco de texto colado em lote em itens estruturados limpos.
 */
export const parseBatchTopicsText = (
    rawBatchText: string
): { cleanName: string; isSubtopic: boolean }[] => {
    const lines = rawBatchText.split(/\r?\n/);
    const result: { cleanName: string; isSubtopic: boolean }[] = [];

    lines.forEach((line) => {
        if (!line.trim()) return;
        const isSubtopic = detectSubtopicFromLine(line);
        const cleanName = stripTopicPrefix(line);
        if (cleanName) {
            result.push({
                cleanName,
                isSubtopic: result.length > 0 ? isSubtopic : false,
            });
        }
    });

    return result;
};

/**
 * Ordena e hidrata os tópicos vindos do banco (`disc.topics`) usando a ordem
 * e hierarquia salvas em `disc.topics_text` (retrocompatível com tópicos legados).
 */
export const hydrateOrderedTopics = (
    dbTopics: Topic[],
    topicsText?: string | null
): Topic[] => {
    if (!dbTopics || dbTopics.length === 0) return [];

    const ordered: Topic[] = [];
    const usedIds = new Set<string>();

    if (topicsText && topicsText.trim() !== '') {
        const lines = topicsText
            .split(/\r?\n/)
            .filter((line) => line.trim() !== '');

        lines.forEach((rawLine) => {
            const isSub = detectSubtopicFromLine(rawLine);
            const cleanLine = stripTopicPrefix(rawLine);
            const cleanLineLower = cleanLine.toLowerCase();
            const rawTrimmed = rawLine.trim();

            // 1. Tenta correspondência exata com o nome armazenado
            let matched = dbTopics.find(
                (t) => !usedIds.has(t.id) && (t.name === rawTrimmed || t.name.trim() === rawTrimmed)
            );

            // 2. Tenta correspondência pelo nome sanitizado (sem prefixo numérico)
            if (!matched && cleanLineLower) {
                matched = dbTopics.find(
                    (t) =>
                        !usedIds.has(t.id) &&
                        stripTopicPrefix(t.name).toLowerCase() === cleanLineLower
                );
            }

            if (matched) {
                usedIds.add(matched.id);
                ordered.push({
                    ...matched,
                    isSubtopic: isSub || detectSubtopicFromLine(matched.name),
                    cleanName: stripTopicPrefix(matched.name) || matched.name.trim(),
                });
            }
        });
    }

    // Tópicos restantes que não estavam no topics_text (ex: planos gerados por IA ou legados)
    const remaining = dbTopics.filter((t) => !usedIds.has(t.id));
    const sortedRemaining = sortLegacyTopicsByPrefix(remaining);

    sortedRemaining.forEach((t) => {
        ordered.push({
            ...t,
            isSubtopic: t.isSubtopic ?? detectSubtopicFromLine(t.name),
            cleanName: stripTopicPrefix(t.name) || t.name.trim(),
        });
    });

    const numbered = computeHierarchicalNumbers(ordered);
    return numbered.map((t, index) => ({
        ...t,
        orderIndex: index,
    }));
};

/**
 * Parses a raw string of topics (potentially with multi-line topics) into an array of ParsedTopic objects.
 * It identifies new topics by lines starting with a number followed by a dot (e.g., "1.", "1.1.", "2.").
 * Lines that do not match this pattern are considered continuations of the previous topic.
 */
export const parseTopicsText = (topicsText: string): ParsedTopic[] => {
    const lines = topicsText.split('\n').map(line => line.trim()).filter(line => line !== '');
    const parsedTopics: ParsedTopic[] = [];
    let currentTopicName: string | null = null;

    lines.forEach(line => {
        const isNewTopicStart = /^\s*(\d+(\.\d+)*\.)\s*(.*)/.test(line);

        if (isNewTopicStart) {
            if (currentTopicName !== null) {
                parsedTopics.push({ name: currentTopicName, status: 'Pendente' });
            }
            currentTopicName = line;
        } else {
            if (currentTopicName !== null) {
                currentTopicName += ' ' + line;
            } else {
                currentTopicName = line;
            }
        }
    });

    if (currentTopicName !== null) {
        parsedTopics.push({ name: currentTopicName, status: 'Pendente' });
    }

    return parsedTopics;
};

/**
 * Ordenação legada baseada em prefixo numérico no campo `name`.
 */
const sortLegacyTopicsByPrefix = <T extends { name: string }>(topics: T[]): T[] => {
    return [...topics].sort((a, b) => {
        const extractPrefix = (name: string) => {
            const match = name.match(/^(\s*\d+(\.\d+)*)\.?/);
            return match ? match[1].trim() : '';
        };

        const prefixA = extractPrefix(a.name);
        const prefixB = extractPrefix(b.name);

        if (!prefixA && !prefixB) return 0; // Mantém ordem original se nenhum tiver prefixo
        if (!prefixA) return 1;
        if (!prefixB) return -1;

        const partsA = prefixA.split('.').map(Number);
        const partsB = prefixB.split('.').map(Number);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;

            if (numA !== numB) {
                return numA - numB;
            }
        }
        return 0;
    });
};

/**
 * Sorts an array of topics respecting `orderIndex` (from structured list) first,
 * falling back to numeric prefix ordering for legacy topics.
 */
export const sortTopics = <T extends { name: string; orderIndex?: number }>(topics: T[]): T[] => {
    const hasOrderIndex = topics.some((t) => typeof t.orderIndex === 'number');
    if (hasOrderIndex) {
        return [...topics].sort((a, b) => {
            const idxA = typeof a.orderIndex === 'number' ? a.orderIndex : Number.MAX_SAFE_INTEGER;
            const idxB = typeof b.orderIndex === 'number' ? b.orderIndex : Number.MAX_SAFE_INTEGER;
            if (idxA !== idxB) return idxA - idxB;
            return 0;
        });
    }
    return sortLegacyTopicsByPrefix(topics);
};