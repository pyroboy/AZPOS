import { getContext } from 'telefunc';
import {
	salesReportFiltersSchema,
	type SalesItem,
	type SalesReportFilters,
	type PaginatedSalesReport,
	type SalesStats,
	type SalesSummary,
	type ProductPerformance
} from '$lib/types/sales.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper function to transform inventory adjustments to sales items
function transformAdjustmentToSaleItem(adjustment: any, product: any): SalesItem {
	return {
		id: adjustment.id,
		product_id: adjustment.product_id,
		product_name: product?.name ?? 'Unknown Product',
		product_sku: product?.sku,
		quantity: Math.abs(adjustment.quantity_adjusted),
		price_per_unit: product?.price ?? 0,
		total_amount: product ? Math.abs(adjustment.quantity_adjusted) * product.price : 0,
		batch_id: adjustment.batch_id,
		adjustment_id: adjustment.id,
		sale_date: adjustment.created_at,
		user_id: adjustment.user_id,
		reason: adjustment.reason
	};
}

// Telefunc to get paginated sales report with filters
export async function onGetSalesReport(
	filters?: SalesReportFilters
): Promise<PaginatedSalesReport> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();
	const validatedFilters = filters ? salesReportFiltersSchema.parse(filters) : {};

	const page = validatedFilters.page || 1;
	const limit = validatedFilters.limit || 20;
	const offset = (page - 1) * limit;

	// Build query for inventory adjustments that represent sales
	let adjustmentsQuery = supabase
		.from('inventory_adjustments')
		.select('*', { count: 'exact' })
		.eq('adjustment_type', 'subtract')
		.like('reason', 'Sale%');

	// Apply filters
	if (validatedFilters.date_from) {
		adjustmentsQuery = adjustmentsQuery.gte('created_at', validatedFilters.date_from);
	}

	if (validatedFilters.date_to) {
		adjustmentsQuery = adjustmentsQuery.lte('created_at', validatedFilters.date_to);
	}

	if (validatedFilters.product_id) {
		adjustmentsQuery = adjustmentsQuery.eq('product_id', validatedFilters.product_id);
	}

	if (validatedFilters.user_id) {
		adjustmentsQuery = adjustmentsQuery.eq('user_id', validatedFilters.user_id);
	}

	if (validatedFilters.search) {
		adjustmentsQuery = adjustmentsQuery.or(`reason.ilike.%${validatedFilters.search}%`);
	}

	// Apply sorting
	const sortBy = validatedFilters.sort_by || 'sale_date';
	const sortOrder = validatedFilters.sort_order || 'desc';

	// Map sort fields to database columns
	const sortMapping: Record<string, string> = {
		sale_date: 'created_at',
		quantity: 'quantity_adjusted',
		product_name: 'product_id', // Will sort by product after joining
		price_per_unit: 'product_id', // Will sort by product price after joining
		total_amount: 'product_id' // Will sort by calculated total after joining
	};

	adjustmentsQuery = adjustmentsQuery.order(sortMapping[sortBy] || 'created_at', {
		ascending: sortOrder === 'asc'
	});

	// Apply pagination
	adjustmentsQuery = adjustmentsQuery.range(offset, offset + limit - 1);

	const { data: adjustments, error: adjustmentsError, count } = await adjustmentsQuery;
	if (adjustmentsError) throw adjustmentsError;

	// Get unique product IDs for batch fetch
	const productIds = Array.from(new Set(adjustments?.map((adj) => adj.product_id) || []));

	// Fetch products for the adjustments
	const { data: products, error: productsError } = await supabase
		.from('products')
		.select('id, name, sku, price')
		.in('id', productIds);

	if (productsError) throw productsError;

	// Create a product lookup map
	const productMap = new Map(products?.map((p) => [p.id, p]) || []);

	// Transform adjustments to sales items
	const salesItems: SalesItem[] = (adjustments || [])
		.map((adjustment) =>
			transformAdjustmentToSaleItem(adjustment, productMap.get(adjustment.product_id))
		)
		.filter((item) => item.total_amount > 0); // Filter out items with no valid price

	// Apply client-side sorting for complex fields if needed
	if (sortBy === 'product_name') {
		salesItems.sort((a, b) => {
			const comparison = a.product_name.localeCompare(b.product_name);
			return sortOrder === 'asc' ? comparison : -comparison;
		});
	} else if (sortBy === 'price_per_unit') {
		salesItems.sort((a, b) => {
			const comparison = a.price_per_unit - b.price_per_unit;
			return sortOrder === 'asc' ? comparison : -comparison;
		});
	} else if (sortBy === 'total_amount') {
		salesItems.sort((a, b) => {
			const comparison = a.total_amount - b.total_amount;
			return sortOrder === 'asc' ? comparison : -comparison;
		});
	}

	// Apply search filter on product name if needed
	let filteredSalesItems = salesItems;
	if (validatedFilters.search && validatedFilters.product_name) {
		filteredSalesItems = salesItems.filter(
			(item) =>
				item.product_name.toLowerCase().includes(validatedFilters.search!.toLowerCase()) ||
				(item.product_sku &&
					item.product_sku.toLowerCase().includes(validatedFilters.search!.toLowerCase()))
		);
	}

	const totalPages = Math.ceil((count || 0) / limit);

	return {
		sales: filteredSalesItems,
		pagination: {
			page,
			limit,
			total: count || 0,
			total_pages: totalPages,
			has_more: page < totalPages
		}
	};
}

