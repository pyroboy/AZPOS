import { getContext } from 'telefunc';
import {
	supplierInputSchema,
	supplierFiltersSchema,
	type Supplier,
	type SupplierFilters,
	type SupplierStats,
	type PaginatedSuppliers,
	type SupplierPerformance,
	type SupplierProduct
} from '$lib/types/supplier.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get paginated suppliers with filters
export async function onGetSuppliers(filters?: SupplierFilters): Promise<PaginatedSuppliers> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	console.log('🔍 [TELEFUNC] Fetching suppliers with filters:', filters);

	const supabase = createSupabaseClient();
	const validatedFilters = filters ? supplierFiltersSchema.parse(filters) : {};

	const page = validatedFilters.page || 1;
	const limit = validatedFilters.limit || 20;
	const offset = (page - 1) * limit;

	let query = supabase.from('suppliers').select('*', { count: 'exact' });

	// Apply filters
	if (validatedFilters.search) {
		query = query.or(
			`name.ilike.%${validatedFilters.search}%,code.ilike.%${validatedFilters.search}%,email.ilike.%${validatedFilters.search}%`
		);
	}

	if (validatedFilters.is_active !== undefined) {
		query = query.eq('is_active', validatedFilters.is_active);
	}

	if (validatedFilters.payment_terms) {
		query = query.eq('payment_terms', validatedFilters.payment_terms);
	}

	if (validatedFilters.tags && validatedFilters.tags.length > 0) {
		query = query.overlaps('tags', validatedFilters.tags);
	}

	if (validatedFilters.has_products) {
		// Get supplier IDs that have products
		const { data: supplierIds } = await supabase
			.from('products')
			.select('supplier_id')
			.not('supplier_id', 'is', null);

		const uniqueSupplierIds = [
			...new Set(supplierIds?.map((p) => p.supplier_id).filter(Boolean) || [])
		];

		if (uniqueSupplierIds.length > 0) {
			query = query.in('id', uniqueSupplierIds);
		} else {
			// If no suppliers have products, return empty result
			query = query.eq('id', 'no-match');
		}
	}

	// Apply sorting
	const sortBy = validatedFilters.sort_by || 'name';
	const sortOrder = validatedFilters.sort_order || 'asc';
	query = query.order(sortBy, { ascending: sortOrder === 'asc' });

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	const { data: suppliers, error, count } = await query;

	console.log('📊 [TELEFUNC] Suppliers query result:', {
		suppliersCount: suppliers?.length || 0,
		totalCount: count,
		hasError: !!error,
		errorMessage: error?.message
	});

	if (error) {
		console.error('🚨 [TELEFUNC] Suppliers query error:', error);
		throw error;
	}

	const totalPages = Math.ceil((count || 0) / limit);

	return {
		suppliers:
			suppliers?.map((supplier) => ({
				id: supplier.id,
				name: supplier.name,
				code: supplier.code,
				email: supplier.email,
				phone: supplier.phone,
				website: supplier.website,
				tax_id: supplier.tax_id,
				payment_terms: supplier.payment_terms,
				credit_limit: supplier.credit_limit,
				currency: supplier.currency,
				is_active: supplier.is_active,
				notes: supplier.notes,
				contacts: supplier.contacts,
				addresses: supplier.addresses,
				tags: supplier.tags,
				created_at: supplier.created_at,
				updated_at: supplier.updated_at,
				created_by: supplier.created_by,
				updated_by: supplier.updated_by
			})) || [],
		pagination: {
			page,
			limit,
			total: count || 0,
			total_pages: totalPages,
			has_more: page < totalPages
		}
	};
}

// Telefunc to get supplier by ID
export async function onGetSupplierById(supplierId: string): Promise<Supplier | null> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	const { data: supplier, error } = await supabase
		.from('suppliers')
		.select('*')
		.eq('id', supplierId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null;
		throw error;
	}

	return {
		id: supplier.id,
		name: supplier.name,
		code: supplier.code,
		email: supplier.email,
		phone: supplier.phone,
		website: supplier.website,
		tax_id: supplier.tax_id,
		payment_terms: supplier.payment_terms,
		credit_limit: supplier.credit_limit,
		currency: supplier.currency,
		is_active: supplier.is_active,
		notes: supplier.notes,
		contacts: supplier.contacts,
		addresses: supplier.addresses,
		tags: supplier.tags,
		created_at: supplier.created_at,
		updated_at: supplier.updated_at,
		created_by: supplier.created_by,
		updated_by: supplier.updated_by
	};
}

