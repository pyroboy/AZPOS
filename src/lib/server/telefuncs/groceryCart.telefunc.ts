import { getContext } from 'telefunc';
import {
	groceryCartInputSchema,
	groceryCartItemInputSchema,
	groceryCartItemUpdateSchema,
	deliveryFeeCalculationSchema,
	type GroceryCart,
	type GroceryCartWithItems,
	type GroceryCartItem,
	type DeliveryTimeSlot,
	GROCERY_CART_CONSTANTS
} from '$lib/types/groceryCart.schema';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

// Create Supabase client
const supabase = createClient(env.SUPABASE_URL || '', env.SUPABASE_SERVICE_ROLE_KEY || '');

// Helper function to get or create a cart for the current user/session
async function getOrCreateCart(): Promise<GroceryCart> {
	const { user } = getContext();
	// For session handling, we'll use a fallback approach
	const sessionId = 'anonymous';

	let query = supabase
		.from('grocery_carts')
		.select('*')
		.eq('status', 'active')
		.order('updated_at', { ascending: false })
		.limit(1);

	if (user) {
		query = query.eq('user_id', user.id);
	} else {
		query = query.eq('session_id', sessionId);
	}

	const { data: existingCarts } = await query;

	if (existingCarts && existingCarts.length > 0) {
		return existingCarts[0];
	}

	// Create new cart
	const newCart = {
		id: crypto.randomUUID(),
		user_id: user?.id || null,
		session_id: user ? null : sessionId,
		status: 'active',
		subtotal: 0,
		tax_amount: 0,
		total_amount: 0,
		delivery_fee: GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE,
		min_order_amount: GROCERY_CART_CONSTANTS.MIN_ORDER_AMOUNT,
		min_order_met: false,
		item_count: 0,
		substitution_preference: 'allow',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	const { data, error } = await supabase.from('grocery_carts').insert(newCart).select().single();

	if (error) throw new Error(`Failed to create cart: ${error.message}`);
	return data;
}

// Helper function to recalculate cart totals
async function recalculateCartTotals(cartId: string): Promise<void> {
	// Get all cart items with product details
	const { data: items, error: itemsError } = await supabase
		.from('grocery_cart_items')
		.select(
			`
      *,
      product:products(price)
    `
		)
		.eq('cart_id', cartId);

	if (itemsError) throw new Error(`Failed to get cart items: ${itemsError.message}`);

	// Calculate totals
	const subtotal =
		items?.reduce((sum, item) => {
			const unitPrice = item.product?.price || 0;
			return sum + unitPrice * item.quantity;
		}, 0) || 0;

	const taxAmount = subtotal * 0.08; // 8% tax rate
	const itemCount = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
	const minOrderMet = subtotal >= GROCERY_CART_CONSTANTS.MIN_ORDER_AMOUNT;

	// Calculate delivery fee
	let deliveryFee = GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE as number;
	if (subtotal >= GROCERY_CART_CONSTANTS.FREE_DELIVERY_THRESHOLD) {
		deliveryFee = 0;
	}

	const totalAmount = subtotal + taxAmount + deliveryFee;

	// Update cart totals
	const { error: updateError } = await supabase
		.from('grocery_carts')
		.update({
			subtotal,
			tax_amount: taxAmount,
			total_amount: totalAmount,
			delivery_fee: deliveryFee,
			min_order_met: minOrderMet,
			item_count: itemCount,
			updated_at: new Date().toISOString()
		})
		.eq('id', cartId);

	if (updateError) throw new Error(`Failed to update cart totals: ${updateError.message}`);
}

// Get current cart with items
export async function onGetGroceryCart(): Promise<GroceryCartWithItems> {
	const cart = await getOrCreateCart();

	const { data: items, error: itemsError } = await supabase
		.from('grocery_cart_items')
		.select(
			`
      *,
      product:products(
        id,
        name,
        sku,
        price,
        base_unit,
        image_url,
        stock,
        category:categories(name)
      )
    `
		)
		.eq('cart_id', cart.id)
		.order('created_at', { ascending: true });

	if (itemsError) throw new Error(`Failed to get cart items: ${itemsError.message}`);

	return {
		...cart,
		items:
			items?.map((item) => ({
				...item,
				product: item.product
					? {
							...item.product,
							unit: item.product.base_unit || 'each',
							category_name: item.product.category?.name,
							is_available: (item.product.stock || 0) > 0,
							stock_quantity: item.product.stock
						}
					: undefined
			})) || []
	};
}

// Add item to cart
export async function onAddToGroceryCart(itemData: unknown): Promise<GroceryCartItem> {
	const validatedData = groceryCartItemInputSchema.parse(itemData);
	const cart = await getOrCreateCart();

	// Check if item already exists in cart
	const { data: existingItem } = await supabase
		.from('grocery_cart_items')
		.select('*')
		.eq('cart_id', cart.id)
		.eq('product_id', validatedData.product_id)
		.single();

	let result;

	if (existingItem) {
		// Update existing item quantity
		const newQuantity = existingItem.quantity + validatedData.quantity;

		const { data, error } = await supabase
			.from('grocery_cart_items')
			.update({
				quantity: newQuantity,
				special_instructions:
					validatedData.special_instructions || existingItem.special_instructions,
				substitution_allowed: validatedData.substitution_allowed,
				updated_at: new Date().toISOString()
			})
			.eq('id', existingItem.id)
			.select(
				`
        *,
        product:products(
          id, name, sku, price, base_unit, image_url, stock,
          category:categories(name)
        )
      `
			)
			.single();

		if (error) throw new Error(`Failed to update cart item: ${error.message}`);
		result = data;
	} else {
		// Add new item
		const newItem = {
			id: crypto.randomUUID(),
			cart_id: cart.id,
			...validatedData,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		const { data, error } = await supabase
			.from('grocery_cart_items')
			.insert(newItem)
			.select(
				`
        *,
        product:products(
          id, name, sku, price, base_unit, image_url, stock,
          category:categories(name)
        )
      `
			)
			.single();

		if (error) throw new Error(`Failed to add cart item: ${error.message}`);
		result = data;
	}

	// Recalculate cart totals
	await recalculateCartTotals(cart.id);

	return {
		...result,
		product: result.product
			? {
					...result.product,
					unit: result.product.base_unit || 'each',
					category_name: result.product.category?.name,
					is_available: (result.product.stock || 0) > 0,
					stock_quantity: result.product.stock
				}
			: undefined
	};
}

// Update cart item
export async function onUpdateGroceryCartItem(itemData: unknown): Promise<GroceryCartItem> {
	const validatedData = groceryCartItemUpdateSchema.parse(itemData);
	const { user } = getContext();
	const sessionId = 'anonymous';

	// Verify ownership of the cart item
	const cartQuery = supabase
		.from('grocery_cart_items')
		.select('*, cart:grocery_carts(*)')
		.eq('id', validatedData.id);

	const { data: cartItem, error: fetchError } = await cartQuery.single();
	if (fetchError) throw new Error(`Cart item not found: ${fetchError.message}`);

	// Check ownership
	if (user) {
		if (cartItem.cart.user_id !== user.id) {
			throw new Error('Unauthorized');
		}
	} else {
		if (cartItem.cart.session_id !== sessionId) {
			throw new Error('Unauthorized');
		}
	}

	// Update the item
	const { id, ...updateData } = validatedData;
	const finalUpdateData = {
		...updateData,
		updated_at: new Date().toISOString()
	};

	const { data, error } = await supabase
		.from('grocery_cart_items')
		.update(finalUpdateData)
		.eq('id', id)
		.select(
			`
      *,
      product:products(
        id, name, sku, price, base_unit, image_url, stock,
        category:categories(name)
      )
    `
		)
		.single();

	if (error) throw new Error(`Failed to update cart item: ${error.message}`);

	// Recalculate cart totals
	await recalculateCartTotals(cartItem.cart.id);

	return {
		...data,
		product: data.product
			? {
					...data.product,
					unit: data.product.base_unit || 'each',
					category_name: data.product.category?.name,
					is_available: (data.product.stock || 0) > 0,
					stock_quantity: data.product.stock
				}
			: undefined
	};
}

// Remove item from cart
export async function onRemoveFromGroceryCart(itemId: string): Promise<void> {
	const { user } = getContext();
	const sessionId = 'anonymous';

	// Verify ownership
	const { data: cartItem, error: fetchError } = await supabase
		.from('grocery_cart_items')
		.select('*, cart:grocery_carts(*)')
		.eq('id', itemId)
		.single();

	if (fetchError) throw new Error(`Cart item not found: ${fetchError.message}`);

	// Check ownership
	if (user) {
		if (cartItem.cart.user_id !== user.id) {
			throw new Error('Unauthorized');
		}
	} else {
		if (cartItem.cart.session_id !== sessionId) {
			throw new Error('Unauthorized');
		}
	}

	// Remove the item
	const { error } = await supabase.from('grocery_cart_items').delete().eq('id', itemId);

	if (error) throw new Error(`Failed to remove cart item: ${error.message}`);

	// Recalculate cart totals
	await recalculateCartTotals(cartItem.cart.id);
}

// Update cart (delivery address, preferences, etc.)
export async function onUpdateGroceryCart(cartData: unknown): Promise<GroceryCart> {
	const validatedData = groceryCartInputSchema.parse(cartData);
	const cart = await getOrCreateCart();

	const { data, error } = await supabase
		.from('grocery_carts')
		.update({
			...validatedData,
			updated_at: new Date().toISOString()
		})
		.eq('id', cart.id)
		.select()
		.single();

	if (error) throw new Error(`Failed to update cart: ${error.message}`);

	// Recalculate totals in case delivery address affects fees
	await recalculateCartTotals(cart.id);

	return data;
}

// Clear cart
export async function onClearGroceryCart(): Promise<void> {
	const cart = await getOrCreateCart();

	// Remove all items
	const { error: itemsError } = await supabase
		.from('grocery_cart_items')
		.delete()
		.eq('cart_id', cart.id);

	if (itemsError) throw new Error(`Failed to clear cart items: ${itemsError.message}`);

	// Reset cart totals
	const { error: cartError } = await supabase
		.from('grocery_carts')
		.update({
			subtotal: 0,
			tax_amount: 0,
			total_amount: GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE,
			delivery_fee: GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE,
			min_order_met: false,
			item_count: 0,
			updated_at: new Date().toISOString()
		})
		.eq('id', cart.id);

	if (cartError) throw new Error(`Failed to reset cart: ${cartError.message}`);
}

// Get available delivery time slots
export async function onGetDeliveryTimeSlots(date?: string): Promise<DeliveryTimeSlot[]> {
	const targetDate = date || new Date().toISOString().split('T')[0];

	// Mock delivery time slots - in a real app, this would come from a database
	const timeSlots: DeliveryTimeSlot[] = [
		{
			id: crypto.randomUUID(),
			date: targetDate,
			start_time: '09:00:00',
			end_time: '11:00:00',
			is_available: true,
			max_orders: 10,
			current_orders: 3,
			delivery_fee: GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE
		},
		{
			id: crypto.randomUUID(),
			date: targetDate,
			start_time: '11:00:00',
			end_time: '13:00:00',
			is_available: true,
			max_orders: 10,
			current_orders: 7,
			delivery_fee: GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE
		},
		{
			id: crypto.randomUUID(),
			date: targetDate,
			start_time: '13:00:00',
			end_time: '15:00:00',
			is_available: true,
			max_orders: 10,
			current_orders: 5,
			delivery_fee: GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE
		},
		{
			id: crypto.randomUUID(),
			date: targetDate,
			start_time: '15:00:00',
			end_time: '17:00:00',
			is_available: true,
			max_orders: 10,
			current_orders: 2,
			delivery_fee: GROCERY_CART_CONSTANTS.EXPRESS_DELIVERY_FEE
		}
	];

	return timeSlots.filter((slot) => slot.current_orders < slot.max_orders);
}

// Calculate delivery fee
export async function onCalculateDeliveryFee(calculationData: unknown): Promise<number> {
	const validatedData = deliveryFeeCalculationSchema.parse(calculationData);

	// Free delivery threshold
	if (validatedData.subtotal >= GROCERY_CART_CONSTANTS.FREE_DELIVERY_THRESHOLD) {
		return 0;
	}

	// Express delivery fee
	if (validatedData.is_express) {
		return GROCERY_CART_CONSTANTS.EXPRESS_DELIVERY_FEE;
	}

	// Standard delivery fee
	return GROCERY_CART_CONSTANTS.STANDARD_DELIVERY_FEE;
}
