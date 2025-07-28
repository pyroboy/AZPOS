import { z } from 'zod';

// Schema for individual sale item
export const salesItemSchema = z.object({
	id: z.string(),
	product_id: z.string(),
	product_name: z.string(),
	product_sku: z.string().optional(),
	quantity: z.number().min(1),
	price_per_unit: z.number().min(0),
	total_amount: z.number().min(0),
	batch_id: z.string().optional(),
	adjustment_id: z.string().optional(),
	sale_date: z.string().datetime(),
	user_id: z.string().optional(),
	reason: z.string().optional()
});

// Schema for sales report filters
export const salesReportFiltersSchema = z.object({
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	product_id: z.string().optional(),
	product_name: z.string().optional(),
	category_id: z.string().optional(),
	user_id: z.string().optional(),
	search: z.string().optional(), // Search by product name, SKU, or reason
	sort_by: z
		.enum(['sale_date', 'product_name', 'quantity', 'price_per_unit', 'total_amount'])
		.optional(),
	sort_order: z.enum(['asc', 'desc']).optional(),
	page: z.number().min(1).optional(),
	limit: z.number().min(1).max(100).optional()
});

// Schema for sales statistics
export const salesStatsSchema = z.object({
	total_revenue: z.number(),
	total_transactions: z.number(),
	total_items_sold: z.number(),
	average_transaction_value: z.number(),
	average_items_per_transaction: z.number(),
	unique_products_sold: z.number(),
	date_range: z.object({
		from: z.string().datetime().optional(),
		to: z.string().datetime().optional()
	}),
	top_selling_products: z
		.array(
			z.object({
				product_id: z.string(),
				product_name: z.string(),
				product_sku: z.string().optional(),
				quantity_sold: z.number(),
				revenue: z.number(),
				percentage_of_total: z.number()
			})
		)
		.optional(),
	daily_sales: z
		.array(
			z.object({
				date: z.string(),
				revenue: z.number(),
				transaction_count: z.number(),
				items_sold: z.number()
			})
		)
		.optional(),
	hourly_sales: z
		.array(
			z.object({
				hour: z.number(),
				revenue: z.number(),
				transaction_count: z.number(),
				items_sold: z.number()
			})
		)
		.optional()
});

// Schema for paginated sales report
export const paginatedSalesReportSchema = z.object({
	sales: z.array(salesItemSchema),
	pagination: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		total_pages: z.number(),
		has_more: z.boolean()
	}),
	stats: salesStatsSchema.optional()
});

// Schema for sales summary by period
export const salesSummarySchema = z.object({
	period: z.enum(['today', 'week', 'month', 'year', 'custom']),
	revenue: z.number(),
	transaction_count: z.number(),
	items_sold: z.number(),
	unique_products: z.number(),
	average_transaction_value: z.number(),
	growth_percentage: z.number().optional(), // Compared to previous period
	date_range: z.object({
		from: z.string().datetime(),
		to: z.string().datetime()
	})
});

// Schema for product performance
export const productPerformanceSchema = z.object({
	product_id: z.string(),
	product_name: z.string(),
	product_sku: z.string().optional(),
	category_name: z.string().optional(),
	total_quantity_sold: z.number(),
	total_revenue: z.number(),
	average_price: z.number(),
	transaction_count: z.number(),
	first_sale_date: z.string().datetime().optional(),
	last_sale_date: z.string().datetime().optional(),
	revenue_percentage: z.number(), // Percentage of total revenue
	quantity_percentage: z.number() // Percentage of total items sold
});

// Export inferred types
export type SalesItem = z.infer<typeof salesItemSchema>;
export type SalesReportFilters = z.infer<typeof salesReportFiltersSchema>;
export type SalesStats = z.infer<typeof salesStatsSchema>;
export type PaginatedSalesReport = z.infer<typeof paginatedSalesReportSchema>;
export type SalesSummary = z.infer<typeof salesSummarySchema>;
export type ProductPerformance = z.infer<typeof productPerformanceSchema>;
