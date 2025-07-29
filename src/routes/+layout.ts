import { browser } from '$app/environment';

// Initialize telefunc client
if (browser) {
	// Telefunc client is automatically initialized when the script is loaded
	// This file ensures the client-side route exists for proper SvelteKit integration
}

export const prerender = false;
export const ssr = true;
