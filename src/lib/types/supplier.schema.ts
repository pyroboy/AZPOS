import { z } from 'zod';

// Schema for supplier contact information
export const supplierContactSchema = z.object({
	name: z.string(),
	title: z.string().optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	is_primary: z.boolean().default(false)
});

// Schema for supplier address
export const supplierAddressSchema = z.object({
	street: z.string(),
	city: z.string(),
	state: z.string().optional(),
	postal_code: z.string().optional(),
	country: z.string(),
	is_billing: z.boolean().default(false),
	is_shipping: z.boolean().default(false)
});

// Schema for creating/updating supplier
export const supplierInputSchema = z.object({
	name: z.string().min(1),
	code: z.string().min(1),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	website: z.string().url().optional(),
	tax_id: z.string().optional(),
	payment_terms: z.enum(['net_15', 'net_30', 'net_45', 'net_60', 'cod', 'prepaid']).optional(),
	credit_limit: z.number().min(0).optional(),
	currency: z.string().default('USD'),
	is_active: z.boolean().default(true),
	notes: z.string().optional(),
	contacts: z.array(supplierContactSchema).optional(),
	addresses: z.array(supplierAddressSchema).optional(),
	tags: z.array(z.string()).optional()
});

// Full supplier schema
export const supplierSchema = supplierInputSchema.extend({
	id: z.string(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	created_by: z.string().optional(),
	updated_by: z.string().optional()
});

// Schema for supplier filters
export const supplierFiltersSchema = z.object({
	search: z.string().optional(),
	is_active: z.boolean().optional(),
	payment_terms: z.enum(['net_15', 'net_30', 'net_45', 'net_60', 'cod', 'prepaid']).optional(),
	tags: z.array(z.string()).optional(),
	has_products: z.boolean().optional(), // Filter suppliers that have products
	sort_by: z.enum(['name', 'code', 'created_at', 'updated_at']).optional(),
	sort_order: z.enum(['asc', 'desc']).optional(),
	page: z.number().min(1).optional(),
	limit: z.number().min(1).max(100).optional()
});

// Schema for supplier statistics
export const supplierStatsSchema = z.object({
	total_suppliers: z.number(),
	active_suppliers: z.number(),
	inactive_suppliers: z.number(),
	suppliers_with_products: z.number(),
	total_purchase_orders: z.number(),
	total_purchase_value: z.number(),
	avg_order_value: z.number(),
	top_suppliers: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				order_count: z.number(),
				total_value: z.number()
			})
		)
		.optional()
});

// Schema for supplier performance metrics
export const supplierPerformanceSchema = z.object({
	supplier_id: z.string(),
	period: z.enum(['month', 'quarter', 'year']),
	total_orders: z.number(),
	total_value: z.number(),
	on_time_deliveries: z.number(),
	late_deliveries: z.number(),
	cancelled_orders: z.number(),
	average_delivery_time: z.number(), // in days
	quality_rating: z.number().min(1).max(5).optional(),
	service_rating: z.number().min(1).max(5).optional(),
	overall_rating: z.number().min(1).max(5).optional()
});

// Schema for paginated suppliers
export const paginatedSuppliersSchema = z.object({
	suppliers: z.array(supplierSchema),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		total_pages: z.number(),
		has_more: z.boolean()
	}),
	stats: supplierStatsSchema.optional()
});

// Schema for supplier product catalog
export const supplierProductSchema = z.object({
	id: z.string(),
	supplier_id: z.string(),
	product_id: z.string(),
	supplier_sku: z.string().optional(),
	supplier_name: z.string().optional(),
	cost_price: z.number().min(0),
	minimum_order_quantity: z.number().min(1).default(1),
	lead_time_days: z.number().min(0).optional(),
	is_preferred: z.boolean().default(false),
	last_ordered_at: z.string().datetime().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Export inferred types
export type SupplierContact = z.infer<typeof supplierContactSchema>;
export type SupplierAddress = z.infer<typeof supplierAddressSchema>;
export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type Supplier = z.infer<typeof supplierSchema>;
export type SupplierFilters = z.infer<typeof supplierFiltersSchema>;
export type SupplierStats = z.infer<typeof supplierStatsSchema>;
export type SupplierPerformance = z.infer<typeof supplierPerformanceSchema>;
export type PaginatedSuppliers = z.infer<typeof paginatedSuppliersSchema>;
export type SupplierProduct = z.infer<typeof supplierProductSchema>;
