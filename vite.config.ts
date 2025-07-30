import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { telefunc } from 'telefunc/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(), 
		telefunc({
			telefuncUrl: '/api/telefunc'
		}), 
		sveltekit()
	],
	optimizeDeps: {
		include: ['telefunc/client']
	},
	define: {
		// Ensure telefunc client is available in browser
		__TELEFUNC_CLIENT__: true
	},
	ssr: {
		noExternal: process.env.NODE_ENV === 'production' ? [] : ['@tanstack/svelte-query-devtools']
	}
});
