import { z } from 'zod';

// Schema for transaction item
export const transactionItemSchema = z.object({
	product_id: z.string(),
	product_name: z.string(),
	product_sku: z.string(),
	quantity: z.number().min(1),
	unit_price: z.number().min(0),
	discount_amount: z.number().min(0).default(0),
	tax_amount: z.number().min(0).default(0),
	total_amount: z.number().min(0),
	modifiers: z
		.array(
			z.object({
				modifier_id: z.string(),
				modifier_name: z.string(),
				selected_options: z.array(
					z.object({
						option_id: z.string(),
						option_name: z.string(),
						price_adjustment: z.number()
					})
				)
			})
		)
		.optional()
});

// Schema for payment method
export const paymentMethodSchema = z.object({
	type: z.enum(['cash', 'card', 'digital_wallet', 'bank_transfer', 'store_credit', 'gift_card']),
	amount: z.number().min(0),
	reference: z.string().optional(), // Transaction reference, card last 4 digits, etc.
	provider: z.string().optional(), // Visa, Mastercard, PayPal, etc.
	status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('completed')
});

// Schema for creating transaction
export const createTransactionSchema = z.object({
	customer_id: z.string().optional(),
	customer_name: z.string().optional(),
	customer_email: z.string().email().optional(),
	customer_phone: z.string().optional(),
	items: z.array(transactionItemSchema).min(1),
	subtotal: z.number().min(0),
	discount_amount: z.number().min(0).default(0),
	tax_amount: z.number().min(0).default(0),
	tip_amount: z.number().min(0).default(0),
	total_amount: z.number().min(0),
	payment_methods: z.array(paymentMethodSchema).min(1),
	notes: z.string().optional(),
	receipt_email: z.string().email().optional(),
	receipt_phone: z.string().optional()
});

// Full transaction schema
export const transactionSchema = z.object({
	id: z.string(),
	transaction_number: z.string(),
	customer_id: z.string().optional(),
	customer_name: z.string().optional(),
	customer_email: z.string().email().optional(),
	customer_phone: z.string().optional(),
	status: z.enum(['pending', 'completed', 'cancelled', 'refunded', 'partially_refunded']),
	items: z.array(transactionItemSchema),
	subtotal: z.number().min(0),
	discount_amount: z.number().min(0),
	tax_amount: z.number().min(0),
	tip_amount: z.number().min(0),
	total_amount: z.number().min(0),
	payment_methods: z.array(paymentMethodSchema),
	refund_amount: z.number().min(0).default(0),
	notes: z.string().optional(),
	receipt_email: z.string().email().optional(),
	receipt_phone: z.string().optional(),
	processed_by: z.string(), // User ID of cashier/staff
	processed_at: z.string().datetime(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Schema for transaction filters
export const transactionFiltersSchema = z.object({
	search: z.string().optional(), // Search by transaction number, customer name, email
	status: z
		.enum(['all', 'pending', 'completed', 'cancelled', 'refunded', 'partially_refunded'])
		.optional(),
	customer_id: z.string().optional(),
	processed_by: z.string().optional(),
	payment_type: z
		.enum(['cash', 'card', 'digital_wallet', 'bank_transfer', 'store_credit', 'gift_card'])
		.optional(),
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	amount_min: z.number().min(0).optional(),
	amount_max: z.number().min(0).optional(),
	has_refund: z.boolean().optional(),
	sort_by: z
		.enum(['transaction_number', 'processed_at', 'total_amount', 'customer_name'])
		.optional(),
	sort_order: z.enum(['asc', 'desc']).optional(),
	page: z.number().min(1).optional(),
	limit: z.number().min(1).max(100).optional()
});

// Schema for refund request
export const refundRequestSchema = z.object({
	transaction_id: z.string(),
	items: z
		.array(
			z.object({
				product_id: z.string(),
				quantity: z.number().min(1),
				refund_amount: z.number().min(0)
			})
		)
		.optional(), // If not provided, refund entire transaction
	refund_amount: z.number().min(0).optional(), // If not provided, calculate from items
	reason: z.enum(['customer_request', 'defective_product', 'wrong_item', 'damaged', 'other']),
	notes: z.string().optional()
});

// Schema for transaction statistics
export const transactionStatsSchema = z.object({
	total_transactions: z.number(),
	completed_transactions: z.number(),
	cancelled_transactions: z.number(),
	refunded_transactions: z.number(),
	total_revenue: z.number(),
	total_refunds: z.number(),
	net_revenue: z.number(),
	avg_transaction_value: z.number(),
	total_items_sold: z.number(),
	unique_customers: z.number(),
	payment_method_breakdown: z.record(
		z.string(),
		z.object({
			count: z.number(),
			total_amount: z.number(),
			percentage: z.number()
		})
	),
	hourly_sales: z
		.array(
			z.object({
				hour: z.number(),
				transaction_count: z.number(),
				revenue: z.number()
			})
		)
		.optional(),
	top_products: z
		.array(
			z.object({
				product_id: z.string(),
				product_name: z.string(),
				quantity_sold: z.number(),
				revenue: z.number()
			})
		)
		.optional()
});

// Schema for paginated transactions
export const paginatedTransactionsSchema = z.object({
	transactions: z.array(transactionSchema),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		total_pages: z.number(),
		has_more: z.boolean()
	}),
	stats: transactionStatsSchema.optional()
});

// Schema for receipt data
export const receiptSchema = z.object({
	transaction: transactionSchema,
	business_info: z.object({
		name: z.string(),
		address: z.string(),
		phone: z.string().optional(),
		email: z.string().email().optional(),
		tax_id: z.string().optional()
	}),
	receipt_number: z.string(),
	generated_at: z.string().datetime()
});

// Export inferred types
export type TransactionItem = z.infer<typeof transactionItemSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type RefundRequest = z.infer<typeof refundRequestSchema>;
export type TransactionStats = z.infer<typeof transactionStatsSchema>;
export type PaginatedTransactions = z.infer<typeof paginatedTransactionsSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
