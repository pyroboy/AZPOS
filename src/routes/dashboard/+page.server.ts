import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }: { locals: App.Locals }) => {
    // If the user is not logged in, redirect to the login page.
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    // Pass the user to the page component.
    return { user: locals.user };
};
