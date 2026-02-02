/** @type {import('tailwindcss').Config} */
export default {
  // Include all sources that use Tailwind classes (index.html has bg-surface, etc.)
  content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS variables (switch in :root / .dark)
        surface: 'var(--color-surface)',
        'surface-dark': 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        content: 'var(--color-content)',
        'content-muted': 'var(--color-content-muted)',
        'border-subtle': 'var(--color-border)',
        // Legacy surface shades (if needed for one-off use)
        'surface-light': '#ffffff',
        'surface-dark-shade': '#020617',
        // Accent colors
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Elite Dangerous theme colors
        elite: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff7100', // Primary Elite orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Status / legend colors (use in ExplorerView legend and elsewhere)
        valuable: '#f59e0b', // Amber for $$$ indicators
        'value-medium': '#f97316', // Orange for $ medium
        biological: '#22c55e', // Green for bio signals
        'legend-bio': '#4ade80', // Lighter green for legend B
        geological: '#92400e', // Brown for geo (legend)
        'geo-red': '#ef4444', // Red for geo signals
        terraformable: '#06b6d4', // Cyan for terraformable
        discovered: '#a855f7', // Purple for first discovered
        mapped: '#ec4899', // Pink for first mapped
        human: '#3b82f6', // Blue for human signals
        guardian: '#1e40af', // Blue for guardian
        thargoid: '#166534', // Green for thargoid
        landable: '#d97706', // Amber for landable
        atmosphere: '#38bdf8', // Sky for atmosphere
        dss: '#7c3aed', // Violet for DSS scanned
        'mapped-alt': '#db2777', // Pink for mapped (alt)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
