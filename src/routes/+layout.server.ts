import type { LayoutServerLoad } from './$types';
import { get } from 'svelte/store';

import { users } from '$lib/stores/userStore';
import { products } from '$lib/stores/productStore';
import { productBatches } from '$lib/stores/productBatchStore';

// A flag to ensure data is loaded only once on server start
let isDataInitialized = false;

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	// Initialize product and batch data only once
		if (!isDataInitialized) {
		await products.loadProducts(fetch);
		isDataInitialized = true;
	}

	// The user object is attached to 'locals' by our server hook.
	// We pass it to the page data, which makes it available to the client.
	// The user object is attached to 'locals' by our server hook.
	// We pass it to the page data, which makes it available to the client.
		return {
		user: locals.user,
		users: get(users),
		products: get(products),
		productBatches: get(productBatches)
	};
};
