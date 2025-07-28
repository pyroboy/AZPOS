import { redirect, type Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { onGetUsers } from '$lib/server/telefuncs/user.telefunc';

export const load: PageServerLoad = async ({ locals }: { locals: App.Locals }) => {
    // If the user is already logged in, redirect to the dashboard
    if (locals.user) {
        throw redirect(302, '/');
    }
    
    // Return a list of active users to display in the login form
    const usersData = await onGetUsers({ is_active: true });
    
    return { 
        users: usersData.users || []
    };
};

export const actions: Actions = {
    login: async ({ cookies, request }: { cookies: Cookies; request: Request }) => {
        const data = await request.formData();
        const email = data.get('email');

        if (typeof email === 'string') {
            // Get users to validate email exists
            const usersData = await onGetUsers({ is_active: true });
            const user = usersData.users?.find(u => u.email === email);
            
            if (user) {
                cookies.set('session_user', email, { 
                    path: '/',
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 24 * 7 // one week
                });
                throw redirect(302, '/');
            }
        }

        return { 
            error: 'Invalid email.'
        };
	},
	logout: async ({ cookies }: { cookies: Cookies }) => {
		cookies.delete('session_user', { path: '/' });
		throw redirect(302, '/login');
	}
};
