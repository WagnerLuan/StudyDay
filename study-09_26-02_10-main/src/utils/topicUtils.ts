export interface ParsedTopic {
    name: string;
    status: 'Concluído' | 'Pendente';
}

/**
 * Parses a raw string of topics (potentially with multi-line topics) into an array of ParsedTopic objects.
 * It identifies new topics by lines starting with a number followed by a dot (e.g., "1.", "1.1.", "2.").
 * Lines that do not match this pattern are considered continuations of the previous topic.
 *
 * @param topicsText The raw string containing all topics, potentially with newlines within a single topic.
 * @returns An array of ParsedTopic objects.
 */
export const parseTopicsText = (topicsText: string): ParsedTopic[] => {
    const lines = topicsText.split('\n').map(line => line.trim()).filter(line => line !== '');
    const parsedTopics: ParsedTopic[] = [];
    let currentTopicName: string | null = null;

    lines.forEach(line => {
        // Regex to detect lines starting with a number followed by a dot, optionally with sub-numbers (e.g., "1.", "1.1.", "2.3.4.")
        // and also handles indentation (e.g., "  1.1. Subtópico")
        const isNewTopicStart = /^\s*(\d+(\.\d+)*\.)\s*(.*)/.test(line);

        if (isNewTopicStart) {
            // If there's a current topic being built, push it before starting a new one
            if (currentTopicName !== null) {
                parsedTopics.push({ name: currentTopicName, status: 'Pendente' });
            }
            // Start a new topic
            currentTopicName = line;
        } else {
            // If it's not a new topic start, append to the current topic
            if (currentTopicName !== null) {
                currentTopicName += ' ' + line; // Append with a space to avoid concatenating words
            } else {
                // This case handles leading lines that don't start with a number.
                // For now, we'll treat them as the start of the first topic.
                // A more robust solution might ignore them or flag an error.
                currentTopicName = line;
            }
        }
    });

    // Push the last accumulated topic if any
    if (currentTopicName !== null) {
        parsedTopics.push({ name: currentTopicName, status: 'Pendente' });
    }

    return parsedTopics;
};

/**
 * Sorts an array of topics numerically based on their name property,
 * which is expected to start with a numerical prefix (e.g., "1.", "1.1.").
 *
 * @param topics An array of objects, each having a 'name' property (string).
 * @returns A new array with the topics sorted numerically.
 */
export const sortTopics = <T extends { name: string }>(topics: T[]): T[] => {
    return [...topics].sort((a, b) => {
        const extractPrefix = (name: string) => {
            const match = name.match(/^(\s*\d+(\.\d+)*)\.?/);
            return match ? match[1].trim() : '';
        };

        const prefixA = extractPrefix(a.name);
        const prefixB = extractPrefix(b.name);

        if (!prefixA && !prefixB) return a.name.localeCompare(b.name); // Fallback to full name sort if no prefix
        if (!prefixA) return 1; // Topics without prefix go last
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
        return 0; // Prefixes are identical, maintain original relative order
    });
};