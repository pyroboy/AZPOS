import { redirect } from '@sveltejs/kit';
import { createSupabaseClient } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If the user is not logged in, redirect to the login page.
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Pass the user to the page component.
	// Products will be loaded client-side using Telefunc for better UX
	return {
		user: locals.user
	};
};
