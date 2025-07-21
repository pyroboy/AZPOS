import { writable } from 'svelte/store';
import type { Product, ProductBatch, Modifier, CartItem } from '$lib/schemas/models';
import type { Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

export interface CartStore extends Writable<CartItem[]> {
	addItem: (product: Product, batch: ProductBatch, quantity: number, modifiers?: Modifier[]) => void;
	removeItem: (cartItemId: string) => void;
	updateQuantity: (cartItemId: string, quantity: number) => void;
	updateItemPrice: (cartItemId: string, newPrice: number) => void;
	clearCart: () => void;
}

function createCartStore(): CartStore {
	const { subscribe, set, update } = writable<CartItem[]>([]);

	return {
		subscribe,
		set,
		update,
		addItem: (product: Product, batch: ProductBatch, quantity: number, modifiers: Modifier[] = []) => {
			update((items) => {
				const modifierIds = modifiers.map((m) => m.id).sort().join(',');
				// Find item with the same product, batch, and modifiers
				const existingItem = items.find(
					(item) =>
						item.productId === product.id &&
						item.batchId === batch.id &&
						item.modifiers.map((m: Modifier) => m.id).sort().join(',') === modifierIds
				);

				if (existingItem) {
					// Item with same product, batch, and modifiers exists, just update quantity
					return items.map((item) =>
						item.cartItemId === existingItem.cartItemId
							? { ...item, quantity: item.quantity + quantity }
							: item
					);
				} else {
					// Add as new item
					const modifierPrice = modifiers.reduce((sum, m) => sum + (m.price_adjustment || 0), 0);
					const newItem: CartItem = {
						cartItemId: uuidv4(),
						productId: product.id,
						name: product.name,
						sku: product.sku,
						quantity,
						price: product.price,
						batchId: batch.id,
						modifiers,
						finalPrice: product.price + modifierPrice,
						image_url: product.image_url,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					};
					return [...items, newItem];
				}
			});
		},

		removeItem: (cartItemId: string) => {
			update((items) => items.filter((item) => item.cartItemId !== cartItemId));
		},

		updateQuantity: (cartItemId: string, quantity: number) => {
			update((items) =>
				items
					.map((item) =>
						item.cartItemId === cartItemId ? { ...item, quantity: Math.max(0, quantity) } : item
					)
					.filter((item) => item.quantity > 0) // Also remove if quantity is 0
			);
		},

		updateItemPrice: (cartItemId: string, newPrice: number) => {
			update((items) =>
				items.map((item) =>
					item.cartItemId === cartItemId ? { ...item, finalPrice: newPrice } : item
				)
			);
		},

		clearCart: () => {
			set([]);
		}
	};
}

export const cart: CartStore = createCartStore();
