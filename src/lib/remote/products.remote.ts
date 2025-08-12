import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import {
	productInputSchema,
	productFiltersSchema,
	bulkProductUpdateSchema,
	stockAdjustmentSchema,
	updateProductSchema,
	bulkUpdateProductsSchema,
	adjustStockSchema,
	deleteProductSchema,
	type Product,
	type ProductFilters,
	type ProductMeta,
	type PaginatedProducts,
	type ProductInput
} from '$lib/types/product.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper to get authenticated user context (optional for read operations)
function getAuthenticatedUser(required = true) {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user && required) throw new Error('Not authenticated');
	return user;
}

// Remote query to get paginated products with filters
export const getProducts = query(
	productFiltersSchema.optional(), // Pass schema as first argument
	async (validatedFilters): Promise<PaginatedProducts> => {
		const user = getAuthenticatedUser(false); // Optional for read operations
		console.log('🔍 [REMOTE] Fetching products with validated filters:', validatedFilters);

		const supabase = createSupabaseClient();

		// No need to parse again - SvelteKit already validated the data
		const filters = validatedFilters || {};
		const page = filters.page || 1;
		const limit = filters.limit || 20;
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
		if (filters.search) {
			query = query.or(
				`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
			);
		}

		if (filters.category_id) {
			query = query.eq('category_id', filters.category_id);
		}

		if (filters.supplier_id) {
			query = query.eq('supplier_id', filters.supplier_id);
		}

		if (filters.is_active !== undefined) {
			query = query.eq('is_active', filters.is_active);
		}

		if (filters.is_archived !== undefined) {
			query = query.eq('is_archived', filters.is_archived);
		}

		if (filters.is_bundle !== undefined) {
			query = query.eq('is_bundle', filters.is_bundle);
		}

		if (filters.low_stock) {
			query = query.lt('stock_quantity', 'min_stock_level');
		}

		if (filters.out_of_stock) {
			query = query.eq('stock_quantity', 0);
		}

		if (filters.price_min !== undefined) {
			query = query.gte('selling_price', filters.price_min);
		}

		if (filters.price_max !== undefined) {
			query = query.lte('selling_price', filters.price_max);
		}

		if (filters.tags && filters.tags.length > 0) {
			query = query.overlaps('tags', filters.tags);
		}

		// Apply sorting
		const sortBy = filters.sort_by || 'name';
		const sortOrder = filters.sort_order || 'asc';
		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		// Execute query
		const { data: products, error, count } = await query;

		if (error) {
			console.error('❌ [REMOTE] Error fetching products:', error);
			throw error;
		}

		// Calculate pagination info
		const totalPages = Math.ceil((count || 0) / limit);

		// Transform products to match schema
		const transformedProducts =
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
				reorder_point: product.reorder_point,
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
				aisle_location: product.aisle_location,
				created_at: product.created_at,
				updated_at: product.updated_at,
				created_by: product.created_by,
				updated_by: product.updated_by
			})) || [];

		// Get category and supplier counts for meta
		const { count: categoriesCount } = await supabase
			.from('categories')
			.select('*', { count: 'exact', head: true });

		const { count: suppliersCount } = await supabase
			.from('suppliers')
			.select('*', { count: 'exact', head: true });

		return {
			products: transformedProducts,
			pagination: {
				page,
				limit,
				total: count || 0,
				total_pages: totalPages,
				has_more: page < totalPages
			},
			meta: {
				total_products: count || 0,
				active_products: transformedProducts.filter((p) => p.is_active && !p.is_archived).length,
				archived_products: transformedProducts.filter((p) => p.is_archived).length,
				bundle_products: transformedProducts.filter((p) => p.is_bundle).length,
				total_inventory_value: transformedProducts.reduce(
					(sum, p) => sum + p.cost_price * p.stock_quantity,
					0
				),
				potential_revenue: transformedProducts.reduce(
					(sum, p) => sum + p.selling_price * p.stock_quantity,
					0
				),
				low_stock_count: transformedProducts.filter(
					(p) => p.stock_quantity < (p.reorder_point || p.min_stock_level || 10)
				).length,
				out_of_stock_count: transformedProducts.filter((p) => p.stock_quantity === 0).length,
				categories_count: categoriesCount || 0,
				suppliers_count: suppliersCount || 0
			}
		};
	}
);

// Remote query to get product by ID
export const getProductById = query(
	z.string(), // Pass schema as first argument
	async (productId): Promise<Product | null> => {
		const user = getAuthenticatedUser();
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
			reorder_point: product.reorder_point,
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
			aisle_location: product.aisle_location,
			created_at: product.created_at,
			updated_at: product.updated_at,
			created_by: product.created_by,
			updated_by: product.updated_by
		};
	}
);

// Remote query to get product meta information
export const getProductMeta = query(async (): Promise<ProductMeta> => {
	const user = getAuthenticatedUser();
	const supabase = createSupabaseClient();

	// Get product counts and calculations
	const { data: products, error } = await supabase
		.from('products')
		.select(
			'is_active, is_archived, is_bundle, cost_price, selling_price, stock_quantity, min_stock_level, reorder_point'
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
			else if (product.stock_quantity < (product.reorder_point || product.min_stock_level || 10)) {
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
			out_of_stock_count: 0,
			categories_count: 0,
			suppliers_count: 0
		}
	) || {
		total_products: 0,
		active_products: 0,
		archived_products: 0,
		bundle_products: 0,
		total_inventory_value: 0,
		potential_revenue: 0,
		low_stock_count: 0,
		out_of_stock_count: 0,
		categories_count: 0,
		suppliers_count: 0
	};

	// Get category and supplier counts
	const { count: categoriesCount } = await supabase
		.from('categories')
		.select('*', { count: 'exact', head: true });

	const { count: suppliersCount } = await supabase
		.from('suppliers')
		.select('*', { count: 'exact', head: true });

	return {
		...stats,
		categories_count: categoriesCount || 0,
		suppliers_count: suppliersCount || 0
	};
});

// Remote mutation to create a new product
export const createProduct = command(
	productInputSchema, // Pass schema as first argument
	async (validatedData): Promise<Product> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('products:write')) {
			throw new Error('Not authorized - insufficient permissions');
		}

		// No need to parse again - SvelteKit already validated the data
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
			reorder_point: newProduct.reorder_point,
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
			aisle_location: newProduct.aisle_location,
			created_at: newProduct.created_at,
			updated_at: newProduct.updated_at,
			created_by: newProduct.created_by,
			updated_by: newProduct.updated_by
		};
	}
);

// Remote mutation to update a product
export const updateProduct = command(
	updateProductSchema, // Pass schema as first argument
	async ({ productId, productData }): Promise<Product> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('products:write')) {
			throw new Error('Not authorized - insufficient permissions');
		}

		// No need to parse again - SvelteKit already validated the data
		const supabase = createSupabaseClient();

		// Check if SKU already exists (if being updated)
		if (productData.sku) {
			const { data: existingProduct } = await supabase
				.from('products')
				.select('id')
				.eq('sku', productData.sku)
				.neq('id', productId)
				.single();

			if (existingProduct) {
				throw new Error('Product with this SKU already exists');
			}
		}

		const { data: updatedProduct, error } = await supabase
			.from('products')
			.update({
				...productData,
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
			reorder_point: updatedProduct.reorder_point,
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
			aisle_location: updatedProduct.aisle_location,
			created_at: updatedProduct.created_at,
			updated_at: updatedProduct.updated_at,
			created_by: updatedProduct.created_by,
			updated_by: updatedProduct.updated_by
		};
	}
);

// Remote mutation for bulk product updates
export const bulkUpdateProducts = command(
	bulkUpdateProductsSchema, // Pass schema as first argument
	async ({ productIds, updates }): Promise<Product[]> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('products:write')) {
			throw new Error('Not authorized - insufficient permissions');
		}

		// No need to parse again - SvelteKit already validated the data
		const supabase = createSupabaseClient();

		const { data: updatedProducts, error } = await supabase
			.from('products')
			.update({
				...updates,
				updated_by: user.id,
				updated_at: new Date().toISOString()
			})
			.in('id', productIds)
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
				reorder_point: product.reorder_point,
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
				aisle_location: product.aisle_location,
				created_at: product.created_at,
				updated_at: product.updated_at,
				created_by: product.created_by,
				updated_by: product.updated_by
			})) || []
		);
	}
);

// Remote mutation for stock adjustment
export const adjustStock = command(
	adjustStockSchema, // Pass schema as first argument
	async ({ productId, adjustment, reason }): Promise<Product> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('products:write')) {
			throw new Error('Not authorized - insufficient permissions');
		}

		const supabase = createSupabaseClient();

		// Get current product
		const { data: product, error: fetchError } = await supabase
			.from('products')
			.select('stock_quantity')
			.eq('id', productId)
			.single();

		if (fetchError) throw fetchError;

		// Calculate new stock quantity
		const newQuantity = Math.max(0, product.stock_quantity + adjustment);

		// Update product stock
		const { data: updatedProduct, error } = await supabase
			.from('products')
			.update({
				stock_quantity: newQuantity,
				updated_by: user.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', productId)
			.select()
			.single();

		if (error) throw error;

		// Log stock transaction
		await supabase.from('stock_transactions').insert({
			product_id: productId,
			transaction_type: adjustment > 0 ? 'increase' : 'decrease',
			quantity: Math.abs(adjustment),
			previous_quantity: product.stock_quantity,
			new_quantity: newQuantity,
			reason: reason,
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
			reorder_point: updatedProduct.reorder_point,
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
			aisle_location: updatedProduct.aisle_location,
			created_at: updatedProduct.created_at,
			updated_at: updatedProduct.updated_at,
			created_by: updatedProduct.created_by,
			updated_by: updatedProduct.updated_by
		};
	}
);

// Remote mutation to delete a product (soft delete)
export const deleteProduct = command(
	deleteProductSchema, // Pass schema as first argument
	async ({ productId }): Promise<void> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('products:delete')) {
			throw new Error('Not authorized - insufficient permissions');
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
);
