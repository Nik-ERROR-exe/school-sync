import React from 'react';
import { useTheme, RevealShape } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export interface AnimatedThemeTogglerProps {
  variant?: RevealShape;
  duration?: number;
  fromCenter?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedThemeToggler: React.FC<AnimatedThemeTogglerProps> = ({
  variant = 'circle',
  duration = 500,
  fromCenter = false,
  className = '',
  size = 'md',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = (e: React.MouseEvent) => {
    toggleTheme({
      event: e,
      variant,
      duration,
      fromCenter,
    });
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-10 w-10 text-base',
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={`Toggle theme using ${variant} transition`}
      className={`
        relative flex items-center justify-center rounded-xl border transition-all duration-300 shadow-xs hover:scale-105 active:scale-95 cursor-pointer select-none
        ${sizeClasses}
        ${
          isDark
            ? 'bg-indigo-950/80 border-indigo-800/80 text-indigo-300 hover:bg-indigo-900/80 hover:text-indigo-200'
            : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 hover:text-amber-700'
        }
        ${className}
      `}
    >
      <span className="relative flex items-center justify-center">
        {isDark ? (
          <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 hover:-rotate-12" />
        ) : (
          <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 hover:rotate-45" />
        )}
      </span>
    </button>
  );
};

export default AnimatedThemeToggler;
