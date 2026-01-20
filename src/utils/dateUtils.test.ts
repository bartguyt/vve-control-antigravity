import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './dateUtils';

describe('formatRelativeTime', () => {
    it('shows "Zojuist" for times less than 60 seconds ago', () => {
        const now = new Date();
        const result = formatRelativeTime(now);
        expect(result).toBe('Zojuist');
    });

    it('shows "Zojuist" for 30 seconds ago', () => {
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        const result = formatRelativeTime(thirtySecondsAgo);
        expect(result).toBe('Zojuist');
    });

    it('shows minutes for times less than 60 minutes ago', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const result = formatRelativeTime(fiveMinutesAgo);
        expect(result).toBe('5 min geleden');
    });

    it('shows 1 minute for 1 minute ago', () => {
        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
        const result = formatRelativeTime(oneMinuteAgo);
        expect(result).toBe('1 min geleden');
    });

    it('shows hours for times less than 24 hours ago', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const result = formatRelativeTime(twoHoursAgo);
        expect(result).toBe('2 uur geleden');
    });

    it('shows "Gisteren" for exactly 1 day ago', () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = formatRelativeTime(oneDayAgo);
        expect(result).toBe('Gisteren');
    });

    it('shows days for times less than 7 days ago', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const result = formatRelativeTime(threeDaysAgo);
        expect(result).toBe('3 dagen geleden');
    });

    it('shows formatted date for times more than 7 days ago', () => {
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        const result = formatRelativeTime(tenDaysAgo);
        // Should return a date like "9 jan" (depends on current date)
        expect(result).toMatch(/\d{1,2} \w{3}/);
    });

    it('handles string dates', () => {
        const dateString = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const result = formatRelativeTime(dateString);
        expect(result).toBe('5 min geleden');
    });

    it('handles Date objects', () => {
        const dateObject = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const result = formatRelativeTime(dateObject);
        expect(result).toBe('2 uur geleden');
    });
});