// Telefunc to get sales statistics
export async function onGetSalesStats(dateFrom?: string, dateTo?: string): Promise<SalesStats> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	// Build query for sales adjustments
	let adjustmentsQuery = supabase
		.from('inventory_adjustments')
		.select('*, products(id, name, sku, price)')
		.eq('adjustment_type', 'subtract')
		.like('reason', 'Sale%');

	if (dateFrom) {
		adjustmentsQuery = adjustmentsQuery.gte('created_at', dateFrom);
	}

	if (dateTo) {
		adjustmentsQuery = adjustmentsQuery.lte('created_at', dateTo);
	}

	const { data: adjustments, error } = await adjustmentsQuery;
	if (error) throw error;

	// Transform and calculate statistics
	const salesData = (adjustments || [])
		.map((adjustment) => ({
			...adjustment,
			quantity: Math.abs(adjustment.quantity_adjusted),
			total_amount: adjustment.products
				? Math.abs(adjustment.quantity_adjusted) * adjustment.products.price
				: 0
		}))
		.filter((sale) => sale.total_amount > 0);

	const stats = {
		total_revenue: salesData.reduce((sum, sale) => sum + sale.total_amount, 0),
		total_transactions: salesData.length,
		total_items_sold: salesData.reduce((sum, sale) => sum + sale.quantity, 0),
		average_transaction_value: 0,
		average_items_per_transaction: 0,
		unique_products_sold: new Set(salesData.map((sale) => sale.product_id)).size,
		date_range: {
			from: dateFrom,
			to: dateTo
		}
	};

	// Calculate averages
	stats.average_transaction_value =
		stats.total_transactions > 0 ? stats.total_revenue / stats.total_transactions : 0;
	stats.average_items_per_transaction =
		stats.total_transactions > 0 ? stats.total_items_sold / stats.total_transactions : 0;

	// Calculate top selling products
	const productStats = new Map<
		string,
		{
			product_id: string;
			product_name: string;
			product_sku?: string;
			quantity_sold: number;
			revenue: number;
		}
	>();

	salesData.forEach((sale) => {
		const existing = productStats.get(sale.product_id);
		if (existing) {
			existing.quantity_sold += sale.quantity;
			existing.revenue += sale.total_amount;
		} else {
			productStats.set(sale.product_id, {
				product_id: sale.product_id,
				product_name: sale.products?.name || 'Unknown Product',
				product_sku: sale.products?.sku,
				quantity_sold: sale.quantity,
				revenue: sale.total_amount
			});
		}
	});

	const topSellingProducts = Array.from(productStats.values())
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 10)
		.map((product) => ({
			...product,
			percentage_of_total:
				stats.total_revenue > 0 ? (product.revenue / stats.total_revenue) * 100 : 0
		}));

	return {
		...stats,
		top_selling_products: topSellingProducts
	};
}

