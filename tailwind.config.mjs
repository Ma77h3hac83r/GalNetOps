/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0F131A',
        'bg-secondary': '#1A1F27',
        'accent': '#4D9FFF',
        'accent-soft': '#8AC0FF',
        'text-primary': '#F0F3F6',
        'text-secondary': '#8C939C',
        'border': '#202530',
        'hover-bg': '#1F2732',
      },
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
      },
      fontSize: {
        'h1': '32px',
        'h2': '24px',
        'h3': '18px',
        'body': '15px',
        'label': '13px',
      },
      fontWeight: {
        'semibold': '600',
        'medium': '500',
        'regular': '400',
        'light': '300',
      },
      borderRadius: {
        'card': '8px',
        'button': '6px',
      },
    },
  },
  plugins: [],
}

