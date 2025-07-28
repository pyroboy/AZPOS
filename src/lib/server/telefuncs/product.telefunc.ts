import { getContext } from 'telefunc';
import {
	productInputSchema,
	productFiltersSchema,
	bulkProductUpdateSchema,
	stockAdjustmentSchema,
	type Product,
	type ProductFilters,
	type ProductMeta,
	type PaginatedProducts
} from '$lib/types/product.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get paginated products with filters
export async function onGetProducts(filters?: ProductFilters): Promise<PaginatedProducts> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	// Parse and validate filters
	const validatedFilters = filters ? productFiltersSchema.parse(filters) : {};
	const page = validatedFilters.page || 1;
	const limit = validatedFilters.limit || 20;
	const offset = (page - 1) * limit;

	// Build query with filters
	let query = supabase.from('products').select(
		`
      *,
      category:categories(id, name),
      supplier:suppliers(id, name)
    `,
		{ count: 'exact' }
	);

	// Apply filters
	if (validatedFilters.search) {
		query = query.or(
			`name.ilike.%${validatedFilters.search}%,sku.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`
		);
	}

	if (validatedFilters.category_id) {
		query = query.eq('category_id', validatedFilters.category_id);
	}

	if (validatedFilters.supplier_id) {
		query = query.eq('supplier_id', validatedFilters.supplier_id);
	}

	if (validatedFilters.is_active !== undefined) {
		query = query.eq('is_active', validatedFilters.is_active);
	}

	if (validatedFilters.is_archived !== undefined) {
		query = query.eq('is_archived', validatedFilters.is_archived);
	}

	if (validatedFilters.is_bundle !== undefined) {
		query = query.eq('is_bundle', validatedFilters.is_bundle);
	}

	if (validatedFilters.low_stock) {
		query = query.lt('stock_quantity', 'min_stock_level');
	}

	if (validatedFilters.out_of_stock) {
		query = query.eq('stock_quantity', 0);
	}

	if (validatedFilters.price_min !== undefined) {
		query = query.gte('selling_price', validatedFilters.price_min);
	}

	if (validatedFilters.price_max !== undefined) {
		query = query.lte('selling_price', validatedFilters.price_max);
	}

	if (validatedFilters.tags && validatedFilters.tags.length > 0) {
		query = query.overlaps('tags', validatedFilters.tags);
	}

	// Apply sorting
	const sortBy = validatedFilters.sort_by || 'name';
	const sortOrder = validatedFilters.sort_order || 'asc';
	query = query.order(sortBy, { ascending: sortOrder === 'asc' });

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	const { data: products, error, count } = await query;
	if (error) throw error;

	const totalPages = Math.ceil((count || 0) / limit);

	return {
		products:
			products?.map((product) => ({
				id: product.id,
				name: product.name,
				sku: product.sku,
				description: product.description,
				category_id: product.category_id,
				supplier_id: product.supplier_id,
				cost_price: product.cost_price,
				selling_price: product.selling_price,
				stock_quantity: product.stock_quantity,
				min_stock_level: product.min_stock_level,
				max_stock_level: product.max_stock_level,
				barcode: product.barcode,
				image_url: product.image_url,
				is_active: product.is_active,
				is_archived: product.is_archived,
				is_bundle: product.is_bundle,
				bundle_components: product.bundle_components,
				tags: product.tags,
				weight: product.weight,
				dimensions: product.dimensions,
				tax_rate: product.tax_rate,
				discount_eligible: product.discount_eligible,
				track_inventory: product.track_inventory,
				created_at: product.created_at,
				updated_at: product.updated_at,
				created_by: product.created_by,
				updated_by: product.updated_by
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

// Telefunc to get product by ID
export async function onGetProductById(productId: string): Promise<Product | null> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	const { data: product, error } = await supabase
		.from('products')
		.select(
			`
      *,
      category:categories(id, name),
      supplier:suppliers(id, name)
    `
		)
		.eq('id', productId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null; // Not found
		throw error;
	}

	return {
		id: product.id,
		name: product.name,
		sku: product.sku,
		description: product.description,
		category_id: product.category_id,
		supplier_id: product.supplier_id,
		cost_price: product.cost_price,
		selling_price: product.selling_price,
		stock_quantity: product.stock_quantity,
		min_stock_level: product.min_stock_level,
		max_stock_level: product.max_stock_level,
		barcode: product.barcode,
		image_url: product.image_url,
		is_active: product.is_active,
		is_archived: product.is_archived,
		is_bundle: product.is_bundle,
		bundle_components: product.bundle_components,
		tags: product.tags,
		weight: product.weight,
		dimensions: product.dimensions,
		tax_rate: product.tax_rate,
		discount_eligible: product.discount_eligible,
		track_inventory: product.track_inventory,
		created_at: product.created_at,
		updated_at: product.updated_at,
		created_by: product.created_by,
		updated_by: product.updated_by
	};
}

// Telefunc to create a new product
export async function onCreateProduct(productData: unknown): Promise<Product> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const validatedData = productInputSchema.parse(productData);
	const supabase = createSupabaseClient();

	// Check if SKU already exists
	const { data: existingProduct } = await supabase
		.from('products')
		.select('id')
		.eq('sku', validatedData.sku)
		.single();

	if (existingProduct) {
		throw new Error('Product with this SKU already exists');
	}

	const { data: newProduct, error } = await supabase
		.from('products')
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
		id: newProduct.id,
		name: newProduct.name,
		sku: newProduct.sku,
		description: newProduct.description,
		category_id: newProduct.category_id,
		supplier_id: newProduct.supplier_id,
		cost_price: newProduct.cost_price,
		selling_price: newProduct.selling_price,
		stock_quantity: newProduct.stock_quantity,
		min_stock_level: newProduct.min_stock_level,
		max_stock_level: newProduct.max_stock_level,
		barcode: newProduct.barcode,
		image_url: newProduct.image_url,
		is_active: newProduct.is_active,
		is_archived: newProduct.is_archived,
		is_bundle: newProduct.is_bundle,
		bundle_components: newProduct.bundle_components,
		tags: newProduct.tags,
		weight: newProduct.weight,
		dimensions: newProduct.dimensions,
		tax_rate: newProduct.tax_rate,
		discount_eligible: newProduct.discount_eligible,
		track_inventory: newProduct.track_inventory,
		created_at: newProduct.created_at,
		updated_at: newProduct.updated_at,
		created_by: newProduct.created_by,
		updated_by: newProduct.updated_by
	};
}

// Telefunc to update a product
export async function onUpdateProduct(productId: string, productData: unknown): Promise<Product> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const validatedData = productInputSchema.partial().parse(productData);
	const supabase = createSupabaseClient();

	// Check if SKU already exists (if being updated)
	if (validatedData.sku) {
		const { data: existingProduct } = await supabase
			.from('products')
			.select('id')
			.eq('sku', validatedData.sku)
			.neq('id', productId)
			.single();

		if (existingProduct) {
			throw new Error('Product with this SKU already exists');
		}
	}

	const { data: updatedProduct, error } = await supabase
		.from('products')
		.update({
			...validatedData,
			updated_by: user.id,
			updated_at: new Date().toISOString()
		})
		.eq('id', productId)
		.select()
		.single();

	if (error) throw error;

	return {
		id: updatedProduct.id,
		name: updatedProduct.name,
		sku: updatedProduct.sku,
		description: updatedProduct.description,
		category_id: updatedProduct.category_id,
		supplier_id: updatedProduct.supplier_id,
		cost_price: updatedProduct.cost_price,
		selling_price: updatedProduct.selling_price,
		stock_quantity: updatedProduct.stock_quantity,
		min_stock_level: updatedProduct.min_stock_level,
		max_stock_level: updatedProduct.max_stock_level,
		barcode: updatedProduct.barcode,
		image_url: updatedProduct.image_url,
		is_active: updatedProduct.is_active,
		is_archived: updatedProduct.is_archived,
		is_bundle: updatedProduct.is_bundle,
		bundle_components: updatedProduct.bundle_components,
		tags: updatedProduct.tags,
		weight: updatedProduct.weight,
		dimensions: updatedProduct.dimensions,
		tax_rate: updatedProduct.tax_rate,
		discount_eligible: updatedProduct.discount_eligible,
		track_inventory: updatedProduct.track_inventory,
		created_at: updatedProduct.created_at,
		updated_at: updatedProduct.updated_at,
		created_by: updatedProduct.created_by,
		updated_by: updatedProduct.updated_by
	};
}

