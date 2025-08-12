import { z } from 'zod';

// Schema for bundle component
export const bundleComponentSchema = z.object({
	product_id: z.string(),
	quantity: z.number().min(1),
	product_name: z.string().optional(),
	product_sku: z.string().optional()
});

// Schema for product creation/update input
export const productInputSchema = z.object({
	name: z.string().min(1),
	sku: z.string().min(1),
	description: z.string().optional(),
	category_id: z.string().optional(),
	supplier_id: z.string().optional(),
	cost_price: z.number().min(0),
	selling_price: z.number().min(0),
	stock_quantity: z.number().min(0).int(),
	min_stock_level: z.number().min(0).int().optional(),
	max_stock_level: z.number().min(0).int().optional(),
	reorder_point: z.number().min(0).int().optional(),
	barcode: z.string().optional(),
	image_url: z.string().url().optional(),
	is_active: z.boolean().default(true),
	is_archived: z.boolean().default(false),
	is_bundle: z.boolean().default(false),
	bundle_components: z.array(bundleComponentSchema).optional(),
	tags: z.array(z.string()).optional(),
	weight: z.number().min(0).optional(),
	dimensions: z
		.object({
			length: z.number().min(0),
			width: z.number().min(0),
			height: z.number().min(0)
		})
		.optional(),
	tax_rate: z.number().min(0).max(1).optional(),
	discount_eligible: z.boolean().default(true),
	track_inventory: z.boolean().default(true),
	aisle_location: z.string().optional()
});

// Full product schema (from database)
export const productSchema = productInputSchema.extend({
	id: z.string(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	created_by: z.string().optional(),
	updated_by: z.string().optional()
});

// Schema for product filters/queries
export const productFiltersSchema = z.object({
	search: z.string().optional(),
	category_id: z.string().optional(),
	supplier_id: z.string().optional(),
	is_active: z.boolean().optional(),
	is_archived: z.boolean().optional(),
	is_bundle: z.boolean().optional(),
	low_stock: z.boolean().optional(),
	out_of_stock: z.boolean().optional(),
	price_min: z.number().min(0).optional(),
	price_max: z.number().min(0).optional(),
	tags: z.array(z.string()).optional(),
	sort_by: z.enum(['name', 'sku', 'price', 'stock', 'created_at', 'updated_at']).optional(),
	sort_order: z.enum(['asc', 'desc']).optional(),
	page: z.number().min(1).optional(),
	limit: z.number().min(1).max(100).optional()
});

// Schema for product meta information
export const productMetaSchema = z.object({
	total_products: z.number(),
	active_products: z.number(),
	archived_products: z.number(),
	bundle_products: z.number(),
	total_inventory_value: z.number(),
	potential_revenue: z.number(),
	low_stock_count: z.number(),
	out_of_stock_count: z.number(),
	categories_count: z.number(),
	suppliers_count: z.number()
});

// Schema for paginated product response
export const paginatedProductsSchema = z.object({
	products: z.array(productSchema),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		total_pages: z.number(),
		has_more: z.boolean()
	}),
	meta: productMetaSchema.optional()
});

// Schema for bulk product operations
export const bulkProductUpdateSchema = z.object({
	product_ids: z.array(z.string()).min(1),
	updates: z.object({
		category_id: z.string().optional(),
		supplier_id: z.string().optional(),
		cost_price: z.number().min(0).optional(),
		selling_price: z.number().min(0).optional(),
		is_active: z.boolean().optional(),
		is_archived: z.boolean().optional(),
		tags: z.array(z.string()).optional(),
		tax_rate: z.number().min(0).max(1).optional(),
		discount_eligible: z.boolean().optional()
	})
});

// Schema for product stock adjustment
export const stockAdjustmentSchema = z.object({
	product_id: z.string(),
	adjustment_type: z.enum(['increase', 'decrease', 'set']),
	quantity: z.number().min(0),
	reason: z.enum([
		'recount',
		'damage',
		'theft',
		'expired',
		'returned',
		'sale',
		'purchase',
		'transfer',
		'other'
	]),
	notes: z.string().optional(),
	reference_id: z.string().optional() // For linking to orders, returns, etc.
});

// Schema for product analytics
export const productAnalyticsSchema = z.object({
	product_id: z.string(),
	period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
	sales_count: z.number(),
	sales_revenue: z.number(),
	stock_movements: z.number(),
	return_count: z.number(),
	profit_margin: z.number(),
	velocity: z.number(), // Sales per time period
	trend: z.enum(['up', 'down', 'stable'])
});

// Schema for updating a product (combines productId and productData)
export const updateProductSchema = z.object({
	productId: z.string(),
	productData: productInputSchema.partial()
});

// Schema for bulk updating products (combines productIds and updates)
export const bulkUpdateProductsSchema = z.object({
	productIds: z.array(z.string()),
	updates: productInputSchema.partial()
});

// Schema for adjusting stock (combines productId, adjustment, and reason)
export const adjustStockSchema = z.object({
	productId: z.string(),
	adjustment: z.number(),
	reason: z.string().optional()
});

// Schema for deleting a product (combines productId)
export const deleteProductSchema = z.object({
	productId: z.string()
});

// Export inferred types
export type BundleComponent = z.infer<typeof bundleComponentSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type ProductMeta = z.infer<typeof productMetaSchema>;
export type PaginatedProducts = z.infer<typeof paginatedProductsSchema>;
export type BulkProductUpdate = z.infer<typeof bulkProductUpdateSchema>;
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;
export type ProductAnalytics = z.infer<typeof productAnalyticsSchema>;
