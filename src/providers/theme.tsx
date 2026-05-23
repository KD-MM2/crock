import { useEffect, useMemo, useState } from 'react';
import type { Theme, ThemeProviderProps } from '@/types/theme';
import { ThemeProviderContext } from '@/contexts/theme';

function readStoredTheme(key: string, fallback: Theme): Theme {
  const stored = localStorage.getItem(key);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : fallback;
}

export default function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'vite-ui-theme', ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme));

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (next: Theme) => {
      localStorage.setItem(storageKey, next);
      setTheme(next);
    }
  }), [theme, storageKey]);

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
