import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { productBatches } from '$lib/stores/productBatchStore';
import { products } from '$lib/stores/productStore';
import type { ProductBatch } from '$lib/types';
import type { Role } from '$lib/schemas/models';

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager', 'pharmacist'];

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();
    if (!ALLOWED_ROLES.includes(user.role)) {
        throw redirect(302, '/reports');
    }

    const allBatches = get(productBatches);
    const allProducts = get(products);

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
