import { create } from 'zustand';

interface AppState {
  isDarkMode: boolean;
  language: 'en' | 'tl';
  notificationsEnabled: boolean;
  mapStyle: 'standard' | 'satellite' | 'hybrid';

  // Actions
  setDarkMode: (isDarkMode: boolean) => void;
  setLanguage: (language: 'en' | 'tl') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setMapStyle: (style: 'standard' | 'satellite' | 'hybrid') => void;
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: true, // Default dark mode
  language: 'en',
  notificationsEnabled: true,
  mapStyle: 'standard',

  setDarkMode: (isDarkMode) => set({ isDarkMode }),
  setLanguage: (language) => set({ language }),
  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  setMapStyle: (style) => set({ mapStyle: style }),
}));
