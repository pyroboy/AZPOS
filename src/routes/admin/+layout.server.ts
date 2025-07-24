import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// The root layout already redirects if !locals.user, so we only need to check the role here.
	if (locals.user?.role !== 'admin' && locals.user?.role !== 'owner') {
		throw redirect(302, '/');
	}

	return { user: locals.user };
};
