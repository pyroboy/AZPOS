import { z } from 'zod';

// Schema for delivery address
export const deliveryAddressSchema = z.object({
	street: z.string().min(1, 'Street address is required'),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zip_code: z.string().min(5, 'Valid ZIP code is required'),
	apartment: z.string().optional(),
	delivery_instructions: z.string().optional()
});

// Schema for creating a grocery cart item
export const groceryCartItemInputSchema = z.object({
	product_id: z.string().uuid('Invalid product ID'),
	quantity: z.number().min(0.01, 'Quantity must be greater than 0').max(999, 'Quantity too large'),
	special_instructions: z.string().optional(),
	substitution_allowed: z.boolean().default(true)
});

// Schema for updating a grocery cart item
export const groceryCartItemUpdateSchema = groceryCartItemInputSchema.partial().extend({
	id: z.string().uuid('Invalid cart item ID')
});

// Schema for grocery cart creation/update
export const groceryCartInputSchema = z.object({
	delivery_address: deliveryAddressSchema.optional(),
	delivery_time_slot: z.string().datetime().optional(),
	substitution_preference: z.enum(['allow', 'ask', 'none']).default('allow'),
	special_delivery_instructions: z.string().optional()
});

// Schema for the full grocery cart (from database)
export const groceryCartSchema = groceryCartInputSchema.extend({
	id: z.string().uuid(),
	user_id: z.string().uuid().optional(),
	session_id: z.string().optional(),
	delivery_fee: z.number().min(0).default(0),
	subtotal: z.number().min(0).default(0),
	tax_amount: z.number().min(0).default(0),
	total_amount: z.number().min(0).default(0),
	min_order_met: z.boolean().default(false),
	min_order_amount: z.number().min(0).default(35), // $35 minimum for delivery
	item_count: z.number().min(0).default(0),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Schema for grocery cart item (from database)
export const groceryCartItemSchema = groceryCartItemInputSchema.extend({
	id: z.string().uuid(),
	cart_id: z.string().uuid(),
	unit_price: z.number().min(0),
	line_total: z.number().min(0),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	// Product details (joined from products table)
	product: z
		.object({
			id: z.string().uuid(),
			name: z.string(),
			sku: z.string(),
			price: z.number(),
			unit: z.string().default('each'),
			category_name: z.string().optional(),
			image_url: z.string().url().optional(),
			is_available: z.boolean().default(true),
			stock_quantity: z.number().min(0).optional()
		})
		.optional()
});

// Schema for complete cart with items
export const groceryCartWithItemsSchema = groceryCartSchema.extend({
	items: z.array(groceryCartItemSchema)
});

// Filters for querying grocery carts
export const groceryCartFiltersSchema = z.object({
	user_id: z.string().uuid().optional(),
	session_id: z.string().optional(),
	status: z.enum(['active', 'abandoned', 'converted']).optional(),
	created_after: z.string().datetime().optional(),
	created_before: z.string().datetime().optional(),
	min_total: z.number().min(0).optional(),
	max_total: z.number().min(0).optional(),
	has_delivery_address: z.boolean().optional()
});

// Schema for delivery time slots
export const deliveryTimeSlotSchema = z.object({
	id: z.string().uuid(),
	date: z.string().date(),
	start_time: z.string().time(),
	end_time: z.string().time(),
	is_available: z.boolean(),
	max_orders: z.number().min(1),
	current_orders: z.number().min(0),
	delivery_fee: z.number().min(0)
});

// Schema for calculating delivery fees
export const deliveryFeeCalculationSchema = z.object({
	subtotal: z.number().min(0),
	delivery_address: deliveryAddressSchema,
	delivery_time_slot: z.string().datetime().optional(),
	is_express: z.boolean().default(false)
});

// Export inferred TypeScript types
export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;
export type GroceryCartItemInput = z.infer<typeof groceryCartItemInputSchema>;
export type GroceryCartItemUpdate = z.infer<typeof groceryCartItemUpdateSchema>;
export type GroceryCartInput = z.infer<typeof groceryCartInputSchema>;
export type GroceryCart = z.infer<typeof groceryCartSchema>;
export type GroceryCartItem = z.infer<typeof groceryCartItemSchema>;
export type GroceryCartWithItems = z.infer<typeof groceryCartWithItemsSchema>;
export type GroceryCartFilters = z.infer<typeof groceryCartFiltersSchema>;
export type DeliveryTimeSlot = z.infer<typeof deliveryTimeSlotSchema>;
export type DeliveryFeeCalculation = z.infer<typeof deliveryFeeCalculationSchema>;

// Constants for business rules
export const GROCERY_CART_CONSTANTS = {
	MIN_ORDER_AMOUNT: 35,
	FREE_DELIVERY_THRESHOLD: 75,
	STANDARD_DELIVERY_FEE: 5.99,
	EXPRESS_DELIVERY_FEE: 12.99,
	MAX_ITEMS_PER_CART: 100,
	CART_EXPIRY_DAYS: 30
} as const;
