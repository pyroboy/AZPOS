import { getContext } from 'telefunc';
import {
	createStockTransactionSchema,
	bulkStockAdjustmentSchema,
	stockTransferSchema,
	stockTransactionFiltersSchema,
	type StockTransaction,
	type StockTransactionFilters,
	type PaginatedStockTransactions,
	type StockTransactionStats,
	type StockValuation,
	type StockAging
} from '$lib/types/stockTransaction.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to create stock transaction
export async function onCreateStockTransaction(
	transactionData: unknown
): Promise<StockTransaction> {
	try {
		const { user } = getContext();
		if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
			throw new Error('Not authorized - inventory management access required');
		}

		const validatedData = createStockTransactionSchema.parse(transactionData);
		const supabase = createSupabaseClient();

		// Verify product exists
		const { data: product, error: productError } = await supabase
			.from('products')
			.select('id, name, stock_quantity')
			.eq('id', validatedData.product_id)
			.single();

		if (productError || !product) {
			throw new Error('Product not found');
		}

		const now = new Date().toISOString();
		const transactionId = crypto.randomUUID();

		// Calculate new stock level based on quantity_change
		const newStockLevel = product.stock_quantity + validatedData.quantity_change;

		// Check for negative stock if not allowed
		const { data: settings } = await supabase.from('settings').select('inventory').single();

		const allowNegativeStock = settings?.inventory?.tracking?.allow_negative_stock || false;

		if (!allowNegativeStock && newStockLevel < 0) {
			throw new Error('Insufficient stock - negative stock not allowed');
		}

	const stockTransaction: StockTransaction = {
		id: transactionId,
		product_id: validatedData.product_id,
		location_id: validatedData.location_id,
		movement_type: validatedData.movement_type,
		quantity: Math.abs(validatedData.quantity_change),
		quantity_change: validatedData.quantity_change,
		quantity_before: product.stock_quantity,
		quantity_after: newStockLevel,
		unit_cost: validatedData.unit_cost,
		total_cost: validatedData.unit_cost
			? Math.abs(validatedData.quantity_change) * validatedData.unit_cost
			: undefined,
		reference_type: validatedData.reference_type,
		reference_id: validatedData.reference_id,
		batch_number: validatedData.batch_number,
		expiry_date: validatedData.expiry_date,
		serial_numbers: validatedData.serial_numbers,
		reason: validatedData.reason,
		notes: validatedData.notes,
		created_by: user.id,
		created_at: now
	};

		// Start transaction
		const { data: savedTransaction, error: transactionError } = await supabase
			.from('stock_transactions')
			.insert(stockTransaction)
			.select()
			.single();

		if (transactionError) throw transactionError;

		// Update product stock level
		const { error: updateError } = await supabase
			.from('products')
			.update({
				stock_quantity: newStockLevel,
				updated_at: now
			})
			.eq('id', validatedData.product_id);

		if (updateError) throw updateError;

		return savedTransaction;
	} catch (error) {
		console.error('Failed to create stock transaction:', error);
		throw error;
	}
}

// Telefunc to process bulk adjustment
export async function onProcessBulkAdjustment(
	adjustmentData: unknown
): Promise<StockTransaction[]> {
	try {
		const { user } = getContext();
		if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
			throw new Error('Not authorized - inventory management access required');
		}

		const validatedData = bulkStockAdjustmentSchema.parse(adjustmentData);
		const supabase = createSupabaseClient();

		const transactions: StockTransaction[] = [];
		const now = new Date().toISOString();

		// Process each adjustment
		for (const adjustment of validatedData.adjustments) {
			// Get current product stock
			const { data: product, error: productError } = await supabase
				.from('products')
				.select('id, stock_quantity')
				.eq('id', adjustment.product_id)
				.single();

			if (productError || !product) {
				throw new Error(`Product not found: ${adjustment.product_id}`);
			}

		const transaction: StockTransaction = {
			id: crypto.randomUUID(),
			product_id: adjustment.product_id,
			location_id: adjustment.location_id,
			movement_type: 'adjustment',
			quantity: Math.abs(adjustment.quantity_change),
			quantity_change: adjustment.quantity_change,
			quantity_before: product.stock_quantity,
			quantity_after: product.stock_quantity + adjustment.quantity_change,
			unit_cost: adjustment.unit_cost,
			total_cost: adjustment.unit_cost
				? Math.abs(adjustment.quantity_change) * adjustment.unit_cost
				: undefined,
			reference_type: 'adjustment',
			reason: adjustment.reason || validatedData.global_reason,
			notes: adjustment.notes || validatedData.global_notes,
			created_by: user.id,
			created_at: now
		};

			transactions.push(transaction);
		}

		// Insert all transactions
		const { data: savedTransactions, error: insertError } = await supabase
			.from('stock_transactions')
			.insert(transactions)
			.select();

		if (insertError) throw insertError;

		// Update product stock levels
		for (const transaction of transactions) {
			await supabase
				.from('products')
				.update({
					stock_quantity: transaction.quantity_after,
					updated_at: now
				})
				.eq('id', transaction.product_id);
		}

		return savedTransactions || [];
	} catch (error) {
		console.error('Failed to process bulk adjustment:', error);
		throw error;
	}
}

