type ThemeMode = 'light' | 'dark';

export const getIconColor = (theme: ThemeMode, type: 'primary' | 'secondary' | 'accent' = 'primary') => {
  const colors = {
    light: {
      primary: '#6b7280',
      secondary: '#9ca3af',
      accent: '#3b82f6',
    },
    dark: {
      primary: '#d1d5db',
      secondary: '#9ca3af',
      accent: '#60a5fa',
    },
  };
  
  return colors[theme][type];
};

export const getTextColorClass = (theme: ThemeMode, importance: 'primary' | 'secondary' | 'tertiary') => {
  const classes = {
    light: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      tertiary: 'text-gray-500',
    },
    dark: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      tertiary: 'text-gray-400',
    },
  };
  
  return classes[theme][importance];
};

export const getBorderColorClass = (theme: ThemeMode, weight: 'light' | 'default' | 'strong') => {
  const classes = {
    light: {
      light: 'border-gray-200',
      default: 'border-gray-300',
      strong: 'border-gray-400',
    },
    dark: {
      light: 'border-gray-700',
      default: 'border-gray-600',
      strong: 'border-gray-500',
    },
  };
  
  return classes[theme][weight];
};
