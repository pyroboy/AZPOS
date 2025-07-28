import { z } from 'zod';

// Schema for payment method configuration
export const paymentMethodConfigSchema = z.object({
	id: z.string(),
	type: z.enum([
		'cash',
		'card',
		'digital_wallet',
		'bank_transfer',
		'store_credit',
		'gift_card',
		'check',
		'crypto'
	]),
	name: z.string(),
	is_enabled: z.boolean().default(true),
	is_default: z.boolean().default(false),
	settings: z
		.object({
			// Card payment settings
			accept_credit: z.boolean().optional(),
			accept_debit: z.boolean().optional(),
			require_signature: z.boolean().optional(),
			require_pin: z.boolean().optional(),
			// Digital wallet settings
			provider: z.string().optional(), // PayPal, Apple Pay, Google Pay, etc.
			merchant_id: z.string().optional(),
			// Cash settings
			enable_cash_drawer: z.boolean().optional(),
			require_exact_change: z.boolean().optional(),
			// Store credit settings
			allow_partial_redemption: z.boolean().optional(),
			expiry_days: z.number().optional(),
			// Gift card settings
			min_amount: z.number().optional(),
			max_amount: z.number().optional(),
			// Processing fees
			fixed_fee: z.number().optional(),
			percentage_fee: z.number().optional()
		})
		.optional(),
	sort_order: z.number().default(0)
});

// Schema for payment processing
export const paymentProcessingSchema = z.object({
	amount: z.number().min(0),
	payment_method_id: z.string(),
	payment_method_type: z.enum([
		'cash',
		'card',
		'digital_wallet',
		'bank_transfer',
		'store_credit',
		'gift_card',
		'check',
		'crypto'
	]),
	reference: z.string().optional(), // Card last 4 digits, transaction ID, etc.
	metadata: z
		.object({
			// Card payment metadata
			card_type: z.string().optional(), // Visa, Mastercard, etc.
			card_last_four: z.string().optional(),
			authorization_code: z.string().optional(),
			// Digital wallet metadata
			wallet_type: z.string().optional(),
			wallet_transaction_id: z.string().optional(),
			// Cash metadata
			amount_tendered: z.number().optional(),
			change_given: z.number().optional(),
			// Store credit metadata
			store_credit_id: z.string().optional(),
			remaining_balance: z.number().optional(),
			// Gift card metadata
			gift_card_number: z.string().optional(),
			gift_card_balance: z.number().optional()
		})
		.optional()
});

// Schema for payment result
export const paymentResultSchema = z.object({
	id: z.string(),
	status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']),
	amount: z.number(),
	payment_method_id: z.string(),
	payment_method_type: z.enum([
		'cash',
		'card',
		'digital_wallet',
		'bank_transfer',
		'store_credit',
		'gift_card',
		'check',
		'crypto'
	]),
	reference: z.string().optional(),
	transaction_id: z.string().optional(),
	gateway_response: z
		.object({
			code: z.string().optional(),
			message: z.string().optional(),
			transaction_id: z.string().optional(),
			authorization_code: z.string().optional()
		})
		.optional(),
	fees: z
		.object({
			fixed_fee: z.number().default(0),
			percentage_fee: z.number().default(0),
			total_fee: z.number().default(0)
		})
		.optional(),
	processed_at: z.string().datetime(),
	error_message: z.string().optional()
});

// Schema for refund processing
export const refundProcessingSchema = z.object({
	payment_id: z.string(),
	amount: z.number().min(0),
	reason: z.enum(['customer_request', 'merchant_error', 'fraud', 'chargeback', 'other']),
	notes: z.string().optional()
});

// Schema for payment terminal
export const paymentTerminalSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['physical', 'virtual', 'mobile']),
	status: z.enum(['online', 'offline', 'maintenance', 'error']),
	supported_methods: z.array(
		z.enum([
			'cash',
			'card',
			'digital_wallet',
			'bank_transfer',
			'store_credit',
			'gift_card',
			'check',
			'crypto'
		])
	),
	settings: z
		.object({
			auto_print_receipt: z.boolean().default(true),
			require_signature_amount: z.number().optional(),
			tip_options: z.array(z.number()).optional(),
			currency: z.string().default('USD'),
			tax_rate: z.number().default(0)
		})
		.optional(),
	last_heartbeat: z.string().datetime().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Schema for payment statistics
export const paymentStatsSchema = z.object({
	total_payments: z.number(),
	total_amount: z.number(),
	successful_payments: z.number(),
	failed_payments: z.number(),
	refunded_payments: z.number(),
	total_refunds: z.number(),
	net_amount: z.number(),
	avg_payment_amount: z.number(),
	payment_method_breakdown: z.record(
		z.string(),
		z.object({
			count: z.number(),
			total_amount: z.number(),
			percentage: z.number(),
			avg_amount: z.number()
		})
	),
	hourly_volume: z
		.array(
			z.object({
				hour: z.number(),
				payment_count: z.number(),
				total_amount: z.number()
			})
		)
		.optional(),
	daily_trends: z
		.array(
			z.object({
				date: z.string(),
				payment_count: z.number(),
				total_amount: z.number(),
				refund_count: z.number(),
				refund_amount: z.number()
			})
		)
		.optional()
});

// Schema for payment filters
export const paymentFiltersSchema = z.object({
	search: z.string().optional(),
	status: z
		.enum(['all', 'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'])
		.optional(),
	payment_method_type: z
		.enum([
			'cash',
			'card',
			'digital_wallet',
			'bank_transfer',
			'store_credit',
			'gift_card',
			'check',
			'crypto'
		])
		.optional(),
	amount_min: z.number().min(0).optional(),
	amount_max: z.number().min(0).optional(),
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	terminal_id: z.string().optional(),
	sort_by: z.enum(['processed_at', 'amount', 'status', 'payment_method_type']).optional(),
	sort_order: z.enum(['asc', 'desc']).optional(),
	page: z.number().min(1).optional(),
	limit: z.number().min(1).max(100).optional()
});

// Schema for paginated payments
export const paginatedPaymentsSchema = z.object({
	payments: z.array(paymentResultSchema),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		total_pages: z.number(),
		has_more: z.boolean()
	}),
	stats: paymentStatsSchema.optional()
});

// Schema for payment gateway configuration
export const paymentGatewayConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	provider: z.enum([
		'stripe',
		'square',
		'paypal',
		'authorize_net',
		'braintree',
		'adyen',
		'worldpay'
	]),
	is_enabled: z.boolean().default(false),
	is_test_mode: z.boolean().default(true),
	settings: z.object({
		api_key: z.string().optional(),
		secret_key: z.string().optional(),
		merchant_id: z.string().optional(),
		webhook_url: z.string().url().optional(),
		supported_currencies: z.array(z.string()).optional(),
		supported_countries: z.array(z.string()).optional()
	}),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Export inferred types
export type PaymentMethodConfig = z.infer<typeof paymentMethodConfigSchema>;
export type PaymentProcessing = z.infer<typeof paymentProcessingSchema>;
export type PaymentResult = z.infer<typeof paymentResultSchema>;
export type RefundProcessing = z.infer<typeof refundProcessingSchema>;
export type PaymentTerminal = z.infer<typeof paymentTerminalSchema>;
export type PaymentStats = z.infer<typeof paymentStatsSchema>;
export type PaymentFilters = z.infer<typeof paymentFiltersSchema>;
export type PaginatedPayments = z.infer<typeof paginatedPaymentsSchema>;
export type PaymentGatewayConfig = z.infer<typeof paymentGatewayConfigSchema>;
