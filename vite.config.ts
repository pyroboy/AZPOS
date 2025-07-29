import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { telefunc } from 'telefunc/vite';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		telefunc({
			// Configure telefunc for ESM compatibility
			outDir: '.telefunc',
			transformImports: true
		}),
		sveltekit()
	]
});
