import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, Quest, Streak, DayProgress, CompletedQuestHistory, DisciplineCheck } from './types';
import { firebaseService } from './services/firebase';

interface StoreActions {
  authenticate: (code: string) => void;
  logout: () => void;
  addQuest: (title: string, type: 'permanent' | 'temporary') => void;
  removeQuest: (id: string, type: 'permanent' | 'temporary') => void;
  editQuest: (id: string, newTitle: string) => void;
  toggleQuest: (id: string, type: 'permanent' | 'temporary') => void;
  
  addDisciplineCheck: (title: string, penaltyType: 'xp_reset' | 'level_reduction', penaltyValue: number) => void;
  removeDisciplineCheck: (id: string) => void;
  updateDisciplineCheck: (id: string, title: string, penaltyType: 'xp_reset' | 'level_reduction', penaltyValue: number) => void;
  triggerDisciplineFailure: (id: string) => void;
  
  breakDiscipline: () => void;
  toggleVoice: () => void;
  checkDailyReset: () => void;
  resetDayTasksOnly: () => void;
  resetDayWithXP: () => void;
  resetDayManual: () => void; 
  updateStreakManual: (val: number) => void;
  resetProgressAll: () => void;
  setSyncing: (val: boolean) => void;
  setLastSync: (val: string) => void;
  applyRemoteState: (state: Partial<AppState>) => void;
}

export const calculateRequiredXP = (level: number) => 100 + (level - 1) * 30;

export const calculateRank = (level: number) => {
  const ranks = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  const index = Math.min(Math.floor((level - 1) / 15), ranks.length - 1);
  return ranks[index];
};

const DEFAULT_PERMANENT_QUESTS = [
  "Wake up at 5 AM", "40+ Min Editing", "Squats", "90+ Min Coding",
  "Pushups", "1 LeetCode Problem", "Situps", "Language Practice", "6–7 AM Walking"
];

const DEFAULT_DISCIPLINE_CHECKS: DisciplineCheck[] = [
  {
    id: 'junk-food',
    title: 'Did you spend money today on junk food?',
    penaltyType: 'xp_reset',
    penaltyValue: 0,
    currentStreak: 0,
    lastFailedDate: null
  },
  {
    id: 'broken-discipline',
    title: 'Did you break your discipline today?',
    penaltyType: 'level_reduction',
    penaltyValue: 3,
    currentStreak: 0,
    lastFailedDate: null
  }
];

const initialState: AppState = {
  isAuthenticated: false,
  userCode: null,
  permanentQuests: DEFAULT_PERMANENT_QUESTS.map(title => ({
    id: Math.random().toString(36).substr(2, 9),
    title,
    completed: false,
    type: 'permanent',
    createdAt: new Date().toISOString()
  })),
  temporaryQuests: [],
  completedTemporaryHistory: [],
  disciplineChecks: DEFAULT_DISCIPLINE_CHECKS,
  streak: { current: 0, longest: 0, lastCompletedDate: null },
  xp: 0,
  level: 1,
  disciplineBroken: false,
  voiceEnabled: true,
  lastResetDate: new Date().toDateString(),
  isSyncing: false,
  lastSyncAt: null,
  history: {},
};

let syncTimeout: any = null;

const scheduleSync = (state: AppState) => {
  if (!state.isAuthenticated || !state.userCode) return;
  
  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    const store = useStore.getState();
    store.setSyncing(true);
    // Passing the full state is safe now because firebaseService cleans it
    const success = await firebaseService.pushState(state.userCode!, state);
    if (success) {
      store.setLastSync(new Date().toISOString());
    }
    store.setSyncing(false);
  }, 1000);
};

