import { z } from 'zod';

// Schema for product batch creation/update input
export const productBatchInputSchema = z.object({
  product_id: z.string(),
  batch_number: z.string(),
  expiration_date: z.string().datetime().optional(),
  purchase_cost: z.number().min(0),
  quantity_on_hand: z.number().min(0).int()
});

// Full product batch schema (from database)
export const productBatchSchema = productBatchInputSchema.extend({
  id: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional()
});

// Schema for product batch filters/queries
export const productBatchFiltersSchema = z.object({
  product_id: z.string().optional(),
  batch_number: z.string().optional(),
  expiring_within_days: z.number().min(1).max(365).optional(),
  has_stock: z.boolean().optional(),
  sort_by: z.enum(['batch_number', 'expiration_date', 'purchase_cost', 'quantity_on_hand', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Schema for paginated product batches response
export const paginatedProductBatchesSchema = z.object({
  batches: z.array(productBatchSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_more: z.boolean()
  })
});

// Schema for batch statistics
export const productBatchStatsSchema = z.object({
  total_batches: z.number(),
  expiring_soon: z.number(),
  expired_batches: z.number(),
  total_value: z.number(),
  average_cost: z.number(),
  batches_with_stock: z.number(),
  batches_out_of_stock: z.number()
});

// Export inferred types
export type ProductBatchInput = z.infer<typeof productBatchInputSchema>;
export type ProductBatch = z.infer<typeof productBatchSchema>;
export type ProductBatchFilters = z.infer<typeof productBatchFiltersSchema>;
export type PaginatedProductBatches = z.infer<typeof paginatedProductBatchesSchema>;
export type ProductBatchStats = z.infer<typeof productBatchStatsSchema>;
