import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  DarkTheme,
  LightTheme,
  type ThemeColors,
  type ThemeMode,
} from '../constants/colors';
import { StorageKeys, getString, setString } from '../lib/utils/storage';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: DarkTheme,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = getString(StorageKeys.THEME_MODE);
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const colors = useMemo(() => (mode === 'dark' ? DarkTheme : LightTheme), [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    setString(StorageKeys.THEME_MODE, newMode);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
