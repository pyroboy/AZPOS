import { getContext } from 'telefunc';
import {
	productBatchInputSchema,
	productBatchFiltersSchema,
	type ProductBatch,
	type ProductBatchFilters,
	type PaginatedProductBatches,
	type ProductBatchStats
} from '$lib/types/productBatch.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get all product batches
export async function onGetProductBatches(
	filters?: ProductBatchFilters
): Promise<PaginatedProductBatches> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const supabase = createSupabaseClient();
		const validatedFilters = filters ? productBatchFiltersSchema.parse(filters) : {};

		const page = validatedFilters.page || 1;
		const limit = validatedFilters.limit || 20;
		const offset = (page - 1) * limit;

		let query = supabase.from('product_batches').select(
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

		if (validatedFilters.batch_number) {
			query = query.ilike('batch_number', `%${validatedFilters.batch_number}%`);
		}

		if (validatedFilters.expiring_within_days) {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + validatedFilters.expiring_within_days);
			query = query
				.not('expiration_date', 'is', null)
				.lte('expiration_date', futureDate.toISOString());
		}

		if (validatedFilters.has_stock !== undefined) {
			if (validatedFilters.has_stock) {
				query = query.gt('quantity_on_hand', 0);
			} else {
				query = query.eq('quantity_on_hand', 0);
			}
		}

		// Apply sorting
		const sortBy = validatedFilters.sort_by || 'created_at';
		const sortOrder = validatedFilters.sort_order || 'desc';
		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		const { data: batches, error, count } = await query;
		if (error) throw error;

		const totalPages = Math.ceil((count || 0) / limit);

		return {
			batches: batches || [],
			pagination: {
				page,
				limit,
				total: count || 0,
				total_pages: totalPages,
				has_more: page < totalPages
			}
		};
	} catch (error) {
		console.error('Failed to get product batches:', error);
		throw error;
	}
}

// Telefunc to get a single product batch by ID
export async function onGetProductBatchById(batchId: string): Promise<ProductBatch | null> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const supabase = createSupabaseClient();

		const { data: batch, error } = await supabase
			.from('product_batches')
			.select(
				`
        *,
        product:products(id, name, sku)
      `
			)
			.eq('id', batchId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			throw error;
		}

		return batch;
	} catch (error) {
		console.error('Failed to get product batch by ID:', error);
		throw error;
	}
}

// Telefunc to get expiring batches (within specified days, default 90)
export async function onGetExpiringBatches(daysAhead: number = 90): Promise<ProductBatch[]> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const supabase = createSupabaseClient();

		const now = new Date();
		const futureDate = new Date();
		futureDate.setDate(now.getDate() + daysAhead);

		const { data: batches, error } = await supabase
			.from('product_batches')
			.select(
				`
        *,
        product:products(id, name, sku)
      `
			)
			.not('expiration_date', 'is', null)
			.gte('expiration_date', now.toISOString())
			.lte('expiration_date', futureDate.toISOString())
			.gt('quantity_on_hand', 0)
			.order('expiration_date', { ascending: true });

		if (error) throw error;

		return batches || [];
	} catch (error) {
		console.error('Failed to get expiring batches:', error);
		throw error;
	}
}

// Telefunc to get expired batches
export async function onGetExpiredBatches(): Promise<ProductBatch[]> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const supabase = createSupabaseClient();

		const now = new Date();

		const { data: batches, error } = await supabase
			.from('product_batches')
			.select(
				`
        *,
        product:products(id, name, sku)
      `
			)
			.not('expiration_date', 'is', null)
			.lt('expiration_date', now.toISOString())
			.gt('quantity_on_hand', 0)
			.order('expiration_date', { ascending: false });

		if (error) throw error;

		return batches || [];
	} catch (error) {
		console.error('Failed to get expired batches:', error);
		throw error;
	}
}

// Telefunc to get batches by product ID
export async function onGetBatchesByProduct(productId: string): Promise<ProductBatch[]> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const supabase = createSupabaseClient();

		const { data: batches, error } = await supabase
			.from('product_batches')
			.select(
				`
        *,
        product:products(id, name, sku)
      `
			)
			.eq('product_id', productId)
			.order('expiration_date', { ascending: true });

		if (error) throw error;

		return batches || [];
	} catch (error) {
		console.error('Failed to get batches by product:', error);
		throw error;
	}
}

// Telefunc to create a new product batch
export async function onCreateProductBatch(batchData: unknown): Promise<ProductBatch> {
	try {
		const { user } = getContext();
		if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
			throw new Error('Not authorized - admin/manager access required');
		}

		const validatedData = productBatchInputSchema.parse(batchData);
		const supabase = createSupabaseClient();

		// Verify product exists
		const { data: product, error: productError } = await supabase
			.from('products')
			.select('id, name')
			.eq('id', validatedData.product_id)
			.single();

		if (productError || !product) {
			throw new Error('Product not found');
		}

		// Check if batch number already exists for this product
		const { data: existingBatch } = await supabase
			.from('product_batches')
			.select('id')
			.eq('product_id', validatedData.product_id)
			.eq('batch_number', validatedData.batch_number)
			.single();

		if (existingBatch) {
			throw new Error('Batch number already exists for this product');
		}

		const now = new Date().toISOString();

		const { data: newBatch, error } = await supabase
			.from('product_batches')
			.insert({
				...validatedData,
				created_at: now,
				updated_at: now
			})
			.select(
				`
        *,
        product:products(id, name, sku)
      `
			)
			.single();

		if (error) throw error;

		return newBatch;
	} catch (error) {
		console.error('Failed to create product batch:', error);
		throw error;
	}
}