// Telefunc to process stock transfer
export async function onProcessStockTransfer(transferData: unknown): Promise<StockTransaction[]> {
	try {
		const { user } = getContext();
		if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
			throw new Error('Not authorized - inventory management access required');
		}

		const validatedData = stockTransferSchema.parse(transferData);
		const supabase = createSupabaseClient();

		const transactions: StockTransaction[] = [];
		const now = new Date().toISOString();
		const referenceId = crypto.randomUUID();

		// Process each item
		for (const item of validatedData.items) {
			// Get current product stock at source location
			const { data: product, error: productError } = await supabase
				.from('products')
				.select('id, stock_quantity')
				.eq('id', item.product_id)
				.single();

			if (productError || !product) {
				throw new Error(`Product not found: ${item.product_id}`);
			}

			// Check sufficient stock
			if (product.stock_quantity < item.quantity) {
				throw new Error(`Insufficient stock for product ${item.product_id}`);
			}

		// Create transfer out transaction
		const transferOutTransaction: StockTransaction = {
			id: crypto.randomUUID(),
			product_id: item.product_id,
			location_id: validatedData.from_location_id,
			movement_type: 'transfer',
			quantity: item.quantity,
			quantity_change: -item.quantity,
			quantity_before: product.stock_quantity,
			quantity_after: product.stock_quantity - item.quantity,
			reference_type: 'transfer',
			reference_id: referenceId,
			batch_number: item.batch_number,
			serial_numbers: item.serial_numbers,
			reason: validatedData.reason,
			notes: validatedData.notes,
			created_by: user.id,
			created_at: now
		};

		// Create transfer in transaction
		const transferInTransaction: StockTransaction = {
			id: crypto.randomUUID(),
			product_id: item.product_id,
			location_id: validatedData.to_location_id,
			movement_type: 'transfer',
			quantity: item.quantity,
			quantity_change: item.quantity,
			quantity_before: 0, // Assuming destination starts at 0 for simplicity
			quantity_after: item.quantity,
			reference_type: 'transfer',
			reference_id: referenceId,
			batch_number: item.batch_number,
			serial_numbers: item.serial_numbers,
			reason: validatedData.reason,
			notes: validatedData.notes,
			created_by: user.id,
			created_at: now
		};

			transactions.push(transferOutTransaction, transferInTransaction);
		}

		// Insert all transactions (if not requiring approval)
		if (!validatedData.requires_approval) {
			const { data: savedTransactions, error: insertError } = await supabase
				.from('stock_transactions')
				.insert(transactions)
				.select();

			if (insertError) throw insertError;

			// Update product stock levels for out transactions
			for (const transaction of transactions.filter((t) => t.quantity_change < 0)) {
				await supabase
					.from('products')
					.update({
						stock_quantity: transaction.quantity_after,
						updated_at: now
					})
					.eq('id', transaction.product_id);
			}

			return savedTransactions || [];
		}

		return transactions;
	} catch (error) {
		console.error('Failed to process stock transfer:', error);
		throw error;
	}
}

