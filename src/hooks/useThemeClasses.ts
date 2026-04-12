// src/hooks/useThemeClasses.ts

import { useTheme } from '@/contexts/ThemeContext';

export const themeClassMap = {
  // Background
  bg: {
    primary: 'bg-[var(--color-bg-primary)]',
    secondary: 'bg-[var(--color-bg-secondary)]',
    tertiary: 'bg-[var(--color-bg-tertiary)]',
    card: 'bg-[var(--color-bg-card)]',
    overlay: 'bg-[var(--color-bg-overlay)]',
    hover: 'hover:bg-[var(--color-bg-hover)]',
  },
  
  // Text
  text: {
    primary: 'text-[var(--color-text-primary)]',
    secondary: 'text-[var(--color-text-secondary)]',
    tertiary: 'text-[var(--color-text-tertiary)]',
    muted: 'text-[var(--color-text-muted)]',
    inverted: 'text-[var(--color-text-inverted)]',
  },
  
  // Border
  border: {
    primary: 'border-[var(--color-border-primary)]',
    secondary: 'border-[var(--color-border-secondary)]',
    strong: 'border-[var(--color-border-strong)]',
  },
  
  // Accent
  accent: {
    primary: 'text-[var(--color-accent-primary)]',
    secondary: 'text-[var(--color-accent-secondary)]',
    success: 'text-[var(--color-accent-success)]',
    warning: 'text-[var(--color-accent-warning)]',
    error: 'text-[var(--color-accent-error)]',
  },
  
  // Icon
  icon: {
    primary: 'text-[var(--color-icon-primary)]',
    secondary: 'text-[var(--color-icon-secondary)]',
    accent: 'text-[var(--color-icon-accent)]',
  },
  
  // Status
  status: {
    success: 'text-[var(--color-status-success)]',
    warning: 'text-[var(--color-status-warning)]',
    error: 'text-[var(--color-status-error)]',
    info: 'text-[var(--color-status-info)]',
  },
  
  // Shadows
  shadow: {
    sm: 'shadow-[var(--shadow-sm)]',
    md: 'shadow-[var(--shadow-md)]',
    lg: 'shadow-[var(--shadow-lg)]',
  },
} as const;

export type ThemeClassCategory = keyof typeof themeClassMap;
export type ThemeClassVariant<T extends ThemeClassCategory> = 
  keyof typeof themeClassMap[T];

export const useThemeClasses = () => {
  const { theme } = useTheme();

  const get = <T extends ThemeClassCategory>(
    category: T,
    variant: ThemeClassVariant<T>
  ): any => {
    return themeClassMap[category][variant];
  };

  const combine = (...classes: string[]): string => {
    return classes.filter(Boolean).join(' ');
  };

  return {
    get,
    combine,
    currentTheme: theme,
  };
};