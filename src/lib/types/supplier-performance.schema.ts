import { z } from 'zod';

// Schema for supplier performance report filters
export const supplierPerformanceFiltersSchema = z.object({
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	supplier_ids: z.array(z.string()).optional(), // Filter by specific suppliers
	period: z.enum(['month', 'quarter', 'year', 'custom']).default('month'),
	include_inactive: z.boolean().default(false), // Include inactive suppliers
	sort_by: z
		.enum(['supplier_name', 'on_time_rate', 'cost_variance', 'total_pos'])
		.default('supplier_name'),
	sort_order: z.enum(['asc', 'desc']).default('asc')
});

// Schema for individual supplier performance metrics
export const supplierPerformanceMetricSchema = z.object({
	supplier_id: z.string(),
	supplier_name: z.string(),
	supplier_code: z.string(),
	is_active: z.boolean(),

	// Order metrics
	total_pos: z.number().min(0),
	completed_pos: z.number().min(0),
	cancelled_pos: z.number().min(0),
	pending_pos: z.number().min(0),

	// Delivery performance
	on_time_deliveries: z.number().min(0),
	late_deliveries: z.number().min(0),
	on_time_rate: z.number().min(0).max(100), // Percentage
	average_delivery_delay: z.number().min(0), // Days

	// Financial metrics
	total_order_value: z.number().min(0),
	average_order_value: z.number().min(0),
	cost_variance_total: z.number(), // Can be negative
	average_cost_variance: z.number(), // Can be negative
	cost_variance_percentage: z.number(), // Can be negative, percentage

	// Additional metrics
	last_order_date: z.string().datetime().optional(),
	days_since_last_order: z.number().min(0).optional(),
	quality_score: z.number().min(0).max(5).optional(), // 1-5 rating

	// Period information
	period_start: z.string().datetime(),
	period_end: z.string().datetime()
});

// Schema for aggregated performance statistics
export const performanceStatsSchema = z.object({
	total_suppliers: z.number().min(0),
	active_suppliers: z.number().min(0),
	suppliers_with_orders: z.number().min(0),

	// Delivery stats
	overall_on_time_rate: z.number().min(0).max(100),
	total_on_time_deliveries: z.number().min(0),
	total_late_deliveries: z.number().min(0),
	average_delivery_delay: z.number().min(0),

	// Financial stats
	total_order_value: z.number().min(0),
	total_cost_variance: z.number(),
	average_cost_variance: z.number(),

	// Order stats
	total_purchase_orders: z.number().min(0),
	completed_orders: z.number().min(0),
	cancelled_orders: z.number().min(0),
	pending_orders: z.number().min(0),

	// Top performers
	top_on_time_suppliers: z
		.array(
			z.object({
				supplier_id: z.string(),
				supplier_name: z.string(),
				on_time_rate: z.number()
			})
		)
		.optional(),

	worst_performers: z
		.array(
			z.object({
				supplier_id: z.string(),
				supplier_name: z.string(),
				on_time_rate: z.number()
			})
		)
		.optional()
});

// Schema for the complete supplier performance report
export const supplierPerformanceReportSchema = z.object({
	metrics: z.array(supplierPerformanceMetricSchema),
	stats: performanceStatsSchema,
	period: z.object({
		type: z.enum(['month', 'quarter', 'year', 'custom']),
		start_date: z.string().datetime(),
		end_date: z.string().datetime(),
		label: z.string()
	}),
	generated_at: z.string().datetime(),
	generated_by: z.string()
});

// Schema for export functionality
export const performanceReportExportSchema = z.object({
	format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
	include_charts: z.boolean().default(false),
	include_summary: z.boolean().default(true),
	fields: z
		.array(
			z.enum([
				'supplier_name',
				'supplier_code',
				'total_pos',
				'on_time_rate',
				'average_cost_variance',
				'total_order_value',
				'last_order_date'
			])
		)
		.optional()
});

// Schema for detailed supplier performance with historical data
export const supplierPerformanceDetailSchema = z.object({
	supplier_id: z.string(),
	supplier_info: z.object({
		name: z.string(),
		code: z.string(),
		email: z.string().optional(),
		phone: z.string().optional(),
		is_active: z.boolean()
	}),
	current_period: supplierPerformanceMetricSchema,
	historical_data: z
		.array(
			z.object({
				period_label: z.string(),
				period_start: z.string().datetime(),
				period_end: z.string().datetime(),
				on_time_rate: z.number(),
				total_pos: z.number(),
				cost_variance: z.number()
			})
		)
		.optional(),
	recent_orders: z
		.array(
			z.object({
				po_number: z.string(),
				order_date: z.string().datetime(),
				expected_delivery: z.string().datetime().optional(),
				actual_delivery: z.string().datetime().optional(),
				status: z.string(),
				total_amount: z.number(),
				is_on_time: z.boolean().optional()
			})
		)
		.optional()
});

// Export inferred types
export type SupplierPerformanceFilters = z.infer<typeof supplierPerformanceFiltersSchema>;
export type SupplierPerformanceMetric = z.infer<typeof supplierPerformanceMetricSchema>;
export type PerformanceStats = z.infer<typeof performanceStatsSchema>;
export type SupplierPerformanceReport = z.infer<typeof supplierPerformanceReportSchema>;
export type PerformanceReportExport = z.infer<typeof performanceReportExportSchema>;
export type SupplierPerformanceDetail = z.infer<typeof supplierPerformanceDetailSchema>;
