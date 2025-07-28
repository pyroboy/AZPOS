import type { InventoryAdjustment } from '$lib/schemas/models';
import { SvelteDate } from 'svelte/reactivity';
/**
 * Svelte 5 stock transaction management using runes
 * This replaces the legacy writable store with modern reactive state
 */

// Sample inventory adjustment data for MVP
const initialAdjustments: InventoryAdjustment[] = [
	{
		id: 'adj-sale-1',
		product_id: 'prod-paracetamol-500',
		batch_id: 'batch-para-1',
		quantity_adjusted: -2,
		adjustment_type: 'subtract',
		reason: 'Sale (Order: ord-12345)',
		created_at: new Date('2023-10-15T10:00:00Z').toISOString(),
		user_id: 'user-cashier'
	},
	{
		id: 'adj-stockin-1',
		product_id: 'prod-paracetamol-500',
		batch_id: 'batch-para-1',
		quantity_adjusted: 100,
		adjustment_type: 'add',
		reason: 'Stock In (PO Item: po-item-1)',
		created_at: new Date('2023-10-01T09:00:00Z').toISOString(),
		user_id: 'user-manager'
	}
];

// Reactive state using Svelte 5 runes
let inventoryAdjustments = $state<InventoryAdjustment[]>([...initialAdjustments]);

// Export reactive state and functions
export { inventoryAdjustments };

export function addAdjustment(adjustment: Omit<InventoryAdjustment, 'id' | 'created_at'>) {
	const newAdjustment: InventoryAdjustment = {
		id: `adj-${crypto.randomUUID()}`,
		created_at: new SvelteDate().toISOString(),
		...adjustment
	};
	inventoryAdjustments = [...inventoryAdjustments, newAdjustment];
	return newAdjustment;
}

export function getAllAdjustments(): InventoryAdjustment[] {
	return [...inventoryAdjustments];
}

export function reset() {
	inventoryAdjustments = [...initialAdjustments];
}

// Utility functions for filtering adjustments
export function getAdjustmentsForProduct(productId: string): InventoryAdjustment[] {
	return inventoryAdjustments.filter((adj) => adj.product_id === productId);
}

export function getAdjustmentsForBatch(batchId: string): InventoryAdjustment[] {
	return inventoryAdjustments.filter((adj) => adj.batch_id === batchId);
}

export function getAdjustmentsByType(type: 'add' | 'subtract'): InventoryAdjustment[] {
	return inventoryAdjustments.filter((adj) => adj.adjustment_type === type);
}

export function getAdjustmentsByDateRange(
	startDate: string,
	endDate: string
): InventoryAdjustment[] {
	return inventoryAdjustments.filter(
		(adj) => adj.created_at >= startDate && adj.created_at <= endDate
	);
}
