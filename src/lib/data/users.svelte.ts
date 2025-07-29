import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type { AuthUser } from '$lib/types/auth.schema';

// Mock users data for now
const mockUsers: AuthUser[] = [
	{
		id: '1',
		email: 'admin@azpos.com',
		full_name: 'System Administrator',
		role: 'admin',
		is_active: true,
		is_verified: true,
		permissions: ['*'],
		profile: {
			pin: '1234',
			preferences: {
				language: 'en',
				timezone: 'UTC',
				currency: 'USD'
			}
		},
		last_login_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	}
];

// Mock telefunc functions
const onGetUsers = async (): Promise<AuthUser[]> => {
	return mockUsers;
};

const usersQueryKey = ['users'];

export function useUsers() {
	const queryClient = useQueryClient();

	// Query for all users
	const usersQuery = createQuery<AuthUser[]>({
		queryKey: usersQueryKey,
		queryFn: onGetUsers,
		enabled: browser
	});

	// Derived reactive values
	const users = $derived(() => usersQuery.data ?? []);
	const isLoading = $derived(() => usersQuery.isPending);
	const isError = $derived(() => usersQuery.isError);
	const error = $derived(() => usersQuery.error);

	return {
		usersQuery,
		users,
		isLoading,
		isError,
		error
	};
}

// Export users as a simple reactive array for compatibility
export const users = $state(mockUsers);