export const useStore = create<AppState & StoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      authenticate: async (code) => {
        set({ isAuthenticated: true, userCode: code, isSyncing: true });
        
        // Load initial state from cloud
        const remoteState = await firebaseService.fetchState(code);
        if (remoteState) {
          // Merge remote state while keeping the local userCode and auth status
          set({ ...remoteState, isAuthenticated: true, userCode: code });
        } else {
          // If new profile, push initial local defaults to cloud
          scheduleSync(get());
        }
        
        set({ isSyncing: false, lastSyncAt: new Date().toISOString() });
      },

      logout: () => {
        set({ ...initialState, isAuthenticated: false, userCode: null });
      },

      applyRemoteState: (remoteState) => {
        const current = get();
        if (remoteState && remoteState.userCode === current.userCode) {
          // Create a clean comparison object to check if sync is needed
          const remoteDataOnly: any = {};
          const currentDataOnly: any = {};
          
          Object.keys(current).forEach(k => {
            if (typeof (current as any)[k] !== 'function' && k !== 'isSyncing' && k !== 'lastSyncAt') {
              currentDataOnly[k] = (current as any)[k];
            }
          });

          Object.keys(remoteState).forEach(k => {
             if (typeof (remoteState as any)[k] !== 'function' && k !== 'isSyncing' && k !== 'lastSyncAt') {
               remoteDataOnly[k] = (remoteState as any)[k];
             }
          });

          if (JSON.stringify(remoteDataOnly) !== JSON.stringify(currentDataOnly)) {
             set({ ...remoteState, isAuthenticated: true, userCode: current.userCode });
          }
        }
      },

      addQuest: (title, type) => {
        const newQuest: Quest = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          type,
          createdAt: new Date().toISOString(),
        };
        if (type === 'permanent') {
          set((state) => ({ permanentQuests: [...state.permanentQuests, newQuest] }));
        } else {
          set((state) => ({ temporaryQuests: [...state.temporaryQuests, newQuest] }));
        }
        scheduleSync(get());
      },

      removeQuest: (id, type) => {
        set((state) => ({
          permanentQuests: state.permanentQuests.filter((q) => q.id !== id),
          temporaryQuests: state.temporaryQuests.filter((q) => q.id !== id),
        }));
        scheduleSync(get());
      },

      editQuest: (id, newTitle) => {
        set((state) => ({
          permanentQuests: state.permanentQuests.map((q) => q.id === id ? { ...q, title: newTitle } : q)
        }));
        scheduleSync(get());
      },

      addDisciplineCheck: (title, penaltyType, penaltyValue) => {
        const newCheck: DisciplineCheck = {
          id: crypto.randomUUID(),
          title,
          penaltyType,
          penaltyValue,
          currentStreak: 0,
          lastFailedDate: null
        };
        set(state => ({ disciplineChecks: [...state.disciplineChecks, newCheck] }));
        scheduleSync(get());
      },

      removeDisciplineCheck: (id) => {
        set(state => ({ disciplineChecks: state.disciplineChecks.filter(c => c.id !== id) }));
        scheduleSync(get());
      },

      updateDisciplineCheck: (id, title, penaltyType, penaltyValue) => {
        set(state => ({
          disciplineChecks: state.disciplineChecks.map(c => 
            c.id === id ? { ...c, title, penaltyType, penaltyValue } : c
          )
        }));
        scheduleSync(get());
      },

      triggerDisciplineFailure: (id) => {
        const state = get();
        const today = new Date().toDateString();
        const check = state.disciplineChecks.find(c => c.id === id);
        if (!check || check.lastFailedDate === today) return;

        let newXP = state.xp;
        let newLevel = state.level;
        if (check.penaltyType === 'xp_reset') {
          newXP = 0;
        } else if (check.penaltyType === 'level_reduction') {
          newLevel = Math.max(1, newLevel - check.penaltyValue);
          newXP = 0;
        }

        const currentHistory = get().history[today] || { completedCount: 0, xpGained: 0, level: 1, streak: 0 };
        
        set({
          xp: newXP,
          level: newLevel,
          disciplineBroken: true,
          disciplineChecks: state.disciplineChecks.map(c => 
            c.id === id ? { ...c, currentStreak: 0, lastFailedDate: today } : c
          ),
          history: {
            ...get().history,
            [today]: {
              ...currentHistory,
              level: newLevel,
              streak: 0
            }
          }
        });

        window.dispatchEvent(new CustomEvent('xp-penalty'));
        scheduleSync(get());
      },

      toggleVoice: () => set(state => ({ voiceEnabled: !state.voiceEnabled })),

      toggleQuest: (id, type) => {
        const state = get();
        let xpGained = 0;
        const today = new Date().toDateString();
        const now = new Date();
        let toggledQuest: Quest | undefined;

        const updateList = (list: Quest[]) => list.map((q) => {
          if (q.id === id) {
            const newStatus = !q.completed;
            toggledQuest = { ...q, completed: newStatus };
            xpGained = newStatus ? (type === 'permanent' ? 10 : 5) : (type === 'permanent' ? -10 : -5);
            return toggledQuest;
          }
          return q;
        });

        if (type === 'permanent') {
          set({ permanentQuests: updateList(state.permanentQuests) });
        } else {
          set({ temporaryQuests: updateList(state.temporaryQuests) });
          if (toggledQuest && toggledQuest.completed) {
            const historyEntry: CompletedQuestHistory = {
              id: crypto.randomUUID(),
              title: toggledQuest.title,
              completedAt: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            };
            set(s => ({ completedTemporaryHistory: [historyEntry, ...s.completedTemporaryHistory] }));
          }
        }

        let newXP = get().xp + xpGained;
        let newLevel = get().level;
        const reqXP = calculateRequiredXP(newLevel);
        
        if (newXP >= reqXP) {
          newXP -= reqXP;
          newLevel += 1;
          window.dispatchEvent(new CustomEvent('level-up', { detail: { level: newLevel } }));
        } else if (newXP < 0) {
          if (newLevel > 1) {
            newLevel -= 1;
            newXP = calculateRequiredXP(newLevel) + newXP;
            window.dispatchEvent(new CustomEvent('level-down', { detail: { level: newLevel } }));
          } else {
            newXP = 0;
          }
        }

        const currentHistory = get().history[today] || { completedCount: 0, xpGained: 0, level: 1, streak: 0 };
        set({
          xp: newXP,
          level: newLevel,
          history: {
            ...get().history,
            [today]: {
              completedCount: Math.max(0, currentHistory.completedCount + (xpGained > 0 ? 1 : -1)),
              xpGained: Math.max(0, currentHistory.xpGained + xpGained),
              level: newLevel,
              streak: get().streak.current
            }
          }
        });
        
        scheduleSync(get());
      },

      breakDiscipline: () => {
         const state = get();
         if (state.disciplineChecks.length > 0) {
           get().triggerDisciplineFailure(state.disciplineChecks[0].id);
         }
      },

      checkDailyReset: () => {
        const today = new Date().toDateString();
        const state = get();
        if (state.lastResetDate !== today) {
          get().resetDayTasksOnly();
        }
      },

      resetDayTasksOnly: () => {
        const state = get();
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        let updatedStreak = { ...state.streak };
        const allPermanentDone = state.permanentQuests.length > 0 && state.permanentQuests.every(q => q.completed);
        const yesterdayCompleted = state.streak.lastCompletedDate === yesterdayStr;

        if (allPermanentDone && !state.disciplineBroken && state.streak.lastCompletedDate !== today) {
           const newCurrent = yesterdayCompleted ? state.streak.current + 1 : 1;
           updatedStreak = {
             current: newCurrent,
             longest: Math.max(state.streak.longest, newCurrent),
             lastCompletedDate: today
           };
        } else if (state.disciplineBroken || !yesterdayCompleted) {
           updatedStreak.current = 0;
        }

        const yesterdayHistory = state.history[yesterdayStr] || { completedCount: 0, xpGained: 0, level: 1, streak: 0 };
        
        set({
          lastResetDate: today,
          disciplineBroken: false,
          streak: updatedStreak,
          permanentQuests: state.permanentQuests.map(q => ({ ...q, completed: false })),
          temporaryQuests: state.temporaryQuests.filter(q => !q.completed),
          history: {
            ...state.history,
            [yesterdayStr]: {
              ...yesterdayHistory,
              level: state.level,
              streak: state.streak.current
            },
            [today]: {
              completedCount: 0,
              xpGained: 0,
              level: state.level,
              streak: updatedStreak.current
            }
          }
        });
        scheduleSync(get());
      },

      resetDayWithXP: () => {
        const state = get();
        const today = new Date().toDateString();
        const todayXP = state.history[today]?.xpGained || 0;

        get().resetDayTasksOnly();

        let newXP = get().xp - todayXP;
        let newLevel = get().level;

        if (newXP < 0) {
           while (newXP < 0 && newLevel > 1) {
              newLevel -= 1;
              newXP = calculateRequiredXP(newLevel) + newXP;
           }
           if (newXP < 0) newXP = 0;
        }

        set({
          xp: newXP,
          level: newLevel,
          history: {
            ...get().history,
            [today]: { ...get().history[today], xpGained: 0, level: newLevel }
          }
        });
        scheduleSync(get());
      },

      resetDayManual: () => get().resetDayTasksOnly(),

      updateStreakManual: (val) => {
        set((state) => ({
          streak: {
            ...state.streak,
            current: val,
            longest: Math.max(state.streak.longest, val)
          }
        }));
        scheduleSync(get());
      },

      resetProgressAll: () => {
        set({
          xp: 0,
          level: 1,
          streak: { current: 0, longest: 0, lastCompletedDate: null },
          history: {},
          completedTemporaryHistory: [],
          disciplineChecks: DEFAULT_DISCIPLINE_CHECKS,
          disciplineBroken: false,
          permanentQuests: get().permanentQuests.map(q => ({ ...q, completed: false })),
          temporaryQuests: []
        });
        scheduleSync(get());
      },

      setSyncing: (val) => set({ isSyncing: val }),
      setLastSync: (val) => set({ lastSyncAt: val }),
    }),
    {
      name: 'solo-system-firebase-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
