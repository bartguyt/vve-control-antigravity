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
                // light mode
                tremor: {
                    brand: {
                        faint: colors.indigo[50], // blue-50
                        muted: colors.indigo[200], // blue-200
                        subtle: colors.indigo[400], // blue-400
                        DEFAULT: colors.indigo[600], // blue-600
                        emphasis: colors.indigo[700], // blue-700
                        inverted: colors.white, // white
                    },
                    background: {
                        muted: colors.gray[50], // gray-50
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
                        strong: colors.gray[900], // gray-900
                        inverted: colors.white, // white
                    },
                },
                // dark mode
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
            boxShadow: {
                // light
                "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                "tremor-card": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                "tremor-dropdown": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                // dark
                "dark-tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                "dark-tremor-card": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                "dark-tremor-dropdown": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            },
            borderRadius: {
                "tremor-small": "0.375rem",
                "tremor-default": "0.5rem",
                "tremor-full": "9999px",
            },
            fontSize: {
                "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
                "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
                "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
                "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
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
