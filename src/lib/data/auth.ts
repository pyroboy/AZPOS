import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type {
	AuthUser,
	AuthSession,
	Login,
	Register,
	ProfileUpdate,
	ChangePassword,
	PasswordResetRequest,
	EmailVerification,
	AuthStats,
	AuthActivity,
	PinLogin
} from '$lib/types/auth.schema';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onLogin = async (loginData: Login): Promise<AuthSession> => {
	const { onLogin } = await import('$lib/server/telefuncs/auth.telefunc');
	return onLogin(loginData);
};

const onRegister = async (registerData: Register): Promise<AuthSession> => {
	const { onRegister } = await import('$lib/server/telefuncs/auth.telefunc');
	return onRegister(registerData);
};

const onLogout = async (): Promise<{success: boolean}> => {
	const { onLogout } = await import('$lib/server/telefuncs/auth.telefunc');
	return onLogout();
};

const onGetCurrentUser = async (): Promise<AuthUser | null> => {
	const { onGetCurrentUser } = await import('$lib/server/telefuncs/auth.telefunc');
	return onGetCurrentUser();
};

const onUpdateProfile = async (profileData: ProfileUpdate): Promise<AuthUser> => {
	const { onUpdateProfile } = await import('$lib/server/telefuncs/auth.telefunc');
	return onUpdateProfile(profileData);
};

const onChangePassword = async (passwordData: ChangePassword): Promise<{success: boolean}> => {
	const { onChangePassword } = await import('$lib/server/telefuncs/auth.telefunc');
	return onChangePassword(passwordData);
};

const onRequestPasswordReset = async (resetData: PasswordResetRequest): Promise<{success: boolean}> => {
	const { onRequestPasswordReset } = await import('$lib/server/telefuncs/auth.telefunc');
	return onRequestPasswordReset(resetData);
};

const onVerifyEmail = async (verificationData: EmailVerification): Promise<{success: boolean}> => {
	const { onVerifyEmail } = await import('$lib/server/telefuncs/auth.telefunc');
	return onVerifyEmail(verificationData);
};

const onGetAuthStats = async (): Promise<AuthStats> => {
	const { onGetAuthStats } = await import('$lib/server/telefuncs/auth.telefunc');
	return onGetAuthStats();
};

const onGetUserActivity = async (userId?: string, limit: number = 50): Promise<AuthActivity[]> => {
	const { onGetUserActivity } = await import('$lib/server/telefuncs/auth.telefunc');
	return onGetUserActivity(userId, limit);
};

const onLoginWithPin = async (pinData: PinLogin): Promise<AuthSession> => {
	const { onLoginWithPin } = await import('$lib/server/telefuncs/auth.telefunc');
	return onLoginWithPin(pinData);
};

const onToggleStaffMode = async (): Promise<{isStaffMode: boolean; user: AuthUser}> => {
	const { onToggleStaffMode } = await import('$lib/server/telefuncs/auth.telefunc');
	return onToggleStaffMode();
};

const authQueryKey = ['auth'];
const authStatsQueryKey = ['auth-stats'];
const userActivityQueryKey = ['user-activity'];

