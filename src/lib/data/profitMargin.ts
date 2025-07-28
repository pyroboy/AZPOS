import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	onGetProfitMarginReport,
	onGetProfitMarginReportByDateRange,
	onGetProductProfitMargin,
	type ProfitMarginReport
} from '$lib/server/telefuncs/profitMargin.telefunc';

// Query keys for consistent cache management
const profitMarginQueryKeys = {
	all: ['profitMargin'] as const,
	reports: () => [...profitMarginQueryKeys.all, 'report'] as const,
	report: () => [...profitMarginQueryKeys.reports()] as const,
	reportByDateRange: (startDate: string, endDate: string) =>
		[...profitMarginQueryKeys.reports(), 'dateRange', { startDate, endDate }] as const,
	productReport: (productId: string) =>
		[...profitMarginQueryKeys.reports(), 'product', productId] as const
};

/**
 * Hook for fetching complete profit margin report
 * Uses FIFO methodology to calculate profit margins
 */
export function useProfitMarginReport() {
	const queryClient = useQueryClient();

	// Query to fetch complete profit margin report
	const profitMarginQuery = createQuery<ProfitMarginReport>({
		queryKey: profitMarginQueryKeys.report(),
		queryFn: onGetProfitMarginReport,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		retry: 2,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// Derived reactive state using Svelte 5 runes
	const report = $derived(profitMarginQuery.data);
	const salesWithProfit = $derived(report?.salesWithProfit ?? []);

	// Derived totals and averages
	const totalRevenue = $derived(report?.totalRevenue ?? 0);
	const totalCogs = $derived(report?.totalCogs ?? 0);
	const totalProfit = $derived(report?.totalProfit ?? 0);
	const averageMargin = $derived(report?.averageMargin ?? 0);

	// Additional derived calculations
	const totalSales = $derived(salesWithProfit.length);
	const averageSaleAmount = $derived(totalSales > 0 ? totalRevenue / totalSales : 0);
	const averageProfitPerSale = $derived(totalSales > 0 ? totalProfit / totalSales : 0);

	// Top performing products by profit
	const topProfitableProducts = $derived(
		salesWithProfit
			.reduce(
				(acc: Array<{
					productName: string;
					productId: string;
					totalProfit: number;
					totalRevenue: number;
					totalCogs: number;
					salesCount: number;
					averageMargin: number;
				}>, sale: {
					productName: string;
					product_id: string;
					profit: number;
					revenue: number;
					costOfGoodsSold: number;
					profitMargin: number;
				}) => {
					const existing = acc.find((item) => item.productName === sale.productName);
					if (existing) {
						existing.totalProfit += sale.profit;
						existing.totalRevenue += sale.revenue;
						existing.totalCogs += sale.costOfGoodsSold;
						existing.salesCount += 1;
					} else {
						acc.push({
							productName: sale.productName,
							productId: sale.product_id,
							totalProfit: sale.profit,
							totalRevenue: sale.revenue,
							totalCogs: sale.costOfGoodsSold,
							salesCount: 1,
							averageMargin: sale.profitMargin
						});
					}
					return acc;
				},
				[] as Array<{
					productName: string;
					productId: string;
					totalProfit: number;
					totalRevenue: number;
					totalCogs: number;
					salesCount: number;
					averageMargin: number;
				}>
			)
			.map((item: {
				productName: string;
				productId: string;
				totalProfit: number;
				totalRevenue: number;
				totalCogs: number;
				salesCount: number;
				averageMargin: number;
			}) => ({
				...item,
				averageMargin: item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0
			}))
				.sort((a: { totalProfit: number }, b: { totalProfit: number }) => b.totalProfit - a.totalProfit)
			.slice(0, 10)
	);

	// Products with negative margins (losses)
	const lossProducts = $derived(salesWithProfit.filter((sale: { profit: number }) => sale.profit < 0));

	// Products with highest margin percentages
	const highestMarginSales = $derived(
		[...salesWithProfit].sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 10)
	);

	// Loading and error states
	const isLoading = $derived(profitMarginQuery.isPending);
	const isError = $derived(profitMarginQuery.isError);
	const error = $derived(profitMarginQuery.error);

	return {
		// Query
		profitMarginQuery,

		// Raw data
		report,
		salesWithProfit,

		// Summary totals
		totalRevenue,
		totalCogs,
		totalProfit,
		averageMargin,
		totalSales,
		averageSaleAmount,
		averageProfitPerSale,

		// Derived analytics
		topProfitableProducts,
		lossProducts,
		highestMarginSales,

		// Loading states
		isLoading,
		isError,
		error,

		// Utility functions
		refetch: () => queryClient.invalidateQueries({ queryKey: profitMarginQueryKeys.reports() })
	};
}

/**
 * Hook for fetching profit margin report by date range
 */
export function useProfitMarginReportByDateRange(startDate: string, endDate: string) {
	const queryClient = useQueryClient();

	// Query to fetch profit margin report for specific date range
	const profitMarginQuery = createQuery<ProfitMarginReport>({
		queryKey: profitMarginQueryKeys.reportByDateRange(startDate, endDate),
		queryFn: () => onGetProfitMarginReportByDateRange(startDate, endDate),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: !!(startDate && endDate),
		retry: 2,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// Derived reactive state using Svelte 5 runes
	const report = $derived(profitMarginQuery.data);
	const salesWithProfit = $derived(report?.salesWithProfit ?? []);

	// Derived totals and averages
	const totalRevenue = $derived(report?.totalRevenue ?? 0);
	const totalCogs = $derived(report?.totalCogs ?? 0);
	const totalProfit = $derived(report?.totalProfit ?? 0);
	const averageMargin = $derived(report?.averageMargin ?? 0);

	// Additional derived calculations
	const totalSales = $derived(salesWithProfit.length);
	const averageSaleAmount = $derived(totalSales > 0 ? totalRevenue / totalSales : 0);
	const averageProfitPerSale = $derived(totalSales > 0 ? totalProfit / totalSales : 0);

	// Loading and error states
	const isLoading = $derived(profitMarginQuery.isPending);
	const isError = $derived(profitMarginQuery.isError);
	const error = $derived(profitMarginQuery.error);

	return {
		// Query
		profitMarginQuery,

		// Raw data
		report,
		salesWithProfit,

		// Summary totals
		totalRevenue,
		totalCogs,
		totalProfit,
		averageMargin,
		totalSales,
		averageSaleAmount,
		averageProfitPerSale,

		// Loading states
		isLoading,
		isError,
		error,

		// Utility functions
		refetch: () =>
			queryClient.invalidateQueries({
				queryKey: profitMarginQueryKeys.reportByDateRange(startDate, endDate)
			})
	};
}

/**
 * Hook for fetching profit margin report for a specific product
 */
export function useProductProfitMargin(productId: string) {
	const queryClient = useQueryClient();

	// Query to fetch profit margin report for specific product
	const profitMarginQuery = createQuery<ProfitMarginReport>({
		queryKey: profitMarginQueryKeys.productReport(productId),
		queryFn: () => onGetProductProfitMargin(productId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: !!productId,
		retry: 2,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// Derived reactive state using Svelte 5 runes
	const report = $derived(profitMarginQuery.data);
	const salesWithProfit = $derived(report?.salesWithProfit ?? []);

	// Derived totals and averages
	const totalRevenue = $derived(report?.totalRevenue ?? 0);
	const totalCogs = $derived(report?.totalCogs ?? 0);
	const totalProfit = $derived(report?.totalProfit ?? 0);
	const averageMargin = $derived(report?.averageMargin ?? 0);

	// Additional derived calculations specific to single product
	const totalQuantitySold = $derived(
		salesWithProfit.reduce((sum: number, sale: any) => sum + Math.abs(sale.quantity_adjusted), 0)
	);
	const averageProfitPerUnit = $derived(
		totalQuantitySold > 0 ? totalProfit / totalQuantitySold : 0
	);
	const totalSales = $derived(salesWithProfit.length);

	// Sales trend analysis
	const salesByDate = $derived(
		salesWithProfit.reduce(
			(acc: Record<string, {
				date: string;
				revenue: number;
				profit: number;
				quantity: number;
				salesCount: number;
			}>, sale: any) => {
				const date = new Date(sale.created_at).toISOString().split('T')[0];
				if (!acc[date]) {
					acc[date] = {
						date,
						revenue: 0,
						profit: 0,
						quantity: 0,
						salesCount: 0
					};
				}
				acc[date].revenue += sale.revenue;
				acc[date].profit += sale.profit;
				acc[date].quantity += Math.abs(sale.quantity_adjusted);
				acc[date].salesCount += 1;
				return acc;
			},
			{} as Record<
				string,
				{
					date: string;
					revenue: number;
					profit: number;
					quantity: number;
					salesCount: number;
				}
			>
		)
	);

	const dailySalesTrend = $derived(
		Object.values(salesByDate).sort(
			(a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
		)
	);

	// Loading and error states
	const isLoading = $derived(profitMarginQuery.isPending);
	const isError = $derived(profitMarginQuery.isError);
	const error = $derived(profitMarginQuery.error);

	return {
		// Query
		profitMarginQuery,

		// Raw data
		report,
		salesWithProfit,

		// Summary totals
		totalRevenue,
		totalCogs,
		totalProfit,
		averageMargin,
		totalQuantitySold,
		averageProfitPerUnit,
		totalSales,

		// Trend analysis
		salesByDate,
		dailySalesTrend,

		// Loading states
		isLoading,
		isError,
		error,

		// Utility functions
		refetch: () =>
			queryClient.invalidateQueries({
				queryKey: profitMarginQueryKeys.productReport(productId)
			})
	};
}

// Export query keys for external cache management if needed
export { profitMarginQueryKeys };