// Telefunc to get sales summary for different periods
export async function onGetSalesSummary(
	period: 'today' | 'week' | 'month' | 'year' | 'custom' = 'today',
	customFrom?: string,
	customTo?: string
): Promise<SalesSummary> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	// Calculate date range based on period
	const now = new Date();
	let dateFrom: string;
	let dateTo: string = now.toISOString();

	switch (period) {
		case 'today':
			dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
			break;
		case 'week':
			const weekStart = new Date(now);
			weekStart.setDate(now.getDate() - now.getDay());
			weekStart.setHours(0, 0, 0, 0);
			dateFrom = weekStart.toISOString();
			break;
		case 'month':
			dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
			break;
		case 'year':
			dateFrom = new Date(now.getFullYear(), 0, 1).toISOString();
			break;
		case 'custom':
			if (!customFrom || !customTo) {
				throw new Error('Custom period requires both from and to dates');
			}
			dateFrom = customFrom;
			dateTo = customTo;
			break;
	}

	const stats = await onGetSalesStats(dateFrom, dateTo);

	return {
		period,
		revenue: stats.total_revenue,
		transaction_count: stats.total_transactions,
		items_sold: stats.total_items_sold,
		unique_products: stats.unique_products_sold,
		average_transaction_value: stats.average_transaction_value,
		date_range: {
			from: dateFrom,
			to: dateTo
		}
	};
}

// Telefunc to get product performance data
export async function onGetProductPerformance(
	dateFrom?: string,
	dateTo?: string,
	limit: number = 50
): Promise<ProductPerformance[]> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	// Build query for sales adjustments with product data
	let adjustmentsQuery = supabase
		.from('inventory_adjustments')
		.select(
			`
      *,
      products(id, name, sku, price, categories(name))
    `
		)
		.eq('adjustment_type', 'subtract')
		.like('reason', 'Sale%');

	if (dateFrom) {
		adjustmentsQuery = adjustmentsQuery.gte('created_at', dateFrom);
	}

	if (dateTo) {
		adjustmentsQuery = adjustmentsQuery.lte('created_at', dateTo);
	}

	const { data: adjustments, error } = await adjustmentsQuery;
	if (error) throw error;

	// Calculate totals for percentage calculation
	const totalRevenue = (adjustments || []).reduce((sum, adj) => {
		const amount = adj.products ? Math.abs(adj.quantity_adjusted) * adj.products.price : 0;
		return sum + amount;
	}, 0);

	const totalQuantity = (adjustments || []).reduce(
		(sum, adj) => sum + Math.abs(adj.quantity_adjusted),
		0
	);

	// Group by product and calculate performance metrics
	const productPerformance = new Map<
		string,
		{
			product_id: string;
			product_name: string;
			product_sku?: string;
			category_name?: string;
			total_quantity_sold: number;
			total_revenue: number;
			transaction_count: number;
			first_sale_date?: string;
			last_sale_date?: string;
			prices: number[];
		}
	>();

	(adjustments || []).forEach((adjustment) => {
		if (!adjustment.products) return;

		const productId = adjustment.product_id;
		const quantity = Math.abs(adjustment.quantity_adjusted);
		const revenue = quantity * adjustment.products.price;

		const existing = productPerformance.get(productId);
		if (existing) {
			existing.total_quantity_sold += quantity;
			existing.total_revenue += revenue;
			existing.transaction_count += 1;
			existing.prices.push(adjustment.products.price);
			existing.last_sale_date = adjustment.created_at;
			if (!existing.first_sale_date || adjustment.created_at < existing.first_sale_date) {
				existing.first_sale_date = adjustment.created_at;
			}
		} else {
			productPerformance.set(productId, {
				product_id: productId,
				product_name: adjustment.products.name,
				product_sku: adjustment.products.sku,
				category_name: adjustment.products.categories?.name,
				total_quantity_sold: quantity,
				total_revenue: revenue,
				transaction_count: 1,
				first_sale_date: adjustment.created_at,
				last_sale_date: adjustment.created_at,
				prices: [adjustment.products.price]
			});
		}
	});

	// Convert to final format with calculated metrics
	const performanceList: ProductPerformance[] = Array.from(productPerformance.values())
		.map((perf) => ({
			product_id: perf.product_id,
			product_name: perf.product_name,
			product_sku: perf.product_sku,
			category_name: perf.category_name,
			total_quantity_sold: perf.total_quantity_sold,
			total_revenue: perf.total_revenue,
			average_price: perf.prices.reduce((sum, price) => sum + price, 0) / perf.prices.length,
			transaction_count: perf.transaction_count,
			first_sale_date: perf.first_sale_date,
			last_sale_date: perf.last_sale_date,
			revenue_percentage: totalRevenue > 0 ? (perf.total_revenue / totalRevenue) * 100 : 0,
			quantity_percentage: totalQuantity > 0 ? (perf.total_quantity_sold / totalQuantity) * 100 : 0
		}))
		.sort((a, b) => b.total_revenue - a.total_revenue)
		.slice(0, limit);

	return performanceList;
}
