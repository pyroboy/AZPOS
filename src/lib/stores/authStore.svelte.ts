// Agent: agent_coder | File: authStore.svelte.ts | Last Updated: 2025-07-28T13:51:36+08:00
import { browser } from '$app/environment';

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
	pharmacist: [
		'store:browse',
		'store:purchase',
		'pos:operate',
		'inventory:view',
		'inventory:dispense',
		'prescriptions:manage'
	],
	manager: [
		'store:browse',
		'store:purchase',
		'pos:operate',
		'inventory:view',
		'inventory:manage',
		'inventory:dispense',
		'prescriptions:manage',
		'reports:view',
		'staff:manage'
	],
	admin: ['*'], // All permissions
	owner: ['*'] // All permissions
};

function createAuthStore() {
	// 1. Use $state for the root state object
	const state = $state<AuthState>({
		user: createGuestUser(),
		isAuthenticated: false,
		isStaffMode: false,
		sessionValid: true,
		lastActivity: new Date().toISOString()
	});

	// Session timeout (30 minutes for staff, unlimited for guests)
	const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

	// 2. Use $derived for computed values
	const isStaff = $derived(state.isAuthenticated && state.user.role !== 'guest');
	const isStaffMode = $derived(state.isStaffMode && state.isAuthenticated);
	const userName = $derived(state.user.username || 'Guest');
	const userRole = $derived(state.user.role);
	const canAccessInventory = $derived(
		state.user.permissions.includes('*') ||
			state.user.permissions.includes('inventory:view') ||
			state.user.permissions.includes('inventory:manage')
	);
	const canManageStore = $derived(
		state.user.role === 'admin' || state.user.role === 'owner' || state.user.role === 'manager'
	);

	// Check session validity
	const checkSessionValidity = (authState: AuthState): boolean => {
		if (!authState.isAuthenticated || authState.user.role === 'guest') {
			return true; // Guests don't expire
		}

		const lastActivity = new Date(authState.lastActivity).getTime();
		const now = Date.now();
		return now - lastActivity < SESSION_TIMEOUT;
	};

	// 3. Use $effect for side effects like session monitoring
	$effect(() => {
		if (!browser) return;

		const intervalId = setInterval(() => {
			if (!checkSessionValidity(state) && state.isAuthenticated) {
				console.log('Session expired, logging out');
				logout();
			} else {
				// Update session validity
				state.sessionValid = checkSessionValidity(state);
			}
		}, 60000); // Check every minute

		// Cleanup function for the effect
		return () => clearInterval(intervalId);
	});

	// 4. Methods directly mutate the state object
	async function login(pin: string) {
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
			await new Promise((resolve) => setTimeout(resolve, 500));

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

			// Direct assignment to update state
			state.user = user;
			state.isAuthenticated = true;
			state.isStaffMode = true;
			state.sessionValid = true;
			state.lastActivity = new Date().toISOString();

			return { success: true, user };
		} catch (error) {
			console.error('Login error:', error);
			return { success: false, error: 'Login failed' };
		}
	}

	function logout() {
		state.user = createGuestUser();
		state.isAuthenticated = false;
		state.isStaffMode = false;
		state.sessionValid = true;
		state.lastActivity = new Date().toISOString();
	}

	function toggleStaffMode() {
		// Only authenticated staff can toggle staff mode
		if (!state.isAuthenticated || state.user.role === 'guest') {
			return;
		}

		state.isStaffMode = !state.isStaffMode;
		state.lastActivity = new Date().toISOString();
	}

	// 5. No `get()` needed to read state
	function checkPermission(permission: string): boolean {
		// Check if state exists and has user with permissions
		if (!state.user || !state.user.permissions) return false;

		// Admin and owner have all permissions
		if (state.user.permissions.includes('*')) return true;

		return state.user.permissions.includes(permission);
	}

	function hasRole(roles: UserRole | UserRole[]): boolean {
		if (!state.user) return false;

		const roleArray = Array.isArray(roles) ? roles : [roles];
		return roleArray.includes(state.user.role);
	}

	async function refreshSession(): Promise<boolean> {
		try {
			// In a real implementation, this would validate with the server
			state.lastActivity = new Date().toISOString();
			state.sessionValid = checkSessionValidity(state);
			return true;
		} catch (error) {
			console.error('Session refresh failed:', error);
			return false;
		}
	}

	function updateActivity() {
		state.lastActivity = new Date().toISOString();
	}

	// Return the public API
	return {
		// Expose state via getters to make it readonly from the outside
		get state() {
			return state;
		},
		get isStaff() {
			return isStaff;
		},
		get isStaffMode() {
			return isStaffMode;
		},
		get userName() {
			return userName;
		},
		get userRole() {
			return userRole;
		},
		get canAccessInventory() {
			return canAccessInventory;
		},
		get canManageStore() {
			return canManageStore;
		},

		// Expose methods
		login,
		logout,
		toggleStaffMode,
		checkPermission,
		hasRole,
		refreshSession,
		updateActivity
	};
}

export const auth = createAuthStore();
