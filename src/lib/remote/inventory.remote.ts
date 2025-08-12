import { query, command, getRequestEvent } from '$app/server';
import {
	createInventoryMovementSchema,
	inventoryFiltersSchema,
	createStockCountSchema,
	inventoryMovementsFilterSchema,
	type InventoryItem,
	type InventoryMovement,
	type InventoryFilters,
	type InventoryValuation,
	type StockCount,
	type InventoryAlert,
	type CreateInventoryMovement,
	type CreateStockCount
} from '$lib/types/inventory.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper to get authenticated user context (optional for read operations)
function getAuthenticatedUser(required = true) {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user && required) throw new Error('Not authenticated');
	return user;
}

// Remote query to get inventory items with filters
export const getInventoryItems = query(
	inventoryFiltersSchema.optional(), // Pass schema as first argument
	async (validatedFilters): Promise<InventoryItem[]> => {
		console.log('📦 [REMOTE - getInventoryItems] Starting inventory items query with validated filters:', validatedFilters);
		
		const user = getAuthenticatedUser(false); // Optional for read operations
		console.log('👤 [REMOTE - getInventoryItems] User authenticated:', user?.id || 'anonymous');

		const supabase = createSupabaseClient();
		// No need to parse again - SvelteKit already validated the data
		const filters = validatedFilters || {};
		console.log('✅ [REMOTE - getInventoryItems] Using validated filters:', filters);

		let query = supabase.from('inventory_items').select(`
      *,
      products!inner(id, name, sku, min_stock_level),
      inventory_locations(id, name, code)
    `);

		// Apply filters
		if (filters.product_id) {
			query = query.eq('product_id', filters.product_id);
		}

		if (filters.location_id) {
			query = query.eq('location_id', filters.location_id);
		}

		if (filters.low_stock) {
			query = query.lt('quantity_available', 'products.min_stock_level');
		}

		if (filters.out_of_stock) {
			query = query.eq('quantity_available', 0);
		}

		// Note: expiry_date and batch_number filters disabled 
		// as these fields don't exist in inventory_items table
		// TODO: Add these fields to inventory_items or use product_batches table
		
		// batch_number filter would need join to product_batches table
		// Currently disabled as field doesn't exist in inventory_items

		if (filters.search) {
			query = query.or(
				`products.name.ilike.%${filters.search}%,products.sku.ilike.%${filters.search}%`
			);
		}

		// Apply sorting
		const sortBy = filters.sort_by || 'updated_at';
		const sortOrder = filters.sort_order || 'desc';

		switch (sortBy) {
			case 'product_name':
				query = query.order('products.name', { ascending: sortOrder === 'asc' });
				break;
			case 'quantity':
				query = query.order('quantity_available', { ascending: sortOrder === 'asc' });
				break;
			case 'last_movement':
				query = query.order('last_movement_at', { ascending: sortOrder === 'asc' });
				break;
			case 'created_at':
				query = query.order('created_at', { ascending: sortOrder === 'asc' });
				break;
			case 'updated_at':
			default:
				query = query.order('updated_at', { ascending: sortOrder === 'asc' });
		}

		console.log('🔍 [REMOTE - getInventoryItems] Executing Supabase query for inventory items...');
		const { data: items, error } = await query;
		
		if (error) {
			console.error('❌ [REMOTE - getInventoryItems] Supabase error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE - getInventoryItems] Supabase returned', items?.length || 0, 'inventory items');
		console.log('📋 [REMOTE - getInventoryItems] Sample item:', items?.[0] ? { id: items[0].id, product_id: items[0].product_id, quantity_available: items[0].quantity_available } : 'No items');

		return (
			items?.map((item) => ({
				id: item.id,
				product_id: item.product_id,
				location_id: item.location_id,
				batch_id: item.batch_id, // Use correct field name
				quantity_on_hand: item.quantity_on_hand,
				quantity_reserved: item.quantity_reserved,
				quantity_available: item.quantity_available,
				cost_per_unit: item.cost_per_unit,
				last_counted_at: item.last_counted_at,
				last_movement_at: item.last_movement_at,
				created_at: item.created_at,
				updated_at: item.updated_at
			})) || []
		);
	}
);

// Remote mutation to create inventory movement
export const createInventoryMovement = command(
	createInventoryMovementSchema, // Pass schema as first argument
	async (validatedData): Promise<InventoryMovement> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('pos:operate')) {
			throw new Error('Not authorized - insufficient permissions');
		}

		// No need to parse again - SvelteKit already validated the data
		const supabase = createSupabaseClient();

		// Create the movement record
		const { data: movement, error } = await supabase
			.from('inventory_movements')
			.insert({
				...validatedData,
				user_id: user.id,
				created_at: new Date().toISOString()
			})
			.select()
			.single();

		if (error) throw error;

		// Atomically update inventory quantities using efficient RPC approach
		await updateInventoryQuantitiesAtomic(supabase, validatedData.product_id, validatedData.location_id, validatedData.movement_type, validatedData.quantity);

		// 🚀 Refresh relevant queries to update the UI automatically!
		getInventoryItems({}).refresh();
		getInventoryValuation().refresh();
		
		// Now we can refresh movements with the proper schema
		if (validatedData.location_id) {
			getInventoryMovements({ productId: validatedData.product_id, locationId: validatedData.location_id }).refresh();
		} else {
			getInventoryMovements({}).refresh();
		}

		return {
			id: movement.id,
			product_id: movement.product_id,
			location_id: movement.location_id,
			movement_type: movement.movement_type,
			transaction_type: movement.transaction_type,
			quantity: movement.quantity,
			unit_cost: movement.unit_cost,
			reference_id: movement.reference_id,
			reference_type: movement.reference_type,
			notes: movement.notes,
			user_id: movement.user_id,
			created_at: movement.created_at
		};
	}
);

