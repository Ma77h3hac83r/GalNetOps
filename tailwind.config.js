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
        discovered: '#a855f7', // Purple – FD First Discovered
        mapped: '#a855f7', // Purple – FM First Mapped
        footfall: '#a855f7', // Purple – FF First Footfall
        dss: '#ec4899', // Pink – S FSS Scanned
        'mapped-alt': '#ec4899', // Pink – M DSS Mapped
        valuable: '#eab308', // Gold – $$$ High Value
        'planet-highlight': '#eab308', // Gold square background for Planet Highlight
        'value-medium': '#94a3b8', // Silver – $$ Medium Value
        'value-low': '#b45309', // Bronze – $ Low Value
        landable: '#f97316', // Orange – L Landable
        atmosphere: '#38bdf8', // Sky Blue – A Atmosphere
        biological: '#22c55e', // Green – T Terraformable
        geological: '#92400e', // Brown – G Geological
        'legend-bio': '#14b8a6', // Teal – B Biological
        human: '#7dd3fc', // Light Blue – Hu Human Signals
        thargoid: '#14532d', // Dark Green – Th Thargoid Signals
        guardian: '#1e40af', // Dark Blue – Ga Guardian Signals
        // Legacy / other use
        'geo-red': '#ef4444', // Red for geo signals
        terraformable: '#06b6d4', // Cyan (alias)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
