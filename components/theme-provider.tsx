'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme) ?? 'system';
    setThemeState(stored);
    applyTheme(stored);

    // Re-apply when OS preference changes (relevant only in system mode)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleOsChange = () => {
      const current = (localStorage.getItem('theme') as Theme) ?? 'system';
      if (current === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handleOsChange);
    return () => mq.removeEventListener('change', handleOsChange);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    // system — explicit attribute lets the CSS media query decide
    root.setAttribute('data-theme', 'system');
  }
}
