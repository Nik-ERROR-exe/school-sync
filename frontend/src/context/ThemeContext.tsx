import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';

export type ThemeMode = 'light' | 'dark';
export type RevealShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'rectangle' | 'hexagon' | 'star';

export interface ToggleThemeOptions {
  event?: React.MouseEvent;
  variant?: RevealShape;
  duration?: number;
  fromCenter?: boolean;
}

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: (options?: ToggleThemeOptions | React.MouseEvent) => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme') || localStorage.getItem('auth_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const applyThemeClass = useCallback((newTheme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, []);

  // Synchronize on mount and theme change
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme, applyThemeClass]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      localStorage.setItem('auth_theme', newTheme);
    }
    applyThemeClass(newTheme);
  }, [applyThemeClass]);

  const toggleTheme = useCallback((options?: ToggleThemeOptions | React.MouseEvent) => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';

    // The actual DOM update: flushSync forces React to synchronously re-render the DOM tree
    const updateDOM = () => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    };

    // Fallback if View Transitions API is not supported in current browser environment
    if (typeof document === 'undefined' || !('startViewTransition' in document) || typeof (document as any).startViewTransition !== 'function') {
      updateDOM();
      return;
    }

    // Execute theme mutation INSIDE document.startViewTransition
    (document as any).startViewTransition(updateDOM);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
