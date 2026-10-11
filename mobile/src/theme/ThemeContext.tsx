import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette } from './colors';
import { useSettingsStore } from '../store/useSettingsStore';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: typeof darkPalette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const theme = useSettingsStore((s) => s.theme) || 'light';
  const setStoreTheme = useSettingsStore((s) => s.setTheme);

  const isDark = theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';
  const colors = isDark ? darkPalette : lightPalette;

  const setTheme = (newTheme: Theme) => {
    setStoreTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
