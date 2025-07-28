// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { AuthUser } from '$lib/types/auth.schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// This is populated by src/hooks.server.ts
			user: AuthUser | undefined;
		}
		interface PageData {
			// This is passed from +layout.server.ts to +layout.svelte
			user?: AuthUser;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
