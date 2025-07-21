// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { User } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// This is populated by src/hooks.server.ts
			user: User | undefined;
		}
		interface PageData {
			// This is passed from +layout.server.ts to +layout.svelte
			user?: User;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
