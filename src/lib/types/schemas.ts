import { z } from 'zod';

export const ProductSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	sku: z.string(),
	category_id: z.string().uuid(),
	price: z.number().positive(),
	cost: z.number().nullable(),
	image_url: z.string().url().nullable(),
	active: z.boolean(),
	description: z.string().nullable(),
	supplier_id: z.string().uuid().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

export const ProductBatchSchema = z.object({
	id: z.string().uuid(),
	product_id: z.string().uuid(),
	batch_number: z.string().nullable(),
	expiration_date: z.string().datetime().nullable(),
	purchase_cost: z.number().nullable(),
	quantity_on_hand: z.number().int()
});

export const CategorySchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().nullable()
});

export const DiscountSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().nullable(),
	amount: z.number().positive(),
	is_percentage: z.boolean(),
	product_ids: z.array(z.string().uuid()).nullable(),
	category_ids: z.array(z.string().uuid()).nullable(),
	minimum_purchase_amount: z.number().positive().nullable(),
	start_date: z.string().datetime(),
	end_date: z.string().datetime().nullable(),
	active: z.boolean()
});

export const ModifierSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().nullable(),
	price_change: z.number(),
	product_ids: z.array(z.string().uuid())
});

export const UserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	role: z.enum(['admin', 'manager', 'cashier']),
	pin: z.string() // Assuming PIN is handled securely elsewhere
});
