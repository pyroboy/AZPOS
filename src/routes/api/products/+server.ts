import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createSupabaseClient } from '$lib/server/db';
import { productFiltersSchema } from '$lib/types/product.schema';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication - for testing, we'll make this optional
	console.log('🔍 [API] GET /api/products called');
	console.log('🔍 [API] User from locals:', locals?.user?.id || 'No user');

	// Parse query parameters
	const filters = {};
	url.searchParams.forEach((value, key) => {
		// Convert string values to appropriate types
		if (key === 'page' || key === 'limit') {
			filters[key] = parseInt(value, 10);
		} else if (key === 'is_active' || key === 'is_archived' || key === 'is_bundle' || key === 'low_stock' || key === 'out_of_stock') {
			filters[key] = value === 'true';
		} else if (key === 'price_min' || key === 'price_max') {
			filters[key] = parseFloat(value);
		} else {
			filters[key] = value;
		}
	});

	console.log('🔍 [API] Parsed filters:', filters);

	const supabase = createSupabaseClient();

	// Parse and validate filters with defaults
	const page = filters.page || 1;
	const limit = filters.limit || 20;
	const offset = (page - 1) * limit;

	// Build query with filters
	let query = supabase.from('products').select(
		`*,
		category:categories(id, name),
		supplier:suppliers(id, name)`,
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

	if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
		query = query.overlaps('tags', filters.tags);
	}

	// Apply sorting
	const sortBy = filters.sort_by || 'name';
	const sortOrder = filters.sort_order || 'asc';
	query = query.order(sortBy, { ascending: sortOrder === 'asc' });

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	console.log('🔍 [API] Executing query...');
	const { data: products, error: queryError, count } = await query;

	console.log('📊 [API] Products query result:', {
		productsCount: products?.length || 0,
		totalCount: count,
		hasError: !!queryError,
		errorMessage: queryError?.message
	});

	if (queryError) {
		console.error('🚨 [API] Products query error:', queryError);
		throw error(500, queryError.message);
	}

	const totalPages = Math.ceil((count || 0) / limit);

	return json({
		products: products?.map((product) => ({
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
	});
};
