import type { Handle } from '@sveltejs/kit';
import { users } from '$lib/stores/userStore.svelte';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionUsername = event.cookies.get('session_user');

	// Find the user in our mock database based on the cookie value.
	// This is the single source of truth for the user's session.
	const user = users.findByUsername(sessionUsername ?? '');

	// If the user is found, attach them to `event.locals`.
	// This makes the user object available in all server-side endpoints and load functions.
	if (user) {
		event.locals.user = user;
	}

	// Continue processing the request.
	return resolve(event);
};
