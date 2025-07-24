import { writable, get } from 'svelte/store';
import type { Product, ProductBatch, Modifier, CartItem } from '$lib/schemas/models';
import type { Writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

export interface CartState {
	items: CartItem[];
	discount: { type: 'percentage' | 'fixed'; value: number } | null;
}

export interface CartStore extends Writable<CartState> {
  addItem: (product: Product, batch: ProductBatch, quantity: number, modifiers?: Modifier[]) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemPrice: (cartItemId: string, newPrice: number) => void;
  clearCart: () => void;
  applyDiscount: (discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
  finalizeCart: () => {
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
    items: CartItem[];
  };
}

function createCartStore(): CartStore {
  const initialState: CartState = {
    items: [],
    discount: null
  };

  const store = writable<CartState>(initialState);
  const { subscribe, set, update } = store;

  return {
    subscribe,
    set,
    update,
    addItem: (product: Product, batch: ProductBatch, quantity: number, modifiers: Modifier[] = []) => {
      update((state) => {
        const modifierIds = modifiers.map((m) => m.id).sort().join(',');
        const existingItem = state.items.find(
          (item) =>
            item.productId === product.id &&
            item.batchId === batch.id &&
            item.modifiers.map((m: Modifier) => m.id).sort().join(',') === modifierIds
        );

        if (existingItem) {
          const updatedItems = state.items.map((item) =>
            item.cartItemId === existingItem.cartItemId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          return { ...state, items: updatedItems };
        } else {
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
          return { ...state, items: [...state.items, newItem] };
        }
      });
    },

    removeItem: (cartItemId: string) => {
      update((state) => ({
        ...state,
        items: state.items.filter((item) => item.cartItemId !== cartItemId)
      }));
    },

    updateQuantity: (cartItemId: string, quantity: number) => {
      update((state) => ({
        ...state,
        items: state.items
          .map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity: Math.max(0, quantity) } : item
          )
          .filter((item) => item.quantity > 0)
      }));
    },

    updateItemPrice: (cartItemId: string, newPrice: number) => {
      update((state) => ({
        ...state,
        items: state.items.map((item) =>
          item.cartItemId === cartItemId ? { ...item, finalPrice: newPrice } : item
        )
      }));
    },

    clearCart: () => {
      set(initialState);
    },

    applyDiscount: (discount: { type: 'percentage' | 'fixed'; value: number } | null) => {
      update((state) => ({ ...state, discount }));
    },

		finalizeCart: () => {
			const currentState = get(store);

			const subtotal = currentState.items.reduce(
				(acc, item) => acc + item.finalPrice * item.quantity,
				0
			);

			let discountAmount = 0;
			if (currentState.discount) {
				if (currentState.discount.type === 'percentage') {
					discountAmount = subtotal * (currentState.discount.value / 100);
				} else {
					discountAmount = currentState.discount.value;
				}
			}

			const taxableAmount = subtotal - discountAmount;
			const tax = taxableAmount * 0.12; // 12% VAT
			const total = taxableAmount + tax;

			return {
				subtotal,
				discountAmount,
				tax,
				total,
				items: currentState.items
			};
		}
	};
}

export const cart: CartStore = createCartStore();
