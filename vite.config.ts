import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { telefunc } from 'telefunc/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		sveltekit(), // SvelteKit should be first
		tailwindcss(), 
		telefunc()
	],
	server: {
		host: '127.0.0.1', // Listen on localhost specifically
		port: 5173, // Default port
		strictPort: false, // Allow fallback to next available port
		hmr: {
			port: 5174, // HMR port
			host: '127.0.0.1'
		}
	},
	optimizeDeps: {
		include: ['telefunc/client'],
		exclude: [
			// Exclude problematic chunks that cause Windows issues
			'@tanstack/svelte-query-devtools'
		]
	},
	define: {
		// Ensure telefunc client is available in browser
		__TELEFUNC_CLIENT__: true
	},
	ssr: {
		noExternal: process.env.NODE_ENV === 'production' ? [] : ['@tanstack/svelte-query-devtools']
	}
});
