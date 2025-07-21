import { derived } from 'svelte/store';
import { products } from './productStore';
import { productBatches } from './productBatchStore';
import type { Product, ProductBatch } from '$lib/schemas/models';

/**
 * A harmonized product type that includes calculated stock levels and associated batches.
 */
export type ProductWithStock = Product & {
	stock: number;
	batches: ProductBatch[];
};

/**
 * A derived store that combines product data with their corresponding batch information.
 * It provides a real-time, unified view of the inventory, calculating total stock
 * for each product and attaching the relevant batch details.
 */
export const inventory = derived([products, productBatches], ([$products, $productBatches]): ProductWithStock[] => {
	return $products.map((product) => {
		const batchesForProduct = $productBatches.filter((batch) => batch.product_id === product.id);
		const totalStock = batchesForProduct.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);

		return {
			...product,
			stock: totalStock,
			batches: batchesForProduct
		};
	});
});