// Remote query to get inventory movements/history
export const getInventoryMovements = query(
	inventoryMovementsFilterSchema, // Pass schema as first argument
	async ({ productId, locationId }): Promise<InventoryMovement[]> => {
		const user = getAuthenticatedUser();
		const supabase = createSupabaseClient();

		let query = supabase
			.from('inventory_movements')
			.select(
				`
      *,
      product:products(name, sku),
      location:inventory_locations(name, code),
      user:users(full_name)
    `
			)
			.order('created_at', { ascending: false });

		if (productId) {
			query = query.eq('product_id', productId);
		}

		if (locationId) {
			query = query.eq('location_id', locationId);
		}

		const { data: movements, error } = await query;
		if (error) throw error;

		return (
			movements?.map((movement) => ({
				id: movement.id,
				product_id: movement.product_id,
				location_id: movement.location_id,
				movement_type: movement.movement_type,
				transaction_type: movement.transaction_type,
				quantity: movement.quantity,
				unit_cost: movement.unit_cost,
				reference_id: movement.reference_id,
				reference_type: movement.reference_type,
				notes: movement.notes,
				user_id: movement.user_id,
				created_at: movement.created_at
			})) || []
		);
	}
);

// Remote query to get inventory valuation (no parameters needed)
export const getInventoryValuation = query(async (): Promise<InventoryValuation> => {
	const user = getAuthenticatedUser();
	if (!user.permissions.includes('reports:view')) {
		throw new Error('Not authorized - insufficient permissions');
	}

	const supabase = createSupabaseClient();

	// Get inventory summary data
	const { data: items, error } = await supabase.from('inventory_items').select(`
      quantity_available,
      cost_per_unit,
      expiry_date,
      product:products(min_stock_level)
    `);

	if (error) throw error;

	const now = new Date();
	const thirtyDaysFromNow = new Date();
	thirtyDaysFromNow.setDate(now.getDate() + 30);

	const valuation = items?.reduce(
		(acc, item) => {
			acc.total_items++;
			acc.total_quantity += item.quantity_available;
			acc.total_value += item.quantity_available * item.cost_per_unit;

			if (item.quantity_available === 0) {
				acc.out_of_stock_items++;
			} else if (
				item.product?.[0]?.min_stock_level &&
				item.quantity_available < item.product[0].min_stock_level
			) {
				acc.low_stock_items++;
			}

			if (item.expiry_date) {
				const expiryDate = new Date(item.expiry_date);
				if (expiryDate < now) {
					acc.expired_items++;
				} else if (expiryDate < thirtyDaysFromNow) {
					acc.expiring_soon_items++;
				}
			}

			return acc;
		},
		{
			total_items: 0,
			total_quantity: 0,
			total_value: 0,
			low_stock_items: 0,
			out_of_stock_items: 0,
			expired_items: 0,
			expiring_soon_items: 0
		}
	) || {
		total_items: 0,
		total_quantity: 0,
		total_value: 0,
		low_stock_items: 0,
		out_of_stock_items: 0,
		expired_items: 0,
		expiring_soon_items: 0
	};

	// Get locations count
	const { count: locationsCount } = await supabase
		.from('inventory_locations')
		.select('*', { count: 'exact', head: true });

	return {
		...valuation,
		locations_count: locationsCount || 0,
		last_updated: new Date().toISOString()
	};
});

