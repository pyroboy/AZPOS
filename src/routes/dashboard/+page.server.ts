import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { products } from '$lib/stores/productStore';
import { get } from 'svelte/store';

export const load: PageServerLoad = async ({ locals, fetch }) => {
    // If the user is not logged in, redirect to the login page.
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    await products.loadProducts(fetch); // This uses the new loadProductsCached method

    // Pass the user and products to the page component.
    return { 
        user: locals.user,
        products: get(products)
    };
};
