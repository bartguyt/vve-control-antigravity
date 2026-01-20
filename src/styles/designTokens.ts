/**
 * Design Tokens for Modern Steward UI
 * 
 * Professional, calming interface combining banking reliability
 * with residential warmth. WCAG 2.2 compliant.
 */

export const colors = {
    background: {
        canvas: '#F8F9FA',    // Sea Salt - reduces glare
        card: '#FFFFFF',      // Pure White - content elevation
        sidebar: '#2C3E50'    // Deep Slate Blue - authority
    },

    primary: '#2C3E50',     // Deep Slate Blue - architectural steadfastness
    secondary: '#4A7C59',   // Sage Green - sustainability, positive actions
    accent: '#C07F5E',      // Terracotta - warmth, human scale

    status: {
        error: '#D32F2F',     // Muted Red - reduces panic
        warning: '#F57C00',   // Warm Orange - gentle alerts
        success: '#4A7C59',   // Sage Green - positive confirmation
        info: '#2C3E50'       // Slate Blue - neutral information
    },

    text: {
        primary: '#2C3E50',   // Main text color
        secondary: '#5A6C7D', // Secondary text
        muted: '#8B95A0',     // Muted text
        inverse: '#FFFFFF'    // Text on dark backgrounds
    }
} as const;

export const typography = {
    fonts: {
        heading: "'Merriweather', serif",  // Notarial, trustworthy
        body: "'Inter', sans-serif"         // Clean, readable
    },

    sizes: {
        body: '14px',         // Minimum body text
        label: '16px',        // Important labels
        h1: '32px',
        h2: '24px',
        h3: '20px',
        h4: '18px',
        small: '12px'
    },

    weights: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
    },

    lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75
    }
} as const;

export const spacing = {
    cardRadius: '12px',
    cardRadiusLg: '16px',
    cardPadding: '24px',
    touchTarget: '44px',

    // Spacing scale
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
} as const;

export const shadows = {
    // Soft, diffuse shadows (not harsh)
    card: '0 1px 3px rgba(44, 62, 80, 0.08), 0 1px 2px rgba(44, 62, 80, 0.06)',
    cardHover: '0 4px 6px rgba(44, 62, 80, 0.1), 0 2px 4px rgba(44, 62, 80, 0.08)',
    subtle: '0 1px 2px rgba(44, 62, 80, 0.05)'
} as const;

export const transitions = {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out'
} as const;
