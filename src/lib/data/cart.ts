import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGetCart = async (sessionId: string): Promise<CartState> => {
	const { onGetCart } = await import('$lib/server/telefuncs/cart.telefunc');
	return onGetCart(sessionId);
};

const onAddCartItem = async (itemData: AddCartItemInput, sessionId: string): Promise<void> => {
	const { onAddCartItem } = await import('$lib/server/telefuncs/cart.telefunc');
	return onAddCartItem(itemData, sessionId);
};

const onUpdateCartItem = async (updateData: UpdateCartItemInput): Promise<void> => {
	const { onUpdateCartItem } = await import('$lib/server/telefuncs/cart.telefunc');
	return onUpdateCartItem(updateData);
};

const onApplyCartDiscount = async (discount: CartDiscount, sessionId: string): Promise<void> => {
	const { onApplyCartDiscount } = await import('$lib/server/telefuncs/cart.telefunc');
	return onApplyCartDiscount(discount, sessionId);
};

const onClearCart = async (sessionId: string): Promise<void> => {
	const { onClearCart } = await import('$lib/server/telefuncs/cart.telefunc');
	return onClearCart(sessionId);
};

const onCalculateCartTotals = async (sessionId: string): Promise<CartTotals> => {
	const { onCalculateCartTotals } = await import('$lib/server/telefuncs/cart.telefunc');
	return onCalculateCartTotals(sessionId);
};
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
		gcTime: 1000 * 60 * 30, // 30 minutes
		enabled: browser
	});

	// Query to fetch cart totals (derived from cart state)
	const cartTotalsQuery = createQuery<CartTotals>({
		queryKey: [...cartTotalsQueryKey, sessionId],
		queryFn: () => onCalculateCartTotals(sessionId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		enabled: browser && !!cartQuery.data // Only run when cart data is available
	});

	// Mutation to add item to cart
	const addItemMutation = createMutation({
		mutationFn: (itemData: AddCartItemInput) => onAddCartItem(itemData, sessionId),
		onSuccess: () => {
			// Invalidate and refetch cart data
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		},
		onError: (error) => {
			// Revert optimistic updates on error
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
			console.error('Failed to add item to cart:', error);
		}
	});

	// Mutation to update cart item
	const updateItemMutation = createMutation({
		mutationFn: (updateData: UpdateCartItemInput) => onUpdateCartItem(updateData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		},
		onError: (error) => {
			// Revert optimistic updates on error
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
			console.error('Failed to update cart item:', error);
		}
	});

	// Mutation to apply discount
	const applyDiscountMutation = createMutation({
		mutationFn: (discount: CartDiscount) => onApplyCartDiscount(discount, sessionId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		},
		onError: (error) => {
			// Revert optimistic updates on error
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
			console.error('Failed to apply discount:', error);
		}
	});

	// Mutation to clear cart
	const clearCartMutation = createMutation({
		mutationFn: () => onClearCart(sessionId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
		},
		onError: (error) => {
			// Revert optimistic updates on error
			queryClient.invalidateQueries({ queryKey: [...cartQueryKey, sessionId] });
			queryClient.invalidateQueries({ queryKey: [...cartTotalsQueryKey, sessionId] });
			console.error('Failed to clear cart:', error);
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

	const updateQuantity = (cartItemId: string, newQuantity: number) => {
		const updateData: UpdateCartItemInput = {
			cart_item_id: cartItemId,
			quantity: Math.min(Math.max(0, newQuantity), 999) // Ensure valid range
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
	const addItemOptimistic = (
		product: Product,
		quantity: number = 1,
		modifiers?: CartItemModifier[],
		notes?: string
	) => {
		// Optimistically update the cache
		queryClient.setQueryData([...cartQueryKey, sessionId], (oldData: CartState | undefined) => {
			if (!oldData) {
				// Create initial cart state if none exists
				return {
					items: [],
					discount: null,
					session_id: sessionId,
					last_updated: new Date().toISOString()
				};
			}

			const modifierIds = modifiers?.map(m => m.modifier_id).sort().join(',') || '';
			const existingItemIndex = oldData.items.findIndex(
				(item) => item.product_id === product.id && 
				(item.selected_modifiers?.map(m => m.modifier_id).sort().join(',') || '') === modifierIds
			);

			const modifierPrice = modifiers?.reduce((sum, m) => sum + m.price_adjustment, 0) || 0;
			const itemPrice = product.selling_price + modifierPrice;

			if (existingItemIndex >= 0) {
				// Update existing item
				const updatedItems = [...oldData.items];
				const existingItem = updatedItems[existingItemIndex];
				const newQuantity = Math.min(existingItem.quantity + quantity, 999);
				
				updatedItems[existingItemIndex] = {
					...existingItem,
					quantity: newQuantity,
					subtotal: itemPrice * newQuantity,
					final_price: itemPrice * newQuantity,
					updated_at: new Date().toISOString(),
					notes: notes || existingItem.notes
				};

				return {
					...oldData,
					items: updatedItems,
					last_updated: new Date().toISOString()
				};
			} else {
				// Add new item
				const newItem: EnhancedCartItem = {
					cart_item_id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					product_id: product.id,
					product_name: product.name,
					product_sku: product.sku,
					base_price: product.selling_price,
					quantity: Math.min(quantity, 999),
					selected_modifiers: modifiers,
					subtotal: itemPrice * Math.min(quantity, 999),
					final_price: itemPrice * Math.min(quantity, 999),
					image_url: product.image_url,
					added_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					notes
				};

				return {
					...oldData,
					items: [...oldData.items, newItem],
					last_updated: new Date().toISOString()
				};
			}
		});

		// Also optimistically update totals
		queryClient.setQueryData([...cartTotalsQueryKey, sessionId], (oldTotals: CartTotals | undefined) => {
			if (!oldTotals) return undefined;
			
			const modifierPrice = modifiers?.reduce((sum, m) => sum + m.price_adjustment, 0) || 0;
			const itemPrice = product.selling_price + modifierPrice;
			const addedSubtotal = itemPrice * quantity;
			
			const newSubtotal = oldTotals.subtotal + addedSubtotal;
			const newTax = newSubtotal * 0.12; // 12% VAT
			const newTotal = newSubtotal + newTax;
			
			return {
				...oldTotals,
				subtotal: newSubtotal,
				tax: newTax,
				total: newTotal,
				item_count: oldTotals.item_count + quantity
			};
		});

		// Then perform the actual mutation
		return addItem(product, quantity, modifiers, notes);
	};

	// Optimistic quantity update
	const updateQuantityOptimistic = (cartItemId: string, newQuantity: number) => {
		// Optimistically update cart state
		queryClient.setQueryData([...cartQueryKey, sessionId], (oldData: CartState | undefined) => {
			if (!oldData) return oldData;

			const updatedItems = oldData.items.map(item => {
				if (item.cart_item_id === cartItemId) {
					if (newQuantity <= 0) {
						// Remove item if quantity is 0 or less
						return null;
					}
					
					const modifierPrice = item.selected_modifiers?.reduce((sum, m) => sum + m.price_adjustment, 0) || 0;
					const itemPrice = item.base_price + modifierPrice;
					const validQuantity = Math.min(Math.max(1, newQuantity), 999);
					
					return {
						...item,
						quantity: validQuantity,
						subtotal: itemPrice * validQuantity,
						final_price: itemPrice * validQuantity,
						updated_at: new Date().toISOString()
					};
				}
				return item;
			}).filter(Boolean) as EnhancedCartItem[];

			return {
				...oldData,
				items: updatedItems,
				last_updated: new Date().toISOString()
			};
		});

		// Optimistically update totals
		queryClient.setQueryData([...cartTotalsQueryKey, sessionId], (oldTotals: CartTotals | undefined) => {
			if (!oldTotals) return undefined;
			
			// Get current cart data to recalculate totals
			const currentCart = queryClient.getQueryData([...cartQueryKey, sessionId]) as CartState | undefined;
			if (!currentCart) return oldTotals;
			
			const newSubtotal = currentCart.items.reduce((sum, item) => sum + item.subtotal, 0);
			const newTax = newSubtotal * 0.12;
			const newTotal = newSubtotal + newTax;
			const newItemCount = currentCart.items.reduce((sum, item) => sum + item.quantity, 0);
			
			return {
				...oldTotals,
				subtotal: newSubtotal,
				tax: newTax,
				total: newTotal,
				item_count: newItemCount
			};
		});

		// Then perform the actual mutation
		return updateQuantity(cartItemId, newQuantity);
	};

	// Optimistic item removal
	const removeItemOptimistic = (cartItemId: string) => {
		return updateQuantityOptimistic(cartItemId, 0);
	};

	// Optimistic discount application
	const applyDiscountOptimistic = (discount: CartDiscount) => {
		// Optimistically update cart state
		queryClient.setQueryData([...cartQueryKey, sessionId], (oldData: CartState | undefined) => {
			if (!oldData) return oldData;

			return {
				...oldData,
				discount,
				last_updated: new Date().toISOString()
			};
		});

		// Optimistically update totals with discount
		queryClient.setQueryData([...cartTotalsQueryKey, sessionId], (oldTotals: CartTotals | undefined) => {
			if (!oldTotals) return undefined;
			
			let discountAmount = 0;
			if (discount.type === 'percentage') {
				discountAmount = oldTotals.subtotal * (discount.value / 100);
			} else {
				discountAmount = discount.value;
			}
			
			const discountedSubtotal = oldTotals.subtotal - discountAmount;
			const newTax = discountedSubtotal * 0.12;
			const newTotal = discountedSubtotal + newTax;
			
			return {
				...oldTotals,
				discount_amount: discountAmount,
				tax: newTax,
				total: newTotal
			};
		});

		// Then perform the actual mutation
		return applyDiscount(discount);
	};

	// Optimistic cart clearing
	const clearCartOptimistic = () => {
		// Optimistically clear cart state
		queryClient.setQueryData([...cartQueryKey, sessionId], {
			items: [],
			discount: null,
			session_id: sessionId,
			last_updated: new Date().toISOString()
		});

		// Optimistically clear totals
		queryClient.setQueryData([...cartTotalsQueryKey, sessionId], {
			subtotal: 0,
			discount_amount: 0,
			tax: 0,
			total: 0,
			item_count: 0
		});

		// Then perform the actual mutation
		return clearCart();
	};

	// Additional helper functions
	const getItemById = (cartItemId: string) => {
	return cartState.items.find((item: EnhancedCartItem) => item.cart_item_id === cartItemId);
	};

	const getItemQuantity = (productId: string) => {
		return cartState.items
		.filter((item: EnhancedCartItem) => item.product_id === productId)
			.reduce((sum: number, item: EnhancedCartItem) => sum + item.quantity, 0);
	};

	const hasItem = (productId: string) => {
	return cartState.items.some((item: EnhancedCartItem) => item.product_id === productId);
	};

	// Batch operations
	const addMultipleItems = async (items: Array<{
		product: Product;
		quantity: number;
		modifiers?: CartItemModifier[];
		notes?: string;
	}>) => {
		const promises = items.map(({ product, quantity, modifiers, notes }) => 
			addItemOptimistic(product, quantity, modifiers, notes)
		);
		return Promise.all(promises);
	};

	// Update item notes
	const updateItemNotes = (cartItemId: string, notes: string) => {
		// Optimistically update notes
		queryClient.setQueryData([...cartQueryKey, sessionId], (oldData: CartState | undefined) => {
			if (!oldData) return oldData;

			const updatedItems = oldData.items.map(item => {
				if (item.cart_item_id === cartItemId) {
					return {
						...item,
						notes: notes.length > 500 ? notes.substring(0, 500) : notes,
						updated_at: new Date().toISOString()
					};
				}
				return item;
			});

			return {
				...oldData,
				items: updatedItems,
				last_updated: new Date().toISOString()
			};
		});

		// Perform the actual update via mutation
		return updateItemMutation.mutate({
			cart_item_id: cartItemId,
			notes
		});
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

		// Basic mutations
		addItem,
		updateQuantity,
		removeItem,
		applyDiscount,
		clearCart,

		// Optimistic mutations (recommended for better UX)
		addItemOptimistic,
		updateQuantityOptimistic,
		removeItemOptimistic,
		applyDiscountOptimistic,
		clearCartOptimistic,

		// Helper functions
		getItemById,
		getItemQuantity,
		hasItem,
		updateItemNotes,

		// Batch operations
		addMultipleItems,

		// Mutation states
		isAddingItem: addItemMutation.isPending,
		isUpdatingItem: updateItemMutation.isPending,
		isClearingCart: clearCartMutation.isPending,
		isApplyingDiscount: applyDiscountMutation.isPending,

		// Loading states
		isLoading: cartQuery.isPending,
		isError: cartQuery.isError,
		error: cartQuery.error,

		// Session info
		sessionId
	};
}
