import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';

export const load: PageServerLoad = async ({ locals }) => {
    // If the user is not logged in, redirect to the login page.
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    // Load products on the server side for initial render
    const products = await onGetProducts();

    // Pass the user and products to the page component.
    return { 
        user: locals.user,
        products
    };
};
