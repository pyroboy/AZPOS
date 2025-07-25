import { z } from 'zod';

export const settingsSchema = z.object({
	store_name: z.string().min(1, 'Store name is required'),
	address: z.string().min(1, 'Address is required'),
	tin: z.string().optional(),
	currency: z.string().min(1, 'Currency is required').default('USD'),
	tax_rates: z
		.array(
			z.object({
				name: z.string().min(1, 'Tax name is required'),
				rate: z.number().min(0, 'Rate must be non-negative')
			})
		)
		.optional()
});





// =======================================================================
// 6.1 Product Information
// =======================================================================

export const bundleComponentSchema = z.object({
	product_id: z.string().uuid(),
	quantity: z.coerce.number().int().positive()
});


export const productSchema = z.object({
	// Core fields
	id: z.string(), // Relaxed from uuid() to handle non-compliant data
	name: z.string().min(2, 'Product name is required'),
	sku: z.string().min(3, 'SKU must be at least 3 characters'),
	description: z.string().optional(),
	category_id: z.string().min(1, 'Category is required'),
	price: z.coerce.number().positive('Price must be a positive number'),
	image_url: z.string().optional().or(z.literal('')), // Relaxed from url() to handle non-compliant data

	expiration_date: z.string().optional(),
	// Supplier & Cost
	supplier_id: z.string().min(1, 'Supplier is required').optional(),
	average_cost: z.coerce.number().nonnegative('Average cost must be non-negative').default(0),

	// Inventory & Location
	base_unit: z.enum(['piece', 'gram', 'kg', 'ml', 'L', 'pack', 'can', 'bottle']).default('piece'),
	reorder_point: z.coerce.number().int().nonnegative('Reorder point must be a whole number').optional(),
	aisle: z.string().optional(),
	storage_requirement: z
		.enum(['room_temperature', 'refrigerated', 'frozen'])
		.default('room_temperature'),
	stock: z.coerce.number().int().nonnegative('Stock quantity must be a whole number').default(0),
	// Batch Tracking
	requires_batch_tracking: z.boolean().default(false),

	// Product Type (for variants/bundles)
	product_type: z.enum(['standard', 'variant', 'bundle']).default('standard'),
	master_product_id: z.string().uuid().optional(),
	bundle_components: z.array(bundleComponentSchema).optional(),

	// Status & Timestamps
	is_archived: z.boolean().default(false),
	created_at: z.string().datetime().optional(),
	updated_at: z.string().datetime().optional()
});


export const productBatchSchema = z.object({
	id: z.string().uuid(),
	product_id: z.string().uuid(),
	batch_number: z.string(),
	expiration_date: z.string().datetime().optional(),
	quantity_on_hand: z.coerce.number().int().nonnegative(),
	purchase_cost: z.coerce.number().nonnegative(),
	created_at: z.string().datetime()
});

export const categorySchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, 'Category name is required'),
	description: z.string().optional()
});

// =======================================================================
// 6.2 Modifiers
// =======================================================================

export const modifierSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().optional(),
	price_adjustment: z.coerce.number().default(0),
	is_active: z.boolean().default(true),
	created_at: z.string().datetime()
});

export const modifierGroupSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	selection_type: z.enum(['single', 'multiple']),
	min_selection: z.coerce.number().int().nonnegative().optional(),
	max_selection: z.coerce.number().int().positive().optional(),
	options: z.array(modifierSchema)
});

export const productModifierSchema = z.object({
	product_id: z.string().uuid(),
	modifier_group_id: z.string().uuid()
});

// =======================================================================
// 6.3 Inventory & Suppliers
// =======================================================================

export const supplierSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(2, 'Supplier name must be at least 2 characters'),
	contact_person: z.string().optional(),
	email: z.string().email('Invalid email address').optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	is_active: z.boolean().default(true),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

