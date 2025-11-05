import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Setlist } from '@/types';

interface SetlistState {
  setlists: Record<string, Setlist>;
  activeSetlistId: string | null;
  addSetlist: (setlist: Setlist) => void;
  updateSetlist: (id: string, updates: Partial<Setlist>) => void;
  deleteSetlist: (id: string) => void;
  setActiveSetlist: (id: string | null) => void;
  reorderSongs: (setlistId: string, songIds: string[]) => void;
}

export const useSetlistStore = create<SetlistState>()(
  persist(
    (set) => ({
      setlists: {},
      activeSetlistId: null,
      addSetlist: (setlist) => 
        set((state) => ({ 
          setlists: { ...state.setlists, [setlist.id]: setlist } 
        })),
      updateSetlist: (id, updates) => 
        set((state) => {
          if (!state.setlists[id]) return state;
          return {
            setlists: {
              ...state.setlists,
              [id]: {
                ...state.setlists[id],
                ...updates,
                updatedAt: Date.now(),
              }
            }
          };
        }),
      deleteSetlist: (id) => 
        set((state) => {
          const newSetlists = { ...state.setlists };
          delete newSetlists[id];
          return { 
            setlists: newSetlists,
            activeSetlistId: state.activeSetlistId === id ? null : state.activeSetlistId
          };
        }),
      setActiveSetlist: (id) => 
        set({ activeSetlistId: id }),
      reorderSongs: (setlistId, songIds) => 
        set((state) => {
          if (!state.setlists[setlistId]) return state;
          return {
            setlists: {
              ...state.setlists,
              [setlistId]: {
                ...state.setlists[setlistId],
                songs: songIds,
                updatedAt: Date.now(),
              }
            }
          };
        }),
    }),
    {
      name: 'setmaster-setlists',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);