import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
/**
 * A wrapper for the onGetUsers telefunc to avoid SSR import issues.
 * @param {UserFilters} filters - The parameters for the telefunc.
 * @returns {Promise<PaginatedUsers>} The result from the telefunc.
 */
const onGetUsers = async (filters: UserFilters): Promise<PaginatedUsers> => {
	const { onGetUsers } = await import('$lib/server/telefuncs/user.telefunc.js');
	return onGetUsers(filters);
};

/**
 * A wrapper for the onGetUser telefunc to avoid SSR import issues.
 * @param {string} userId - The parameters for the telefunc.
 * @returns {Promise<User>} The result from the telefunc.
 */
const onGetUser = async (userId: string): Promise<User> => {
	const { onGetUser } = await import('$lib/server/telefuncs/user.telefunc.js');
	return onGetUser(userId);
};

/**
 * A wrapper for the onCreateUser telefunc to avoid SSR import issues.
 * @param {UserInput} userData - The parameters for the telefunc.
 * @returns {Promise<User>} The result from the telefunc.
 */
const onCreateUser = async (userData: UserInput): Promise<User> => {
	const { onCreateUser } = await import('$lib/server/telefuncs/user.telefunc.js');
	return onCreateUser(userData);
};

/**
 * A wrapper for the onUpdateUser telefunc to avoid SSR import issues.
 * @param {string} id - The parameters for the telefunc.
 * @param {UserInput} data - The parameters for the telefunc.
 * @returns {Promise<User>} The result from the telefunc.
 */
const onUpdateUser = async (id: string, data: UserInput): Promise<User> => {
	const { onUpdateUser } = await import('$lib/server/telefuncs/user.telefunc.js');
	return onUpdateUser(id, data);
};

/**
 * A wrapper for the onChangePassword telefunc to avoid SSR import issues.
 * @param {ChangePassword} passwordData - The parameters for the telefunc.
 * @returns {Promise<any>} The result from the telefunc.
 */
const onChangePassword = async (passwordData: ChangePassword): Promise<any> => {
	const { onChangePassword } = await import('$lib/server/telefuncs/user.telefunc.js');
	return onChangePassword(passwordData);
};

/**
 * A wrapper for the onGetUserStats telefunc to avoid SSR import issues.
 * @param {any} params - The parameters for the telefunc.
 * @returns {Promise<UserStats>} The result from the telefunc.
 */
const onGetUserStats = async (): Promise<UserStats> => {
	const { onGetUserStats } = await import('$lib/server/telefuncs/user.telefunc.js');
	return onGetUserStats();
};

/**
 * A wrapper for the onGetUserActivity telefunc to avoid SSR import issues.
 * @param {string} userId - The parameters for the telefunc.
 * @param {number} limit - The parameters for the telefunc.
 * @returns {Promise<UserActivity[]>} The result from the telefunc.
 */
const onGetUserActivity = async (userId?: string, limit?: number): Promise<UserActivity[]> => {
	const { onGetUserActivity } = await import('$lib/server/telefuncs/user.telefunc.js');
	return onGetUserActivity(userId, limit);
};

import type {
	User,
	UserInput,
	UserFilters,
	PaginatedUsers,
	UserStats,
	ChangePassword,
	UserActivity
} from '$lib/types/user.schema';

const usersQueryKey = ['users'];
const userStatsQueryKey = ['user-stats'];
const userActivityQueryKey = ['user-activity'];

