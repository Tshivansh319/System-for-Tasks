import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get as dbGet } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { AppState } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyD3FxsoP0RNm95ZF2QxOf37W2DWxw6THds",
  authDomain: "poetic-anthem-352414.firebaseapp.com",
  databaseURL: "https://poetic-anthem-352414-default-rtdb.firebaseio.com",
  projectId: "poetic-anthem-352414",
  storageBucket: "poetic-anthem-352414.firebasestorage.app",
  messagingSenderId: "1054697254947",
  appId: "1:1054697254947:web:128e69c5eb68c3ab758196",
  measurementId: "G-0BJK2H8LZZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
let analytics: any;

// Analytics is only available in supported environments
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.log("Analytics not supported in this environment");
}

export const firebaseService = {
  /**
   * Pushes the current state to the cloud keyed by userCode
   */
  async pushState(userCode: string, state: Partial<AppState>) {
    try {
      // Create a clean copy of the state for storage
      const { isSyncing, lastSyncAt, ...cleanState } = state as any;
      
      const userRef = ref(database, 'users/' + encodeURIComponent(userCode));
      await set(userRef, {
        state: cleanState,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Firebase Sync Error:", e);
      return false;
    }
  },

  /**
   * Fetches the initial state on login
   */
  async fetchState(userCode: string) {
    try {
      const userRef = ref(database, 'users/' + encodeURIComponent(userCode));
      const snapshot = await dbGet(userRef);
      if (snapshot.exists()) {
        return snapshot.val().state;
      }
      return null;
    } catch (e) {
      console.error("Firebase Fetch Error:", e);
      return null;
    }
  },

  /**
   * Subscribes to live changes for a specific user code
   */
  subscribeToChanges(userCode: string, onUpdate: (newState: AppState) => void) {
    const userRef = ref(database, 'users/' + encodeURIComponent(userCode));
    return onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        onUpdate(data.state);
      }
    }, (error) => {
      console.error("Firebase Live Subscription Error:", error);
    });
  }
};
