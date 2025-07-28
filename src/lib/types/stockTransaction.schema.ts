import { z } from 'zod';

// Schema for stock movement types
export const stockMovementTypeSchema = z.enum([
  'sale', 'return', 'purchase', 'adjustment', 'transfer', 'damaged', 'expired', 
  'theft', 'recount', 'promotion', 'sample', 'waste', 'conversion', 'assembly',
  'stock_in', 'stock_out', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out', 'damage'
]);

// Schema for stock transaction
export const stockTransactionSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  location_id: z.string().optional(),
  movement_type: stockMovementTypeSchema,
  quantity: z.number(), // Absolute quantity involved in transaction
  quantity_change: z.number(), // Positive for increases, negative for decreases
  quantity_before: z.number().min(0),
  quantity_after: z.number().min(0),
  unit_cost: z.number().min(0).optional(),
  total_cost: z.number().optional(),
  reference_type: z.enum(['transaction', 'purchase_order', 'transfer', 'adjustment', 'manual']).optional(),
  reference_id: z.string().optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().datetime().optional(),
  serial_numbers: z.array(z.string()).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string(),
  created_at: z.string().datetime(),
  processed_at: z.string().datetime().optional(),
  approved_by: z.string().optional(),
  approved_at: z.string().datetime().optional()
});

// Schema for creating stock transaction
export const createStockTransactionSchema = z.object({
  product_id: z.string(),
  location_id: z.string().optional(),
  movement_type: stockMovementTypeSchema,
  quantity_change: z.number(),
  unit_cost: z.number().min(0).optional(),
  reference_type: z.enum(['transaction', 'purchase_order', 'transfer', 'adjustment', 'manual']).optional(),
  reference_id: z.string().optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().datetime().optional(),
  serial_numbers: z.array(z.string()).optional(),
  reason: z.string().optional(),
  notes: z.string().optional()
});

// Schema for bulk stock adjustment
export const bulkStockAdjustmentSchema = z.object({
  adjustments: z.array(z.object({
    product_id: z.string(),
    location_id: z.string().optional(),
    quantity_change: z.number(),
    unit_cost: z.number().min(0).optional(),
    reason: z.string().optional(),
    notes: z.string().optional()
  })).min(1),
  reference_type: z.enum(['adjustment', 'recount', 'manual']).default('adjustment'),
  global_reason: z.string().optional(),
  global_notes: z.string().optional()
});

// Schema for stock transfer
export const stockTransferSchema = z.object({
  from_location_id: z.string(),
  to_location_id: z.string(),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().min(1),
    batch_number: z.string().optional(),
    serial_numbers: z.array(z.string()).optional()
  })).min(1),
  reason: z.string().optional(),
  notes: z.string().optional(),
  requires_approval: z.boolean().default(false)
});

// Schema for stock transaction filters
export const stockTransactionFiltersSchema = z.object({
  product_id: z.string().optional(),
  location_id: z.string().optional(),
  movement_type: stockMovementTypeSchema.optional(),
  reference_type: z.enum(['transaction', 'purchase_order', 'transfer', 'adjustment', 'manual']).optional(),
  reference_id: z.string().optional(),
  reference_number: z.string().optional(),
  supplier_id: z.string().optional(),
  created_by: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  quantity_min: z.number().optional(),
  quantity_max: z.number().optional(),
  has_cost: z.boolean().optional(),
  requires_approval: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'quantity_change', 'unit_cost', 'movement_type']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Schema for stock transaction statistics
export const stockTransactionStatsSchema = z.object({
  total_transactions: z.number(),
  transactions_today: z.number(),
  transactions_this_week: z.number(),
  transactions_this_month: z.number(),
  movement_type_breakdown: z.record(z.string(), z.object({
    count: z.number(),
    total_quantity: z.number(),
    percentage: z.number()
  })),
  location_breakdown: z.record(z.string(), z.object({
    count: z.number(),
    total_quantity_in: z.number(),
    total_quantity_out: z.number()
  })),
  top_products: z.array(z.object({
    product_id: z.string(),
    product_name: z.string(),
    transaction_count: z.number(),
    total_quantity_moved: z.number()
  })).optional(),
  cost_impact: z.object({
    total_cost_adjustments: z.number(),
    positive_adjustments: z.number(),
    negative_adjustments: z.number()
  }).optional(),
  hourly_activity: z.array(z.object({
    hour: z.number(),
    transaction_count: z.number(),
    total_quantity: z.number()
  })).optional()
});

// Schema for paginated stock transactions
export const paginatedStockTransactionsSchema = z.object({
  transactions: z.array(stockTransactionSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_more: z.boolean()
  }),
  stats: stockTransactionStatsSchema.optional()
});

// Schema for stock valuation
export const stockValuationSchema = z.object({
  product_id: z.string(),
  location_id: z.string().optional(),
  current_quantity: z.number().min(0),
  current_stock: z.number().min(0),
  average_cost: z.number().min(0),
  total_value: z.number().min(0),
  stock_value: z.number().min(0),
  retail_value: z.number().min(0),
  potential_profit: z.number(),
  last_cost: z.number().min(0).optional(),
  fifo_cost: z.number().min(0).optional(),
  lifo_cost: z.number().min(0).optional(),
  calculated_at: z.string().datetime()
});

// Schema for stock aging report
export const stockAgingSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  location_id: z.string().optional(),
  remaining_quantity: z.number().min(0),
  aging_category: z.enum(['fresh', 'aging', 'old', 'expired']),
  batches: z.array(z.object({
    batch_number: z.string().optional(),
    quantity: z.number().min(0),
    unit_cost: z.number().min(0),
    received_date: z.string().datetime(),
    age_days: z.number(),
    expiry_date: z.string().datetime().optional(),
    days_to_expiry: z.number().optional()
  })),
  total_quantity: z.number().min(0),
  average_age_days: z.number(),
  oldest_stock_days: z.number(),
  expiring_soon_quantity: z.number().min(0)
});

// Export inferred types
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;
export type StockTransaction = z.infer<typeof stockTransactionSchema>;
export type StockTransactionCreate = z.infer<typeof createStockTransactionSchema>;
export type CreateStockTransaction = z.infer<typeof createStockTransactionSchema>;
export type BulkAdjustment = z.infer<typeof bulkStockAdjustmentSchema>;
export type BulkStockAdjustment = z.infer<typeof bulkStockAdjustmentSchema>;
export type StockTransfer = z.infer<typeof stockTransferSchema>;
export type StockTransactionFilters = z.infer<typeof stockTransactionFiltersSchema>;
export type StockTransactionStats = z.infer<typeof stockTransactionStatsSchema>;
export type PaginatedStockTransactions = z.infer<typeof paginatedStockTransactionsSchema>;
export type StockValuation = z.infer<typeof stockValuationSchema>;
export type StockAging = z.infer<typeof stockAgingSchema>;
export type StockAgingReport = z.infer<typeof stockAgingSchema>;
