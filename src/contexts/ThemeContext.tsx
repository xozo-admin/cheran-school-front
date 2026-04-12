// // src/contexts/ThemeContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, ThemeName } from '@/design-system/themes';

interface ThemeContextType {
  theme: ThemeName;
  toggleTheme: () => void;
  setTheme: (theme: ThemeName) => void;
  applyTheme: (themeName: ThemeName) => void;
  isSystemDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('light');
  const [isSystemDark, setIsSystemDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize theme
  useEffect(() => {
    setIsMounted(true);
    
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);
    
    // Handle system theme changes
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
      if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Get stored theme or system preference
    const storedTheme = localStorage.getItem('theme') as ThemeName | null;
    const systemTheme = mediaQuery.matches ? 'dark' : 'light';
    const initialTheme = storedTheme || systemTheme;
    
    applyTheme(initialTheme);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const applyTheme = (themeName: ThemeName) => {
    const themeConfig = themes[themeName];
    
    // Apply CSS variables
    const root = document.documentElement;
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', themeName);
    // Enable Tailwind dark variant styles (darkMode: 'class')
    root.classList.toggle('dark', themeName === 'dark');
    
    // Store theme
    setTheme(themeName);
    localStorage.setItem('theme', themeName);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme: themeName } 
    }));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme: applyTheme,
      applyTheme,
      isSystemDark 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
