import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type {
	GroceryCart,
	GroceryCartWithItems,
	GroceryCartItem,
	GroceryCartItemInput,
	GroceryCartItemUpdate,
	GroceryCartInput,
	DeliveryTimeSlot
} from '$lib/types/groceryCart.schema';

/**
 * A wrapper for the onGetGroceryCart telefunc to avoid SSR import issues.
 * @returns {Promise<GroceryCartWithItems>} The result from the telefunc.
 */
const onGetGroceryCart = async (): Promise<GroceryCartWithItems> => {
	const { onGetGroceryCart } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onGetGroceryCart();
};

/**
 * A wrapper for the onAddToGroceryCart telefunc to avoid SSR import issues.
 * @param {GroceryCartItemInput} itemData - The item data to add to cart.
 * @returns {Promise<void>} The result from the telefunc.
 */
const onAddToGroceryCart = async (itemData: GroceryCartItemInput): Promise<any> => {
	const { onAddToGroceryCart } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onAddToGroceryCart(itemData);
};

/**
 * A wrapper for the onUpdateGroceryCartItem telefunc to avoid SSR import issues.
 * @param {GroceryCartItemUpdate} itemData - The item data to update.
 * @returns {Promise<void>} The result from the telefunc.
 */
const onUpdateGroceryCartItem = async (itemData: GroceryCartItemUpdate): Promise<any> => {
	const { onUpdateGroceryCartItem } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onUpdateGroceryCartItem(itemData);
};

/**
 * A wrapper for the onRemoveFromGroceryCart telefunc to avoid SSR import issues.
 * @param {string} itemId - The item ID to remove.
 * @returns {Promise<void>} The result from the telefunc.
 */
const onRemoveFromGroceryCart = async (itemId: string): Promise<void> => {
	const { onRemoveFromGroceryCart } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onRemoveFromGroceryCart(itemId);
};

/**
 * A wrapper for the onUpdateGroceryCart telefunc to avoid SSR import issues.
 * @param {GroceryCartInput} cartData - The cart data to update.
 * @returns {Promise<void>} The result from the telefunc.
 */
const onUpdateGroceryCart = async (cartData: GroceryCartInput): Promise<any> => {
	const { onUpdateGroceryCart } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onUpdateGroceryCart(cartData);
};

/**
 * A wrapper for the onClearGroceryCart telefunc to avoid SSR import issues.
 * @returns {Promise<void>} The result from the telefunc.
 */
const onClearGroceryCart = async (): Promise<void> => {
	const { onClearGroceryCart } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onClearGroceryCart();
};

/**
 * A wrapper for the onGetDeliveryTimeSlots telefunc to avoid SSR import issues.
 * @param {string} date - The date to get time slots for.
 * @returns {Promise<DeliveryTimeSlot[]>} The result from the telefunc.
 */
const onGetDeliveryTimeSlots = async (date?: string): Promise<DeliveryTimeSlot[]> => {
	const { onGetDeliveryTimeSlots } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onGetDeliveryTimeSlots(date);
};

/**
 * A wrapper for the onCalculateDeliveryFee telefunc to avoid SSR import issues.
 * @param {any} data - The data for calculating delivery fee.
 * @returns {Promise<any>} The result from the telefunc.
 */
const onCalculateDeliveryFee = async (data: { subtotal: number; is_express?: boolean }): Promise<any> => {
	const { onCalculateDeliveryFee } = await import('$lib/server/telefuncs/groceryCart.telefunc');
	return onCalculateDeliveryFee(data);
};

const groceryCartQueryKey = ['groceryCart'];
const deliveryTimeSlotsQueryKey = ['deliveryTimeSlots'];

