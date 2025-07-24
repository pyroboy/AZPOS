import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { get } from 'svelte/store';
import { inventoryAdjustments } from '$lib/stores/stockTransactionStore';
import { products } from '$lib/stores/productStore';
import { users } from '$lib/stores/userStore';
import type { InventoryAdjustment, Product, User } from '$lib/schemas/models';

export type DetailedAdjustment = InventoryAdjustment & {
    transaction_type: string; // e.g., 'Sale', 'Adjustment', 'Return'
    qty_change: number;
	productName: string;
	userName: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect if user is not authenticated
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const allAdjustments: InventoryAdjustment[] = get(inventoryAdjustments);
	const allProducts: Product[] = get(products);
	const allUsers: User[] = get(users);

	const detailedAdjustments: DetailedAdjustment[] = allAdjustments
		.map((adj) => {
			const product = allProducts.find((p) => p.id === adj.product_id);
			const user = allUsers.find((u) => u.id === adj.user_id);
			return {
				...adj,
				productName: product?.name ?? 'Unknown Product',
				userName: user?.full_name ?? 'System',
				transaction_type: 'Adjustment',
				qty_change: adj.adjustment_type === 'add' ? adj.quantity_adjusted : -adj.quantity_adjusted
			};
		})
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return { transactions: detailedAdjustments };
};
