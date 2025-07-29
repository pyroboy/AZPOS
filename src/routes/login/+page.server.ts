import { redirect, type Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseClient } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }: { locals: App.Locals }) => {
	// If the user is already logged in, redirect to the dashboard
	if (locals.user) {
		throw redirect(302, '/');
	}

	const supabase = createSupabaseClient();

	// Query to get users from Supabase auth.users table
	const { data: users, error } = await supabase.auth.admin.listUsers();

	if (error) {
		console.error('Error fetching users:', error);
		return { users: [] };
	}

	return {
		users: users?.users || []
	};
};

export const actions: Actions = {
	login: async ({ cookies, request }: { cookies: Cookies; request: Request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email === 'string' && typeof password === 'string') {
			const supabase = createSupabaseClient();
			
			// Authenticate user with email and password
			const { data: authData, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				console.error('Authentication error:', error.message);
				return { error: 'Invalid email or password.' };
			}

			const user = authData?.user;
			if (user) {
				// Store user session
				cookies.set('session_user', email, {
					path: '/',
					httpOnly: true,
					sameSite: 'strict',
					maxAge: 60 * 60 * 24 * 7 // one week
				});
				
				// Also store the access token for API calls
				if (authData.session?.access_token) {
					cookies.set('session_token', authData.session.access_token, {
						path: '/',
						httpOnly: true,
						sameSite: 'strict',
						maxAge: 60 * 60 * 24 * 7 // one week
					});
				}
				
				throw redirect(302, '/');
			}
		}
		return {
			error: 'Please provide both email and password.'
		};
	},
	logout: async ({ cookies }: { cookies: Cookies }) => {
		cookies.delete('session_user', { path: '/' });
		throw redirect(302, '/login');
	}
};
