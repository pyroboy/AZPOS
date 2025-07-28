import { z } from 'zod';

// Schema for modifier option
export const modifierOptionSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	price_adjustment: z.number().default(0), // Can be positive or negative
	is_default: z.boolean().default(false),
	is_available: z.boolean().default(true),
	sort_order: z.number().min(0).default(0),
	sku_suffix: z.string().optional(), // Added to product SKU
	image_url: z.string().url().optional()
});

// Schema for creating/updating modifier
export const modifierInputSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	type: z.enum(['single_select', 'multi_select', 'text_input', 'number_input']),
	is_required: z.boolean().default(false),
	is_active: z.boolean().default(true),
	min_selections: z.number().min(0).default(0), // For multi_select
	max_selections: z.number().min(1).optional(), // For multi_select
	sort_order: z.number().min(0).default(0),
	applies_to: z.enum(['all_products', 'specific_products', 'specific_categories']),
	product_ids: z.array(z.string()).optional(),
	category_ids: z.array(z.string()).optional(),
	options: z.array(modifierOptionSchema).optional() // Not for text/number inputs
});

// Full modifier schema
export const modifierSchema = modifierInputSchema.extend({
	id: z.string(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	created_by: z.string().optional(),
	updated_by: z.string().optional()
});

// Schema for modifier selection (when applied to products)
export const modifierSelectionSchema = z.object({
	modifier_id: z.string(),
	modifier_name: z.string(),
	modifier_type: z.enum(['single_select', 'multi_select', 'text_input', 'number_input']),
	selected_options: z
		.array(
			z.object({
				option_id: z.string(),
				option_name: z.string(),
				price_adjustment: z.number()
			})
		)
		.optional(),
	text_value: z.string().optional(), // For text_input
	number_value: z.number().optional(), // For number_input
	total_price_adjustment: z.number().default(0)
});

// Schema for modifier filters
export const modifierFiltersSchema = z.object({
	search: z.string().optional(),
	type: z.enum(['single_select', 'multi_select', 'text_input', 'number_input']).optional(),
	is_active: z.boolean().optional(),
	is_required: z.boolean().optional(),
	applies_to: z.enum(['all_products', 'specific_products', 'specific_categories']).optional(),
	product_id: z.string().optional(), // Get modifiers for specific product
	category_id: z.string().optional(), // Get modifiers for specific category
	sort_by: z.enum(['name', 'sort_order', 'created_at', 'type']).optional(),
	sort_order: z.enum(['asc', 'desc']).optional()
});

// Schema for modifier validation
export const validateModifierSelectionSchema = z.object({
	modifier_id: z.string(),
	selected_options: z.array(z.string()).optional(), // Option IDs
	text_value: z.string().optional(),
	number_value: z.number().optional()
});

// Schema for modifier statistics
export const modifierStatsSchema = z.object({
	total_modifiers: z.number(),
	active_modifiers: z.number(),
	inactive_modifiers: z.number(),
	required_modifiers: z.number(),
	single_select_count: z.number(),
	multi_select_count: z.number(),
	text_input_count: z.number(),
	number_input_count: z.number(),
	avg_options_per_modifier: z.number(),
	most_used_modifiers: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				usage_count: z.number(),
				type: z.string()
			})
		)
		.optional()
});

// Schema for product modifier assignment
export const productModifierAssignmentSchema = z.object({
	product_id: z.string(),
	modifier_ids: z.array(z.string()),
	override_settings: z
		.array(
			z.object({
				modifier_id: z.string(),
				is_required: z.boolean().optional(),
				sort_order: z.number().optional()
			})
		)
		.optional()
});

// Schema for bulk modifier operations
export const bulkModifierUpdateSchema = z.object({
	modifier_ids: z.array(z.string()).min(1),
	updates: z.object({
		is_active: z.boolean().optional(),
		is_required: z.boolean().optional(),
		applies_to: z.enum(['all_products', 'specific_products', 'specific_categories']).optional(),
		product_ids: z.array(z.string()).optional(),
		category_ids: z.array(z.string()).optional()
	})
});

// Export inferred types
export type ModifierOption = z.infer<typeof modifierOptionSchema>;
export type ModifierInput = z.infer<typeof modifierInputSchema>;
export type Modifier = z.infer<typeof modifierSchema>;
export type ModifierSelection = z.infer<typeof modifierSelectionSchema>;
export type ModifierFilters = z.infer<typeof modifierFiltersSchema>;
export type ValidateModifierSelection = z.infer<typeof validateModifierSelectionSchema>;
export type ModifierStats = z.infer<typeof modifierStatsSchema>;
export type ProductModifierAssignment = z.infer<typeof productModifierAssignmentSchema>;
export type BulkModifierUpdate = z.infer<typeof bulkModifierUpdateSchema>;
