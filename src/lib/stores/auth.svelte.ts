import { getCurrentUser, login, logout, updateProfile, changePassword, loginWithPin } from '$lib/remote/auth.remote';
import type { AuthUser } from '$lib/types/auth.schema';

// Simple Svelte 5 auth store
class AuthStore {
	user = $state<AuthUser | null>(null);
	isLoading = $state(false);
	isStaffMode = $state(false);
	loginWithPinStatus = $state<'idle' | 'pending' | 'success' | 'error'>('idle');
	
	// Derived states
	isAuthenticated = $derived(!!this.user);
	isAdmin = $derived(this.user?.role === 'admin');
	isManager = $derived(this.user?.role === 'manager');
	isCashier = $derived(this.user?.role === 'cashier');
	isCustomer = $derived(this.user?.role === 'customer');
	isGuest = $derived(this.user?.role === 'guest');
	isStaff = $derived(!!this.user && !this.isGuest && !this.isCustomer);
	userName = $derived(this.user?.full_name || 'Guest');
	canManageUsers = $derived(this.isAdmin || this.isManager);
	canViewReports = $derived(this.isAdmin || this.isManager);
	canProcessTransactions = $derived(this.isAdmin || this.isManager || this.isCashier);

	// Initialize user from server
	async init() {
		try {
			this.isLoading = true;
			this.user = await getCurrentUser();
		} catch (error) {
			console.log('No authenticated user');
			this.user = null;
		} finally {
			this.isLoading = false;
		}
	}

	// Login method
	async login(credentials: { email: string; password: string }) {
		this.isLoading = true;
		try {
			const result = await login(credentials);
			this.user = result.user;
			this.isStaffMode = false;
			return result;
		} finally {
			this.isLoading = false;
		}
	}

	// Logout method
	async logout() {
		this.isLoading = true;
		try {
			await logout();
			this.user = null;
			this.isStaffMode = false;
		} finally {
			this.isLoading = false;
		}
	}

	// PIN login for staff mode
	async loginWithPin(pin: string) {
		this.loginWithPinStatus = 'pending';
		try {
			const result = await loginWithPin({ pin });
			this.user = result.user;
			this.isStaffMode = true;
			this.loginWithPinStatus = 'success';
			return { success: true, ...result };
		} catch (error) {
			this.loginWithPinStatus = 'error';
			throw error;
		}
	}

	// Toggle staff mode
	toggleStaffMode() {
		this.isStaffMode = !this.isStaffMode;
	}

	// Permission checks
	hasPermission(permission: string): boolean {
		if (!this.user) return false;
		if (this.user.role === 'admin') return true;
		return this.user.permissions?.includes(permission) ?? false;
	}

	hasAnyPermission(permissions: string[]): boolean {
		return permissions.some(permission => this.hasPermission(permission));
	}

	hasAllPermissions(permissions: string[]): boolean {
		return permissions.every(permission => this.hasPermission(permission));
	}

	// Update profile
	async updateProfile(profileData: any) {
		const updatedUser = await updateProfile(profileData);
		this.user = { ...this.user, ...updatedUser };
		return updatedUser;
	}

	// Change password
	async changePassword(passwordData: { current_password: string; new_password: string }) {
		return await changePassword(passwordData);
	}
}

// Export singleton instance
export const authStore = new AuthStore();