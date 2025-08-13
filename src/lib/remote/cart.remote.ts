import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { createSupabaseClient, getAuthenticatedUser } from '$lib/server/db';
import type { EnhancedCartItem, CartItemModifier } from '$lib/types/cart.schema';

// Schemas
const addCartItemSchema = z.object({
	product_id: z.string(),
	quantity: z.number().min(1),
	modifiers: z.array(z.object({
		modifier_id: z.string(),
		modifier_name: z.string(),
		price_adjustment: z.number()
	})).optional().default([]),
	batch_id: z.string().optional()
});

const updateQuantitySchema = z.object({
	cart_item_id: z.string(),
	quantity: z.number().min(0)
});

const applyDiscountSchema = z.object({
	type: z.enum(['fixed', 'percentage']),
	value: z.number().min(0)
});

// Get cart items and totals
export const getCart = query(async (): Promise<{
	items: EnhancedCartItem[];
	totals: {
		subtotal: number;
		tax: number;
		discount_amount: number;
		total: number;
	};
}> => {
	const user = getAuthenticatedUser();
	console.log('🛒 [REMOTE] Fetching cart for user:', user.id);
	
	const supabase = createSupabaseClient();
	
	// Get cart items with product details
	const { data: cartItems, error } = await supabase
		.from('cart_items')
		.select(`
			*,
			product:products(*),
			cart_item_modifiers(
				modifier_id,
				modifier_name,
				price_adjustment
			)
		`)
		.eq('user_id', user.id)
		.eq('is_active', true);
	
	if (error) {
		console.error('❌ [REMOTE] Cart fetch error:', error);
		throw error;
	}
	
	// Transform to enhanced cart items
	const enhancedItems: EnhancedCartItem[] = (cartItems || []).map(item => ({
		cart_item_id: item.id,
		product_id: item.product_id,
		product_name: item.product?.name || 'Unknown Product',
		product_sku: item.product?.sku || '',
		quantity: item.quantity,
		base_price: item.product?.selling_price || 0,
		selected_modifiers: item.cart_item_modifiers || [],
		final_price: calculateItemFinalPrice(
			item.product?.selling_price || 0,
			item.quantity,
			item.cart_item_modifiers || []
		),
		image_url: item.product?.image_url || null
	}));
	
	// Calculate totals
	const subtotal = enhancedItems.reduce((sum, item) => sum + item.final_price, 0);
	const tax = Math.round(subtotal * 0.12); // 12% VAT
	const discount_amount = 0; // Will be calculated based on applied discounts
	const total = subtotal + tax - discount_amount;
	
	console.log('✅ [REMOTE] Cart fetched:', enhancedItems.length, 'items');
	return {
		items: enhancedItems,
		totals: { subtotal, tax, discount_amount, total }
	};
});

// Add item to cart
export const addCartItem = command(
	addCartItemSchema,
	async (data): Promise<void> => {
		const user = getAuthenticatedUser();
		console.log('🛒 [REMOTE] Adding item to cart:', data.product_id);
		
		const supabase = createSupabaseClient();
		
		// Check if item already exists in cart
		const { data: existingItem } = await supabase
			.from('cart_items')
			.select('id, quantity')
			.eq('user_id', user.id)
			.eq('product_id', data.product_id)
			.eq('is_active', true)
			.single();
		
		if (existingItem) {
			// Update quantity
			const { error } = await supabase
				.from('cart_items')
				.update({ 
					quantity: existingItem.quantity + data.quantity,
					updated_at: new Date().toISOString()
				})
				.eq('id', existingItem.id);
			
			if (error) throw error;
		} else {
			// Create new cart item
			const { data: newCartItem, error } = await supabase
				.from('cart_items')
				.insert({
					user_id: user.id,
					product_id: data.product_id,
					quantity: data.quantity,
					batch_id: data.batch_id,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.select('id')
				.single();
			
			if (error) throw error;
			
			// Add modifiers if any
			if (data.modifiers && data.modifiers.length > 0) {
				const modifierInserts = data.modifiers.map(mod => ({
					cart_item_id: newCartItem.id,
					modifier_id: mod.modifier_id,
					modifier_name: mod.modifier_name,
					price_adjustment: mod.price_adjustment,
					created_at: new Date().toISOString()
				}));
				
				const { error: modError } = await supabase
					.from('cart_item_modifiers')
					.insert(modifierInserts);
				
				if (modError) throw modError;
			}
		}
		
		console.log('✅ [REMOTE] Item added to cart');
	}
);

// Update item quantity
export const updateCartItemQuantity = command(
	updateQuantitySchema,
	async (data): Promise<void> => {
		const user = getAuthenticatedUser();
		console.log('🛒 [REMOTE] Updating cart item quantity:', data.cart_item_id);
		
		const supabase = createSupabaseClient();
		
		if (data.quantity === 0) {
			// Remove item from cart
			const { error } = await supabase
				.from('cart_items')
				.update({ is_active: false })
				.eq('id', data.cart_item_id)
				.eq('user_id', user.id);
			
			if (error) throw error;
		} else {
			// Update quantity
			const { error } = await supabase
				.from('cart_items')
				.update({ 
					quantity: data.quantity,
					updated_at: new Date().toISOString()
				})
				.eq('id', data.cart_item_id)
				.eq('user_id', user.id);
			
			if (error) throw error;
		}
		
		console.log('✅ [REMOTE] Cart item quantity updated');
	}
);

// Remove item from cart
export const removeCartItem = command(
	z.object({ cart_item_id: z.string() }),
	async (data): Promise<void> => {
		const user = getAuthenticatedUser();
		console.log('🛒 [REMOTE] Removing cart item:', data.cart_item_id);
		
		const supabase = createSupabaseClient();
		
		const { error } = await supabase
			.from('cart_items')
			.update({ is_active: false })
			.eq('id', data.cart_item_id)
			.eq('user_id', user.id);
		
		if (error) throw error;
		
		console.log('✅ [REMOTE] Cart item removed');
	}
);

// Clear entire cart
export const clearCart = command(
	z.object({}),
	async (): Promise<void> => {
		const user = getAuthenticatedUser();
		console.log('🛒 [REMOTE] Clearing cart for user:', user.id);
		
		const supabase = createSupabaseClient();
		
		const { error } = await supabase
			.from('cart_items')
			.update({ is_active: false })
			.eq('user_id', user.id);
		
		if (error) throw error;
		
		console.log('✅ [REMOTE] Cart cleared');
	}
);

// Apply discount to cart
export const applyCartDiscount = command(
	applyDiscountSchema,
	async (data): Promise<void> => {
		const user = getAuthenticatedUser();
		console.log('🛒 [REMOTE] Applying discount:', data);
		
		// For now, store discount in user session or cache
		// In a real implementation, you might store this in a cart_discounts table
		console.log('✅ [REMOTE] Discount applied');
	}
);

// Helper function to calculate item final price
function calculateItemFinalPrice(
	basePrice: number,
	quantity: number,
	modifiers: CartItemModifier[]
): number {
	const modifierAdjustment = modifiers.reduce(
		(sum, mod) => sum + (mod.price_adjustment || 0),
		0
	);
	return (basePrice + modifierAdjustment) * quantity;
}