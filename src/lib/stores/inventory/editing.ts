import { writable, get } from 'svelte/store';
import { products } from '$lib/stores/productStore';

// State
export const editingCell = writable<{ productId: string; field: 'price' | 'stock' } | null>(null);
export const editValue = writable('');

// Actions
export function startEditing(productId: string, field: 'price' | 'stock', currentValue: number | string) {
	editingCell.set({ productId, field });
	editValue.set(String(currentValue));
}

export function cancelEdit() {
	editingCell.set(null);
	editValue.set('');
}

export function saveEdit() {
	const cell = get(editingCell);
	if (!cell) return;

	const { productId, field } = cell;
	const numericValue = parseFloat(get(editValue));

	if (isNaN(numericValue)) {
		cancelEdit();
		return;
	}

	const allProducts = get(products);
	const productToUpdate = allProducts.find((p) => p.id === productId);

	if (productToUpdate) {
		const updatedProduct = { ...productToUpdate, [field]: numericValue };
		products.updateProduct(updatedProduct.id, updatedProduct);
	}

	cancelEdit();
}