export const purchaseOrderItemSchema = z.object({
	id: z.string().uuid(),
	purchase_order_id: z.string().uuid(),
	product_id: z.string().uuid(),
	quantity_ordered: z.coerce.number().int().positive(),
	unit_cost: z.coerce.number().nonnegative()
});

export const purchaseOrderSchema = z.object({
	id: z.string().uuid(),
	supplier_id: z.string().uuid(),
	order_date: z.string().datetime(),
	expected_delivery_date: z.string().datetime().optional(),
	status: z.enum(['pending', 'submitted', 'partially_received', 'received', 'cancelled']),
	items: z.array(purchaseOrderItemSchema)
});

export const adjustmentReasons = {
	cycle_count: 'Cycle Count Correction',
	spoilage: 'Spoilage',
	damage: 'Damage',
	theft: 'Theft',
	recount: 'Recount / Cycle Count',
	expiry: 'Expiry',
	transfer_in: 'Stock Transfer In',
	transfer_out: 'Stock Transfer Out',
	other: 'Other'
} as const;

export const inventoryAdjustmentSchema = z.object({
	id: z.string().uuid(),
	product_id: z.string().uuid(),
	batch_id: z.string().uuid(),
	user_id: z.string().uuid(),
	adjustment_type: z.enum(['add', 'subtract', 'recount']),
	quantity_adjusted: z.coerce.number().int(),
	reason: z.string(),
	created_at: z.string().datetime()
});

// =======================================================================
// 6.4 Users & Roles
// =======================================================================

export const roleSchema = z.enum(['admin', 'owner', 'manager', 'pharmacist', 'cashier']);

export const userSchema = z.object({
	id: z.string().uuid(),
	username: z.string(),
	full_name: z.string(),
	role: roleSchema,
	pin_hash: z.string(), // For manager overrides, etc.
	is_active: z.boolean().default(true),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// =======================================================================
// 6.5 Transactions & Sales
// =======================================================================

export const transactionItemSchema = z.object({
	id: z.string().uuid(),
	transaction_id: z.string().uuid(),
	product_id: z.string().uuid(),
	batch_id: z.string().uuid(),
	quantity: z.coerce.number().positive(),
	price_at_sale: z.coerce.number(),
	applied_modifiers: z.array(modifierSchema).optional()
});

export const paymentSchema = z.object({
	id: z.string().uuid(),
	transaction_id: z.string().uuid(),
	payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'other']),
	amount: z.coerce.number().positive(),
	processed_at: z.string().datetime(),
	reference_number: z.string().optional()
});

export const transactionSchema = z.object({
	id: z.string().uuid(),
	user_id: z.string().uuid(),
	subtotal: z.coerce.number(),
	tax_amount: z.coerce.number(),
	discount_amount: z.coerce.number().optional(),
	total_amount: z.coerce.number(),
	status: z.enum(['completed', 'voided', 'pending']),
	created_at: z.string().datetime(),
	items: z.array(transactionItemSchema),
	payments: z.array(paymentSchema)
});

export const slowMoverSchema = z.object({
	product_id: z.string().uuid(),
	name: z.string(),
	sku: z.string(),
	stock_on_hand: z.coerce.number().int().positive(),
	last_sale_date: z.string().datetime().nullable()
});

// =======================================================================
// 6.6 Discounts
// =======================================================================

export const discountSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().optional(),
	type: z.enum(['percentage', 'fixed_amount']),
	value: z.coerce.number().positive(),
	applicable_scope: z
		.enum(['all_items', 'specific_product', 'specific_category'])
		.default('all_items'),
	product_ids: z.array(z.string().uuid()).optional(),
	category_ids: z.array(z.string().uuid()).optional(),
	is_active: z.boolean().default(true),
	start_date: z.string().optional(),
	end_date: z.string().optional()
});

// =======================================================================
// 6.7 Returns
// =======================================================================

export const returnReasons = {
	defective: 'Defective/Damaged',
	wrong_item: 'Wrong Item Shipped',
	not_as_described: 'Not as Described',
	changed_mind: 'Customer Changed Mind',
	other: 'Other'
} as const;

