import type { z } from 'zod';
import type {
	settingsSchema,
	productSchema,
	productBatchSchema,
	categorySchema,
	modifierSchema,
	modifierGroupSchema,
	productModifierSchema,
	supplierSchema,
	purchaseOrderItemSchema,
	purchaseOrderSchema,
	inventoryAdjustmentSchema,
	roleSchema,
	userSchema,
	transactionItemSchema,
	paymentSchema,
	transactionSchema,
	discountSchema,
	bundleComponentSchema,
	returnItemSchema,
	returnSchema,
	CartItemSchema,
	csvAdjustmentSchema
} from '$lib/schemas/models';

// =======================================================================
// Inferred TypeScript Types from Zod Schemas
// =======================================================================

export type Settings = z.infer<typeof settingsSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductBatch = z.infer<typeof productBatchSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Modifier = z.infer<typeof modifierSchema>;
export type ModifierGroup = z.infer<typeof modifierGroupSchema>;
export type ProductModifier = z.infer<typeof productModifierSchema>;
export type Supplier = z.infer<typeof supplierSchema>;
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSchema>;
export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type TransactionItem = z.infer<typeof transactionItemSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type BundleComponent = z.infer<typeof bundleComponentSchema>;
export type ReturnItem = z.infer<typeof returnItemSchema>;
export type ReturnRecord = z.infer<typeof returnSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type CsvAdjustment = z.infer<typeof csvAdjustmentSchema>;
