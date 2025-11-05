import React, { createContext, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import colors from '@/constants/colors';

// Define the theme context type
type ThemeContextType = {
  theme: 'dark' | 'light';
  colors: typeof colors.dark | typeof colors.light;
  isDark: boolean;
  toggleTheme: () => void;
};

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: colors.dark,
  isDark: true,
  toggleTheme: () => {},
});

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

// Theme provider component with error handling
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  try {
    const { settings, updateSettings } = useSettingsStore();
    const systemColorScheme = useColorScheme();
    
    // Determine the actual theme based on settings and system preference
    const themePreference = settings?.theme || 'dark';
    const actualTheme = themePreference === 'system' 
      ? (systemColorScheme || 'light') 
      : themePreference;
    
    const isDark = actualTheme === 'dark';
    const themeColors = isDark ? colors.dark : colors.light;
    
    // Function to toggle between dark and light themes
    const toggleTheme = () => {
      try {
        updateSettings({ theme: isDark ? 'light' : 'dark' });
      } catch (error) {
        console.log('Theme toggle error:', error);
      }
    };
    
    // Create the theme context value
    const themeContext: ThemeContextType = {
      theme: actualTheme as 'dark' | 'light',
      colors: themeColors,
      isDark,
      toggleTheme,
    };
    
    return (
      <ThemeContext.Provider value={themeContext}>
        {children}
      </ThemeContext.Provider>
    );
  } catch (error) {
    console.log('ThemeProvider error:', error);
    // Fallback to default theme
    const fallbackContext: ThemeContextType = {
      theme: 'dark',
      colors: colors.dark,
      isDark: true,
      toggleTheme: () => {},
    };
    
    return (
      <ThemeContext.Provider value={fallbackContext}>
        {children}
      </ThemeContext.Provider>
    );
  }
};