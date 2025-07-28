import { products } from '$lib/stores/productStore';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    await products.loadProducts(fetch); // This now correctly points to loadProductsCached
    const productsData = products.getActiveProducts();
    return { products: productsData };
};
