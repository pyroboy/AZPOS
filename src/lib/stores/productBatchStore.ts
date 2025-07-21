import { writable, get } from 'svelte/store';
import type { ProductBatch, CsvAdjustment } from '$lib/schemas/models';
import { products } from './productStore';

function createProductBatchStore() {
    const { subscribe, set, update } = writable<ProductBatch[]>([]);

    return {
        subscribe,
        set,
        clear: () => set([]),
        addBatch: (batch: Omit<ProductBatch, 'id' | 'created_at'>) => {
            const newBatch = {
                ...batch,
                id: `batch_${crypto.randomUUID()}`,
                created_at: new Date().toISOString()
            };
            update((batches) => [...batches, newBatch]);
        },
        updateBatch: (updatedBatch: ProductBatch) => {
            update((batches) =>
                batches.map((b) => (b.id === updatedBatch.id ? updatedBatch : b))
            );
        },
        deleteBatch: (id: string) => {
            update((batches) => batches.filter((b) => b.id !== id));
        },
        addStockToBatch: (batchId: string, quantity: number) => {
            update(batches => {
                const batchIndex = batches.findIndex(b => b.id === batchId);
                if (batchIndex !== -1) {
                    batches[batchIndex].quantity_on_hand += quantity;
                }
                return batches;
            });
        },
        removeStockFromBatch: (batchId: string, quantity: number) => {
            update(batches => {
                const batch = batches.find(b => b.id === batchId);
                if (batch) {
                    batch.quantity_on_hand -= quantity;
                }
                return batches;
            });
        },
		setStockForBatch: (batchId: string, quantity: number) => {
			update(batches => {
				const batch = batches.find(b => b.id === batchId);
				if (batch) {
					batch.quantity_on_hand = quantity;
				}
				return batches;
			});
		},
        adjustBatchQuantity: (batchId: string, quantityChange: number) => {
            update(batches => {
                const batchIndex = batches.findIndex(b => b.id === batchId);
                if (batchIndex !== -1) {
                    const newQuantity = batches[batchIndex].quantity_on_hand + quantityChange;
                    // Ensure stock doesn't go below zero
                    batches[batchIndex].quantity_on_hand = Math.max(0, newQuantity);
                }
                return batches;
            });
        },

		bulkAdjustFromCsv: (adjustments: CsvAdjustment[]) => {
			update(batches => {
				const newBatches = [...batches];
				for (const adj of adjustments) {
					const product = get(products).find(p => p.id === adj.product_id);
					if (!product) continue; // Skip if product not found

					const targetBatch = adj.batch_number
						? newBatches.find(b => b.product_id === adj.product_id && b.batch_number === adj.batch_number)
						: undefined;

					if (targetBatch) { // Adjust existing batch
						if (adj.adjustment_type === 'set') {
							targetBatch.quantity_on_hand = adj.adjustment_quantity;
						} else {
							const quantityChange = adj.adjustment_type === 'remove' ? -adj.adjustment_quantity : adj.adjustment_quantity;
							targetBatch.quantity_on_hand += quantityChange;
						}
						targetBatch.quantity_on_hand = Math.max(0, targetBatch.quantity_on_hand);
					} else { // Create new batch
						if (adj.adjustment_type === 'remove') continue; // Cannot remove from a non-existent batch

						const newBatch: ProductBatch = {
							id: `batch_${crypto.randomUUID()}`,
							product_id: adj.product_id,
							batch_number: adj.batch_number || `auto-${Date.now()}`,
							quantity_on_hand: adj.adjustment_quantity,
							purchase_cost: product.average_cost || 0, // Use product avg cost as a fallback
							expiration_date: adj.expiration_date || undefined,
							created_at: new Date().toISOString(),
						};
						newBatches.push(newBatch);
					}
				}
				return newBatches;
			});
		},

        bulkAdjust: (adjustments: { batchId: string, quantityChange: number }[]) => {
            update(batches => {
                const adjustmentsMap = new Map(adjustments.map(a => [a.batchId, a.quantityChange]));
                return batches.map(batch => {
                    const quantityChange = adjustmentsMap.get(batch.id);
                    if (quantityChange !== undefined) {
                        const newQuantity = batch.quantity_on_hand + quantityChange;
                        return {
                            ...batch,
                            quantity_on_hand: Math.max(0, newQuantity)
                        };
                    }
                    return batch;
                });
            });
        },

    };

}

export const productBatches = createProductBatchStore();

/**
 * Calculates the total stock for a given product across all its batches.
 * @param productId The ID of the product.
 * @param allBatches Optional. An array of all product batches. If not provided, it will get the current store value.
 * @returns The total quantity on hand for the product.
 */
export function getTotalStockForProduct(productId: string, allBatches?: ProductBatch[]): number {
    const batches = allBatches || get(productBatches);
    return batches
        .filter(b => b.product_id === productId)
        .reduce((total, b) => total + b.quantity_on_hand, 0);
}
