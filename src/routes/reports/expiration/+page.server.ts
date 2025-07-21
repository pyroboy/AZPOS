import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { get } from 'svelte/store';
import { productBatches } from '$lib/stores/productBatchStore';
import { products } from '$lib/stores/productStore';
import type { ProductBatch } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect if user is not authenticated
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const allBatches = get(productBatches);
	const allProducts = get(products);

	// Get near-expiry batches (e.g., expiring within 90 days)
	const now = new Date();
	const ninetyDaysFromNow = new Date();
	ninetyDaysFromNow.setDate(now.getDate() + 90);

	const nearExpiryBatches = allBatches.filter((batch: ProductBatch) => {
		if (!batch.expiration_date) {
			return false;
		}
		const expiryDate = new Date(batch.expiration_date);
		return expiryDate > now && expiryDate <= ninetyDaysFromNow;
	});

    const detailedNearExpiryProducts = nearExpiryBatches.map(batch => {
        const product = allProducts.find(p => p.id === batch.product_id);
        return {
            ...batch,
            productName: product?.name ?? 'Unknown Product',
        };
    });

	return { nearExpiryProducts: detailedNearExpiryProducts };
};
