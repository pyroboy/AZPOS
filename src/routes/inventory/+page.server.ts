import { products } from '$lib/stores/productStore';
import { get } from 'svelte/store';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    await products.loadProducts(fetch); // This now correctly points to loadProductsCached
    return { products: get(products) };
};
