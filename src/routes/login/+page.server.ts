import { redirect, type Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { get } from 'svelte/store';
import { users } from '$lib/stores/userStore';

export const load: PageServerLoad = async ({ locals }: { locals: App.Locals }) => {
    // If the user is already logged in, redirect to the dashboard
    if (locals.user) {
        throw redirect(302, '/');
    }
    return { 
        // Return a list of usernames to display in the login form
        usernames: get(users).map(u => u.username) 
    };
};

export const actions: Actions = {
    login: async ({ cookies, request }: { cookies: Cookies; request: Request }) => {
        const data = await request.formData();
        const username = data.get('username');

        if (typeof username === 'string' && users.findByUsername(username)) {
            cookies.set('session_user', username, { 
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7 // one week
            });
            throw redirect(302, '/');
        }

        return { 
            error: 'Invalid username.'
        };
	},
	logout: async ({ cookies }: { cookies: Cookies }) => {
		cookies.delete('session_user', { path: '/' });
		throw redirect(302, '/login');
	}
};
