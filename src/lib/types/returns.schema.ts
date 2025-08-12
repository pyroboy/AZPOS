import { z } from 'zod';

// Schema for return item
export const returnItemSchema = z.object({
	product_id: z.string(),
	product_name: z.string(),
	product_sku: z.string(),
	quantity: z.number().min(1)
});

// Schema for creating a new return (input)
export const newReturnSchema = z.object({
	order_id: z.string().min(1),
	customer_name: z.string().min(1),
	items: z.array(returnItemSchema).min(1),
	reason: z.enum(['defective', 'wrong_item', 'changed_mind', 'other', 'no_longer_needed']),
	notes: z.string().optional()
});

// Schema for updating return status
export const updateReturnStatusSchema = z.object({
	return_id: z.string(),
	status: z.enum(['pending', 'approved', 'rejected', 'processed']),
	admin_notes: z.string().optional()
});

// Full return record schema (from database)
export const enhancedReturnSchema = z.object({
	id: z.string(),
	order_id: z.string(),
	customer_name: z.string(),
	items: z.array(returnItemSchema),
	return_date: z.string().datetime(),
	status: z.enum(['pending', 'approved', 'rejected', 'processed']),
	reason: z.enum(['defective', 'wrong_item', 'changed_mind', 'other', 'no_longer_needed']),
	notes: z.string().optional(),
	admin_notes: z.string().optional(),
	processed_by: z.string().optional(), // Admin user ID who processed the return
	processed_at: z.string().datetime().optional(),
	user_id: z.string().uuid().optional(), // For RBAC
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Schema for return filters/queries
export const returnFiltersSchema = z.object({
	status: z.enum(['all', 'pending', 'approved', 'rejected', 'processed']).optional(),
	reason: z
		.enum(['all', 'defective', 'wrong_item', 'changed_mind', 'other', 'no_longer_needed'])
		.optional(),
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	customer_name: z.string().optional(),
	order_id: z.string().optional()
});

// Schema for return statistics
export const returnStatsSchema = z.object({
	total_returns: z.number(),
	pending_count: z.number(),
	approved_count: z.number(),
	rejected_count: z.number(),
	processed_count: z.number(),
	total_value: z.number(),
	avg_processing_time: z.number().optional() // in hours
});

// Export inferred types
export type ReturnItem = z.infer<typeof returnItemSchema>;
export type NewReturnInput = z.infer<typeof newReturnSchema>;
export type UpdateReturnStatusInput = z.infer<typeof updateReturnStatusSchema>;
export type EnhancedReturnRecord = z.infer<typeof enhancedReturnSchema>;
export type ReturnFilters = z.infer<typeof returnFiltersSchema>;
export type ReturnStats = z.infer<typeof returnStatsSchema>;
