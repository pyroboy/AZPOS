import { createSupabaseClient } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	console.log('🏠 [SERVER] Inventory page server load started');
	
	// Ensure user is authenticated
	if (!locals.user) {
		console.log('🚫 [SERVER] No authenticated user found');
		return {
			products: {
				products: [],
				pagination: { page: 1, limit: 20, total: 0, total_pages: 0, has_more: false }
			}
		};
	}

	console.log('👤 [SERVER] Authenticated user:', locals.user.id);
	const supabase = createSupabaseClient();

	console.log('🔍 [SERVER] Starting Supabase query for products...');
	
	// First, let's check if there are ANY products in the database
	const { data: allProducts, error: allError, count: allCount } = await supabase
		.from('products')
		.select('id, name, is_active, is_archived', { count: 'exact' })
		.limit(5);
	
	console.log('🔍 [SERVER] All products check:', {
		allProductsCount: allProducts?.length || 0,
		totalInDb: allCount,
		first5Products: allProducts?.map(p => ({ id: p.id, name: p.name, is_active: p.is_active, is_archived: p.is_archived })),
		allError: allError?.message
	});
	
	// Now run the filtered query
	// Load active products for initial render using direct Supabase call
	const { data: products, error, count } = await supabase
		.from('products')
		.select(
			`
			*,
			category:categories(id, name),
			supplier:suppliers(id, name)
			`,
			{ count: 'exact' }
		)
		.eq('is_active', true)
		.eq('is_archived', false)
		.order('name', { ascending: true })
		.limit(50); // Limit initial load for performance
	
	console.log('🔍 [SERVER] Filtered query filters applied:', {
		is_active: true,
		is_archived: false,
		limit: 50
	});

	console.log('📊 [SERVER] Supabase query results:', {
		productsCount: products?.length || 0,
		totalCount: count,
		hasError: !!error,
		errorMessage: error?.message
	});

	if (error) {
		console.error('🚨 [SERVER] Error loading products:', error);
		return {
			products: {
				products: [],
				pagination: { page: 1, limit: 20, total: 0, total_pages: 0, has_more: false }
			}
		};
	}

	// Transform to match expected format
	console.log('🔄 [SERVER] Transforming products data...');
	const transformedProducts = products?.map((product) => ({
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
	})) || [];

	console.log('✅ [SERVER] Products transformation complete. Count:', transformedProducts.length);

	const result = {
		products: {
			products: transformedProducts,
			pagination: {
				page: 1,
				limit: 50,
				total: count || 0,
				total_pages: Math.ceil((count || 0) / 50),
				has_more: (count || 0) > 50
			}
		}
	};

	console.log('🎯 [SERVER] Final result prepared:', {
		productsCount: result.products.products.length,
		total: result.products.pagination.total,
		totalPages: result.products.pagination.total_pages
	});

	return result;
};
