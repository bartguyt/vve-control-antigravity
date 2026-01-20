/**
 * Debug utility for conditional console logging
 * Only logs when DEBUG_MODE is enabled in localStorage
 */

const DEBUG_KEY = 'vve_debug_mode';

export const debugUtils = {
    /**
     * Check if debug mode is enabled
     */
    isDebugEnabled(): boolean {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(DEBUG_KEY) === 'true';
    },

    /**
     * Enable debug mode
     */
    enable(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(DEBUG_KEY, 'true');
            window.dispatchEvent(new Event('debugModeChanged'));
            console.log('🐛 Debug mode enabled');
        }
    },

    /**
     * Disable debug mode
     */
    disable(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(DEBUG_KEY, 'false');
            window.dispatchEvent(new Event('debugModeChanged'));
            console.log('🐛 Debug mode disabled');
        }
    },

    /**
     * Conditional console.log - only logs if debug mode is enabled
     */
    log(...args: any[]): void {
        if (this.isDebugEnabled()) {
            console.log(...args);
        }
    },

    /**
     * Conditional console.warn - only logs if debug mode is enabled
     */
    warn(...args: any[]): void {
        if (this.isDebugEnabled()) {
            console.warn(...args);
        }
    },

    /**
     * Conditional console.error - always logs (errors should always be visible)
     */
    error(...args: any[]): void {
        console.error(...args);
    },

    /**
     * Conditional console.groupCollapsed - only logs if debug mode is enabled
     */
    groupCollapsed(...args: any[]): void {
        if (this.isDebugEnabled()) {
            console.groupCollapsed(...args);
        }
    },

    /**
     * Conditional console.groupEnd - only logs if debug mode is enabled
     */
    groupEnd(): void {
        if (this.isDebugEnabled()) {
            console.groupEnd();
        }
    }
};

// Make it globally accessible for easy debugging in console
if (typeof window !== 'undefined') {
    (window as any).debugUtils = debugUtils;
}

// Usage in console:
// debugUtils.enable()  - Turn on debug logging
// debugUtils.disable() - Turn off debug logging
