"use client";

import React, { useState } from 'react';

/* ─────────────────────────────────────────────
   AUTH INPUT — Shared premium input component
   ───────────────────────────────────────────── */

export interface AuthInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  error?: string;
  disabled?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  icon,
  rightSlot,
  error,
  disabled = false,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label row */}
      <div className="flex items-center justify-between px-0.5">
        <label
          htmlFor={id}
          className={`text-[11.5px] font-semibold tracking-[0.03em] uppercase select-none transition-colors duration-200 ${
            focused
              ? 'text-[var(--primary-color)]'
              : 'text-[var(--secondary-text)]'
          }`}
        >
          {label}
        </label>
        {error && (
          <span className="text-[11px] font-medium text-red-500 animate-fade-in">
            {error}
          </span>
        )}
      </div>

      {/* Input container */}
      <div
        className={`
          auth-input-container
          relative flex items-center h-[46px] w-full rounded-[12px] border
          transition-all duration-200
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
          ${
            error
              ? 'border-red-500/70 shadow-[0_0_0_2px_rgba(239,68,68,0.08)]'
              : focused
              ? 'border-[var(--primary-color)] shadow-[0_0_0_2.5px_rgba(23,105,255,0.1)]'
              : 'border-[var(--border-color)] hover:border-[color-mix(in_srgb,var(--border-color),var(--text-color)_20%)]'
          }
        `}
        style={{ backgroundColor: 'var(--input-bg)' }}
      >
        {/* Icon */}
        <span
          className={`
            absolute left-3 flex items-center justify-center
            transition-all duration-200
            ${
              focused
                ? 'text-[var(--primary-color)] scale-105'
                : error
                ? 'text-red-400'
                : 'text-[var(--secondary-text)]'
            }
          `}
        >
          {icon}
        </span>

        {/* Input */}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-label={label}
          aria-invalid={!!error}
          className="
            w-full h-full bg-transparent pl-9 pr-10
            text-[13.5px] font-medium
            text-[var(--text-color)]
            placeholder:text-[var(--secondary-text)]
            outline-none rounded-[12px]
            transition-colors duration-200
          "
        />

        {/* Right slot (password toggle, etc.) */}
        {rightSlot && (
          <span className="absolute right-3 flex items-center justify-center">
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   AUTH CHECKBOX — Custom accessible checkbox
   ───────────────────────────────────────────── */

export interface AuthCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const AuthCheckbox: React.FC<AuthCheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
}) => (
  <label
    htmlFor={id}
    className="group flex cursor-pointer select-none items-center gap-2 text-[12px] font-medium text-[var(--secondary-text)] hover:text-[var(--text-color)] transition-colors duration-200"
  >
    <div className="relative flex items-center justify-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div
        className={`
          h-4 w-4 rounded-[5px] border flex items-center justify-center
          transition-all duration-200
          ${
            checked
              ? 'bg-[var(--primary-color)] border-[var(--primary-color)] shadow-sm'
              : 'bg-[var(--input-bg)] border-[var(--border-color)] group-hover:border-[color-mix(in_srgb,var(--border-color),var(--text-color)_25%)]'
          }
        `}
      >
        <svg
          className={`h-2.5 w-2.5 text-white transition-all duration-200 ${
            checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6L5 8.5L9.5 3.5" />
        </svg>
      </div>
    </div>
    <span>{label}</span>
  </label>
);

/* ─────────────────────────────────────────────
   AUTH BUTTON — Premium primary CTA
   ───────────────────────────────────────────── */

export interface AuthButtonProps {
  type?: 'submit' | 'button';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  onClick?: () => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  type = 'submit',
  loading = false,
  disabled = false,
  children,
  loadingText = 'Please wait…',
  onClick,
}) => (
  <button
    type={type}
    disabled={loading || disabled}
    onClick={onClick}
    className="
      group relative flex w-full items-center justify-center gap-2
      h-[46px] rounded-[12px]
      bg-[var(--primary-color)]
      text-[13.5px] font-semibold text-white
      shadow-[0_2px_8px_rgba(23,105,255,0.2)]
      transition-all duration-200
      hover:-translate-y-[1px] hover:brightness-110
      hover:shadow-[0_6px_16px_rgba(23,105,255,0.3)]
      active:translate-y-0 active:scale-[0.995] active:brightness-100
      disabled:opacity-55 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-color)]
    "
  >
    {loading ? (
      <>
        <svg className="h-4 w-4 animate-spin text-white/90" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span className="opacity-90">{loadingText}</span>
      </>
    ) : (
      children
    )}
  </button>
);

/* ─────────────────────────────────────────────
   PASSWORD TOGGLE — Accessible eye button
   ───────────────────────────────────────────── */

import { Eye, EyeOff } from 'lucide-react';

export interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export const PasswordToggle: React.FC<PasswordToggleProps> = ({ visible, onToggle }) => (
  <button
    type="button"
    aria-label={visible ? 'Hide password' : 'Show password'}
    onClick={onToggle}
    tabIndex={-1}
    className="
      text-[var(--secondary-text)]
      hover:text-[var(--text-color)]
      transition-all duration-200
      rounded-md p-0.5
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary-color)]
    "
  >
    <span className="relative block h-4 w-4 overflow-hidden">
      {visible ? (
        <EyeOff size={16} className="absolute inset-0 transition-transform duration-200" />
      ) : (
        <Eye size={16} className="absolute inset-0 transition-transform duration-200" />
      )}
    </span>
  </button>
);

/* ─────────────────────────────────────────────
   SEGMENTED CONTROL — Login / Register switch
   ───────────────────────────────────────────── */

export interface SegmentedControlProps {
  active: 'login' | 'register';
  onSwitch: (tab: 'login' | 'register') => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ active, onSwitch }) => (
  <div className="relative flex rounded-[10px] p-[3px] border border-[var(--border-color)] bg-[var(--input-bg)]">
    {/* Sliding indicator */}
    <div
      className="
        absolute top-[3px] bottom-[3px] rounded-[8px]
        bg-[var(--primary-color)]
        shadow-sm
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
      "
      style={{
        width: 'calc(50% - 3px)',
        left: active === 'login' ? '3px' : 'calc(50%)',
      }}
    />
    <button
      type="button"
      onClick={() => onSwitch('login')}
      className={`
        relative z-10 flex-1 rounded-[8px] px-4 py-[6px]
        text-[12px] font-semibold
        transition-colors duration-200
        ${active === 'login' ? 'text-white' : 'text-[var(--secondary-text)] hover:text-[var(--text-color)]'}
      `}
    >
      Login
    </button>
    <button
      type="button"
      onClick={() => onSwitch('register')}
      className={`
        relative z-10 flex-1 rounded-[8px] px-4 py-[6px]
        text-[12px] font-semibold
        transition-colors duration-200
        ${active === 'register' ? 'text-white' : 'text-[var(--secondary-text)] hover:text-[var(--text-color)]'}
      `}
    >
      Register
    </button>
  </div>
);

/* ─────────────────────────────────────────────
   LANGUAGE SELECTOR — Compact lang toggle
   ───────────────────────────────────────────── */

export interface LanguageSelectorProps {
  currentLang: string;
  onChange: (lang: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onChange }) => (
  <div className="flex items-center rounded-[10px] border border-[var(--border-color)] bg-[var(--input-bg)] p-[3px]">
    {(['en', 'mr'] as const).map((code) => (
      <button
        key={code}
        type="button"
        onClick={() => onChange(code)}
        className={`
          rounded-[7px] px-2.5 py-[5px]
          text-[11px] font-semibold
          transition-all duration-200
          ${
            currentLang === code
              ? 'bg-[var(--surface-color)] text-[var(--primary-color)] shadow-xs'
              : 'text-[var(--secondary-text)] hover:text-[var(--text-color)]'
          }
        `}
      >
        {code === 'en' ? 'EN' : 'मराठी'}
      </button>
    ))}
  </div>
);

export default AuthInput;
