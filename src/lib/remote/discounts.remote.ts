import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { createSupabaseClient, getAuthenticatedUser } from '$lib/server/db';

// Discount schemas
const createDiscountSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	type: z.enum(['fixed_amount', 'percentage']),
	value: z.number().min(0),
	min_purchase_amount: z.number().min(0).optional(),
	max_discount_amount: z.number().min(0).optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	usage_limit: z.number().min(1).optional(),
	is_stackable: z.boolean().default(false),
	applicable_categories: z.array(z.string()).optional().default([]),
	applicable_products: z.array(z.string()).optional().default([])
});

const updateDiscountSchema = createDiscountSchema.partial().extend({
	id: z.string()
});

const discountFiltersSchema = z.object({
	is_active: z.boolean().optional(),
	type: z.enum(['fixed_amount', 'percentage']).optional(),
	search: z.string().optional(),
	limit: z.number().default(20),
	offset: z.number().default(0)
}).optional();

// Get all discounts
export const getDiscounts = query(
	discountFiltersSchema,
	async (filters = {}): Promise<any[]> => {
		const user = getAuthenticatedUser();
		console.log('💰 [REMOTE] Fetching discounts');
		
		const supabase = createSupabaseClient();
		
		let query = supabase
			.from('discounts')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(filters.limit || 20);
		
		if (filters.offset) {
			query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
		}
		
		if (filters.is_active !== undefined) {
			query = query.eq('is_active', filters.is_active);
		}
		
		if (filters.type) {
			query = query.eq('type', filters.type);
		}
		
		if (filters.search) {
			query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
		}
		
		const { data, error } = await query;
		
		if (error) {
			console.error('❌ [REMOTE] Discounts fetch error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Fetched', data?.length || 0, 'discounts');
		return data || [];
	}
);

// Get discount by ID
export const getDiscount = query(
	z.object({ id: z.string() }),
	async ({ id }): Promise<any | null> => {
		const user = getAuthenticatedUser();
		console.log('💰 [REMOTE] Fetching discount:', id);
		
		const supabase = createSupabaseClient();
		
		const { data, error } = await supabase
			.from('discounts')
			.select('*')
			.eq('id', id)
			.single();
		
		if (error) {
			console.error('❌ [REMOTE] Discount fetch error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Discount fetched');
		return data;
	}
);

// Create discount
export const createDiscount = command(
	createDiscountSchema,
	async (discountData): Promise<any> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('discounts:write')) {
			throw new Error('Not authorized to create discounts');
		}
		
		console.log('💰 [REMOTE] Creating discount:', discountData.name);
		
		const supabase = createSupabaseClient();
		
		const { data: discount, error } = await supabase
			.from('discounts')
			.insert({
				name: discountData.name,
				description: discountData.description,
				type: discountData.type,
				value: discountData.value,
				min_purchase_amount: discountData.min_purchase_amount,
				max_discount_amount: discountData.max_discount_amount,
				start_date: discountData.start_date,
				end_date: discountData.end_date,
				usage_limit: discountData.usage_limit,
				is_stackable: discountData.is_stackable,
				applicable_categories: discountData.applicable_categories,
				applicable_products: discountData.applicable_products,
				is_active: true,
				usage_count: 0,
				created_by: user.id,
				updated_by: user.id,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.select()
			.single();
		
		if (error) {
			console.error('❌ [REMOTE] Discount creation error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Discount created:', discount.id);
		return discount;
	}
);

// Update discount
export const updateDiscount = command(
	updateDiscountSchema,
	async (discountData): Promise<any> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('discounts:write')) {
			throw new Error('Not authorized to update discounts');
		}
		
		console.log('💰 [REMOTE] Updating discount:', discountData.id);
		
		const supabase = createSupabaseClient();
		
		const { id, ...updateData } = discountData;
		
		const { data: discount, error } = await supabase
			.from('discounts')
			.update({
				...updateData,
				updated_by: user.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();
		
		if (error) {
			console.error('❌ [REMOTE] Discount update error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Discount updated');
		return discount;
	}
);

// Delete discount (soft delete)
export const deleteDiscount = command(
	z.object({ id: z.string() }),
	async ({ id }): Promise<void> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('discounts:write')) {
			throw new Error('Not authorized to delete discounts');
		}
		
		console.log('💰 [REMOTE] Deleting discount:', id);
		
		const supabase = createSupabaseClient();
		
		const { error } = await supabase
			.from('discounts')
			.update({
				is_active: false,
				updated_by: user.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
		
		if (error) {
			console.error('❌ [REMOTE] Discount deletion error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Discount deleted');
	}
);

// Get active discounts (for POS)
export const getActiveDiscounts = query(async (): Promise<any[]> => {
	const user = getAuthenticatedUser();
	console.log('💰 [REMOTE] Fetching active discounts for POS');
	
	const supabase = createSupabaseClient();
	
	const now = new Date().toISOString();
	
	const { data, error } = await supabase
		.from('discounts')
		.select('*')
		.eq('is_active', true)
		.or(`start_date.is.null,start_date.lte.${now}`)
		.or(`end_date.is.null,end_date.gte.${now}`)
		.or(`usage_limit.is.null,usage_count.lt.usage_limit`)
		.order('created_at', { ascending: false });
	
	if (error) {
		console.error('❌ [REMOTE] Active discounts fetch error:', error);
		throw error;
	}
	
	console.log('✅ [REMOTE] Fetched', data?.length || 0, 'active discounts');
	return data || [];
});

// Apply discount to cart (validation)
export const validateDiscount = command(
	z.object({
		discount_id: z.string(),
		cart_total: z.number(),
		cart_items: z.array(z.object({
			product_id: z.string(),
			category_id: z.string().optional(),
			quantity: z.number(),
			unit_price: z.number()
		}))
	}),
	async (data): Promise<{
		valid: boolean;
		discount_amount: number;
		error_message?: string;
	}> => {
		const user = getAuthenticatedUser();
		console.log('💰 [REMOTE] Validating discount:', data.discount_id);
		
		const supabase = createSupabaseClient();
		
		// Get discount details
		const { data: discount, error } = await supabase
			.from('discounts')
			.select('*')
			.eq('id', data.discount_id)
			.eq('is_active', true)
			.single();
		
		if (error || !discount) {
			return {
				valid: false,
				discount_amount: 0,
				error_message: 'Discount not found or inactive'
			};
		}
		
		// Check date validity
		const now = new Date().toISOString();
		if (discount.start_date && discount.start_date > now) {
			return {
				valid: false,
				discount_amount: 0,
				error_message: 'Discount is not yet active'
			};
		}
		
		if (discount.end_date && discount.end_date < now) {
			return {
				valid: false,
				discount_amount: 0,
				error_message: 'Discount has expired'
			};
		}
		
		// Check usage limit
		if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
			return {
				valid: false,
				discount_amount: 0,
				error_message: 'Discount usage limit reached'
			};
		}
		
		// Check minimum purchase amount
		if (discount.min_purchase_amount && data.cart_total < discount.min_purchase_amount) {
			return {
				valid: false,
				discount_amount: 0,
				error_message: `Minimum purchase amount of $${discount.min_purchase_amount} required`
			};
		}
		
		// Check product/category applicability
		if (discount.applicable_products?.length > 0 || discount.applicable_categories?.length > 0) {
			const applicableItems = data.cart_items.filter(item => {
				return (
					discount.applicable_products?.includes(item.product_id) ||
					discount.applicable_categories?.includes(item.category_id || '')
				);
			});
			
			if (applicableItems.length === 0) {
				return {
					valid: false,
					discount_amount: 0,
					error_message: 'Discount not applicable to cart items'
				};
			}
		}
		
		// Calculate discount amount
		let discountAmount = 0;
		if (discount.type === 'percentage') {
			discountAmount = Math.round((data.cart_total * discount.value) / 100);
		} else {
			discountAmount = discount.value;
		}
		
		// Apply maximum discount amount limit
		if (discount.max_discount_amount && discountAmount > discount.max_discount_amount) {
			discountAmount = discount.max_discount_amount;
		}
		
		console.log('✅ [REMOTE] Discount validated, amount:', discountAmount);
		return {
			valid: true,
			discount_amount: discountAmount
		};
	}
);