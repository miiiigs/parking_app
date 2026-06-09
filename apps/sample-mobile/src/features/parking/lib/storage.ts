import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

const fallbackMemory = new Map<string, string>();

export const secureStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return fallbackMemory.get(name) ?? null;
    }
  },
  setItem: async (name, value) => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      fallbackMemory.set(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      fallbackMemory.delete(name);
    }
  },
};
