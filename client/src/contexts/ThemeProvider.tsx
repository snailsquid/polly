import { createContext, useEffect, type ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeContextType {
  theme: ReturnType<typeof useTheme>['theme'];
  resolvedTheme: ReturnType<typeof useTheme>['resolvedTheme'];
  setTheme: ReturnType<typeof useTheme>['setTheme'];
  toggleTheme: ReturnType<typeof useTheme>['toggleTheme'];
  isDark: ReturnType<typeof useTheme>['isDark'];
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeHook = useTheme();

  useEffect(() => {
    const resolved = themeHook.resolvedTheme;
    const html = document.documentElement;
    if (resolved === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [themeHook.resolvedTheme]);

  return (
    <ThemeContext.Provider value={themeHook}>
      {children}
    </ThemeContext.Provider>
  );
}