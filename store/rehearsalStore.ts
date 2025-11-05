import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSetlistStore } from './setlistStore';

export interface RehearsalSession {
  id: string;
  title: string;
  date: Date;
  duration: number; // in minutes
  setlistId?: string;
  songIds: string[];
  notes: string;
  completed: boolean;
  practiceGoals: string[];
  focusAreas: string[];
  isActive?: boolean;
  startedAt?: Date;
  currentSongIndex?: number; // Track current song in session
  temporarySetlistId?: string; // ID of temporary setlist created for this session
  timeRemaining?: number; // Time remaining in seconds
}

export interface RehearsalPlan {
  id: string;
  name: string;
  sessions: RehearsalSession[];
  createdAt: Date;
  updatedAt: Date;
  totalDuration: number; // in minutes
  aiGenerated: boolean;
}

interface RehearsalStore {
  plans: RehearsalPlan[];
  currentPlanId: string | null;
  sessions: RehearsalSession[];
  activeSessionId: string | null;
  loadPlans: () => Promise<void>;
  savePlans: () => Promise<void>;
  addPlan: (plan: RehearsalPlan) => void;
  updatePlan: (id: string, updates: Partial<RehearsalPlan>) => void;
  deletePlan: (id: string) => void;
  setCurrentPlan: (id: string | null) => void;
  addSession: (session: RehearsalSession) => void;
  updateSession: (id: string, updates: Partial<RehearsalSession>) => void;
  deleteSession: (id: string) => void;
  clearUpcomingSessions: () => void;
  clearCompletedSessions: () => void;
  markSessionComplete: (id: string) => void;
  startSession: (id: string) => void;
  stopSession: (id: string) => void;
  completeSession: (id: string) => void;
  getUpcomingSessions: () => RehearsalSession[];
  getPastSessions: () => RehearsalSession[];
  getActiveSession: () => RehearsalSession | null;
  createTemporarySetlist: (sessionId: string) => string | null;
  nextSessionSong: (sessionId: string) => void;
  previousSessionSong: (sessionId: string) => void;
  getCurrentSessionSong: (sessionId: string) => string | null;
  getSessionSongIndex: (sessionId: string) => number;
  getTotalSessionSongs: (sessionId: string) => number;
}

