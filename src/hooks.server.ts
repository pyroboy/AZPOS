import type { Handle } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '$lib/server/db';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import { telefunc } from 'telefunc';

// Authentication handler
async function handleAuth(event: any) {
	const sessionEmail = event.cookies.get('session_user');
	const sessionToken = event.cookies.get('session_token');

	// If we have a session email and token, validate the session
	if (sessionEmail && sessionToken) {
		try {
			const supabase = createSupabaseClient();
			
			// Create a new supabase client with the access token
			const authenticatedSupabase = createClient(
				SUPABASE_URL,
				SUPABASE_ANON_KEY,
				{
					global: {
						headers: {
							Authorization: `Bearer ${sessionToken}`
						}
					}
				}
			);
			
			// Validate the token by getting the user
			const { data: userData, error: userError } = await authenticatedSupabase.auth.getUser(sessionToken);
			
			if (!userError && userData?.user) {
				const user = userData.user;
				
				// Attach user to event.locals
				event.locals.user = {
					id: user.id,
					email: user.email || sessionEmail,
					username: user.email?.split('@')[0] || 'user',
					is_verified: user.email_confirmed_at !== null,
					permissions: ['pos:operate', 'reports:view'],
					created_at: user.created_at,
					updated_at: user.updated_at
				};
			} else {
				// Session is invalid, clear cookies
				event.cookies.delete('session_user', { path: '/' });
				event.cookies.delete('session_token', { path: '/' });
			}
		} catch (error) {
			console.error('Error validating session:', error);
			// Clear invalid session cookies
			event.cookies.delete('session_user', { path: '/' });
			event.cookies.delete('session_token', { path: '/' });
		}
	} else if (sessionEmail) {
		// We have email but no token - this is likely from an old session, clear it
		event.cookies.delete('session_user', { path: '/' });
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Handle authentication first
	await handleAuth(event);
	
	// Handle Telefunc requests
	if (event.url.pathname === '/_telefunc') {
		const context = {
			user: event.locals.user,
			request: event.request,
			cookies: event.cookies
		};
		
		const httpResponse = await telefunc({
			url: event.url.toString(),
			method: event.request.method,
			body: await event.request.text(),
			context
		});
		
		const { body, statusCode, contentType } = httpResponse;
		return new Response(body, {
			status: statusCode,
			headers: { 'content-type': contentType }
		});
	}
	
	// Continue with normal SvelteKit handling
	return resolve(event);
};
