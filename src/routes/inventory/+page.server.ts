import { createSupabaseClient } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	if (!locals.user) {
		return {
			products: {
				products: [],
				pagination: { page: 1, limit: 20, total: 0, total_pages: 0, has_more: false }
			}
		};
	}

	const supabase = createSupabaseClient();

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

	if (error) {
		console.error('Error loading products:', error);
		return {
			products: {
				products: [],
				pagination: { page: 1, limit: 20, total: 0, total_pages: 0, has_more: false }
			}
		};
	}

	// Transform to match expected format
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

	return {
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
};
