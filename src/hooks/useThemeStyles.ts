import { useTheme } from '@/contexts/ThemeContext';
import { themes } from '@/design-system/themes';

export const useThemeStyles = () => {
  const { theme } = useTheme();
  const currentTheme = themes[theme];

  const getColor = (colorKey: keyof typeof currentTheme.colors) => {
    return currentTheme.colors[colorKey];
  };

  const getStyle = (property: string, colorKey: keyof typeof currentTheme.colors) => {
    return { [property]: getColor(colorKey) };
  };

  return {
    getColor,
    getStyle,
    theme: currentTheme,
  };
};