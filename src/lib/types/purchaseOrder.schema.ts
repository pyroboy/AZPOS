import { z } from 'zod';

// Schema for purchase order item
export const purchaseOrderItemSchema = z.object({
	product_id: z.string(),
	product_name: z.string(),
	product_sku: z.string(),
	quantity_ordered: z.number().min(1),
	quantity_received: z.number().min(0).default(0),
	unit_cost: z.number().min(0),
	total_cost: z.number().min(0),
	notes: z.string().optional()
});

// Schema for creating a purchase order
export const createPurchaseOrderSchema = z.object({
	supplier_id: z.string(),
	expected_delivery_date: z.string().datetime().optional(),
	notes: z.string().optional(),
	items: z.array(purchaseOrderItemSchema).min(1)
});

// Schema for updating purchase order
export const updatePurchaseOrderSchema = z.object({
	supplier_id: z.string().optional(),
	status: z
		.enum([
			'draft',
			'pending',
			'approved',
			'ordered',
			'partially_received',
			'received',
			'cancelled'
		])
		.optional(),
	expected_delivery_date: z.string().datetime().optional(),
	actual_delivery_date: z.string().datetime().optional(),
	notes: z.string().optional(),
	items: z.array(purchaseOrderItemSchema).optional()
});

// Full purchase order schema
export const purchaseOrderSchema = z.object({
	id: z.string(),
	po_number: z.string(),
	supplier_id: z.string(),
	status: z.enum([
		'draft',
		'pending',
		'approved',
		'ordered',
		'partially_received',
		'received',
		'cancelled'
	]),
	order_date: z.string().datetime(),
	expected_delivery_date: z.string().datetime().optional(),
	actual_delivery_date: z.string().datetime().optional(),
	subtotal: z.number().min(0),
	tax_amount: z.number().min(0).default(0),
	total_amount: z.number().min(0),
	notes: z.string().optional(),
	items: z.array(purchaseOrderItemSchema),
	created_by: z.string(),
	approved_by: z.string().optional(),
	approved_at: z.string().datetime().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Schema for purchase order filters
export const purchaseOrderFiltersSchema = z.object({
	supplier_id: z.string().optional(),
	status: z
		.enum([
			'all',
			'draft',
			'pending',
			'approved',
			'ordered',
			'partially_received',
			'received',
			'cancelled'
		])
		.optional(),
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	search: z.string().optional(), // Search by PO number or supplier name
	created_by: z.string().optional(),
	sort_by: z.enum(['po_number', 'order_date', 'supplier', 'status', 'total_amount']).optional(),
	sort_order: z.enum(['asc', 'desc']).optional(),
	page: z.number().min(1).optional(),
	limit: z.number().min(1).max(100).optional()
});

// Schema for purchase order statistics
export const purchaseOrderStatsSchema = z.object({
	total_orders: z.number(),
	draft_count: z.number(),
	pending_count: z.number(),
	approved_count: z.number(),
	ordered_count: z.number(),
	partially_received_count: z.number(),
	received_count: z.number(),
	cancelled_count: z.number(),
	total_value: z.number(),
	pending_value: z.number(),
	received_value: z.number(),
	avg_order_value: z.number(),
	suppliers_count: z.number()
});

// Schema for receiving items
export const receiveItemsSchema = z.object({
	purchase_order_id: z.string(),
	items: z
		.array(
			z.object({
				product_id: z.string(),
				quantity_received: z.number().min(0),
				unit_cost: z.number().min(0).optional(), // Allow cost adjustment on receipt
				batch_number: z.string().optional(),
				expiry_date: z.string().datetime().optional(),
				notes: z.string().optional()
			})
		)
		.min(1),
	received_date: z.string().datetime().optional(),
	notes: z.string().optional()
});

// Schema for purchase order approval
export const approvePurchaseOrderSchema = z.object({
	purchase_order_id: z.string(),
	approved: z.boolean(),
	notes: z.string().optional()
});

// Schema for paginated purchase orders
export const paginatedPurchaseOrdersSchema = z.object({
	purchase_orders: z.array(purchaseOrderSchema),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		total_pages: z.number(),
		has_more: z.boolean()
	}),
	stats: purchaseOrderStatsSchema.optional()
});

// Export inferred types
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;
export type CreatePurchaseOrder = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrder = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderFilters = z.infer<typeof purchaseOrderFiltersSchema>;
export type PurchaseOrderStats = z.infer<typeof purchaseOrderStatsSchema>;
export type ReceiveItems = z.infer<typeof receiveItemsSchema>;
export type ApprovePurchaseOrder = z.infer<typeof approvePurchaseOrderSchema>;
export type PaginatedPurchaseOrders = z.infer<typeof paginatedPurchaseOrdersSchema>;
