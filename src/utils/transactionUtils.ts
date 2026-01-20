/**
 * Extract year from transaction description
 * Looks for 4-digit year pattern (2020-2099)
 */
export function extractYearFromDescription(description: string): number | null {
    if (!description) return null;

    // Match 4-digit year (2020-2099)
    const yearMatch = description.match(/\b(20[2-9][0-9])\b/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
}

/**
 * Extract month from transaction description
 * Recognizes quarters, Dutch/English month names
 */
export function extractMonthFromDescription(description: string): number | null {
    if (!description) return null;

    const desc = description.toLowerCase();

    // Quarter patterns (use end month of quarter)
    if (desc.includes('q1') || desc.includes('kwartaal 1')) return 3;
    if (desc.includes('q2') || desc.includes('kwartaal 2')) return 6;
    if (desc.includes('q3') || desc.includes('kwartaal 3')) return 9;
    if (desc.includes('q4') || desc.includes('kwartaal 4')) return 12;

    // Dutch month names
    const dutchMonths = [
        'januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];
    for (let i = 0; i < dutchMonths.length; i++) {
        if (desc.includes(dutchMonths[i])) return i + 1;
    }

    // English month names
    const englishMonths = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    for (let i = 0; i < englishMonths.length; i++) {
        if (desc.includes(englishMonths[i])) return i + 1;
    }

    // Short month names (jan, feb, mar, etc.)
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    for (let i = 0; i < shortMonths.length; i++) {
        if (desc.includes(shortMonths[i])) return i + 1;
    }

    return null;
}

/**
 * Get month name in Dutch
 */
export function getMonthName(month: number): string {
    const months = [
        'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
    ];
    return months[month - 1] || '';
}

/**
 * Extract ALL months mentioned in description
 * Returns array of month numbers (1-12), sorted
 */
export function extractMonthsFromDescription(description: string): number[] {
    if (!description) return [];

    const desc = description.toLowerCase();
    const foundMonths = new Set<number>();

    // Quarter expansion (use all 3 months in quarter)
    if (desc.includes('q1') || desc.includes('kwartaal 1')) {
        foundMonths.add(1); foundMonths.add(2); foundMonths.add(3);
    }
    if (desc.includes('q2') || desc.includes('kwartaal 2')) {
        foundMonths.add(4); foundMonths.add(5); foundMonths.add(6);
    }
    if (desc.includes('q3') || desc.includes('kwartaal 3')) {
        foundMonths.add(7); foundMonths.add(8); foundMonths.add(9);
    }
    if (desc.includes('q4') || desc.includes('kwartaal 4')) {
        foundMonths.add(10); foundMonths.add(11); foundMonths.add(12);
    }

    // Dutch month names (full)
    const dutchMonths = [
        'januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];
    dutchMonths.forEach((month, i) => {
        if (desc.includes(month)) foundMonths.add(i + 1);
    });

    // Short Dutch (jan, feb, mrt)
    const shortDutch = ['jan', 'feb', 'mrt', 'apr', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    shortDutch.forEach((month, i) => {
        // Adjust index for missing 'mei' (index 4)
        const monthNum = i < 4 ? i + 1 : i + 2;
        if (desc.includes(month)) foundMonths.add(monthNum);
    });

    // English month names (full)
    const englishMonths = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    englishMonths.forEach((month, i) => {
        if (desc.includes(month)) foundMonths.add(i + 1);
    });

    return Array.from(foundMonths).sort((a, b) => a - b);
}
