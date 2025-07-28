import { z } from 'zod';

// Schema for inventory item
export const inventoryItemSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  location_id: z.string().optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().datetime().optional(),
  quantity_on_hand: z.number().min(0),
  quantity_reserved: z.number().min(0).default(0),
  quantity_available: z.number().min(0),
  cost_per_unit: z.number().min(0),
  last_counted_at: z.string().datetime().optional(),
  last_movement_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Schema for inventory movement/transaction
export const inventoryMovementSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  location_id: z.string().optional(),
  movement_type: z.enum(['in', 'out', 'transfer', 'adjustment', 'count']),
  transaction_type: z.enum(['purchase', 'sale', 'return', 'adjustment', 'transfer', 'count', 'damage', 'expired']),
  quantity: z.number(),
  unit_cost: z.number().min(0).optional(),
  reference_id: z.string().optional(), // Order ID, Return ID, etc.
  reference_type: z.enum(['order', 'return', 'purchase_order', 'adjustment', 'transfer', 'count']).optional(),
  notes: z.string().optional(),
  user_id: z.string(),
  created_at: z.string().datetime()
});

// Schema for creating inventory movement
export const createInventoryMovementSchema = z.object({
  product_id: z.string(),
  location_id: z.string().optional(),
  movement_type: z.enum(['in', 'out', 'transfer', 'adjustment', 'count']),
  transaction_type: z.enum(['purchase', 'sale', 'return', 'adjustment', 'transfer', 'count', 'damage', 'expired']),
  quantity: z.number(),
  unit_cost: z.number().min(0).optional(),
  reference_id: z.string().optional(),
  reference_type: z.enum(['order', 'return', 'purchase_order', 'adjustment', 'transfer', 'count']).optional(),
  notes: z.string().optional()
});

// Schema for inventory location
export const inventoryLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Schema for inventory filters
export const inventoryFiltersSchema = z.object({
  product_id: z.string().optional(),
  location_id: z.string().optional(),
  low_stock: z.boolean().optional(),
  out_of_stock: z.boolean().optional(),
  expired: z.boolean().optional(),
  expiring_soon: z.boolean().optional(), // Within 30 days
  batch_number: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['product_name', 'quantity', 'value', 'last_movement', 'expiry_date']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

// Schema for inventory valuation
export const inventoryValuationSchema = z.object({
  total_items: z.number(),
  total_quantity: z.number(),
  total_value: z.number(),
  low_stock_items: z.number(),
  out_of_stock_items: z.number(),
  expired_items: z.number(),
  expiring_soon_items: z.number(),
  locations_count: z.number(),
  last_updated: z.string().datetime()
});

// Schema for stock count/audit
export const stockCountSchema = z.object({
  id: z.string(),
  location_id: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  count_date: z.string().datetime(),
  counted_by: z.string(),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    expected_quantity: z.number(),
    counted_quantity: z.number(),
    variance: z.number(),
    notes: z.string().optional()
  })),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Schema for creating stock count
export const createStockCountSchema = z.object({
  location_id: z.string().optional(),
  count_date: z.string().datetime(),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    expected_quantity: z.number(),
    counted_quantity: z.number(),
    notes: z.string().optional()
  }))
});

// Schema for inventory alert
export const inventoryAlertSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  alert_type: z.enum(['low_stock', 'out_of_stock', 'expired', 'expiring_soon']),
  threshold_value: z.number().optional(),
  current_value: z.number(),
  message: z.string(),
  is_acknowledged: z.boolean().default(false),
  acknowledged_by: z.string().optional(),
  acknowledged_at: z.string().datetime().optional(),
  created_at: z.string().datetime()
});

// Export inferred types
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;
export type CreateInventoryMovement = z.infer<typeof createInventoryMovementSchema>;
export type InventoryLocation = z.infer<typeof inventoryLocationSchema>;
export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;
export type InventoryValuation = z.infer<typeof inventoryValuationSchema>;
export type StockCount = z.infer<typeof stockCountSchema>;
export type CreateStockCount = z.infer<typeof createStockCountSchema>;
export type InventoryAlert = z.infer<typeof inventoryAlertSchema>;