// Telefunc to get product meta information
export async function onGetProductMeta(): Promise<ProductMeta> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	// Get product counts and calculations
	const { data: products, error } = await supabase
		.from('products')
		.select(
			'is_active, is_archived, is_bundle, cost_price, selling_price, stock_quantity, min_stock_level'
		);

	if (error) throw error;

	const stats = products?.reduce(
		(acc, product) => {
			acc.total_products++;

			if (product.is_active && !product.is_archived) acc.active_products++;
			if (product.is_archived) acc.archived_products++;
			if (product.is_bundle) acc.bundle_products++;

			const inventoryValue = product.cost_price * product.stock_quantity;
			const potentialRevenue = product.selling_price * product.stock_quantity;

			acc.total_inventory_value += inventoryValue;
			acc.potential_revenue += potentialRevenue;

			if (product.stock_quantity === 0) acc.out_of_stock_count++;
			else if (product.min_stock_level && product.stock_quantity < product.min_stock_level) {
				acc.low_stock_count++;
			}

			return acc;
		},
		{
			total_products: 0,
			active_products: 0,
			archived_products: 0,
			bundle_products: 0,
			total_inventory_value: 0,
			potential_revenue: 0,
			low_stock_count: 0,
			out_of_stock_count: 0
		}
	) || {
		total_products: 0,
		active_products: 0,
		archived_products: 0,
		bundle_products: 0,
		total_inventory_value: 0,
		potential_revenue: 0,
		low_stock_count: 0,
		out_of_stock_count: 0
	};

	// Get categories and suppliers count
	const [{ count: categoriesCount }, { count: suppliersCount }] = await Promise.all([
		supabase.from('categories').select('*', { count: 'exact', head: true }),
		supabase.from('suppliers').select('*', { count: 'exact', head: true })
	]);

	return {
		...stats,
		categories_count: categoriesCount || 0,
		suppliers_count: suppliersCount || 0
	};
}

