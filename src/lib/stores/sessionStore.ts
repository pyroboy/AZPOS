import { writable } from 'svelte/store';
import type { User } from '$lib/schemas/models';
import { users } from './userStore'; // Import the user "database"

interface SessionState {
	currentUser: User | null;
}

function createSessionStore() {
	const { subscribe, set, update } = writable<SessionState>({ currentUser: null });

	return {
		subscribe,
		// This method will be called from the root layout to sync with server data
		setSession: (user: User | null) => {
			set({ currentUser: user });
		},
		// Login is now primarily handled by server-side actions setting a cookie.
		// This client-side login can be used for optimistic updates if needed.
		login: (username: string): boolean => {
			const user = users.findByUsername(username);
			if (user) {
				update((store) => ({ ...store, currentUser: user }));
				users.updateUser(user.id, { updated_at: new Date().toISOString() });
				return true;
			}
			return false;
		},
		logout: () => {
			set({ currentUser: null });
		}
	};
}

export const session = createSessionStore();
