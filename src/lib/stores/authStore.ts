// Agent: agent_coder | File: authStore.ts | Last Updated: 2025-07-28T10:41:46+08:00
import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

// User roles based on agent_researcher security findings
export type UserRole = 'guest' | 'cashier' | 'pharmacist' | 'manager' | 'admin' | 'owner';

export interface User {
  id?: string;
  username?: string;
  role: UserRole;
  permissions: string[];
  session_id?: string;
  authenticated_at?: string;
  expires_at?: string;
}

export interface AuthState {
  user: User;
  isAuthenticated: boolean;
  isStaffMode: boolean;
  sessionValid: boolean;
  lastActivity: string;
}

export interface AuthStore extends Writable<AuthState> {
  login: (pin: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  toggleStaffMode: () => void;
  checkPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshSession: () => Promise<boolean>;
  updateActivity: () => void;
}

// Default guest user
const createGuestUser = (): User => ({
  role: 'guest',
  permissions: ['store:browse', 'store:purchase'],
  session_id: crypto.randomUUID(),
  authenticated_at: new Date().toISOString()
});

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  guest: ['store:browse', 'store:purchase'],
  cashier: ['store:browse', 'store:purchase', 'pos:operate', 'inventory:view'],
  pharmacist: ['store:browse', 'store:purchase', 'pos:operate', 'inventory:view', 'inventory:dispense', 'prescriptions:manage'],
  manager: ['store:browse', 'store:purchase', 'pos:operate', 'inventory:view', 'inventory:manage', 'inventory:dispense', 'prescriptions:manage', 'reports:view', 'staff:manage'],
  admin: ['*'], // All permissions
  owner: ['*'] // All permissions
};

function createAuthStore(): AuthStore {
  const initialState: AuthState = {
    user: createGuestUser(),
    isAuthenticated: false,
    isStaffMode: false,
    sessionValid: true,
    lastActivity: new Date().toISOString()
  };

  const store = writable<AuthState>(initialState);
  const { subscribe, set, update } = store;

  // Session timeout (30 minutes for staff, unlimited for guests)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Check session validity
  const checkSessionValidity = (state: AuthState): boolean => {
    if (!state.isAuthenticated || state.user.role === 'guest') {
      return true; // Guests don't expire
    }

    const lastActivity = new Date(state.lastActivity).getTime();
    const now = Date.now();
    return (now - lastActivity) < SESSION_TIMEOUT;
  };

  // Auto-logout on session expiry
  const startSessionMonitoring = () => {
    setInterval(() => {
      update((state) => {
        if (!checkSessionValidity(state) && state.isAuthenticated) {
          console.log('Session expired, logging out');
          return {
            user: createGuestUser(),
            isAuthenticated: false,
            isStaffMode: false,
            sessionValid: false,
            lastActivity: new Date().toISOString()
          };
        }
        return { ...state, sessionValid: checkSessionValidity(state) };
      });
    }, 60000); // Check every minute
  };

  // Start session monitoring
  if (typeof window !== 'undefined') {
    startSessionMonitoring();
  }

  return {
    subscribe,
    set,
    update,

    login: async (pin: string) => {
      try {
        // In a real implementation, this would call the server
        // For now, simulate PIN authentication with predefined PINs
        const mockUsers: Record<string, Omit<User, 'permissions'>> = {
          '1234': { id: 'cashier1', username: 'cashier', role: 'cashier' },
          '2345': { id: 'pharmacist1', username: 'pharmacist', role: 'pharmacist' },
          '3456': { id: 'manager1', username: 'manager', role: 'manager' },
          '4567': { id: 'admin1', username: 'admin', role: 'admin' },
          '5678': { id: 'owner1', username: 'owner', role: 'owner' }
        };

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const userData = mockUsers[pin];
        if (!userData) {
          return { success: false, error: 'Invalid PIN' };
        }

        const user: User = {
          ...userData,
          permissions: ROLE_PERMISSIONS[userData.role],
          session_id: crypto.randomUUID(),
          authenticated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + SESSION_TIMEOUT).toISOString()
        };

        update((state) => ({
          ...state,
          user,
          isAuthenticated: true,
          isStaffMode: true,
          sessionValid: true,
          lastActivity: new Date().toISOString()
        }));

        return { success: true, user };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Login failed' };
      }
    },

    logout: () => {
      update((state) => ({
        user: createGuestUser(),
        isAuthenticated: false,
        isStaffMode: false,
        sessionValid: true,
        lastActivity: new Date().toISOString()
      }));
    },

    toggleStaffMode: () => {
      update((state) => {
        // Only authenticated staff can toggle staff mode
        if (!state.isAuthenticated || state.user.role === 'guest') {
          return state;
        }

        return {
          ...state,
          isStaffMode: !state.isStaffMode,
          lastActivity: new Date().toISOString()
        };
      });
    },

    checkPermission: (permission: string) => {
      const state = get(store);
      
      // Check if state exists and has user with permissions
      if (!state || !state.user || !state.user.permissions) return false;
      
      // Admin and owner have all permissions
      if (state.user.permissions.includes('*')) return true;
      
      return state.user.permissions.includes(permission);
    },

    hasRole: (roles: UserRole | UserRole[]) => {
      const state = get(store);
      
      if (!state.user) return false;
      
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(state.user.role);
    },

    refreshSession: async () => {
      try {
        // In a real implementation, this would validate with the server
        update((state) => ({
          ...state,
          lastActivity: new Date().toISOString(),
          sessionValid: checkSessionValidity(state)
        }));
        return true;
      } catch (error) {
        console.error('Session refresh failed:', error);
        return false;
      }
    },

    updateActivity: () => {
      update((state) => ({
        ...state,
        lastActivity: new Date().toISOString()
      }));
    }
  };
}

// Create derived stores for common checks
export const auth = createAuthStore();

export const isStaff = derived(auth, ($auth) => 
  $auth.isAuthenticated && $auth.user.role !== 'guest'
);

export const isStaffMode = derived(auth, ($auth) => 
  $auth.isStaffMode && $auth.isAuthenticated
);

export const canAccessInventory = derived(auth, ($auth) => 
  $auth.user.permissions.includes('*') || 
  $auth.user.permissions.includes('inventory:view') ||
  $auth.user.permissions.includes('inventory:manage')
);

export const canManageStore = derived(auth, ($auth) => 
  $auth.user.role === 'admin' || 
  $auth.user.role === 'owner' || 
  $auth.user.role === 'manager'
);

export const userRole = derived(auth, ($auth) => $auth.user.role);
export const userName = derived(auth, ($auth) => $auth.user.username || 'Guest');