// Telefunc for bulk product updates
export async function onBulkUpdateProducts(updateData: unknown): Promise<Product[]> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const validatedData = bulkProductUpdateSchema.parse(updateData);
	const supabase = createSupabaseClient();

	const { data: updatedProducts, error } = await supabase
		.from('products')
		.update({
			...validatedData.updates,
			updated_by: user.id,
			updated_at: new Date().toISOString()
		})
		.in('id', validatedData.product_ids)
		.select();

	if (error) throw error;

	return (
		updatedProducts?.map((product) => ({
			id: product.id,
			name: product.name,
			sku: product.sku,
			description: product.description,
			category_id: product.category_id,
			supplier_id: product.supplier_id,
			cost_price: product.cost_price,
			selling_price: product.selling_price,
			stock_quantity: product.stock_quantity,
			min_stock_level: product.min_stock_level,
			max_stock_level: product.max_stock_level,
			barcode: product.barcode,
			image_url: product.image_url,
			is_active: product.is_active,
			is_archived: product.is_archived,
			is_bundle: product.is_bundle,
			bundle_components: product.bundle_components,
			tags: product.tags,
			weight: product.weight,
			dimensions: product.dimensions,
			tax_rate: product.tax_rate,
			discount_eligible: product.discount_eligible,
			track_inventory: product.track_inventory,
			created_at: product.created_at,
			updated_at: product.updated_at,
			created_by: product.created_by,
			updated_by: product.updated_by
		})) || []
	);
}

// Telefunc for stock adjustment
export async function onAdjustStock(adjustmentData: unknown): Promise<Product> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const validatedData = stockAdjustmentSchema.parse(adjustmentData);
	const supabase = createSupabaseClient();

	// Get current product
	const { data: product, error: fetchError } = await supabase
		.from('products')
		.select('stock_quantity')
		.eq('id', validatedData.product_id)
		.single();

	if (fetchError) throw fetchError;

	// Calculate new stock quantity
	let newQuantity: number;
	switch (validatedData.adjustment_type) {
		case 'increase':
			newQuantity = product.stock_quantity + validatedData.quantity;
			break;
		case 'decrease':
			newQuantity = Math.max(0, product.stock_quantity - validatedData.quantity);
			break;
		case 'set':
			newQuantity = validatedData.quantity;
			break;
	}

	// Update product stock
	const { data: updatedProduct, error } = await supabase
		.from('products')
		.update({
			stock_quantity: newQuantity,
			updated_by: user.id,
			updated_at: new Date().toISOString()
		})
		.eq('id', validatedData.product_id)
		.select()
		.single();

	if (error) throw error;

	// Log stock transaction
	await supabase.from('stock_transactions').insert({
		product_id: validatedData.product_id,
		transaction_type: validatedData.adjustment_type,
		quantity: validatedData.quantity,
		previous_quantity: product.stock_quantity,
		new_quantity: newQuantity,
		reason: validatedData.reason,
		notes: validatedData.notes,
		reference_id: validatedData.reference_id,
		user_id: user.id,
		created_at: new Date().toISOString()
	});

	return {
		id: updatedProduct.id,
		name: updatedProduct.name,
		sku: updatedProduct.sku,
		description: updatedProduct.description,
		category_id: updatedProduct.category_id,
		supplier_id: updatedProduct.supplier_id,
		cost_price: updatedProduct.cost_price,
		selling_price: updatedProduct.selling_price,
		stock_quantity: updatedProduct.stock_quantity,
		min_stock_level: updatedProduct.min_stock_level,
		max_stock_level: updatedProduct.max_stock_level,
		barcode: updatedProduct.barcode,
		image_url: updatedProduct.image_url,
		is_active: updatedProduct.is_active,
		is_archived: updatedProduct.is_archived,
		is_bundle: updatedProduct.is_bundle,
		bundle_components: updatedProduct.bundle_components,
		tags: updatedProduct.tags,
		weight: updatedProduct.weight,
		dimensions: updatedProduct.dimensions,
		tax_rate: updatedProduct.tax_rate,
		discount_eligible: updatedProduct.discount_eligible,
		track_inventory: updatedProduct.track_inventory,
		created_at: updatedProduct.created_at,
		updated_at: updatedProduct.updated_at,
		created_by: updatedProduct.created_by,
		updated_by: updatedProduct.updated_by
	};
}

// Telefunc to delete a product (soft delete)
export async function onDeleteProduct(productId: string): Promise<void> {
	const { user } = getContext();
	if (!user || user.role !== 'admin') {
		throw new Error('Not authorized - admin access required');
	}

	const supabase = createSupabaseClient();

	// Soft delete by archiving
	const { error } = await supabase
		.from('products')
		.update({
			is_archived: true,
			is_active: false,
			updated_by: user.id,
			updated_at: new Date().toISOString()
		})
		.eq('id', productId);

	if (error) throw error;
}
