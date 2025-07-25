import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';

import { users } from '$lib/stores/userStore';
import { products } from '$lib/stores/productStore';
import { productBatches } from '$lib/stores/productBatchStore';

// A flag to ensure data is loaded only once on server start
let isDataInitialized = false;

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Redirect unauthenticated users to the login page, unless they are already there.
	if (!locals.user && url.pathname !== '/login') {
		throw redirect(302, '/login');
	}

	// Initialize product and batch data only once
	if (!isDataInitialized) {
		// await products.loadProducts(); // NOTE: This is now handled by loadProductsCached in the store or streamed in routes
		isDataInitialized = true;
	}

	// The user object is attached to 'locals' by our server hook.
	// We pass it to the page data, which makes it available to the client.
	return {
		user: locals.user,
		users: users.getAllActiveUsers(),
		products: get(products),
		productBatches: get(productBatches)
	};
};