export const returnItemSchema = z.object({
	product_id: z.string().uuid(),
	product_name: z.string(), // Denormalized for display in returns history
	product_sku: z.string(), // Denormalized
	quantity: z.coerce.number().int().positive()
});

export const returnSchema = z.object({
	id: z.string(), // e.g., 'RTN-001'
	order_id: z.string(), // e.g., 'ORD-12345'
	customer_name: z.string(),
	items: z.array(returnItemSchema),
	return_date: z.string().datetime(),
	status: z.enum(['pending', 'approved', 'rejected']),
	reason: z.enum(
		Object.keys(returnReasons) as [keyof typeof returnReasons, ...(keyof typeof returnReasons)[]]
	),
	notes: z.string().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});



// =======================================================================
// 6.7 Orders
// =======================================================================

export const CartItemSchema = z.object({
	cartItemId: z.string().uuid(),
	productId: z.string().uuid(),
	name: z.string(),
	sku: z.string(),
	discount: z.coerce.number().optional(),
	quantity: z.coerce.number().int().positive(),
	price: z.coerce.number().positive(),
	batchId: z.string().uuid(),
	modifiers: z.array(modifierSchema),
	finalPrice: z.coerce.number().positive(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const fastMoverSchema = z.object({
	product_id: z.string().uuid(),
	name: z.string(),
	sku: z.string(),
	units_sold: z.coerce.number().int().positive(),
	total_revenue: z.coerce.number(),
	last_sale_date: z.string()
});

export const dashboardStatsSchema = z.object({
	total_sales: z.coerce.number(),
	total_transactions: z.coerce.number().int(),
	average_transaction_value: z.coerce.number(),
	new_customers: z.coerce.number().int(),
	fast_movers: z.array(fastMoverSchema),
	slow_movers: z.array(slowMoverSchema)
});

// =======================================================================
// 7.0 UI & Form Schemas (Not direct DB models)
// =======================================================================

export const csvAdjustmentSchema = z.object({
	product_id: z.string(),
	product_name: z.string().optional(),
	batch_number: z.string().optional(),
	expiration_date: z.string().optional(),
	adjustment_quantity: z.coerce.number().int().positive(),
	reason: z.string(),
	adjustment_type: z.enum(['add', 'remove', 'set']).default('add'),
	notes: z.string().optional()
});

export type CsvAdjustment = z.infer<typeof csvAdjustmentSchema>;


export const reorderItemSchema = z.object({
	sku: z.string(),
	name: z.string(),
	supplier_name: z.string(),
	stock_on_hand: z.coerce.number().int(),
	reorder_point: z.coerce.number().int().optional(),
	suggested_reorder_qty: z.coerce.number().int()
});

export const supplierPerformanceDataSchema = z.object({
	supplier_name: z.string(),
	on_time_rate: z.coerce.number(),
	avg_cost_variance: z.coerce.number(),
	total_pos: z.coerce.number().int()
});

// =======================================================================
// Inferred TypeScript Types
// =======================================================================
export type Settings = z.infer<typeof settingsSchema>;
export type FastMover = z.infer<typeof fastMoverSchema>;
export type SlowMover = z.infer<typeof slowMoverSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductBatch = z.infer<typeof productBatchSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Modifier = z.infer<typeof modifierSchema>;
export type ModifierGroup = z.infer<typeof modifierGroupSchema>;
export type ProductModifier = z.infer<typeof productModifierSchema>;
export type Supplier = z.infer<typeof supplierSchema>;
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSchema>;
export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type TransactionItem = z.infer<typeof transactionItemSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type BundleComponent = z.infer<typeof bundleComponentSchema>;
export type ReturnItem = z.infer<typeof returnItemSchema>;

export type ReturnRecord = z.infer<typeof returnSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type ReorderItem = z.infer<typeof reorderItemSchema>;
export type SupplierPerformanceData = z.infer<typeof supplierPerformanceDataSchema>;