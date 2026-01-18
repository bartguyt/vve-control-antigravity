// Helper function to format relative time in Dutch
export const formatRelativeTime = (date: Date | string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Zojuist';
    if (diffMin < 60) return `${diffMin} min geleden`;
    if (diffHour < 24) return `${diffHour} uur geleden`;
    if (diffDay === 1) return 'Gisteren';
    if (diffDay < 7) return `${diffDay} dagen geleden`;

    // Older than a week, show date
    return then.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
};
