// src/design-system/themes/index.ts

import { tokens } from '../tokens';

// Theme definitions using design tokens
export const themes = {
  light: {
    name: 'light',
    colors: {
      // Background
      'bg-primary': tokens.colors.neutral[0],
      'bg-secondary': tokens.colors.neutral[50],
      'bg-tertiary': tokens.colors.neutral[100],
      'bg-card': tokens.colors.neutral[0],
      'bg-overlay': tokens.colors.neutral[0],
      'bg-hover': tokens.colors.neutral[100],
      
      // Text
      'text-primary': tokens.colors.neutral[900],
      'text-secondary': tokens.colors.neutral[600],
      'text-tertiary': tokens.colors.neutral[500],
      'text-muted': tokens.colors.neutral[400],
      'text-inverted': tokens.colors.neutral[0],
      
      // Border
      'border-primary': tokens.colors.neutral[200],
      'border-secondary': tokens.colors.neutral[300],
      'border-strong': tokens.colors.neutral[400],
      
      // Accent
      'accent-primary': tokens.colors.primary[600],
      'accent-secondary': tokens.colors.primary[400],
      'accent-success': tokens.colors.success[500],
      'accent-warning': tokens.colors.warning[500],
      'accent-error': tokens.colors.error[500],
      
      // Status
      'status-success': tokens.colors.success[500],
      'status-warning': tokens.colors.warning[500],
      'status-error': tokens.colors.error[500],
      'status-info': tokens.colors.primary[500],
      
      // Icon
      'icon-primary': tokens.colors.neutral[600],
      'icon-secondary': tokens.colors.neutral[500],
      'icon-accent': tokens.colors.primary[500],
    },
  },
  dark: {
    name: 'dark',
    colors: {
      // Background
      'bg-primary': tokens.colors.neutral[950],
      'bg-secondary': tokens.colors.neutral[900],
      'bg-tertiary': tokens.colors.neutral[800],
      'bg-card': tokens.colors.neutral[900],
      'bg-overlay': tokens.colors.neutral[800],
      'bg-hover': tokens.colors.neutral[800],
      
      // Text
      'text-primary': tokens.colors.neutral[50],
      'text-secondary': tokens.colors.neutral[300],
      'text-tertiary': tokens.colors.neutral[400],
      'text-muted': tokens.colors.neutral[500],
      'text-inverted': tokens.colors.neutral[950],
      
      // Border
      'border-primary': tokens.colors.neutral[800],
      'border-secondary': tokens.colors.neutral[700],
      'border-strong': tokens.colors.neutral[600],
      
      // Accent
      'accent-primary': tokens.colors.primary[400],
      'accent-secondary': tokens.colors.primary[300],
      'accent-success': tokens.colors.success[400],
      'accent-warning': tokens.colors.warning[400],
      'accent-error': tokens.colors.error[400],
      
      // Status
      'status-success': tokens.colors.success[400],
      'status-warning': tokens.colors.warning[400],
      'status-error': tokens.colors.error[400],
      'status-info': tokens.colors.primary[400],
      
      // Icon
      'icon-primary': tokens.colors.neutral[400],
      'icon-secondary': tokens.colors.neutral[500],
      'icon-accent': tokens.colors.primary[400],
    },
  },
} as const;

export type ThemeName = keyof typeof themes;
export type ThemeColorKey = keyof typeof themes.light.colors;