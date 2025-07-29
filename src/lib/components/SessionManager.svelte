<script lang="ts">
	import { useSessions } from '$lib/data/session';
	import { browser } from '$app/environment';
	import type { User } from '$lib/schemas/models';

	const { user } = $props<{ user: User | null }>();

	// Initialize session management with TanStack Query
	const { currentSession, createSession } = useSessions();

	// When the user data changes (e.g., on login/logout),
	// create or update session accordingly
	$effect(() => {
		if (browser && user && !currentSession) {
			// Create new session for logged in user
			createSession({
				user_id: user.id,
				session_type: 'user',
				device_info: {
					user_agent: navigator.userAgent,
					screen_resolution: `${screen.width}x${screen.height}`
				}
			}).catch(console.error);
		}
	});
</script>

<!-- This component doesn't render anything, it just manages sessions -->
