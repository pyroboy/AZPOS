import { z } from 'zod';

// Schema for cart item modifiers
export const cartItemModifierSchema = z.object({
  modifier_id: z.string(),
  modifier_name: z.string(),
  price_adjustment: z.number()
});

// Schema for applied discounts
export const appliedDiscountSchema = z.object({
  discount_id: z.string(),
  discount_name: z.string(),
  discount_amount: z.number()
});

// Schema for adding an item to cart (input)
export const addCartItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().min(1),
  selected_modifiers: z.array(cartItemModifierSchema).optional(),
  notes: z.string().optional()
});

// Schema for updating cart item quantity
export const updateCartItemSchema = z.object({
  cart_item_id: z.string(),
  quantity: z.number().min(0) // 0 to remove item
});

// Schema for cart discount
export const cartDiscountSchema = z.object({
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0)
});

// Full cart item schema (from database)
export const enhancedCartItemSchema = z.object({
  cart_item_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  product_sku: z.string(),
  base_price: z.number(),
  quantity: z.number(),
  selected_modifiers: z.array(cartItemModifierSchema).optional(),
  applied_discounts: z.array(appliedDiscountSchema).optional(),
  subtotal: z.number(),
  final_price: z.number(),
  image_url: z.string().optional(),
  added_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  notes: z.string().optional()
});

// Full cart state schema
export const cartStateSchema = z.object({
  items: z.array(enhancedCartItemSchema),
  discount: cartDiscountSchema.nullable(),
  session_id: z.string(),
  last_updated: z.string().datetime(),
  user_id: z.string().uuid().optional() // For authenticated users
});

// Cart totals schema
export const cartTotalsSchema = z.object({
  subtotal: z.number(),
  discount_amount: z.number(),
  tax: z.number(),
  total: z.number(),
  item_count: z.number()
});

// Export inferred types
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CartDiscount = z.infer<typeof cartDiscountSchema>;
export type EnhancedCartItem = z.infer<typeof enhancedCartItemSchema>;
export type CartState = z.infer<typeof cartStateSchema>;
export type CartTotals = z.infer<typeof cartTotalsSchema>;
