import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	onGetCart,
	onAddCartItem,
	onUpdateCartItem,
	onApplyCartDiscount,
	onClearCart,
	onCalculateCartTotals
} from '$lib/server/telefuncs/cart.telefunc';
import type {
	CartState,
	EnhancedCartItem,
	AddCartItemInput,
	UpdateCartItemInput,
	CartDiscount,
	CartTotals
} from '$lib/types/cart.schema';
import { browser } from '$app/environment';
import { v4 as uuidv4 } from 'uuid';
import type { Product } from '$lib/types/product.schema';
import type { CartItemModifier } from '$lib/types/cart.schema';

const cartQueryKey = ['cart'];
const cartTotalsQueryKey = ['cart', 'totals'];

// Get or create session ID for guest users
function getSessionId(): string {
	if (!browser) return uuidv4();

	const STORAGE_KEY = 'azpos_cart_session';
	let sessionId = localStorage.getItem(STORAGE_KEY);

	if (!sessionId) {
		sessionId = uuidv4();
		localStorage.setItem(STORAGE_KEY, sessionId);
	}

	return sessionId;
}

export function useCart() {
	const queryClient = useQueryClient();
	const sessionId = getSessionId();

	// Query to fetch cart state
	const cartQuery = createQuery<CartState>({
		queryKey: [...cartQueryKey, sessionId],
		queryFn: () => onGetCart(sessionId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30 // 30 minutes
	});

	// Query to fetch cart totals (derived from cart state)
	const cartTotalsQuery = createQuery<CartTotals>({
		queryKey: [...cartTotalsQueryKey, sessionId],
		queryFn: () => onCalculateCartTotals(sessionId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		enabled: !!cartQuery.data // Only run when cart data is available
	});

	// Mutation to add item to cart
	const addItemMutation = createMutation({
		mutationFn: (itemData: AddCartItemInput) => onAddCartItem(itemData, sessionId),
		onSuccess: () => {
			// Invalidate and refetch cart data
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		}
	});

	// Mutation to update cart item
	const updateItemMutation = createMutation({
		mutationFn: (updateData: UpdateCartItemInput) => onUpdateCartItem(updateData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		}
	});

	// Mutation to apply discount
	const applyDiscountMutation = createMutation({
		mutationFn: (discount: CartDiscount) => onApplyCartDiscount(discount, sessionId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		}
	});

	// Mutation to clear cart
	const clearCartMutation = createMutation({
		mutationFn: () => onClearCart(sessionId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		}
	});

	// Re-create derived state using Svelte 5 runes on the query's data
	const cartState = $derived(
		cartQuery.data ?? {
			items: [],
			discount: null,
			session_id: sessionId,
			last_updated: new Date().toISOString()
		}
	);

	const cartTotals = $derived(
		cartTotalsQuery.data ?? {
			subtotal: 0,
			discount_amount: 0,
			tax: 0,
			total: 0,
			item_count: 0
		}
	);

	// Derived convenience properties
	const items = $derived(cartState.items);
	const isEmpty = $derived(cartState.items.length === 0);
	const itemCount = $derived(cartTotals.item_count);

	// Helper methods that wrap mutations
	const addItem = (
		product: Product,
		quantity: number = 1,
		modifiers?: CartItemModifier[],
		notes?: string
	) => {
		const itemData: AddCartItemInput = {
			product_id: product.id,
			quantity,
			selected_modifiers: modifiers,
			notes
		};
		return addItemMutation.mutate(itemData);
	};

	const updateQuantity = (cartItemId: string, quantity: number) => {
		const updateData: UpdateCartItemInput = {
			cart_item_id: cartItemId,
			quantity
		};
		return updateItemMutation.mutate(updateData);
	};

	const removeItem = (cartItemId: string) => {
		return updateQuantity(cartItemId, 0);
	};

	const applyDiscount = (discount: CartDiscount) => {
		return applyDiscountMutation.mutate(discount);
	};

	const clearCart = () => {
		return clearCartMutation.mutate();
	};

	// Optimistic updates for better UX
	const addItemOptimistic = (product: Product, quantity: number = 1) => {
		// Optimistically update the cache
		queryClient.setQueryData([...cartQueryKey, sessionId], (oldData: CartState | undefined) => {
			if (!oldData) return oldData;

			const existingItemIndex = oldData.items.findIndex((item) => item.product_id === product.id);

			if (existingItemIndex >= 0) {
				// Update existing item
				const updatedItems = [...oldData.items];
				updatedItems[existingItemIndex] = {
					...updatedItems[existingItemIndex],
					quantity: updatedItems[existingItemIndex].quantity + quantity,
					subtotal:
						updatedItems[existingItemIndex].final_price *
						(updatedItems[existingItemIndex].quantity + quantity)
				};

				return {
					...oldData,
					items: updatedItems,
					last_updated: new Date().toISOString()
				};
			} else {
				// Add new item
				const newItem: EnhancedCartItem = {
					cart_item_id: `temp-${Date.now()}`,
					product_id: product.id,
					product_name: product.name,
					product_sku: product.sku,
					base_price: product.selling_price,
					quantity,
					subtotal: product.selling_price * quantity,
					final_price: product.selling_price,
					image_url: product.image_url,
					added_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};

				return {
					...oldData,
					items: [...oldData.items, newItem],
					last_updated: new Date().toISOString()
				};
			}
		});

		// Then perform the actual mutation
		return addItem(product, quantity);
	};

	return {
		// Queries and their states
		cartQuery,
		cartTotalsQuery,

		// Derived state (reactive)
		cartState,
		cartTotals,
		items,
		isEmpty,
		itemCount,

		// Mutations
		addItem,
		addItemOptimistic,
		updateQuantity,
		removeItem,
		applyDiscount,
		clearCart,

		// Mutation states
		isAddingItem: addItemMutation.isPending,
		isUpdatingItem: updateItemMutation.isPending,
		isClearingCart: clearCartMutation.isPending,

		// Loading states
		isLoading: cartQuery.isPending,
		isError: cartQuery.isError,
		error: cartQuery.error
	};
}
