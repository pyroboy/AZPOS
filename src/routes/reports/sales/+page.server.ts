import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { inventoryAdjustments } from '$lib/stores/stockTransactionStore';
import { products } from '$lib/stores/productStore';
import type { InventoryAdjustment, Product } from '$lib/types';
import type { Role } from '$lib/schemas/models';

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager'];

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();
    if (!ALLOWED_ROLES.includes(user.role)) {
        throw redirect(302, '/reports');
    }

    const allAdjustments = get(inventoryAdjustments);
    const allProducts: Product[] = get(products);

    const salesData = allAdjustments
        .filter((adj: InventoryAdjustment) => adj.adjustment_type === 'subtract' && adj.reason.startsWith('Sale'))
        .map((sale: InventoryAdjustment) => {
            const product = allProducts.find((p: Product) => p.id === sale.product_id);
            const saleAmount = product ? Math.abs(sale.quantity_adjusted) * product.price : 0;
            return {
                ...sale,
                productName: product?.name ?? 'Unknown Product',
                pricePerUnit: product?.price ?? 0,
                totalSale: saleAmount
            };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return {
        sales: salesData
    };
};
