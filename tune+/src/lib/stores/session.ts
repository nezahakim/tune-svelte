// src/lib/stores/session.ts
import { writable } from 'svelte/store';

// Define the session data interface
export interface SessionData {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
  } | null;
  authenticated: boolean;
  token?: string;
}

// Initialize with default values
const initialSession: SessionData = {
  user: null,
  authenticated: false
};

// Create the session store
function createSessionStore() {
  // Check if localStorage is available (for browser environment)
  const isLocalStorageAvailable = typeof localStorage !== 'undefined';
  
  // Try to get existing session from localStorage
  let storedSession: SessionData | null = null;
  
  if (isLocalStorageAvailable) {
    try {
      const stored = localStorage.getItem('userSession');
      if (stored) {
        storedSession = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading session from localStorage:', e);
    }
  }
  
  // Create the writable store with either the stored session or initial values
  const { subscribe, set, update } = writable<SessionData>(storedSession || initialSession);
  
  return {
    subscribe,
    
    // Update session data
    update: (newData: Partial<SessionData>) => {
      update(session => {
        const updatedSession = { ...session, ...newData };
        
        // Save to localStorage if available
        if (isLocalStorageAvailable) {
          localStorage.setItem('userSession', JSON.stringify(updatedSession));
        }
        
        return updatedSession;
      });
    },
    
    // Set complete session data
    set: (newSession: SessionData) => {
      set(newSession);
      
      // Save to localStorage if available
      if (isLocalStorageAvailable) {
        localStorage.setItem('userSession', JSON.stringify(newSession));
      }
    },
    
    // Login user
    login: (userData: SessionData['user'], token?: string) => {
      const newSession = {
        user: userData,
        authenticated: true,
        token
      };
      
      set(newSession);
      
      // Save to localStorage if available
      if (isLocalStorageAvailable) {
        localStorage.setItem('userSession', JSON.stringify(newSession));
      }
    },
    
    // Logout user
    logout: () => {
      set(initialSession);
      
      // Remove from localStorage if available
      if (isLocalStorageAvailable) {
        localStorage.removeItem('userSession');
      }
    }
  };
}

// Export the session store
export const session = createSessionStore();