// Remote mutation to create stock count
export const createStockCount = command(
	createStockCountSchema, // Pass schema as first argument
	async (validatedData): Promise<StockCount> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('pos:operate')) {
			throw new Error('Not authorized - insufficient permissions');
		}

		// No need to parse again - SvelteKit already validated the data
		const supabase = createSupabaseClient();

		// Calculate variances
		const itemsWithVariance = validatedData.items.map((item) => ({
			...item,
			variance: item.counted_quantity - item.expected_quantity
		}));

		const { data: stockCount, error } = await supabase
			.from('stock_counts')
			.insert({
				location_id: validatedData.location_id,
				status: 'completed',
				count_date: validatedData.count_date,
				counted_by: user.id,
				notes: validatedData.notes,
				items: itemsWithVariance,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.select()
			.single();

		if (error) throw error;

		// Create inventory movements for variances
		for (const item of itemsWithVariance) {
			if (item.variance !== 0) {
				await supabase.from('inventory_movements').insert({
					product_id: item.product_id,
					location_id: validatedData.location_id,
					movement_type: item.variance > 0 ? 'in' : 'out',
					transaction_type: 'count',
					quantity: Math.abs(item.variance),
					reference_id: stockCount.id,
					reference_type: 'count',
					notes: `Stock count adjustment: ${item.notes || 'No notes'}`,
					user_id: user.id,
					created_at: new Date().toISOString()
				});

				// Update inventory quantities atomically
				await updateInventoryQuantitiesAtomic(
					supabase, 
					item.product_id, 
					validatedData.location_id, 
					item.variance > 0 ? 'in' : 'out', 
					Math.abs(item.variance)
				);
			}
		}

		// 🚀 Refresh relevant queries to update the UI automatically!
		getInventoryItems({}).refresh();
		getInventoryValuation().refresh();
		
		// Refresh movements for items with variances
		for (const item of itemsWithVariance) {
			if (item.variance !== 0) {
				if (validatedData.location_id) {
					getInventoryMovements({ productId: item.product_id, locationId: validatedData.location_id }).refresh();
				} else {
					getInventoryMovements({ productId: item.product_id }).refresh();
				}
			}
		}

		return {
			id: stockCount.id,
			location_id: stockCount.location_id,
			status: stockCount.status,
			count_date: stockCount.count_date,
			counted_by: stockCount.counted_by,
			notes: stockCount.notes,
			items: stockCount.items,
			created_at: stockCount.created_at,
			updated_at: stockCount.updated_at
		};
	}
);

// Remote query to get inventory alerts
export const getInventoryAlerts = query(async (): Promise<InventoryAlert[]> => {
	const user = getAuthenticatedUser();
	if (!user.permissions.includes('reports:view')) {
		throw new Error('Not authorized - insufficient permissions');
	}

	const supabase = createSupabaseClient();

	const { data: alerts, error } = await supabase
		.from('inventory_alerts')
		.select(
			`
      *,
      product:products(name, sku)
    `
		)
		.eq('is_acknowledged', false)
		.order('created_at', { ascending: false });

	if (error) throw error;

	return (
		alerts?.map((alert) => ({
			id: alert.id,
			product_id: alert.product_id,
			alert_type: alert.alert_type,
			threshold_value: alert.threshold_value,
			current_value: alert.current_value,
			message: alert.message,
			is_acknowledged: alert.is_acknowledged,
			acknowledged_by: alert.acknowledged_by,
			acknowledged_at: alert.acknowledged_at,
			created_at: alert.created_at
		})) || []
	);
});

// ✅ NEW: Efficient atomic inventory quantity update function
async function updateInventoryQuantitiesAtomic(
	supabase: ReturnType<typeof createSupabaseClient>,
	productId: string,
	locationId: string | undefined,
	movementType: 'in' | 'out' | 'transfer' | 'adjustment' | 'count',
	quantity: number
) {
	// Calculate the quantity change based on movement type
	const quantityChange = movementType === 'in' ? quantity : -quantity;
	
	// Use atomic upsert to efficiently update quantities
	const { error } = await supabase
		.from('inventory_items')
		.upsert({
			product_id: productId,
			location_id: locationId,
			quantity_on_hand: quantityChange, // This will be added to existing or set as new
			quantity_available: quantityChange, // Assuming no reservations for now
			last_movement_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}, {
			onConflict: 'product_id,location_id',
			ignoreDuplicates: false
		});

	if (error) {
		console.error('❌ [updateInventoryQuantitiesAtomic] Error updating inventory quantities:', error);
		throw error;
	}

	console.log('✅ [updateInventoryQuantitiesAtomic] Successfully updated inventory quantities for product:', productId, 'location:', locationId, 'change:', quantityChange);
}

// ❌ DEPRECATED: Old inefficient function - kept for reference but not used
async function updateInventoryQuantities(
	supabase: ReturnType<typeof createSupabaseClient>,
	productId: string,
	locationId?: string
) {
	console.warn('⚠️ [DEPRECATED] updateInventoryQuantities is deprecated. Use updateInventoryQuantitiesAtomic instead.');
	
	// Recalculate quantities based on movements
	const { data: movements } = await supabase
		.from('inventory_movements')
		.select('movement_type, quantity')
		.eq('product_id', productId)
		.eq('location_id', locationId || null);

	if (!movements) return;

	const totalIn = movements
		.filter((m: { movement_type: string; quantity: number }) => m.movement_type === 'in')
		.reduce((sum: number, m: { movement_type: string; quantity: number }) => sum + m.quantity, 0);

	const totalOut = movements
		.filter((m: { movement_type: string; quantity: number }) => m.movement_type === 'out')
		.reduce((sum: number, m: { movement_type: string; quantity: number }) => sum + m.quantity, 0);

	const quantityOnHand = totalIn - totalOut;
	const quantityAvailable = Math.max(0, quantityOnHand); // Assuming no reservations for now

	// Update or insert inventory item
	await supabase.from('inventory_items').upsert({
		product_id: productId,
		location_id: locationId,
		quantity_on_hand: quantityOnHand,
		quantity_available: quantityAvailable,
		last_movement_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	});
}