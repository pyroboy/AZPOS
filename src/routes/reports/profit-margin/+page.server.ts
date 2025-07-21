import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { get } from 'svelte/store';
import { inventoryAdjustments } from '$lib/stores/stockTransactionStore';
import { products } from '$lib/stores/productStore';
import { productBatches } from '$lib/stores/productBatchStore';
import type { InventoryAdjustment, Product, ProductBatch } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const allAdjustments = get(inventoryAdjustments);
	const allProducts: Product[] = get(products);
	const allBatches: ProductBatch[] = get(productBatches);

	// Filter for sales adjustments
	const saleAdjustments = allAdjustments.filter(
		(adj: InventoryAdjustment) =>
			adj.adjustment_type === 'subtract' && adj.reason.startsWith('Sale')
	);

	// Create a mutable copy of batches for FIFO calculation
	const tempBatches: ProductBatch[] = JSON.parse(JSON.stringify(allBatches));

	const salesWithProfit = saleAdjustments.map((sale: InventoryAdjustment) => {
		const product = allProducts.find((p: Product) => p.id === sale.product_id);
		const saleQty = Math.abs(sale.quantity_adjusted);
		const revenue = (product?.price ?? 0) * saleQty;

		// Find batches for the product, sort by date to ensure FIFO
		const productBatchesForFifo = tempBatches
			.filter((b: ProductBatch) => b.product_id === sale.product_id)
			.sort(
				(a: ProductBatch, b: ProductBatch) =>
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);

		let costOfGoodsSold = 0;
		let qtyToFulfill = saleQty;

		for (const batch of productBatchesForFifo) {
			if (qtyToFulfill === 0) break;

			const qtyFromBatch = Math.min(qtyToFulfill, batch.quantity_on_hand);
			costOfGoodsSold += qtyFromBatch * batch.purchase_cost;

			// Decrease the batch quantity for subsequent calculations
			batch.quantity_on_hand -= qtyFromBatch;
			qtyToFulfill -= qtyFromBatch;
		}

		const profit = revenue - costOfGoodsSold;
		const profitMargin = revenue > 0 ? profit / revenue : 0;

		return {
			...sale,
			productName: product?.name ?? 'Unknown',
			revenue,
			costOfGoodsSold,
			profit,
			profitMargin: profitMargin * 100
		};
	});

	return { salesWithProfit };
};
