/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,css}",
    ],
    theme: {
        extend: {
            colors: {
                'caramelo-primary': '#FF4444',      // Bright Red
                'caramelo-secondary': '#FF6B35',    // Orange-Red
                'caramelo-accent': '#F95738',       // Vibrant Orange
                'caramelo-light': '#0a0a0a',        // Dark background
                'caramelo-dark': '#FFFFFF',         // White text
                'caramelo-cream': '#151515',        // Dark card background

                // Neutral palette for modern UI
                'neutral-50': '#FAFAFA',
                'neutral-100': '#F5F5F5',
                'neutral-200': '#E5E5E5',
                'neutral-300': '#D4D4D4',
                'neutral-400': '#A3A3A3',
                'neutral-500': '#737373',
                'neutral-600': '#525252',
                'neutral-700': '#404040',
                'neutral-800': '#262626',
                'neutral-900': '#171717',
            }
        },
    },
    plugins: [],
}