// Telefunc to get paginated stock transactions
export async function onGetStockTransactions(
	filters?: StockTransactionFilters
): Promise<PaginatedStockTransactions> {
	try {
		const { user } = getContext();
		if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
			throw new Error('Not authorized - inventory management access required');
		}

		const supabase = createSupabaseClient();
		const validatedFilters = filters ? stockTransactionFiltersSchema.parse(filters) : {};

		const page = validatedFilters.page || 1;
		const limit = validatedFilters.limit || 20;
		const offset = (page - 1) * limit;

		let query = supabase.from('stock_transactions').select(
			`
        *,
        product:products(id, name, sku)
      `,
			{ count: 'exact' }
		);

		// Apply filters
		if (validatedFilters.product_id) {
			query = query.eq('product_id', validatedFilters.product_id);
		}

		if (validatedFilters.location_id) {
			query = query.eq('location_id', validatedFilters.location_id);
		}

		if (validatedFilters.movement_type) {
			query = query.eq('movement_type', validatedFilters.movement_type);
		}

		if (validatedFilters.reference_type) {
			query = query.eq('reference_type', validatedFilters.reference_type);
		}

		if (validatedFilters.reference_id) {
			query = query.eq('reference_id', validatedFilters.reference_id);
		}

		if (validatedFilters.created_by) {
			query = query.eq('created_by', validatedFilters.created_by);
		}

		if (validatedFilters.date_from) {
			query = query.gte('created_at', validatedFilters.date_from);
		}

		if (validatedFilters.date_to) {
			query = query.lte('created_at', validatedFilters.date_to);
		}

		if (validatedFilters.quantity_min !== undefined) {
			query = query.gte('quantity_change', validatedFilters.quantity_min);
		}

		if (validatedFilters.quantity_max !== undefined) {
			query = query.lte('quantity_change', validatedFilters.quantity_max);
		}

		if (validatedFilters.has_cost !== undefined) {
			if (validatedFilters.has_cost) {
				query = query.not('unit_cost', 'is', null);
			} else {
				query = query.is('unit_cost', null);
			}
		}

		// Apply sorting
		const sortBy = validatedFilters.sort_by || 'created_at';
		const sortOrder = validatedFilters.sort_order || 'desc';
		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		const { data: transactions, error, count } = await query;
		if (error) throw error;

		const totalPages = Math.ceil((count || 0) / limit);

		return {
			transactions: transactions || [],
			pagination: {
				page,
				limit,
				total: count || 0,
				total_pages: totalPages,
				has_more: page < totalPages
			}
		};
	} catch (error) {
		console.error('Failed to get stock transactions:', error);
		throw error;
	}
}

// Telefunc to get stock transaction statistics
export async function onGetStockTransactionStats(): Promise<StockTransactionStats> {
	try {
		const { user } = getContext();
		if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
			throw new Error('Not authorized - inventory management access required');
		}

		const supabase = createSupabaseClient();

		const { data: transactions, error } = await supabase
			.from('stock_transactions')
			.select('movement_type, quantity_change, created_at, location_id, product_id');

		if (error) throw error;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

		const thisWeek = new Date();
		thisWeek.setDate(thisWeek.getDate() - 7);

		const thisMonth = new Date();
		thisMonth.setMonth(thisMonth.getMonth() - 1);

		const baseStats = {
			total_transactions: 0,
			transactions_today: 0,
			transactions_this_week: 0,
			transactions_this_month: 0,
			movement_type_breakdown: {} as Record<
				string,
				{ count: number; percentage: number; total_quantity: number }
			>,
			location_breakdown: {} as Record<
				string,
				{ count: number; total_quantity_in: number; total_quantity_out: number }
			>,
			top_products: [] as Array<{
				product_id: string;
				product_name: string;
				transaction_count: number;
				total_quantity_moved: number;
			}>,
			cost_impact: {
				total_cost_adjustments: 0,
				positive_adjustments: 0,
				negative_adjustments: 0
			},
			hourly_activity: [] as Array<{
				hour: number;
				transaction_count: number;
				total_quantity: number;
			}>
		};

		const stats =
			transactions?.reduce((acc, transaction) => {
				acc.total_transactions++;

				const createdDate = new Date(transaction.created_at);
				if (createdDate >= today) acc.transactions_today++;
				if (createdDate >= thisWeek) acc.transactions_this_week++;
				if (createdDate >= thisMonth) acc.transactions_this_month++;

				// Movement type breakdown
				if (!acc.movement_type_breakdown[transaction.movement_type]) {
					acc.movement_type_breakdown[transaction.movement_type] = {
						count: 0,
						percentage: 0,
						total_quantity: 0
					};
				}
				acc.movement_type_breakdown[transaction.movement_type].count++;
				acc.movement_type_breakdown[transaction.movement_type].total_quantity += Math.abs(
					transaction.quantity_change
				);

				// Location breakdown
				if (transaction.location_id) {
					if (!acc.location_breakdown[transaction.location_id]) {
						acc.location_breakdown[transaction.location_id] = {
							count: 0,
							total_quantity_in: 0,
							total_quantity_out: 0
						};
					}
					acc.location_breakdown[transaction.location_id].count++;

					if (transaction.quantity_change > 0) {
						acc.location_breakdown[transaction.location_id].total_quantity_in +=
							transaction.quantity_change;
					} else {
						acc.location_breakdown[transaction.location_id].total_quantity_out += Math.abs(
							transaction.quantity_change
						);
					}
				}

				return acc;
			}, baseStats) || baseStats;

		// Calculate movement type percentages
		Object.keys(stats.movement_type_breakdown).forEach((type) => {
			stats.movement_type_breakdown[type].percentage =
				stats.total_transactions > 0
					? (stats.movement_type_breakdown[type].count / stats.total_transactions) * 100
					: 0;
		});

		return stats;
	} catch (error) {
		console.error('Failed to get stock transaction stats:', error);
		throw error;
	}
}