export function useGroceryCart() {
	const queryClient = useQueryClient();

	// Query to fetch grocery cart with items
	const groceryCartQuery = createQuery<GroceryCartWithItems>({
		queryKey: groceryCartQueryKey,
		queryFn: () => onGetGroceryCart(),
		staleTime: 1000 * 60 * 2, // 2 minutes - shorter for real-time shopping
		gcTime: 1000 * 60 * 10 // 10 minutes
	});

	// Mutation to add item to grocery cart
	const addItemMutation = createMutation({
		mutationFn: (itemData: GroceryCartItemInput) => onAddToGroceryCart(itemData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: groceryCartQueryKey });
		},
		onError: (error) => {
			console.error('Failed to add item to grocery cart:', error);
		}
	});

	// Mutation to update cart item
	const updateItemMutation = createMutation({
		mutationFn: (itemData: GroceryCartItemUpdate) => onUpdateGroceryCartItem(itemData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: groceryCartQueryKey });
		},
		onError: (error) => {
			console.error('Failed to update grocery cart item:', error);
		}
	});

	// Mutation to remove item from cart
	const removeItemMutation = createMutation({
		mutationFn: (itemId: string) => onRemoveFromGroceryCart(itemId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: groceryCartQueryKey });
		},
		onError: (error) => {
			console.error('Failed to remove item from grocery cart:', error);
		}
	});

	// Mutation to update cart (delivery info, preferences, etc.)
	const updateCartMutation = createMutation({
		mutationFn: (cartData: GroceryCartInput) => onUpdateGroceryCart(cartData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: groceryCartQueryKey });
		},
		onError: (error) => {
			console.error('Failed to update grocery cart:', error);
		}
	});

	// Mutation to clear cart
	const clearCartMutation = createMutation({
		mutationFn: () => onClearGroceryCart(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: groceryCartQueryKey });
		},
		onError: (error) => {
			console.error('Failed to clear grocery cart:', error);
		}
	});

	// Derived state using Svelte 5 runes
	const cart = $derived(groceryCartQuery.data ?? null);
	const cartItems = $derived(cart?.items ?? []);
	const cartTotals = $derived(
		cart
			? {
					subtotal: cart.subtotal,
					tax_amount: cart.tax_amount,
					total_amount: cart.total_amount,
					delivery_fee: cart.delivery_fee,
					min_order_met: cart.min_order_met,
					item_count: cart.item_count
				}
			: {
					subtotal: 0,
					tax_amount: 0,
					total_amount: 0,
					delivery_fee: 0,
					min_order_met: false,
					item_count: 0
				}
	);

	// Convenience properties
	const isEmpty = $derived(cartItems.length === 0);
	const itemCount = $derived(cartTotals.item_count);
	const isMinOrderMet = $derived(cartTotals.min_order_met);

	// Helper methods that wrap mutations
	const addItem = (itemData: GroceryCartItemInput) => {
		return addItemMutation.mutate(itemData);
	};

	const updateQuantity = (itemId: string, quantity: number) => {
		const updateData: GroceryCartItemUpdate = {
			id: itemId,
			quantity
		};
		return updateItemMutation.mutate(updateData);
	};

	const updateSpecialInstructions = (itemId: string, specialInstructions: string) => {
		const updateData: GroceryCartItemUpdate = {
			id: itemId,
			special_instructions: specialInstructions
		};
		return updateItemMutation.mutate(updateData);
	};

	const updateSubstitutionAllowed = (itemId: string, substitutionAllowed: boolean) => {
		const updateData: GroceryCartItemUpdate = {
			id: itemId,
			substitution_allowed: substitutionAllowed
		};
		return updateItemMutation.mutate(updateData);
	};

	const removeItem = (itemId: string) => {
		return removeItemMutation.mutate(itemId);
	};

	const updateCart = (cartData: GroceryCartInput) => {
		return updateCartMutation.mutate(cartData);
	};

	const clearCart = () => {
		return clearCartMutation.mutate();
	};

	// Find item by product ID
	const findItemByProductId = (productId: string) => {
		return cartItems.find((item: GroceryCartItem) => item.product_id === productId);
	};

	// Get item quantity by product ID
	const getItemQuantity = (productId: string) => {
		const item = findItemByProductId(productId);
		return item?.quantity ?? 0;
	};

	return {
		// Query and its state
		groceryCartQuery,

		// Derived state (reactive)
		cart,
		cartItems,
		cartTotals,
		isEmpty,
		itemCount,
		isMinOrderMet,

		// Mutations
		addItem,
		updateQuantity,
		updateSpecialInstructions,
		updateSubstitutionAllowed,
		removeItem,
		updateCart,
		clearCart,

		// Helper methods
		findItemByProductId,
		getItemQuantity,

		// Mutation states
		isAddingItem: addItemMutation.isPending,
		isUpdatingItem: updateItemMutation.isPending,
		isRemovingItem: removeItemMutation.isPending,
		isUpdatingCart: updateCartMutation.isPending,
		isClearingCart: clearCartMutation.isPending,

		// Mutation statuses for granular control
		addItemStatus: addItemMutation.status,
		updateItemStatus: updateItemMutation.status,
		removeItemStatus: removeItemMutation.status,
		updateCartStatus: updateCartMutation.status,
		clearCartStatus: clearCartMutation.status,

		// Loading and error states
		isLoading: groceryCartQuery.isPending,
		isError: groceryCartQuery.isError,
		error: groceryCartQuery.error,

		// Refetch function
		refetch: groceryCartQuery.refetch
	};
}

export function useDeliveryTimeSlots(date?: string) {
	const groceryCartQuery = createQuery<DeliveryTimeSlot[]>({
		queryKey: [...deliveryTimeSlotsQueryKey, date],
		queryFn: () => onGetDeliveryTimeSlots(date),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15 // 15 minutes
	});

	const availableSlots = $derived(groceryCartQuery.data ?? []);

	return {
		deliveryTimeSlotsQuery: groceryCartQuery,
		availableSlots,
		isLoading: groceryCartQuery.isPending,
		isError: groceryCartQuery.isError,
		error: groceryCartQuery.error,
		refetch: groceryCartQuery.refetch
	};
}

export function useDeliveryFeeCalculation() {
	const calculateFeeMutation = createMutation({
		mutationFn: (data: { subtotal: number; is_express?: boolean }) => onCalculateDeliveryFee(data)
	});

	const calculateDeliveryFee = (subtotal: number, isExpress: boolean = false) => {
		return calculateFeeMutation.mutate({ subtotal, is_express: isExpress });
	};

	return {
		calculateDeliveryFee,
		calculatedFee: calculateFeeMutation.data,
		isCalculating: calculateFeeMutation.isPending,
		calculationError: calculateFeeMutation.error
	};
}
