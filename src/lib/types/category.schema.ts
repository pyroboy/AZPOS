import { z } from 'zod';

// Schema for creating/updating category
export const categoryInputSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	parent_id: z.string().optional(), // For hierarchical categories
	slug: z.string().min(1),
	image_url: z.string().url().optional(),
	is_active: z.boolean().default(true),
	sort_order: z.number().min(0).default(0),
	meta_title: z.string().optional(),
	meta_description: z.string().optional(),
	tags: z.array(z.string()).optional()
});

// Full category schema
export const categorySchema = categoryInputSchema.extend({
	id: z.string(),
	level: z.number().min(0).default(0), // Hierarchy level (0 = root)
	path: z.string(), // Full path like "electronics/phones/smartphones"
	product_count: z.number().min(0).default(0),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	created_by: z.string().optional(),
	updated_by: z.string().optional()
});

// Schema for category tree structure
const categoryTreeSchemaBase = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	color: z.string().optional(),
	icon: z.string().optional(),
	is_active: z.boolean()
});

export const categoryTreeSchema: z.ZodType<CategoryTree> = categoryTreeSchemaBase.extend({
	children: z.array(z.lazy(() => categoryTreeSchema)).optional()
});

// Schema for category filters
export const categoryFiltersSchema = z.object({
	search: z.string().optional(),
	parent_id: z.string().optional(),
	is_active: z.boolean().optional(),
	level: z.number().min(0).optional(),
	has_products: z.boolean().optional(),
	sort_by: z.enum(['name', 'sort_order', 'product_count', 'created_at']).optional(),
	sort_order: z.enum(['asc', 'desc']).optional()
});

// Schema for category statistics
export const categoryStatsSchema = z.object({
	total_categories: z.number(),
	active_categories: z.number(),
	inactive_categories: z.number(),
	root_categories: z.number(),
	categories_with_products: z.number(),
	max_depth: z.number(),
	avg_products_per_category: z.number(),
	top_categories: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				product_count: z.number(),
				percentage: z.number()
			})
		)
		.optional()
});

// Schema for moving category
export const moveCategorySchema = z.object({
	category_id: z.string(),
	new_parent_id: z.string().optional(), // null for root level
	new_sort_order: z.number().min(0).optional()
});

// Schema for bulk category operations
export const bulkCategoryUpdateSchema = z.object({
	category_ids: z.array(z.string()).min(1),
	updates: z.object({
		is_active: z.boolean().optional(),
		parent_id: z.string().optional(),
		tags: z.array(z.string()).optional()
	})
});

// Export inferred types
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CategoryTree = z.infer<typeof categoryTreeSchemaBase> & {
	children?: CategoryTree[];
};
export type CategoryFilters = z.infer<typeof categoryFiltersSchema>;
export type CategoryStats = z.infer<typeof categoryStatsSchema>;
export type MoveCategory = z.infer<typeof moveCategorySchema>;
export type BulkCategoryUpdate = z.infer<typeof bulkCategoryUpdateSchema>;
