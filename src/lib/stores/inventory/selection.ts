import { get, writable, derived } from 'svelte/store';
import type { Product } from '$lib/types';
import { filteredProducts } from './products.js';

// State
export const selectedProductIds = writable<string[]>([]);

// Derived
export const areAllVisibleRowsSelected = derived(
	[filteredProducts, selectedProductIds],
	([$filteredProducts, $selectedProductIds]) =>
		$filteredProducts.length > 0 && $selectedProductIds.length === $filteredProducts.length
);

// Actions
export function handleRowSelect(productId: string) {
	selectedProductIds.update((ids) =>
		ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId]
	);
}

export function toggleSelectAll() {
	selectedProductIds.update(($selectedProductIds) => {
		const allIds = (get(filteredProducts) as Product[]).map((p) => p.id);
		return $selectedProductIds.length === allIds.length ? [] : allIds;
	});
}