// Telefunc to create a new supplier
export async function onCreateSupplier(supplierData: unknown): Promise<Supplier> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const validatedData = supplierInputSchema.parse(supplierData);
	const supabase = createSupabaseClient();

	// Check if supplier code already exists
	const { data: existingSupplier } = await supabase
		.from('suppliers')
		.select('id')
		.eq('code', validatedData.code)
		.single();

	if (existingSupplier) {
		throw new Error('Supplier with this code already exists');
	}

	const { data: newSupplier, error } = await supabase
		.from('suppliers')
		.insert({
			...validatedData,
			created_by: user.id,
			updated_by: user.id,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.select()
		.single();

	if (error) throw error;

	return {
		id: newSupplier.id,
		name: newSupplier.name,
		code: newSupplier.code,
		email: newSupplier.email,
		phone: newSupplier.phone,
		website: newSupplier.website,
		tax_id: newSupplier.tax_id,
		payment_terms: newSupplier.payment_terms,
		credit_limit: newSupplier.credit_limit,
		currency: newSupplier.currency,
		is_active: newSupplier.is_active,
		notes: newSupplier.notes,
		contacts: newSupplier.contacts,
		addresses: newSupplier.addresses,
		tags: newSupplier.tags,
		created_at: newSupplier.created_at,
		updated_at: newSupplier.updated_at,
		created_by: newSupplier.created_by,
		updated_by: newSupplier.updated_by
	};
}

// Telefunc to update a supplier
export async function onUpdateSupplier(
	supplierId: string,
	supplierData: unknown
): Promise<Supplier> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const validatedData = supplierInputSchema.partial().parse(supplierData);
	const supabase = createSupabaseClient();

	// Check if supplier code already exists (if being updated)
	if (validatedData.code) {
		const { data: existingSupplier } = await supabase
			.from('suppliers')
			.select('id')
			.eq('code', validatedData.code)
			.neq('id', supplierId)
			.single();

		if (existingSupplier) {
			throw new Error('Supplier with this code already exists');
		}
	}

	const { data: updatedSupplier, error } = await supabase
		.from('suppliers')
		.update({
			...validatedData,
			updated_by: user.id,
			updated_at: new Date().toISOString()
		})
		.eq('id', supplierId)
		.select()
		.single();

	if (error) throw error;

	return {
		id: updatedSupplier.id,
		name: updatedSupplier.name,
		code: updatedSupplier.code,
		email: updatedSupplier.email,
		phone: updatedSupplier.phone,
		website: updatedSupplier.website,
		tax_id: updatedSupplier.tax_id,
		payment_terms: updatedSupplier.payment_terms,
		credit_limit: updatedSupplier.credit_limit,
		currency: updatedSupplier.currency,
		is_active: updatedSupplier.is_active,
		notes: updatedSupplier.notes,
		contacts: updatedSupplier.contacts,
		addresses: updatedSupplier.addresses,
		tags: updatedSupplier.tags,
		created_at: updatedSupplier.created_at,
		updated_at: updatedSupplier.updated_at,
		created_by: updatedSupplier.created_by,
		updated_by: updatedSupplier.updated_by
	};
}

// Telefunc to get supplier statistics
export async function onGetSupplierStats(): Promise<SupplierStats> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const supabase = createSupabaseClient();

	// Get supplier counts
	const { data: suppliers, error: suppliersError } = await supabase
		.from('suppliers')
		.select('id, is_active');

	if (suppliersError) throw suppliersError;

	const supplierStats = suppliers?.reduce(
		(acc, supplier) => {
			acc.total_suppliers++;
			if (supplier.is_active) acc.active_suppliers++;
			else acc.inactive_suppliers++;
			return acc;
		},
		{
			total_suppliers: 0,
			active_suppliers: 0,
			inactive_suppliers: 0
		}
	) || {
		total_suppliers: 0,
		active_suppliers: 0,
		inactive_suppliers: 0
	};

	// Get suppliers with products count
	const { data: suppliersWithProducts } = await supabase
		.from('products')
		.select('supplier_id')
		.not('supplier_id', 'is', null);

	const uniqueSupplierIds = new Set(suppliersWithProducts?.map((p) => p.supplier_id) || []);

	// Get purchase order statistics
	const { data: purchaseOrders } = await supabase
		.from('purchase_orders')
		.select('supplier_id, total_amount, status');

	const poStats = purchaseOrders?.reduce(
		(acc, po) => {
			acc.total_purchase_orders++;
			acc.total_purchase_value += po.total_amount;
			return acc;
		},
		{
			total_purchase_orders: 0,
			total_purchase_value: 0
		}
	) || {
		total_purchase_orders: 0,
		total_purchase_value: 0
	};

	// Calculate top suppliers by order value
	const supplierOrderMap = new Map();
	purchaseOrders?.forEach((po) => {
		if (!supplierOrderMap.has(po.supplier_id)) {
			supplierOrderMap.set(po.supplier_id, { order_count: 0, total_value: 0 });
		}
		const stats = supplierOrderMap.get(po.supplier_id);
		stats.order_count++;
		stats.total_value += po.total_amount;
	});

	// Get supplier names for top suppliers
	const topSupplierIds = Array.from(supplierOrderMap.entries())
		.sort(([, a], [, b]) => b.total_value - a.total_value)
		.slice(0, 5)
		.map(([id]) => id);

	const { data: topSuppliersData } = await supabase
		.from('suppliers')
		.select('id, name')
		.in('id', topSupplierIds);

	const topSuppliers =
		topSuppliersData?.map((supplier) => ({
			id: supplier.id,
			name: supplier.name,
			order_count: supplierOrderMap.get(supplier.id)?.order_count || 0,
			total_value: supplierOrderMap.get(supplier.id)?.total_value || 0
		})) || [];

	return {
		...supplierStats,
		suppliers_with_products: uniqueSupplierIds.size,
		...poStats,
		avg_order_value:
			poStats.total_purchase_orders > 0
				? poStats.total_purchase_value / poStats.total_purchase_orders
				: 0,
		top_suppliers: topSuppliers
	};
}

