import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export interface AnimatedThemeTogglerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: string; // kept for API compat, not used
  duration?: number; // kept for API compat, not used
}

export const AnimatedThemeToggler: React.FC<AnimatedThemeTogglerProps> = ({
  className = '',
  size = 'md',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = () => {
    toggleTheme();
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  }[size];

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`
        relative flex items-center justify-center rounded-[10px] border
        transition-all duration-300
        hover:scale-105 active:scale-95
        cursor-pointer select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-1
        ${sizeClasses}
        ${
          isDark
            ? 'bg-[var(--input-bg)] border-[var(--border-color)] text-blue-400 hover:text-blue-300'
            : 'bg-amber-50 border-amber-200/80 text-amber-500 hover:text-amber-600'
        }
        ${className}
      `}
    >
      <span className="relative flex items-center justify-center">
        {isDark ? (
          <Moon size={iconSize} className="transition-transform duration-300 hover:-rotate-12" />
        ) : (
          <Sun size={iconSize} className="transition-transform duration-300 hover:rotate-45" />
        )}
      </span>
    </button>
  );
};

export default AnimatedThemeToggler;
