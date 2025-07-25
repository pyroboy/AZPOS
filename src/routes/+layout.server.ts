import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { users } from '$lib/stores/userStore';
import { productBatches } from '$lib/stores/productBatchStore';

export const load: LayoutServerLoad = async ({ locals, url, fetch }) => {
    if (!locals.user && url.pathname !== '/login') {
        throw redirect(302, '/login');
    }

    // 🎯 Surgical fix: Load CSV directly for meta
    const [productsRes, metaRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/products/meta')
    ]);

    let products = [];
    let meta = {
        totalProducts: 0,
        totalInventoryValue: 0,
        potentialRevenue: 0,
        lowStockCount: 0,
        outOfStockCount: 0
    };

    if (productsRes.ok) {
        const productsData = await productsRes.json();
        products = productsData.products;
    }

    if (metaRes.ok) {
        meta = await metaRes.json();
    }

    return {
        user: locals.user,
        users: users.getAllActiveUsers(),
        products,
        productBatches: get(productBatches),
        meta // 🎯 This fixes the meta disconnect
    };
};
