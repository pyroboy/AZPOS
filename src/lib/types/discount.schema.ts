import { z } from 'zod';

// Schema for discount conditions
export const discountConditionSchema = z.object({
  type: z.enum(['minimum_amount', 'minimum_quantity', 'specific_products', 'specific_categories', 'customer_group']),
  value: z.union([z.number(), z.string(), z.array(z.string())]),
  operator: z.enum(['gte', 'lte', 'eq', 'in']).optional()
});

// Schema for creating/updating discount
export const discountInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  code: z.string().min(1).optional(), // Coupon code
  type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping']),
  value: z.number().min(0), // Percentage (0-100) or fixed amount
  max_discount_amount: z.number().min(0).optional(), // Cap for percentage discounts
  minimum_order_amount: z.number().min(0).optional(),
  usage_limit: z.number().min(1).optional(), // Total usage limit
  usage_limit_per_customer: z.number().min(1).optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  is_active: z.boolean().default(true),
  is_stackable: z.boolean().default(false), // Can be combined with other discounts
  applies_to: z.enum(['all', 'specific_products', 'specific_categories']),
  product_ids: z.array(z.string()).optional(),
  category_ids: z.array(z.string()).optional(),
  customer_eligibility: z.enum(['all', 'new_customers', 'returning_customers', 'vip_customers']).default('all'),
  conditions: z.array(discountConditionSchema).optional(),
  priority: z.number().min(0).default(0) // Higher priority discounts apply first
});

// Full discount schema
export const discountSchema = discountInputSchema.extend({
  id: z.string(),
  usage_count: z.number().min(0).default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().optional(),
  updated_by: z.string().optional()
});

// Schema for discount usage tracking
export const discountUsageSchema = z.object({
  id: z.string(),
  discount_id: z.string(),
  order_id: z.string(),
  customer_id: z.string().optional(),
  discount_amount: z.number().min(0),
  original_amount: z.number().min(0),
  final_amount: z.number().min(0),
  used_at: z.string().datetime()
});

// Schema for discount filters
export const discountFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping']).optional(),
  is_active: z.boolean().optional(),
  is_expired: z.boolean().optional(),
  has_code: z.boolean().optional(), // Filter discounts with/without coupon codes
  applies_to: z.enum(['all', 'specific_products', 'specific_categories']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort_by: z.enum(['name', 'start_date', 'end_date', 'usage_count', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Schema for discount validation
export const validateDiscountSchema = z.object({
  code: z.string().optional(),
  discount_id: z.string().optional(),
  order_amount: z.number().min(0),
  customer_id: z.string().optional(),
  product_ids: z.array(z.string()).optional(),
  category_ids: z.array(z.string()).optional()
});

// Schema for discount application result
export const discountApplicationSchema = z.object({
  discount_id: z.string(),
  discount_name: z.string(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping']),
  discount_amount: z.number().min(0),
  original_amount: z.number().min(0),
  final_amount: z.number().min(0),
  is_valid: z.boolean(),
  error_message: z.string().optional()
});

// Schema for discount statistics
export const discountStatsSchema = z.object({
  total_discounts: z.number(),
  active_discounts: z.number(),
  expired_discounts: z.number(),
  code_based_discounts: z.number(),
  automatic_discounts: z.number(),
  total_usage: z.number(),
  total_savings: z.number(),
  avg_discount_amount: z.number(),
  top_discounts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    usage_count: z.number(),
    total_savings: z.number()
  })).optional()
});

// Schema for paginated discounts
export const paginatedDiscountsSchema = z.object({
  discounts: z.array(discountSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_more: z.boolean()
  }),
  stats: discountStatsSchema.optional()
});

// Export inferred types
export type DiscountCondition = z.infer<typeof discountConditionSchema>;
export type DiscountInput = z.infer<typeof discountInputSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type DiscountUsage = z.infer<typeof discountUsageSchema>;
export type DiscountFilters = z.infer<typeof discountFiltersSchema>;
export type ValidateDiscount = z.infer<typeof validateDiscountSchema>;
export type DiscountApplication = z.infer<typeof discountApplicationSchema>;
export type DiscountStats = z.infer<typeof discountStatsSchema>;
export type PaginatedDiscounts = z.infer<typeof paginatedDiscountsSchema>;