// Telefunc to update a product batch
export async function onUpdateProductBatch(
	batchId: string,
	batchData: unknown
): Promise<ProductBatch> {
	try {
		const { user } = getContext();
		if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
			throw new Error('Not authorized - admin/manager access required');
		}

		const validatedData = productBatchInputSchema.partial().parse(batchData);
		const supabase = createSupabaseClient();

		// Verify batch exists
		const { data: existingBatch, error: fetchError } = await supabase
			.from('product_batches')
			.select('id, product_id, batch_number')
			.eq('id', batchId)
			.single();

		if (fetchError || !existingBatch) {
			throw new Error('Batch not found');
		}

		// If updating batch number, check for conflicts
		if (validatedData.batch_number && validatedData.batch_number !== existingBatch.batch_number) {
			const { data: conflictingBatch } = await supabase
				.from('product_batches')
				.select('id')
				.eq('product_id', existingBatch.product_id)
				.eq('batch_number', validatedData.batch_number)
				.neq('id', batchId)
				.single();

			if (conflictingBatch) {
				throw new Error('Batch number already exists for this product');
			}
		}

		const { data: updatedBatch, error } = await supabase
			.from('product_batches')
			.update({
				...validatedData,
				updated_at: new Date().toISOString()
			})
			.eq('id', batchId)
			.select(
				`
        *,
        product:products(id, name, sku)
      `
			)
			.single();

		if (error) throw error;

		return updatedBatch;
	} catch (error) {
		console.error('Failed to update product batch:', error);
		throw error;
	}
}

// Telefunc to adjust batch quantity
export async function onAdjustBatchQuantity(
	batchId: string,
	quantityChange: number,
	reason?: string
): Promise<ProductBatch> {
	try {
		const { user } = getContext();
		if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
			throw new Error('Not authorized - admin/manager access required');
		}

		const supabase = createSupabaseClient();

		// Get current batch
		const { data: batch, error: fetchError } = await supabase
			.from('product_batches')
			.select('*')
			.eq('id', batchId)
			.single();

		if (fetchError || !batch) {
			throw new Error('Batch not found');
		}

		const newQuantity = Math.max(0, batch.quantity_on_hand + quantityChange);

		const { data: updatedBatch, error } = await supabase
			.from('product_batches')
			.update({
				quantity_on_hand: newQuantity,
				updated_at: new Date().toISOString()
			})
			.eq('id', batchId)
			.select(
				`
        *,
        product:products(id, name, sku)
      `
			)
			.single();

		if (error) throw error;

		// Log the adjustment (if you have an adjustment log table)
		await supabase.from('batch_adjustments').insert({
			batch_id: batchId,
			user_id: user.id,
			quantity_change: quantityChange,
			previous_quantity: batch.quantity_on_hand,
			new_quantity: newQuantity,
			reason: reason || 'Manual adjustment',
			created_at: new Date().toISOString()
		});

		return updatedBatch;
	} catch (error) {
		console.error('Failed to adjust batch quantity:', error);
		throw error;
	}
}

// Telefunc to delete a product batch
export async function onDeleteProductBatch(batchId: string): Promise<void> {
	try {
		const { user } = getContext();
		if (!user || user.role !== 'admin') {
			throw new Error('Not authorized - admin access required');
		}

		const supabase = createSupabaseClient();

		// Verify batch exists and has no remaining quantity
		const { data: batch, error: fetchError } = await supabase
			.from('product_batches')
			.select('quantity_on_hand')
			.eq('id', batchId)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				throw new Error('Batch not found');
			}
			throw fetchError;
		}

		if (batch.quantity_on_hand > 0) {
			throw new Error('Cannot delete batch with remaining quantity');
		}

		const { error } = await supabase.from('product_batches').delete().eq('id', batchId);

		if (error) throw error;
	} catch (error) {
		console.error('Failed to delete product batch:', error);
		throw error;
	}
}

// Telefunc to get batch statistics
export async function onGetProductBatchStats(): Promise<ProductBatchStats> {
	try {
		const { user } = getContext();
		if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
			throw new Error('Not authorized - admin/manager access required');
		}

		const supabase = createSupabaseClient();

		const { data: batches, error } = await supabase
			.from('product_batches')
			.select('quantity_on_hand, purchase_cost, expiration_date');

		if (error) throw error;

		const now = new Date();
		const thirtyDaysFromNow = new Date();
		thirtyDaysFromNow.setDate(now.getDate() + 30);

		const stats = batches?.reduce(
			(acc, batch) => {
				acc.total_batches++;

				if (batch.quantity_on_hand > 0) {
					acc.batches_with_stock++;
					acc.total_value += batch.quantity_on_hand * (batch.purchase_cost || 0);
				} else {
					acc.batches_out_of_stock++;
				}

				if (batch.expiration_date) {
					const expirationDate = new Date(batch.expiration_date);

					if (expirationDate < now) {
						acc.expired_batches++;
					} else if (expirationDate <= thirtyDaysFromNow) {
						acc.expiring_soon++;
					}
				}

				return acc;
			},
			{
				total_batches: 0,
				expiring_soon: 0,
				expired_batches: 0,
				total_value: 0,
				average_cost: 0,
				batches_with_stock: 0,
				batches_out_of_stock: 0
			}
		) || {
			total_batches: 0,
			expiring_soon: 0,
			expired_batches: 0,
			total_value: 0,
			average_cost: 0,
			batches_with_stock: 0,
			batches_out_of_stock: 0
		};

		// Calculate average cost
		const totalCostValue =
			batches?.reduce((sum, batch) => sum + (batch.purchase_cost || 0), 0) || 0;
		stats.average_cost = stats.total_batches > 0 ? totalCostValue / stats.total_batches : 0;

		return stats;
	} catch (error) {
		console.error('Failed to get product batch stats:', error);
		throw error;
	}
}
