import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	onGetSalesReport,
	onGetSalesStats,
	onGetSalesSummary,
	onGetProductPerformance
} from '$lib/server/telefuncs/sales.telefunc';
import type {
	SalesItem,
	SalesReportFilters,
	PaginatedSalesReport,
	SalesStats,
	SalesSummary,
	ProductPerformance
} from '$lib/types/sales.schema';

const salesQueryKey = ['sales'];
const salesStatsQueryKey = ['sales-stats'];
const salesSummaryQueryKey = ['sales-summary'];
const productPerformanceQueryKey = ['product-performance'];

export function useSalesReports() {
	const queryClient = useQueryClient();

	// State for filters
	let filters = $state<SalesReportFilters>({
		page: 1,
		limit: 20,
		sort_by: 'sale_date',
		sort_order: 'desc'
	});

	// Query for paginated sales report
	const salesReportQuery = createQuery<PaginatedSalesReport>({
		queryKey: $derived([...salesQueryKey, filters]),
		queryFn: () => onGetSalesReport(filters)
	});

	// Query for sales statistics
	const statsQuery = createQuery<SalesStats>({
		queryKey: $derived([...salesStatsQueryKey, filters.date_from, filters.date_to]),
		queryFn: () => onGetSalesStats(filters.date_from, filters.date_to)
	});

	// Derived reactive state
	const salesItems = $derived(salesReportQuery.data?.sales || []);
	const pagination = $derived(salesReportQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Filtered sales items
	const todaysSales = $derived(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayString = today.toISOString();

		return salesItems.filter((sale: SalesItem) => {
			const saleDate = new Date(sale.sale_date);
			saleDate.setHours(0, 0, 0, 0);
			return saleDate.toISOString() === todayString;
		});
	});

	const thisWeekSales = $derived(() => {
		const now = new Date();
		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - now.getDay());
		weekStart.setHours(0, 0, 0, 0);

		return salesItems.filter((sale: SalesItem) => {
			const saleDate = new Date(sale.sale_date);
			return saleDate >= weekStart;
		});
	});

	const thisMonthSales = $derived(() => {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		return salesItems.filter((sale: SalesItem) => {
			const saleDate = new Date(sale.sale_date);
			return saleDate >= monthStart;
		});
	});

	// Sales by product aggregation
	const salesByProduct = $derived(() => {
		const productMap = new Map<
			string,
			{
				product_id: string;
				product_name: string;
				product_sku?: string;
				total_quantity: number;
				total_revenue: number;
				transaction_count: number;
				average_price: number;
			}
		>();

		salesItems.forEach((sale: SalesItem) => {
			const existing = productMap.get(sale.product_id);
			if (existing) {
				existing.total_quantity += sale.quantity;
				existing.total_revenue += sale.total_amount;
				existing.transaction_count += 1;
				existing.average_price = existing.total_revenue / existing.total_quantity;
			} else {
				productMap.set(sale.product_id, {
					product_id: sale.product_id,
					product_name: sale.product_name,
					product_sku: sale.product_sku,
					total_quantity: sale.quantity,
					total_revenue: sale.total_amount,
					transaction_count: 1,
					average_price: sale.price_per_unit
				});
			}
		});

		return Array.from(productMap.values()).sort((a, b) => b.total_revenue - a.total_revenue);
	});

	// Top selling products (from current view)
	const topSellingProducts = $derived(() => {
		return salesByProduct().slice(0, 10);
	});

	// Calculate totals for current view
	const currentViewTotals = $derived(() => {
		const total_revenue = salesItems.reduce(
			(sum: number, sale: SalesItem) => sum + sale.total_amount,
			0
		);
		const total_quantity = salesItems.reduce(
			(sum: number, sale: SalesItem) => sum + sale.quantity,
			0
		);
		const transaction_count = salesItems.length;
		const unique_products = new Set(salesItems.map((sale: SalesItem) => sale.product_id)).size;

		return {
			total_revenue,
			total_quantity,
			transaction_count,
			unique_products,
			average_transaction_value: transaction_count > 0 ? total_revenue / transaction_count : 0,
			average_items_per_transaction: transaction_count > 0 ? total_quantity / transaction_count : 0
		};
	});

	// Helper functions for filters
	function updateFilters(newFilters: Partial<SalesReportFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function resetFilters() {
		filters = {
			page: 1,
			limit: 20,
			sort_by: 'sale_date',
			sort_order: 'desc'
		};
	}

	function goToPage(page: number) {
		updateFilters({ page });
	}

	function setSearch(search: string) {
		updateFilters({ search: search || undefined, page: 1 });
	}

	function setProductFilter(product_id: string | undefined) {
		updateFilters({ product_id, page: 1 });
	}

	function setUserFilter(user_id: string | undefined) {
		updateFilters({ user_id, page: 1 });
	}

	function setDateRange(date_from?: string, date_to?: string) {
		updateFilters({ date_from, date_to, page: 1 });
	}

	function setSorting(
		sort_by: SalesReportFilters['sort_by'],
		sort_order: SalesReportFilters['sort_order']
	) {
		updateFilters({ sort_by, sort_order, page: 1 });
	}

	// Set predefined date ranges
	function setToday() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);

		setDateRange(today.toISOString(), tomorrow.toISOString());
	}

	function setThisWeek() {
		const now = new Date();
		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - now.getDay());
		weekStart.setHours(0, 0, 0, 0);

		setDateRange(weekStart.toISOString(), now.toISOString());
	}

	function setThisMonth() {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		setDateRange(monthStart.toISOString(), now.toISOString());
	}

	function setThisYear() {
		const now = new Date();
		const yearStart = new Date(now.getFullYear(), 0, 1);

		setDateRange(yearStart.toISOString(), now.toISOString());
	}

	// Sales summary hooks for different periods
	function useSalesSummary(
		period: 'today' | 'week' | 'month' | 'year' | 'custom' = 'today',
		customFrom?: string,
		customTo?: string
	) {
		return createQuery<SalesSummary>({
			queryKey: [...salesSummaryQueryKey, period, customFrom, customTo],
			queryFn: () => onGetSalesSummary(period, customFrom, customTo)
		});
	}

	// Product performance hook
	function useProductPerformance(dateFrom?: string, dateTo?: string, limit: number = 50) {
		return createQuery<ProductPerformance[]>({
			queryKey: [...productPerformanceQueryKey, dateFrom, dateTo, limit],
			queryFn: () => onGetProductPerformance(dateFrom, dateTo, limit)
		});
	}

	// Refresh functions
	function refreshSalesReport() {
		return queryClient.invalidateQueries({ queryKey: salesQueryKey });
	}

	function refreshStats() {
		return queryClient.invalidateQueries({ queryKey: salesStatsQueryKey });
	}

	function refreshAll() {
		return Promise.all([
			queryClient.invalidateQueries({ queryKey: salesQueryKey }),
			queryClient.invalidateQueries({ queryKey: salesStatsQueryKey }),
			queryClient.invalidateQueries({ queryKey: salesSummaryQueryKey }),
			queryClient.invalidateQueries({ queryKey: productPerformanceQueryKey })
		]);
	}

	// Export data for other components
	function exportSalesData(format: 'csv' | 'json' = 'csv') {
		if (format === 'csv') {
			const headers = [
				'Date',
				'Product Name',
				'SKU',
				'Quantity',
				'Unit Price',
				'Total Amount',
				'Reason'
			];
			const csvContent = [
				headers.join(','),
				...salesItems.map((sale) =>
					[
						new Date(sale.sale_date).toLocaleDateString(),
						`"${sale.product_name}"`,
						sale.product_sku || '',
						sale.quantity,
						sale.price_per_unit,
						sale.total_amount,
						`"${sale.reason || ''}"`
					].join(',')
				)
			].join('\n');

			const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			const url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', `sales-report-${new Date().toISOString().split('T')[0]}.csv`);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} else {
			const jsonContent = JSON.stringify(
				{
					sales: salesItems,
					stats: stats,
					totals: currentViewTotals,
					exported_at: new Date().toISOString()
				},
				null,
				2
			);

			const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
			const link = document.createElement('a');
			const url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', `sales-report-${new Date().toISOString().split('T')[0]}.json`);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	return {
		// Queries and their states
		salesReportQuery,
		statsQuery,

		// Reactive data
		salesItems,
		pagination,
		stats,

		// Filtered data
		todaysSales,
		thisWeekSales,
		thisMonthSales,
		salesByProduct,
		topSellingProducts,

		// Current filters and totals
		filters: $derived(filters),
		currentViewTotals,

		// Filter helpers
		updateFilters,
		resetFilters,
		goToPage,
		setSearch,
		setProductFilter,
		setUserFilter,
		setDateRange,
		setSorting,

		// Date range shortcuts
		setToday,
		setThisWeek,
		setThisMonth,
		setThisYear,

		// Additional hooks
		useSalesSummary,
		useProductPerformance,

		// Refresh functions
		refreshSalesReport,
		refreshStats,
		refreshAll,

		// Export function
		exportSalesData,

		// Loading states
		isLoading: $derived(salesReportQuery.isPending),
		isError: $derived(salesReportQuery.isError),
		error: $derived(salesReportQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