export function useUsers() {
	const queryClient = useQueryClient();

	// State for filters
	let filters = $state<UserFilters>({
		page: 1,
		limit: 20,
		sort_by: 'created_at',
		sort_order: 'desc'
	});

	// Query for paginated users
	const usersQuery = createQuery<PaginatedUsers>({
		queryKey: $derived([...usersQueryKey, filters]),
		queryFn: () => onGetUsers(filters)
	});

	// Query for user statistics
	const statsQuery = createQuery<UserStats>({
		queryKey: userStatsQueryKey,
		queryFn: onGetUserStats
	});

	// Mutation to create user
	const createUserMutation = createMutation({
		mutationFn: (userData: UserInput) => onCreateUser(userData),
		onSuccess: (newUser) => {
			// Invalidate and refetch users
			queryClient.invalidateQueries({ queryKey: usersQueryKey });
			queryClient.invalidateQueries({ queryKey: userStatsQueryKey });

			// Optimistically add to cache
			queryClient.setQueryData<PaginatedUsers>([...usersQueryKey, filters], (old) => {
				if (!old) return old;
				return {
					...old,
					users: [newUser, ...old.users]
				};
			});
		}
	});

	// Mutation to update user
	const updateUserMutation = createMutation({
		mutationFn: ({ id, data }: { id: string; data: UserInput }) => onUpdateUser(id, data),
		onSuccess: (updatedUser) => {
			// Invalidate and refetch users
			queryClient.invalidateQueries({ queryKey: usersQueryKey });
			queryClient.invalidateQueries({ queryKey: userStatsQueryKey });

			// Update specific user in cache
			queryClient.setQueryData<User>(['user', updatedUser.id], updatedUser);

			// Update user in list cache
			queryClient.setQueryData<PaginatedUsers>([...usersQueryKey, filters], (old) => {
				if (!old) return old;
				return {
					...old,
					users: old.users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
				};
			});
		}
	});

	// Mutation to change password
	const changePasswordMutation = createMutation({
		mutationFn: (passwordData: ChangePassword) => onChangePassword(passwordData)
	});

	// Derived reactive state
	const users = $derived(usersQuery.data?.users || []);
	const pagination = $derived(usersQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Filtered users
	const activeUsers = $derived(users.filter((user: User) => user.is_active));

	const inactiveUsers = $derived(users.filter((user: User) => !user.is_active));

	const verifiedUsers = $derived(users.filter((user: User) => user.is_verified));

	const unverifiedUsers = $derived(users.filter((user: User) => !user.is_verified));

	const adminUsers = $derived(users.filter((user: User) => user.role === 'admin'));

	const managerUsers = $derived(users.filter((user: User) => user.role === 'manager'));

	const cashierUsers = $derived(users.filter((user: User) => user.role === 'cashier'));

	const customerUsers = $derived(users.filter((user: User) => user.role === 'customer'));

	// Helper functions
	function updateFilters(newFilters: Partial<UserFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function resetFilters() {
		filters = {
			page: 1,
			limit: 20,
			sort_by: 'created_at',
			sort_order: 'desc'
		};
	}

	function goToPage(page: number) {
		updateFilters({ page });
	}

	function setSearch(search: string) {
		updateFilters({ search: search || undefined, page: 1 });
	}

	function setRoleFilter(role: UserFilters['role']) {
		updateFilters({ role, page: 1 });
	}

	function setActiveFilter(is_active: boolean | undefined) {
		updateFilters({ is_active, page: 1 });
	}

	function setVerifiedFilter(is_verified: boolean | undefined) {
		updateFilters({ is_verified, page: 1 });
	}

	function setCreatedDateRange(created_from?: string, created_to?: string) {
		updateFilters({ created_from, created_to, page: 1 });
	}

	function setLastLoginRange(last_login_from?: string, last_login_to?: string) {
		updateFilters({ last_login_from, last_login_to, page: 1 });
	}

	function setSorting(sort_by: UserFilters['sort_by'], sort_order: UserFilters['sort_order']) {
		updateFilters({ sort_by, sort_order, page: 1 });
	}

	// User operations
	function createUser(userData: UserInput) {
		return createUserMutation.mutateAsync(userData);
	}

	function updateUser(id: string, userData: UserInput) {
		return updateUserMutation.mutateAsync({ id, data: userData });
	}

	function changePassword(passwordData: ChangePassword) {
		return changePasswordMutation.mutateAsync(passwordData);
	}

	// Single user query helper
	function useUser(userId: string) {
		return createQuery<User>({
			queryKey: ['user', userId],
			queryFn: () => onGetUser(userId),
			enabled: !!userId
		});
	}

	// User activity query helper
	function useUserActivity(userId?: string, limit: number = 50) {
		return createQuery<UserActivity[]>({
			queryKey: [...userActivityQueryKey, userId, limit],
			queryFn: () => onGetUserActivity(userId, limit)
		});
	}

	// Role-based helpers
	function canUserPerformAction(user: User, action: string): boolean {
		const rolePermissions = {
			admin: ['*'], // Admin can do everything
			manager: [
				'view_users',
				'create_user',
				'update_user',
				'view_stats',
				'manage_inventory',
				'manage_products',
				'process_transactions'
			],
			cashier: ['process_transactions', 'view_products', 'view_inventory'],
			customer: ['view_profile', 'update_profile']
		};

		const permissions = rolePermissions[user.role] || [];
		return (
			permissions.includes('*') || permissions.includes(action) || user.permissions.includes(action)
		);
	}

	function getUsersByRole(role: User['role']) {
		return users.filter((user: User) => user.role === role);
	}

	function getRecentlyActiveUsers(hours: number = 24) {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
		return users.filter(
			(user: User) => user.last_login_at && new Date(user.last_login_at) > cutoff
		);
	}

	function getNewUsers(days: number = 30) {
		const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
		return users.filter((user: User) => new Date(user.created_at) > cutoff);
	}

	return {
		// Queries and their states
		usersQuery,
		statsQuery,

		// Reactive data
		users,
		pagination,
		stats,

		// Filtered data
		activeUsers,
		inactiveUsers,
		verifiedUsers,
		unverifiedUsers,
		adminUsers,
		managerUsers,
		cashierUsers,
		customerUsers,

		// Current filters
		filters: $derived(filters),

		// Mutations
		createUser,
		createUserStatus: $derived(createUserMutation.status),

		updateUser,
		updateUserStatus: $derived(updateUserMutation.status),

		changePassword,
		changePasswordStatus: $derived(changePasswordMutation.status),

		// Filter helpers
		updateFilters,
		resetFilters,
		goToPage,
		setSearch,
		setRoleFilter,
		setActiveFilter,
		setVerifiedFilter,
		setCreatedDateRange,
		setLastLoginRange,
		setSorting,

		// Single user and activity helpers
		useUser,
		useUserActivity,

		// Role-based helpers
		canUserPerformAction,
		getUsersByRole,
		getRecentlyActiveUsers,
		getNewUsers,

		// Loading states
		isLoading: $derived(usersQuery.isPending),
		isError: $derived(usersQuery.isError),
		error: $derived(usersQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
