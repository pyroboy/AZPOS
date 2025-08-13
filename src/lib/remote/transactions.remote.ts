import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { createSupabaseClient, getAuthenticatedUser } from '$lib/server/db';
import type { CreateTransaction } from '$lib/types/transaction.schema';

// Create transaction schema
const createTransactionSchema = z.object({
	customer_name: z.string().optional(),
	customer_email: z.string().email().optional(),
	customer_phone: z.string().optional(),
	items: z.array(z.object({
		product_id: z.string(),
		product_name: z.string(),
		product_sku: z.string(),
		quantity: z.number().min(1),
		unit_price: z.number(),
		discount_amount: z.number().default(0),
		tax_amount: z.number().default(0),
		total_amount: z.number(),
		modifiers: z.array(z.object({
			modifier_id: z.string(),
			modifier_name: z.string(),
			selected_options: z.array(z.string()).default([])
		})).optional().default([])
	})),
	subtotal: z.number(),
	discount_amount: z.number().default(0),
	tax_amount: z.number(),
	tip_amount: z.number().default(0),
	total_amount: z.number(),
	payment_methods: z.array(z.object({
		type: z.string(),
		amount: z.number(),
		reference: z.string().optional(),
		status: z.string()
	})),
	receipt_email: z.string().email().optional(),
	receipt_phone: z.string().optional()
});

// Get transactions
export const getTransactions = query(
	z.object({
		limit: z.number().default(50),
		offset: z.number().default(0),
		date_from: z.string().optional(),
		date_to: z.string().optional()
	}).optional(),
	async (filters = {}): Promise<any[]> => {
		const user = getAuthenticatedUser();
		console.log('💳 [REMOTE] Fetching transactions');
		
		const supabase = createSupabaseClient();
		
		let query = supabase
			.from('transactions')
			.select(`
				*,
				transaction_items(*),
				transaction_payments(*)
			`)
			.order('created_at', { ascending: false })
			.limit(filters.limit || 50);
		
		if (filters.offset) {
			query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
		}
		
		if (filters.date_from) {
			query = query.gte('created_at', filters.date_from);
		}
		
		if (filters.date_to) {
			query = query.lte('created_at', filters.date_to);
		}
		
		const { data, error } = await query;
		
		if (error) {
			console.error('❌ [REMOTE] Transactions fetch error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Fetched', data?.length || 0, 'transactions');
		return data || [];
	}
);

// Create transaction
export const createTransaction = command(
	createTransactionSchema,
	async (transactionData): Promise<any> => {
		const user = getAuthenticatedUser();
		console.log('💳 [REMOTE] Creating transaction');
		
		const supabase = createSupabaseClient();
		
		// Create transaction
		const { data: transaction, error: transactionError } = await supabase
			.from('transactions')
			.insert({
				customer_name: transactionData.customer_name,
				customer_email: transactionData.customer_email,
				customer_phone: transactionData.customer_phone,
				subtotal: transactionData.subtotal,
				discount_amount: transactionData.discount_amount,
				tax_amount: transactionData.tax_amount,
				tip_amount: transactionData.tip_amount,
				total_amount: transactionData.total_amount,
				processed_by: user.id,
				status: 'completed',
				receipt_email: transactionData.receipt_email,
				receipt_phone: transactionData.receipt_phone,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.select()
			.single();
		
		if (transactionError) {
			console.error('❌ [REMOTE] Transaction creation error:', transactionError);
			throw transactionError;
		}
		
		// Create transaction items
		const transactionItems = transactionData.items.map(item => ({
			transaction_id: transaction.id,
			product_id: item.product_id,
			product_name: item.product_name,
			product_sku: item.product_sku,
			quantity: item.quantity,
			unit_price: item.unit_price,
			discount_amount: item.discount_amount,
			tax_amount: item.tax_amount,
			total_amount: item.total_amount,
			created_at: new Date().toISOString()
		}));
		
		const { error: itemsError } = await supabase
			.from('transaction_items')
			.insert(transactionItems);
		
		if (itemsError) {
			console.error('❌ [REMOTE] Transaction items creation error:', itemsError);
			throw itemsError;
		}
		
		// Create payment records
		const payments = transactionData.payment_methods.map(payment => ({
			transaction_id: transaction.id,
			payment_method: payment.type,
			amount: payment.amount,
			reference_number: payment.reference,
			status: payment.status,
			processed_by: user.id,
			created_at: new Date().toISOString()
		}));
		
		const { error: paymentsError } = await supabase
			.from('transaction_payments')
			.insert(payments);
		
		if (paymentsError) {
			console.error('❌ [REMOTE] Payments creation error:', paymentsError);
			throw paymentsError;
		}
		
		// Update inventory quantities
		for (const item of transactionData.items) {
			const { error: inventoryError } = await supabase.rpc('adjust_inventory_quantity', {
				p_product_id: item.product_id,
				p_quantity_change: -item.quantity,
				p_reason: 'sale',
				p_reference: transaction.id,
				p_performed_by: user.id
			});
			
			if (inventoryError) {
				console.error('❌ [REMOTE] Inventory adjustment error:', inventoryError);
				// Don't throw here - transaction is already created
			}
		}
		
		console.log('✅ [REMOTE] Transaction created:', transaction.id);
		return transaction;
	}
);

// Get transaction by ID
export const getTransaction = query(
	z.object({ id: z.string() }),
	async ({ id }): Promise<any | null> => {
		const user = getAuthenticatedUser();
		console.log('💳 [REMOTE] Fetching transaction:', id);
		
		const supabase = createSupabaseClient();
		
		const { data, error } = await supabase
			.from('transactions')
			.select(`
				*,
				transaction_items(*),
				transaction_payments(*)
			`)
			.eq('id', id)
			.single();
		
		if (error) {
			console.error('❌ [REMOTE] Transaction fetch error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Transaction fetched');
		return data;
	}
);