export function useAuth() {
	const queryClient = useQueryClient();

	// Internal staff mode state (managed client-side)
	let staffModeState = $state(false);

	// Query for current user
	const currentUserQuery = createQuery<AuthUser | null>({
		queryKey: [...authQueryKey, 'current-user'],
		queryFn: onGetCurrentUser,
		retry: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: browser
	});

	// Query for auth statistics (admin/manager only)
	const authStatsQuery = createQuery<AuthStats>({
		queryKey: authStatsQueryKey,
		queryFn: onGetAuthStats,
		enabled: $derived(
			browser && !!currentUserQuery.data && ['admin', 'manager'].includes(currentUserQuery.data.role)
		)
	});

	// Mutation to login
	const loginMutation = createMutation({
		mutationFn: (loginData: Login) => onLogin(loginData),
		onSuccess: (authSession) => {
			// Update current user in cache
			queryClient.setQueryData([...authQueryKey, 'current-user'], authSession.user);

			// Invalidate auth-related queries
			queryClient.invalidateQueries({ queryKey: authQueryKey });
			queryClient.invalidateQueries({ queryKey: authStatsQueryKey });
		}
	});

	// Mutation to register
	const registerMutation = createMutation({
		mutationFn: (registerData: Register) => onRegister(registerData),
		onSuccess: (authSession) => {
			// Update current user in cache
			queryClient.setQueryData([...authQueryKey, 'current-user'], authSession.user);

			// Invalidate auth-related queries
			queryClient.invalidateQueries({ queryKey: authQueryKey });
			queryClient.invalidateQueries({ queryKey: authStatsQueryKey });
		}
	});

	// Mutation to logout
	const logoutMutation = createMutation({
		mutationFn: onLogout,
		onSuccess: () => {
			// Clear all cached data
			queryClient.clear();

			// Set current user to null
			queryClient.setQueryData([...authQueryKey, 'current-user'], null);

			// Reset staff mode on logout
			staffModeState = false;
		}
	});

	// Mutation to update profile
	const updateProfileMutation = createMutation({
		mutationFn: (profileData: ProfileUpdate) => onUpdateProfile(profileData),
		onSuccess: (updatedUser) => {
			// Update current user in cache
			queryClient.setQueryData([...authQueryKey, 'current-user'], updatedUser);

			// Invalidate user-related queries
			queryClient.invalidateQueries({ queryKey: authQueryKey });
		}
	});

	// Mutation to change password
	const changePasswordMutation = createMutation({
		mutationFn: (passwordData: ChangePassword) => onChangePassword(passwordData)
	});

	// Mutation to request password reset
	const requestPasswordResetMutation = createMutation({
		mutationFn: (resetData: PasswordResetRequest) => onRequestPasswordReset(resetData)
	});

	// Mutation to verify email
	const verifyEmailMutation = createMutation({
		mutationFn: (verificationData: EmailVerification) => onVerifyEmail(verificationData),
		onSuccess: () => {
			// Refresh current user to get updated verification status
			queryClient.invalidateQueries({ queryKey: [...authQueryKey, 'current-user'] });
		}
	});

	// Mutation to login with PIN (staff authentication)
	const loginWithPinMutation = createMutation({
		mutationFn: (pin: string) => onLoginWithPin({ pin }),
		onSuccess: (authSession) => {
			// Update current user in cache
			queryClient.setQueryData([...authQueryKey, 'current-user'], authSession.user);

			// Enable staff mode when logging in with PIN
			staffModeState = true;

			// Invalidate auth-related queries
			queryClient.invalidateQueries({ queryKey: authQueryKey });
			queryClient.invalidateQueries({ queryKey: authStatsQueryKey });
		}
	});

	// Mutation to toggle staff mode
	const toggleStaffModeMutation = createMutation({
		mutationFn: () => onToggleStaffMode(),
		onSuccess: () => {
			// Toggle staff mode state
			staffModeState = !staffModeState;
		}
	});

	// Derived reactive state
	const user = $derived(currentUserQuery.data);
	const isAuthenticated = $derived(!!user);
	const isLoading = $derived(currentUserQuery.isPending);
	const authStats = $derived(authStatsQuery.data);

	// Staff mode derived state
	const isStaffMode = $derived(staffModeState);

	// Role-based helpers
	const isAdmin = $derived(user?.role === 'admin');
	const isManager = $derived(user?.role === 'manager');
	const isCashier = $derived(user?.role === 'cashier');
	const isCustomer = $derived(user?.role === 'customer');
	const isGuest = $derived(user?.role === 'guest');

	// Staff helper (true for non-guest/non-customer roles)
	const isStaff = $derived(!!user && !isGuest && !isCustomer);

	// User name derived state
	const userName = $derived(user?.full_name || 'Guest');

	const canManageUsers = $derived(isAdmin || isManager);
	const canViewReports = $derived(isAdmin || isManager);
	const canProcessTransactions = $derived(isAdmin || isManager || isCashier);

	// Permission helpers
	function hasPermission(permission: string): boolean {
		if (!user) return false;
		if (user.role === 'admin') return true; // Admin has all permissions
		return user.permissions.includes(permission);
	}

	function hasAnyPermission(permissions: string[]): boolean {
		return permissions.some((permission) => hasPermission(permission));
	}

	function hasAllPermissions(permissions: string[]): boolean {
		return permissions.every((permission) => hasPermission(permission));
	}

	// Authentication actions
	function login(loginData: Login) {
		return loginMutation.mutateAsync(loginData);
	}

	function register(registerData: Register) {
		return registerMutation.mutateAsync(registerData);
	}

	function logout() {
		return logoutMutation.mutateAsync();
	}

	function updateProfile(profileData: ProfileUpdate) {
		return updateProfileMutation.mutateAsync(profileData);
	}

	function changePassword(passwordData: ChangePassword) {
		return changePasswordMutation.mutateAsync(passwordData);
	}

	function requestPasswordReset(resetData: PasswordResetRequest) {
		return requestPasswordResetMutation.mutateAsync(resetData);
	}

	function verifyEmail(verificationData: EmailVerification) {
		return verifyEmailMutation.mutateAsync(verificationData);
	}

	function loginWithPin(pin: string) {
		return loginWithPinMutation.mutateAsync(pin);
	}

	function toggleStaffMode() {
		return toggleStaffModeMutation.mutateAsync();
	}

	// User activity helper
	function useUserActivity(userId?: string, limit: number = 50) {
		return createQuery<AuthActivity[]>({
			queryKey: [...userActivityQueryKey, userId, limit],
			queryFn: () => onGetUserActivity(userId, limit),
			enabled: browser && !!user
		});
	}

	return {
		// Queries and their states
		currentUserQuery,
		authStatsQuery,

		// Reactive data
		user,
		isAuthenticated,
		isLoading,
		authStats,

		// Staff mode state
		isStaffMode,

		// Role checks
		isAdmin,
		isManager,
		isCashier,
		isCustomer,
		isGuest,
		isStaff,
		userName,
		canManageUsers,
		canViewReports,
		canProcessTransactions,

		// Permission helpers
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,

		// Authentication actions
		login,
		register,
		logout,
		updateProfile,
		changePassword,
		requestPasswordReset,
		verifyEmail,
		loginWithPin,
		toggleStaffMode,

		// Mutation states
		loginStatus: $derived(loginMutation.status),
		registerStatus: $derived(registerMutation.status),
		logoutStatus: $derived(logoutMutation.status),
		updateProfileStatus: $derived(updateProfileMutation.status),
		changePasswordStatus: $derived(changePasswordMutation.status),
		requestPasswordResetStatus: $derived(requestPasswordResetMutation.status),
		verifyEmailStatus: $derived(verifyEmailMutation.status),
		loginWithPinStatus: $derived(loginWithPinMutation.status),
		toggleStaffModeStatus: $derived(toggleStaffModeMutation.status),

		// User activity helper
		useUserActivity,

		// Loading states
		isError: $derived(currentUserQuery.isError),
		error: $derived(currentUserQuery.error),

		// Stats loading
		isStatsLoading: $derived(authStatsQuery.isPending),
		statsError: $derived(authStatsQuery.error)
	};
}
