import type { Product, ProductBatch, Modifier } from '$lib/schemas/models';
import { browser } from '$app/environment';
import { v4 as uuidv4 } from 'uuid';

// Enhanced CartItem interface aligned with CustomerCartItemSchema
export interface EnhancedCartItem {
	cart_item_id: string;
	product_id: string;
	product_name: string;
	product_sku: string;
	base_price: number;
	quantity: number;
	selected_modifiers?: Array<{
		modifier_id: string;
		modifier_name: string;
		price_adjustment: number;
	}>;
	applied_discounts?: Array<{
		discount_id: string;
		discount_name: string;
		discount_amount: number;
	}>;
	subtotal: number;
	final_price: number;
	image_url?: string;
	added_at: string;
	updated_at: string;
	notes?: string;
}

export interface CartState {
	items: EnhancedCartItem[];
	discount: { type: 'percentage' | 'fixed'; value: number } | null;
	session_id?: string;
	last_updated?: string;
}

export interface CartTotals {
	subtotal: number;
	discount_amount: number;
	tax: number;
	total: number;
	item_count: number;
}

function createCartStore() {
	const STORAGE_KEY = 'azpos_cart_session';

	// Load initial state from session storage
	const loadInitialState = (): CartState => {
		if (browser) {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					// Validate and sanitize stored data
					if (parsed.items && Array.isArray(parsed.items)) {
						return {
							items: parsed.items,
							discount: parsed.discount || null,
							session_id: parsed.session_id || uuidv4(),
							last_updated: parsed.last_updated || new Date().toISOString()
						};
					}
				}
			} catch (error) {
				console.warn('Failed to load cart from session storage:', error);
			}
		}

		return {
			items: [],
			discount: null,
			session_id: uuidv4(),
			last_updated: new Date().toISOString()
		};
	};

	// 1. Use $state for the cart state
	let state = $state<CartState>(loadInitialState());

	// 2. Use $derived for computed totals
	const totals = $derived.by(() => {
		const subtotal = state.items.reduce((acc, item) => acc + item.subtotal, 0);

		let discount_amount = 0;
		if (state.discount) {
			if (state.discount.type === 'percentage') {
				discount_amount = subtotal * (state.discount.value / 100);
			} else {
				discount_amount = state.discount.value;
			}
		}

		const taxableAmount = subtotal - discount_amount;
		const tax = taxableAmount * 0.12; // 12% VAT
		const total = taxableAmount + tax;
		const item_count = state.items.reduce((acc, item) => acc + item.quantity, 0);

		return {
			subtotal,
			discount_amount,
			tax,
			total,
			item_count
		};
	});

	// 3. Use $effect for localStorage synchronization
	$effect(() => {
		if (!browser) return;

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			console.warn('Failed to save cart to session storage:', error);
		}
	});

	// Save to session storage
	function saveToSession() {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			} catch (error) {
				console.warn('Failed to save cart to session storage:', error);
			}
		}
	}

	// Load from session storage
	function loadFromSession() {
		const initialState = loadInitialState();
		state = initialState;
	}

	// 4. Methods directly mutate the state
	function addItem(
		product: Product,
		batch: ProductBatch,
		quantity: number,
		modifiers: Modifier[] = [],
		notes?: string
	) {
		// Validate quantity (max 999 as per schema)
		const validQuantity = Math.min(Math.max(1, quantity), 999);

		const modifierIds = modifiers
			.map((m) => m.id)
			.sort()
			.join(',');
		const existingItem = state.items.find(
			(item) =>
				item.product_id === product.id &&
				item.selected_modifiers
					?.map((m) => m.modifier_id)
					.sort()
					.join(',') === modifierIds
		);

		const now = new Date().toISOString();
		const modifierPrice = modifiers.reduce((sum, m) => sum + (m.price_adjustment || 0), 0);
		const itemSubtotal = (product.price + modifierPrice) * validQuantity;

		if (existingItem) {
			const newQuantity = Math.min(existingItem.quantity + validQuantity, 999);
			const itemIndex = state.items.findIndex(
				(item) => item.cart_item_id === existingItem.cart_item_id
			);

			state.items[itemIndex] = {
				...state.items[itemIndex],
				quantity: newQuantity,
				subtotal: (product.price + modifierPrice) * newQuantity,
				final_price: (product.price + modifierPrice) * newQuantity,
				updated_at: now,
				notes: notes || state.items[itemIndex].notes
			};
		} else {
			const newItem: EnhancedCartItem = {
				cart_item_id: uuidv4(),
				product_id: product.id,
				product_name: product.name,
				product_sku: product.sku,
				base_price: product.price,
				quantity: validQuantity,
				selected_modifiers: modifiers.map((m) => ({
					modifier_id: m.id,
					modifier_name: m.name,
					price_adjustment: m.price_adjustment || 0
				})),
				applied_discounts: [],
				subtotal: itemSubtotal,
				final_price: itemSubtotal,
				image_url: product.image_url,
				added_at: now,
				updated_at: now,
				notes: notes
			};

			state.items.push(newItem);
		}

		state.last_updated = now;
	}

	function removeItem(cartItemId: string) {
		state.items = state.items.filter((item) => item.cart_item_id !== cartItemId);
		state.last_updated = new Date().toISOString();
	}

	function updateQuantity(cartItemId: string, quantity: number) {
		const validQuantity = Math.min(Math.max(1, quantity), 999);
		const now = new Date().toISOString();

		const itemIndex = state.items.findIndex((item) => item.cart_item_id === cartItemId);
		if (itemIndex !== -1) {
			const item = state.items[itemIndex];
			const modifierPrice =
				item.selected_modifiers?.reduce((sum, m) => sum + m.price_adjustment, 0) || 0;
			const newSubtotal = (item.base_price + modifierPrice) * validQuantity;

			state.items[itemIndex] = {
				...item,
				quantity: validQuantity,
				subtotal: newSubtotal,
				final_price: newSubtotal,
				updated_at: now
			};
		}

		state.last_updated = now;
	}

	function updateItemPrice(cartItemId: string, newPrice: number) {
		const now = new Date().toISOString();
		const itemIndex = state.items.findIndex((item) => item.cart_item_id === cartItemId);

		if (itemIndex !== -1) {
			const item = state.items[itemIndex];
			const modifierPrice =
				item.selected_modifiers?.reduce((sum, m) => sum + m.price_adjustment, 0) || 0;
			const newSubtotal = (newPrice + modifierPrice) * item.quantity;

			state.items[itemIndex] = {
				...item,
				base_price: newPrice,
				subtotal: newSubtotal,
				final_price: newSubtotal,
				updated_at: now
			};
		}

		state.last_updated = now;
	}

	function updateNotes(cartItemId: string, notes: string) {
		// Validate notes length (max 500 chars as per schema)
		const validNotes = notes.length > 500 ? notes.substring(0, 500) : notes;
		const now = new Date().toISOString();

		const itemIndex = state.items.findIndex((item) => item.cart_item_id === cartItemId);
		if (itemIndex !== -1) {
			state.items[itemIndex] = {
				...state.items[itemIndex],
				notes: validNotes,
				updated_at: now
			};
		}

		state.last_updated = now;
	}

	function applyDiscount(discount: { type: 'percentage' | 'fixed'; value: number }) {
		state.discount = discount;
		state.last_updated = new Date().toISOString();
	}

	function removeDiscount() {
		state.discount = null;
		state.last_updated = new Date().toISOString();
	}

	function clear() {
		state.items = [];
		state.discount = null;
		state.session_id = uuidv4();
		state.last_updated = new Date().toISOString();
	}

	function clearCart() {
		// Backward compatibility method
		clear();
	}

	async function syncWithServer() {
		// In a real implementation, this would sync with the server
		// For now, just update the timestamp
		state.last_updated = new Date().toISOString();
	}

	function finalizeCart() {
		return {
			subtotal: totals.subtotal,
			discount_amount: totals.discount_amount,
			tax: totals.tax,
			total: totals.total,
			items: state.items
		};
	}

	// Return the public API
	return {
		// Expose state via getters to make it readonly from the outside
		state,
		totals,

		// Expose methods
		addItem,
		removeItem,
		updateQuantity,
		updateItemPrice,
		updateNotes,
		applyDiscount,
		removeDiscount,
		clear,
		clearCart,
		syncWithServer,
		finalizeCart,
		loadFromSession,
		saveToSession
	};
}

export const cart = createCartStore();
