import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '@/types';

interface SettingsState {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  fontScale: 1.0,
  autoScroll: true,
  scrollSpeed: 1.0,
  keepScreenAwake: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) => 
        set((state) => ({ 
          settings: { ...state.settings, ...newSettings } 
        })),
    }),
    {
      name: 'setmaster-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);