export const useRehearsalStore = create<RehearsalStore>((set, get) => ({
  plans: [],
  currentPlanId: null,
  sessions: [],
  activeSessionId: null,

  loadPlans: async () => {
    try {
      const plansData = await AsyncStorage.getItem('rehearsal_plans');
      const sessionsData = await AsyncStorage.getItem('rehearsal_sessions');
      const currentPlanData = await AsyncStorage.getItem('current_rehearsal_plan');
      
      if (plansData) {
        const plans = JSON.parse(plansData);
        // Convert date strings back to Date objects
        plans.forEach((plan: RehearsalPlan) => {
          plan.createdAt = new Date(plan.createdAt);
          plan.updatedAt = new Date(plan.updatedAt);
          plan.sessions.forEach((session: RehearsalSession) => {
            session.date = new Date(session.date);
          });
        });
        set({ plans });
      }
      
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        sessions.forEach((session: RehearsalSession) => {
          session.date = new Date(session.date);
        });
        set({ sessions });
      }
      
      if (currentPlanData) {
        set({ currentPlanId: currentPlanData });
      }
    } catch (error) {
      console.error('Error loading rehearsal plans:', error);
    }
  },

  savePlans: async () => {
    try {
      const { plans, sessions, currentPlanId } = get();
      await AsyncStorage.setItem('rehearsal_plans', JSON.stringify(plans));
      await AsyncStorage.setItem('rehearsal_sessions', JSON.stringify(sessions));
      if (currentPlanId) {
        await AsyncStorage.setItem('current_rehearsal_plan', currentPlanId);
      } else {
        await AsyncStorage.removeItem('current_rehearsal_plan');
      }
    } catch (error) {
      console.error('Error saving rehearsal plans:', error);
    }
  },

  addPlan: (plan) => {
    set((state) => ({
      plans: [...state.plans, plan],
    }));
    get().savePlans();
  },

  updatePlan: (id, updates) => {
    set((state) => ({
      plans: state.plans.map((plan) =>
        plan.id === id
          ? { ...plan, ...updates, updatedAt: new Date() }
          : plan
      ),
    }));
    get().savePlans();
  },

  deletePlan: (id) => {
    set((state) => ({
      plans: state.plans.filter((plan) => plan.id !== id),
      currentPlanId: state.currentPlanId === id ? null : state.currentPlanId,
    }));
    get().savePlans();
  },

  setCurrentPlan: (id) => {
    set({ currentPlanId: id });
    get().savePlans();
  },

  addSession: (session) => {
    set((state) => ({
      sessions: [...state.sessions, session],
    }));
    get().savePlans();
  },

  updateSession: (id, updates) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, ...updates } : session
      ),
    }));
    get().savePlans();
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
    }));
    get().savePlans();
  },

  markSessionComplete: (id) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, completed: true, isActive: false } : session
      ),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    }));
    get().savePlans();
  },

  startSession: (id) => {
    const now = new Date();
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id 
          ? { 
              ...session, 
              isActive: true, 
              startedAt: now,
              currentSongIndex: 0 // Start with first song
            } 
          : { ...session, isActive: false }
      ),
      activeSessionId: id,
    }));
    
    // Create temporary setlist if session has multiple songs
    const session = get().sessions.find(s => s.id === id);
    if (session && session.songIds.length > 1) {
      const tempSetlistId = get().createTemporarySetlist(id);
      if (tempSetlistId) {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, temporarySetlistId: tempSetlistId } : s
          ),
        }));
      }
    }
    
    get().savePlans();
  },

  stopSession: (id) => {
    const session = get().sessions.find(s => s.id === id);
    
    // Clean up temporary setlist if it exists
    if (session?.temporarySetlistId) {
      const setlistStore = useSetlistStore.getState();
      setlistStore.deleteSetlist(session.temporarySetlistId);
    }
    
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { 
          ...session, 
          isActive: false, 
          startedAt: undefined,
          currentSongIndex: undefined,
          temporarySetlistId: undefined
        } : session
      ),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    }));
    get().savePlans();
  },

  completeSession: (id) => {
    const session = get().sessions.find(s => s.id === id);
    
    // Clean up temporary setlist if it exists
    if (session?.temporarySetlistId) {
      const setlistStore = useSetlistStore.getState();
      setlistStore.deleteSetlist(session.temporarySetlistId);
    }
    
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { 
          ...session, 
          completed: true,
          isActive: false, 
          startedAt: undefined,
          currentSongIndex: undefined,
          temporarySetlistId: undefined
        } : session
      ),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    }));
    get().savePlans();
  },



  getUpcomingSessions: () => {
    const { sessions } = get();
    return sessions
      .filter((session) => !session.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  getPastSessions: () => {
    const { sessions } = get();
    return sessions
      .filter((session) => session.completed)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    return sessions.find(session => session.id === activeSessionId && session.isActive) || null;
  },

  clearUpcomingSessions: () => {
    // Clean up any temporary setlists from upcoming sessions
    const upcomingSessions = get().sessions.filter(session => !session.completed);
    const setlistStore = useSetlistStore.getState();
    
    upcomingSessions.forEach(session => {
      if (session.temporarySetlistId) {
        setlistStore.deleteSetlist(session.temporarySetlistId);
      }
    });
    
    set((state) => ({
      sessions: state.sessions.filter((session) => session.completed),
    }));
    get().savePlans();
  },

  clearCompletedSessions: () => {
    // Clean up any temporary setlists from completed sessions
    const completedSessions = get().sessions.filter(session => session.completed);
    const setlistStore = useSetlistStore.getState();
    
    completedSessions.forEach(session => {
      if (session.temporarySetlistId) {
        setlistStore.deleteSetlist(session.temporarySetlistId);
      }
    });
    
    set((state) => ({
      sessions: state.sessions.filter((session) => !session.completed),
    }));
    get().savePlans();
  },

  createTemporarySetlist: (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session || session.songIds.length <= 1) {
      return null;
    }
    
    const setlistStore = useSetlistStore.getState();
    
    // Calculate total duration from session duration (convert minutes to seconds)
    const totalDuration = session.duration * 60;
    
    const tempSetlistId = `temp_session_${sessionId}_${Date.now()}`;
    const tempSetlist = {
      id: tempSetlistId,
      name: `Session: ${session.title}`,
      songs: session.songIds,
      duration: totalDuration,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setlistStore.addSetlist(tempSetlist);
    return tempSetlistId;
  },

  nextSessionSong: (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session || session.songIds.length <= 1) return;
    
    const currentIndex = session.currentSongIndex || 0;
    const nextIndex = Math.min(currentIndex + 1, session.songIds.length - 1);
    
    if (nextIndex !== currentIndex) {
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, currentSongIndex: nextIndex } : s
        ),
      }));
      get().savePlans();
    }
  },

  previousSessionSong: (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session || session.songIds.length <= 1) return;
    
    const currentIndex = session.currentSongIndex || 0;
    const prevIndex = Math.max(currentIndex - 1, 0);
    
    if (prevIndex !== currentIndex) {
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, currentSongIndex: prevIndex } : s
        ),
      }));
      get().savePlans();
    }
  },

  getCurrentSessionSong: (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session || session.songIds.length === 0) return null;
    
    const currentIndex = session.currentSongIndex || 0;
    return session.songIds[currentIndex] || null;
  },

  getSessionSongIndex: (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    return session?.currentSongIndex || 0;
  },

  getTotalSessionSongs: (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    return session?.songIds.length || 0;
  },
}));