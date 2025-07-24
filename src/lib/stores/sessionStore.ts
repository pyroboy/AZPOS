import { writable } from 'svelte/store';
import type { User } from '$lib/schemas/models';
import { goto } from '$app/navigation';

interface SessionState {
	currentUser: User | null;
}

function createSessionStore() {
	const { subscribe, set } = writable<SessionState>({ currentUser: null });

	return {
		subscribe,
		// This method will be called from the root layout to sync with server data
		setSession: (user: User | null | undefined) => {
			set({ currentUser: user ?? null });
		},
		// Logout helper that posts to the server endpoint
		logout: async () => {
			await fetch('/login?/logout', {
				method: 'POST'
			});
			// After logout, reset the store and redirect to login
			set({ currentUser: null });
			await goto('/login');
		}
	};
}

export const session = createSessionStore();