// Telefunc to get stock valuation
export async function onGetStockValuation(): Promise<StockValuation[]> {
	try {
		const { user } = getContext();
		if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
			throw new Error('Not authorized - inventory management access required');
		}

		const supabase = createSupabaseClient();

		const { data: products, error } = await supabase
			.from('products')
			.select('id, name, sku, stock_quantity, cost_price, selling_price')
			.gt('stock_quantity', 0);

		if (error) throw error;

		const now = new Date().toISOString();

	const valuation: StockValuation[] = (products || []).map((product) => ({
		product_id: product.id,
		current_quantity: product.stock_quantity,
		current_stock: product.stock_quantity,
		average_cost: product.cost_price || 0,
		total_value: product.stock_quantity * (product.cost_price || 0),
		stock_value: product.stock_quantity * (product.cost_price || 0),
		retail_value: product.stock_quantity * (product.selling_price || 0),
		potential_profit: product.stock_quantity * ((product.selling_price || 0) - (product.cost_price || 0)),
		calculated_at: now
	}));

		return valuation;
	} catch (error) {
		console.error('Failed to get stock valuation:', error);
		throw error;
	}
}

// Telefunc to get stock aging report
export async function onGetStockAging(): Promise<StockAging[]> {
	try {
		const { user } = getContext();
		if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
			throw new Error('Not authorized - inventory management access required');
		}

		const supabase = createSupabaseClient();

		// Get transactions with batch information
		const { data: transactions, error } = await supabase
			.from('stock_transactions')
			.select(
				`
        *,
        product:products(id, name)
      `
			)
			.not('batch_number', 'is', null)
			.order('created_at', { ascending: true });

		if (error) throw error;

	const now = new Date();
	const batchData = new Map<string, {
		product_id: string;
		product_name: string;
		batches: Array<{
			batch_number: string;
			quantity: number;
			unit_cost: number;
			received_date: string;
			age_days: number;
			expiry_date?: string;
			days_to_expiry?: number;
		}>;
	}>();

		// Process transactions to build batch aging data
		transactions?.forEach((transaction) => {
			const key = `${transaction.product_id}-${transaction.batch_number}`;

			if (!batchData.has(key)) {
				const ageInDays = Math.floor(
					(now.getTime() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60 * 24)
				);

				batchData.set(key, {
					product_id: transaction.product_id,
					product_name: transaction.product.name,
					batches: [
						{
							batch_number: transaction.batch_number,
							quantity: transaction.quantity_change > 0 ? transaction.quantity_change : 0,
							unit_cost: transaction.unit_cost || 0,
							received_date: transaction.created_at,
							age_days: ageInDays,
							expiry_date: transaction.expiry_date,
							days_to_expiry: transaction.expiry_date
								? Math.floor(
										(new Date(transaction.expiry_date).getTime() - now.getTime()) /
											(1000 * 60 * 60 * 24)
									)
								: undefined
						}
					]
				});
			}
		});

	const agingReport: StockAging[] = Array.from(batchData.values()).map((data) => {
		const totalQuantity = data.batches.reduce(
			(sum: number, batch) => sum + batch.quantity,
			0
		);
		const averageAge =
			data.batches.reduce((sum: number, batch) => sum + batch.age_days, 0) /
			data.batches.length;
		const oldestStock = Math.max(...data.batches.map((batch) => batch.age_days));
		const expiringSoon = data.batches
			.filter((batch) => batch.days_to_expiry !== undefined && batch.days_to_expiry <= 30)
			.reduce((sum: number, batch) => sum + batch.quantity, 0);

		return {
				...data,
				remaining_quantity: totalQuantity,
				aging_category: expiringSoon > 0 ? 'expired' as const : (averageAge > 60 ? 'old' as const : (averageAge > 30 ? 'aging' as const : 'fresh' as const)),
				total_quantity: totalQuantity,
				average_age_days: averageAge,
				oldest_stock_days: oldestStock,
				expiring_soon_quantity: expiringSoon
			};
		});

		return agingReport;
	} catch (error) {
		console.error('Failed to get stock aging report:', error);
		throw error;
	}
}
