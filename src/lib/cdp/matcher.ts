/**
 * Golden Record CDP Core Utilities
 * Contains string distance algorithms and normalization logic for Identity Resolution.
 */

/**
 * Normalizes a Thai phone number (e.g. 081-234-5678 -> +66812345678)
 * Returns the original if parsing fails.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/[^0-9+]/g, '');

    // If it's a Thai local number starting with 0
    if (cleaned.startsWith('0') && cleaned.length === 10) {
        return '+66' + cleaned.substring(1);
    }
    // If already international but missing the +
    if (cleaned.startsWith('66') && cleaned.length === 11) {
        return '+' + cleaned;
    }
    return cleaned;
}

/**
 * Normalizes a Thai name for comparison (strips prefixes, lowercase English equivalents)
 */
export function normalizeName(name: string | null | undefined): string {
    if (!name) return '';
    let cleaned = name.trim().toLowerCase();

    // Strip common Thai honorifics to prevent false negatives in Jaro-Winkler
    const prefixes = ['คุณ', 'นาย', 'นางสาว', 'น.ส.', 'ด.ช.', 'ด.ญ.', 'บจก.', 'mr.', 'mrs.', 'ms.', 'k.'];
    for (const prefix of prefixes) {
        if (cleaned.startsWith(prefix)) {
            cleaned = cleaned.substring(prefix.length).trim();
            break; // only strip one
        }
    }

    // Remove all internal spaces (e.g., "สมชาย ใจดี" -> "สมชายใจดี") for comparison purposes
    return cleaned.replace(/\s+/g, '');
}

/**
 * Jaro-Winkler String Distance Algorithm
 * Returns 0.0 (completely different) to 1.0 (exact match)
 */
export function jaroWinkler(s1: string, s2: string): number {
    if (!s1 || !s2) return 0.0;
    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;
    const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, len2);

        for (let j = start; j < end; j++) {
            if (s2Matches[j]) continue;
            if (s1[i] !== s2[j]) continue;

            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    const m = matches;
    const jaro = (m / len1 + m / len2 + (m - transpositions / 2) / m) / 3.0;

    // Winkler extension (gives more weight to common prefixes up to 4 chars)
    let commonPrefixLength = 0;
    const prefixLimit = Math.min(4, Math.min(len1, len2));
    for (let i = 0; i < prefixLimit; i++) {
        if (s1[i] === s2[i]) commonPrefixLength++;
        else break;
    }

    const winkler = jaro + (commonPrefixLength * 0.1 * (1.0 - jaro));
    return Number(winkler.toFixed(4));
}
