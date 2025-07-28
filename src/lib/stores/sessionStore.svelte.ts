import type { User } from '$lib/schemas/models';
import { goto } from '$app/navigation';


// Use $state for session state
export let currentUser = $state<User | null>(null);

// Derived state for authentication status
export const isAuthenticated = $derived(currentUser !== null);

// Export functions that directly mutate the state
export function setSession(user: User | null | undefined) {
	currentUser = user ?? null;
}

// Logout helper that posts to the server endpoint
export async function logout() {
	await fetch('/login?/logout', {
		method: 'POST'
	});
	// After logout, reset the store and redirect to login
	currentUser = null;
	await goto('/login');
}
