import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const saved = localStorage.getItem('theme') || localStorage.getItem('auth_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const applyThemeClass = (newTheme: ThemeMode) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  };

  useEffect(() => {
    applyThemeClass(theme);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('auth_theme', newTheme);
    applyThemeClass(newTheme);
  };

  const getShapeClipPaths = (
    variant: RevealShape,
    x: number,
    y: number,
    R: number
  ): { start: string; end: string } => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    switch (variant) {
      case 'square':
      case 'rectangle': {
        return {
          start: `inset(${y}px ${w - x}px ${h - y}px ${x}px)`,
          end: `inset(0px 0px 0px 0px)`,
        };
      }
      case 'triangle': {
        return {
          start: `polygon(${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px)`,
          end: `polygon(${x}px ${y - R * 2.5}px, ${x + R * 2.5}px ${y + R * 2.5}px, ${x - R * 2.5}px ${y + R * 2.5}px)`,
        };
      }
      case 'diamond': {
        return {
          start: `polygon(${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px)`,
          end: `polygon(${x}px ${y - R * 2}px, ${x + R * 2}px ${y}px, ${x}px ${y + R * 2}px, ${x - R * 2}px ${y}px)`,
        };
      }
      case 'hexagon': {
        return {
          start: `polygon(${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px)`,
          end: `polygon(${x - R * 0.8}px ${y - R * 1.4}px, ${x + R * 0.8}px ${y - R * 1.4}px, ${x + R * 1.6}px ${y}px, ${x + R * 0.8}px ${y + R * 1.4}px, ${x - R * 0.8}px ${y + R * 1.4}px, ${x - R * 1.6}px ${y}px)`,
        };
      }
      case 'star': {
        const p1 = `${x}px ${y - R * 2}px`;
        const p2 = `${x + R * 0.6}px ${y - R * 0.6}px`;
        const p3 = `${x + R * 2}px ${y - R * 0.6}px`;
        const p4 = `${x + R * 0.9}px ${y + R * 0.4}px`;
        const p5 = `${x + R * 1.4}px ${y + R * 1.8}px`;
        const p6 = `${x}px ${y + R}px`;
        const p7 = `${x - R * 1.4}px ${y + R * 1.8}px`;
        const p8 = `${x - R * 0.9}px ${y + R * 0.4}px`;
        const p9 = `${x - R * 2}px ${y - R * 0.6}px`;
        const p10 = `${x - R * 0.6}px ${y - R * 0.6}px`;
        return {
          start: `polygon(${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px)`,
          end: `polygon(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, ${p6}, ${p7}, ${p8}, ${p9}, ${p10})`,
        };
      }
      case 'circle':
      default: {
        return {
          start: `circle(0px at ${x}px ${y}px)`,
          end: `circle(${R}px at ${x}px ${y}px)`,
        };
      }
    }
  };

  const toggleTheme = (options?: ToggleThemeOptions | React.MouseEvent) => {
    let event: React.MouseEvent | undefined;
    let variant: RevealShape = 'circle';
    let duration = 500;
    let fromCenter = false;

    if (options && 'target' in options && 'preventDefault' in options) {
      // Direct MouseEvent passed
      event = options as React.MouseEvent;
    } else if (options && typeof options === 'object') {
      const opts = options as ToggleThemeOptions;
      event = opts.event;
      variant = opts.variant || 'circle';
      duration = opts.duration || 500;
      fromCenter = opts.fromCenter || false;
    }

    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';

    // Fallback if View Transitions API is not supported
    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    // Origin coordinates: viewport center if fromCenter is true, otherwise click location
    const x = fromCenter || !event ? window.innerWidth / 2 : event.clientX;
    const y = fromCenter || !event ? window.innerHeight / 2 : event.clientY;

    // Calculate radius to cover the viewport
    const R = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const { start, end } = getShapeClipPaths(variant, x, y, R);

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      const isGoingDark = nextTheme === 'dark';

      document.documentElement.animate(
        {
          clipPath: isGoingDark ? [start, end] : [end, start],
        },
        {
          duration,
          easing: 'ease-in-out',
          pseudoElement: isGoingDark
            ? '::view-transition-new(root)'
            : '::view-transition-old(root)',
        }
      );
    });
  };

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
