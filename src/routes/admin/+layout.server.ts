import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    // If the user is not logged in or is not an admin, redirect them.
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(302, '/');
    }

    return { user: locals.user };
};
