import type { Handle } from '@sveltejs/kit';
import { users } from '$lib/stores/userStore';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionUser = event.cookies.get('session_user');

	if (sessionUser) {
		// Find the user in our mock database based on the cookie value
		const user = users.findByUsername(sessionUser);
		if (user) {
			// If the user is found, attach them to `event.locals`
			// This makes the user object available in all server-side endpoints and load functions
			event.locals.user = user;
		}
	}

	// Continue processing the request
	return resolve(event);
};
