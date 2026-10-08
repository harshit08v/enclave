'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'enclave_theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Apply theme to document
  const applyTheme = (mode: ThemeMode) => {
    if (typeof window === 'undefined') return;

    let isDark = false;
    if (mode === 'dark') {
      isDark = true;
    } else if (mode === 'light') {
      isDark = false;
    } else {
      // System preference
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      setResolvedTheme('dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      setResolvedTheme('light');
    }
  };

  useEffect(() => {
    // Read persisted theme
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const initialTheme: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    
    setThemeState(initialTheme);
    applyTheme(initialTheme);

    // Media query listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentStored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (!currentStored || currentStored === 'system') {
        applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