// Telefunc to get supplier performance metrics
export async function onGetSupplierPerformance(
	supplierId: string,
	period: 'month' | 'quarter' | 'year'
): Promise<SupplierPerformance> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const supabase = createSupabaseClient();

	// Calculate date range based on period
	const now = new Date();
	let startDate: Date;

	switch (period) {
		case 'month':
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			break;
		case 'quarter': {
			const quarter = Math.floor(now.getMonth() / 3);
			startDate = new Date(now.getFullYear(), quarter * 3, 1);
			break;
		}
		case 'year':
			startDate = new Date(now.getFullYear(), 0, 1);
			break;
		default:
			// This should never happen due to TypeScript types, but ensures startDate is assigned
			startDate = new Date(now.getFullYear(), 0, 1);
			break;
	}

	// Get purchase orders for the period
	const { data: orders, error } = await supabase
		.from('purchase_orders')
		.select('status, total_amount, order_date, expected_delivery_date, actual_delivery_date')
		.eq('supplier_id', supplierId)
		.gte('order_date', startDate.toISOString());

	if (error) throw error;

	const performance = orders?.reduce(
		(acc, order) => {
			acc.total_orders++;
			acc.total_value += order.total_amount;

			if (order.status === 'cancelled') {
				acc.cancelled_orders++;
			} else if (order.actual_delivery_date && order.expected_delivery_date) {
				const expectedDate = new Date(order.expected_delivery_date);
				const actualDate = new Date(order.actual_delivery_date);

				if (actualDate <= expectedDate) {
					acc.on_time_deliveries++;
				} else {
					acc.late_deliveries++;
					const diffTime = actualDate.getTime() - expectedDate.getTime();
					const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
					acc.total_delay_days += diffDays;
				}
			}

			return acc;
		},
		{
			total_orders: 0,
			total_value: 0,
			on_time_deliveries: 0,
			late_deliveries: 0,
			cancelled_orders: 0,
			total_delay_days: 0
		}
	) || {
		total_orders: 0,
		total_value: 0,
		on_time_deliveries: 0,
		late_deliveries: 0,
		cancelled_orders: 0,
		total_delay_days: 0
	};

	const totalDeliveries = performance.on_time_deliveries + performance.late_deliveries;
	const averageDeliveryTime =
		totalDeliveries > 0 ? performance.total_delay_days / totalDeliveries : 0;

	return {
		supplier_id: supplierId,
		period,
		total_orders: performance.total_orders,
		total_value: performance.total_value,
		on_time_deliveries: performance.on_time_deliveries,
		late_deliveries: performance.late_deliveries,
		cancelled_orders: performance.cancelled_orders,
		average_delivery_time: averageDeliveryTime
	};
}

// Telefunc to get supplier products
export async function onGetSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	const { data: supplierProducts, error } = await supabase
		.from('supplier_products')
		.select(
			`
      *,
      product:products(name, sku)
    `
		)
		.eq('supplier_id', supplierId)
		.order('created_at', { ascending: false });

	if (error) throw error;

	return (
		supplierProducts?.map((sp) => ({
			id: sp.id,
			supplier_id: sp.supplier_id,
			product_id: sp.product_id,
			supplier_sku: sp.supplier_sku,
			supplier_name: sp.supplier_name,
			cost_price: sp.cost_price,
			minimum_order_quantity: sp.minimum_order_quantity,
			lead_time_days: sp.lead_time_days,
			is_preferred: sp.is_preferred,
			last_ordered_at: sp.last_ordered_at,
			created_at: sp.created_at,
			updated_at: sp.updated_at
		})) || []
	);
}

// Telefunc to delete a supplier (soft delete)
export async function onDeleteSupplier(supplierId: string): Promise<void> {
	const { user } = getContext();
	if (!user || user.role !== 'admin') {
		throw new Error('Not authorized - admin access required');
	}

	const supabase = createSupabaseClient();

	// Check if supplier has active purchase orders
	const { data: activePOs } = await supabase
		.from('purchase_orders')
		.select('id')
		.eq('supplier_id', supplierId)
		.in('status', ['draft', 'pending', 'approved', 'ordered', 'partially_received']);

	if (activePOs && activePOs.length > 0) {
		throw new Error('Cannot delete supplier with active purchase orders');
	}

	// Soft delete by deactivating
	const { error } = await supabase
		.from('suppliers')
		.update({
			is_active: false,
			updated_by: user.id,
			updated_at: new Date().toISOString()
		})
		.eq('id', supplierId);

	if (error) throw error;
}
