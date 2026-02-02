/** Applies theme from store to document root: light/dark/elite class, or system preference with media query listener. */
import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function useTheme() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (isDark: boolean, isElite: boolean = false) => {
      // Remove all theme classes first
      root.classList.remove('dark', 'elite');
      
      if (isElite) {
        // Elite theme uses dark mode as base with elite overrides
        root.classList.add('dark', 'elite');
      } else if (isDark) {
        root.classList.add('dark');
      }
    };

    if (theme === 'system') {
      // Use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      // Listen for system theme changes
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (theme === 'elite') {
      applyTheme(true, true);
      return undefined;
    } else {
      applyTheme(theme === 'dark');
      return undefined;
    }
  }, [theme]);

  return theme ?? 'system';
}
