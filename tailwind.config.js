/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        // Path to Tremor module
        "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        transparent: 'transparent',
        current: 'currentColor',
        extend: {
            colors: {
                // Modern Steward Brand Colors
                'sea-salt': '#F8F9FA',
                'slate-blue': '#2C3E50',
                'sage-green': '#4A7C59',
                'terracotta': '#C07F5E',
                'muted-red': '#D32F2F',
                'warm-orange': '#F57C00',

                // Existing Tremor colors mapping (keeping for compatibility)
                tremor: {
                    brand: {
                        faint: '#F2F8F4', // sage-50
                        muted: '#E1EFE5', // sage-100
                        subtle: '#4A7C59', // sage-green
                        DEFAULT: '#4A7C59', // Sage Green (Primary CTA)
                        emphasis: '#3A6347', // Darker Sage
                        inverted: colors.white, // white
                    },
                    background: {
                        muted: '#F8F9FA', // Sea Salt
                        subtle: colors.gray[100], // gray-100
                        DEFAULT: colors.white, // white
                        emphasis: colors.gray[700], // gray-700
                    },
                    border: {
                        DEFAULT: colors.gray[200], // gray-200
                    },
                    ring: {
                        DEFAULT: colors.gray[200], // gray-200
                    },
                    content: {
                        subtle: colors.gray[400], // gray-400
                        DEFAULT: colors.gray[500], // gray-500
                        emphasis: colors.gray[700], // gray-700
                        strong: '#2C3E50', // Slate Blue for strong text
                        inverted: colors.white, // white
                    },
                },
                // dark mode (keeping as is for now, but could be updated later)
                "dark-tremor": {
                    brand: {
                        faint: "#0B1229", // custom
                        muted: colors.indigo[950], // blue-950
                        subtle: colors.indigo[800], // blue-800
                        DEFAULT: colors.indigo[500], // blue-500
                        emphasis: colors.indigo[400], // blue-400
                        inverted: colors.gray[950], // gray-950
                    },
                    background: {
                        muted: "#131A2B", // custom
                        subtle: colors.gray[800], // gray-800
                        DEFAULT: colors.gray[900], // gray-900
                        emphasis: colors.gray[300], // gray-300
                    },
                    border: {
                        DEFAULT: colors.gray[800], // gray-800
                    },
                    ring: {
                        DEFAULT: colors.gray[800], // gray-800
                    },
                    content: {
                        subtle: colors.gray[600], // gray-600
                        DEFAULT: colors.gray[500], // gray-500
                        emphasis: colors.gray[200], // gray-200
                        strong: colors.gray[50], // gray-50
                        inverted: colors.gray[950], // gray-950
                    },
                },
            },
            fontFamily: {
                'heading': ['Merriweather', 'serif'],
                'body': ['Inter', 'sans-serif'],
                'sans': ['Inter', 'sans-serif'], // Override default sans
            },
            fontSize: {
                'body': '14px',
                'label': '16px',
                "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
                "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
                "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
                "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
            },
            borderRadius: {
                'card': '12px',
                'card-lg': '16px',
                "tremor-small": "0.375rem",
                "tremor-default": "0.5rem",
                "tremor-full": "9999px",
            },
        },
    },
    safelist: [
        {
            pattern:
                /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
            variants: ["hover", "ui-selected"],
        },
        {
            pattern:
                /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
            variants: ["hover", "ui-selected"],
        },
        {
            pattern:
                /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
            variants: ["hover", "ui-selected"],
        },
        {
            pattern:
                /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        },
        {
            pattern:
                /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        },
        {
            pattern:
                /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        },
    ],
    plugins: [require('@headlessui/tailwindcss')],
}
