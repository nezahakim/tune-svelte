// // src/lib/stores/session.ts
// import { writable } from 'svelte/store';

// // Define the session data interface
// export interface SessionData {
//   user: {
//     id: string;
//     name: string;
//     username: string;
//     email: string;
//   } | null;
//   authenticated: boolean;
//   token?: string;
// }

// // Initialize with default values
// const initialSession: SessionData = {
//   user: null,
//   authenticated: false
// };

// // Create the session store
// function createSessionStore() {
//   // Check if localStorage is available (for browser environment)
//   const isLocalStorageAvailable = typeof localStorage !== 'undefined';
  
//   // Try to get existing session from localStorage
//   let storedSession: SessionData | null = null;
  
//   if (isLocalStorageAvailable) {
//     try {
//       const stored = localStorage.getItem('userSession');
//       if (stored) {
//         storedSession = JSON.parse(stored);
//       }
//     } catch (e) {
//       console.error('Error loading session from localStorage:', e);
//     }
//   }
  
//   // Create the writable store with either the stored session or initial values
//   const { subscribe, set, update } = writable<SessionData>(storedSession || initialSession);
  
//   return {
//     subscribe,
    
//     // Update session data
//     update: (newData: Partial<SessionData>) => {
//       update(session => {
//         const updatedSession = { ...session, ...newData };
        
//         // Save to localStorage if available
//         if (isLocalStorageAvailable) {
//           localStorage.setItem('userSession', JSON.stringify(updatedSession));
//         }
        
//         return updatedSession;
//       });
//     },
    
//     // Set complete session data
//     set: (newSession: SessionData) => {
//       set(newSession);
      
//       // Save to localStorage if available
//       if (isLocalStorageAvailable) {
//         localStorage.setItem('userSession', JSON.stringify(newSession));
//       }
//     },
    
//     // Login user
//     login: (userData: SessionData['user'], token?: string) => {
//       const newSession = {
//         user: userData,
//         authenticated: true,
//         token
//       };
      
//       set(newSession);
      
//       // Save to localStorage if available
//       if (isLocalStorageAvailable) {
//         localStorage.setItem('userSession', JSON.stringify(newSession));
//       }
//     },
    
//     // Logout user
//     logout: () => {
//       set(initialSession);
      
//       // Remove from localStorage if available
//       if (isLocalStorageAvailable) {
//         localStorage.removeItem('userSession');
//         return true
//       }
//     }
//   };
// }

// // Export the session store
// export const session = createSessionStore();


import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface SessionData {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar?: string;
    preferences?: {
      theme: 'light' | 'dark';
      color: string;
    };
  } | null;
  authenticated: boolean;
  token?: string;
}

const initialSession: SessionData = {
  user: null,
  authenticated: false
};

function createSessionStore() {
  const STORAGE_KEY = 'userSessionData';
  const TOKEN_KEY = 'userAuthToken';

  const validateSession = (data: any): data is SessionData => {
    return data 
      && typeof data === 'object'
      && 'authenticated' in data
      && (data.user === null || (
        'id' in data.user &&
        'name' in data.user &&
        'username' in data.user &&
        'email' in data.user
      ));
  };

  const getInitialState = (): SessionData => {
    if (!browser) return initialSession;

    try {
      const storedSession = sessionStorage.getItem(STORAGE_KEY);
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        if (validateSession(parsedSession) && storedToken) {
          return {
            ...parsedSession,
            token: storedToken,
            authenticated: true
          };
        }
      }
    } catch (error) {
      console.error('Session validation failed:', error);
    }
    
    if (browser) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
    return initialSession;
  };

  const { subscribe, set, update } = writable<SessionData>(getInitialState());

  const persistSession = (data: SessionData) => {
    if (!browser) return;

    try {
      const { token, ...sessionData } = data;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  };

  return {
    subscribe,

    update: (newData: Partial<SessionData>) => {
      update(session => {
        const updatedSession = { ...session, ...newData };
        persistSession(updatedSession);
        return updatedSession;
      });
    },

    set: (newSession: SessionData) => {
      set(newSession);
      persistSession(newSession);
    },

    login: (userData: SessionData['user'], token?: string) => {
     
      if (!userData || !userData.id) {
        throw new Error('Invalid user data');
      }
      
      const newSession = {
        user: userData,
        authenticated: true,
        token
      };
      set(newSession);
      persistSession(newSession);
    },

    logout: () => {
      set(initialSession);
      if (browser) {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
      }
      return true;
    },

    isAuthenticated: (): boolean => {
      if (!browser) return false;

      const stored = sessionStorage.getItem(STORAGE_KEY);
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!stored || !token) return false;
      
      try {
        const session = JSON.parse(stored);
        return validateSession(session) && session.authenticated && !!session.user;
      } catch {
        return false;
      }
    }
  };
}

export const session = createSessionStore();