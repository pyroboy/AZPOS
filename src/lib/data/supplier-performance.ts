import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	onGetSupplierPerformanceReport,
	onGetSupplierPerformanceDetail,
	onExportSupplierPerformanceReport
} from '$lib/server/telefuncs/supplier-performance.telefunc.js';
import type {
	SupplierPerformanceReport,
	SupplierPerformanceFilters,
	SupplierPerformanceDetail,
	SupplierPerformanceMetric
} from '$lib/types/supplier-performance.schema';

// Query keys for consistent cache management
const supplierPerformanceQueryKeys = {
	all: ['supplier-performance'] as const,
	reports: () => [...supplierPerformanceQueryKeys.all, 'reports'] as const,
	report: (filters?: SupplierPerformanceFilters) =>
		[...supplierPerformanceQueryKeys.reports(), filters] as const,
	details: () => [...supplierPerformanceQueryKeys.all, 'details'] as const,
	detail: (supplierId: string, period: string) =>
		[...supplierPerformanceQueryKeys.details(), supplierId, period] as const,
	comparisons: () => [...supplierPerformanceQueryKeys.all, 'comparisons'] as const,
	comparison: (supplierIds: string[], period: string) =>
		[...supplierPerformanceQueryKeys.comparisons(), supplierIds.sort().join(','), period] as const,
	exports: () => [...supplierPerformanceQueryKeys.all, 'exports'] as const
};

// Main hook for supplier performance report
export function useSupplierPerformanceReport(filters?: SupplierPerformanceFilters) {
	const queryClient = useQueryClient();

	// Query to fetch supplier performance report
	const reportQuery = createQuery<SupplierPerformanceReport>({
		queryKey: supplierPerformanceQueryKeys.report(filters),
		queryFn: () => onGetSupplierPerformanceReport(filters),
		staleTime: 1000 * 60 * 5, // 5 minutes - performance data doesn't change frequently
		gcTime: 1000 * 60 * 15, // 15 minutes
		retry: 2
	});

	// Mutation for exporting performance report
	const exportReportMutation = createMutation({
		mutationFn: ({
			filters,
			format
		}: {
			filters?: SupplierPerformanceFilters;
			format?: 'csv' | 'xlsx';
		}) => onExportSupplierPerformanceReport(filters, format),
		onError: (error) => {
			console.error('Failed to export supplier performance report:', error);
		}
	});

	// Derived reactive state using Svelte 5 runes
	const report = $derived(reportQuery.data);
	const metrics = $derived(report?.metrics ?? []);
	const stats = $derived(report?.stats);
	const period = $derived(report?.period);

	// Derived metrics for easy access
	const totalSuppliers = $derived(stats?.total_suppliers ?? 0);
	const activeSuppliers = $derived(stats?.active_suppliers ?? 0);
	const suppliersWithOrders = $derived(stats?.suppliers_with_orders ?? 0);
	const overallOnTimeRate = $derived(stats?.overall_on_time_rate ?? 0);
	const totalOrderValue = $derived(stats?.total_order_value ?? 0);
	const averageCostVariance = $derived(stats?.average_cost_variance ?? 0);

	// Top and worst performers
	const topPerformers = $derived(stats?.top_on_time_suppliers ?? []);
	const worstPerformers = $derived(stats?.worst_performers ?? []);

	// Filtered metrics for different views
	const activeSupplierMetrics = $derived(
		metrics.filter((m: SupplierPerformanceMetric) => m.is_active)
	);
	const suppliersWithIssues = $derived(
		metrics.filter(
			(m: SupplierPerformanceMetric) => m.on_time_rate < 80 || m.cost_variance_percentage > 10
		)
	);
	const topPerformingSuppliers = $derived(
		metrics
			.filter((m: SupplierPerformanceMetric) => m.total_pos > 0)
			.sort(
				(a: SupplierPerformanceMetric, b: SupplierPerformanceMetric) =>
					b.on_time_rate - a.on_time_rate
			)
			.slice(0, 10)
	);

	// Performance categories
	const excellentPerformers = $derived(
		metrics.filter((m: SupplierPerformanceMetric) => m.on_time_rate >= 95)
	);
	const goodPerformers = $derived(
		metrics.filter((m: SupplierPerformanceMetric) => m.on_time_rate >= 85 && m.on_time_rate < 95)
	);
	const averagePerformers = $derived(
		metrics.filter((m: SupplierPerformanceMetric) => m.on_time_rate >= 70 && m.on_time_rate < 85)
	);
	const poorPerformers = $derived(
		metrics.filter((m: SupplierPerformanceMetric) => m.on_time_rate < 70 && m.total_pos > 0)
	);

	// Loading and error states
	const isLoading = $derived(reportQuery.isPending);
	const isError = $derived(reportQuery.isError);
	const error = $derived(reportQuery.error);

	// Export states
	const isExporting = $derived(exportReportMutation.isPending);
	const exportError = $derived(exportReportMutation.error);

	return {
		// Queries
		reportQuery,

		// Main data
		report,
		metrics,
		stats,
		period,

		// Aggregated metrics
		totalSuppliers,
		activeSuppliers,
		suppliersWithOrders,
		overallOnTimeRate,
		totalOrderValue,
		averageCostVariance,

		// Performance insights
		topPerformers,
		worstPerformers,
		suppliersWithIssues,
		topPerformingSuppliers,

		// Performance categories
		excellentPerformers,
		goodPerformers,
		averagePerformers,
		poorPerformers,

		// Filtered views
		activeSupplierMetrics,

		// Loading states
		isLoading,
		isError,
		error,

		// Export functionality
		exportReport: exportReportMutation.mutate,
		isExporting,
		exportError,

		// Utility functions
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: supplierPerformanceQueryKeys.reports() }),

		// Helper functions for data analysis
		getSupplierMetric: (supplierId: string) =>
			metrics.find((m: SupplierPerformanceMetric) => m.supplier_id === supplierId),

		getPerformanceCategory: (onTimeRate: number) => {
			if (onTimeRate >= 95) return 'excellent';
			if (onTimeRate >= 85) return 'good';
			if (onTimeRate >= 70) return 'average';
			return 'poor';
		},

		getPerformanceCategoryColor: (onTimeRate: number) => {
			if (onTimeRate >= 95) return 'text-success';
			if (onTimeRate >= 85) return 'text-info';
			if (onTimeRate >= 70) return 'text-warning';
			return 'text-error';
		},

		formatCurrency: (value: number) =>
			new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD'
			}).format(value),

		formatPercentage: (value: number) => `${value.toFixed(2)}%`
	};
}

// Hook for detailed supplier performance
export function useSupplierPerformanceDetail(
	supplierId: string,
	period: 'month' | 'quarter' | 'year' = 'month'
) {
	const queryClient = useQueryClient();

	const detailQuery = createQuery<SupplierPerformanceDetail>({
		queryKey: supplierPerformanceQueryKeys.detail(supplierId, period),
		queryFn: () => onGetSupplierPerformanceDetail(supplierId, period),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: !!supplierId
	});

	// Derived reactive state
	const detail = $derived(detailQuery.data);
	const supplierInfo = $derived(detail?.supplier_info);
	const currentPeriod = $derived(detail?.current_period);
	const recentOrders = $derived(detail?.recent_orders ?? []);
	const historicalData = $derived(detail?.historical_data ?? []);

	// Analysis of recent orders
	const recentOnTimeOrders = $derived(
		recentOrders.filter((order: { is_on_time?: boolean }) => order.is_on_time === true).length
	);
	const recentLateOrders = $derived(
		recentOrders.filter((order: { is_on_time?: boolean }) => order.is_on_time === false).length
	);
	const recentOnTimeRate = $derived(
		recentOrders.length > 0 ? (recentOnTimeOrders / recentOrders.length) * 100 : 0
	);

	// Loading and error states
	const isLoading = $derived(detailQuery.isPending);
	const isError = $derived(detailQuery.isError);
	const error = $derived(detailQuery.error);

	return {
		// Query
		detailQuery,

		// Main data
		detail,
		supplierInfo,
		currentPeriod,
		recentOrders,
		historicalData,

		// Recent order analysis
		recentOnTimeOrders,
		recentLateOrders,
		recentOnTimeRate,

		// Loading states
		isLoading,
		isError,
		error,

		// Utility functions
		refetch: () =>
			queryClient.invalidateQueries({
				queryKey: supplierPerformanceQueryKeys.detail(supplierId, period)
			})
	};
}

// Hook for comparing supplier performance
export function useSupplierPerformanceComparison(supplierIds: string[], period: string = 'month') {
	// Remove unused queryClient variable

	const comparisonQuery = createQuery<SupplierPerformanceReport>({
		queryKey: supplierPerformanceQueryKeys.comparison(supplierIds, period),
		queryFn: () =>
			onGetSupplierPerformanceReport({
				supplier_ids: supplierIds,
				period: period as 'month' | 'quarter' | 'year' | 'custom',
				include_inactive: false,
				sort_by: 'supplier_name',
				sort_order: 'asc'
			}),
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15,
		enabled: supplierIds.length > 0
	});

	// Derived comparison data
	const metrics = $derived(comparisonQuery.data?.metrics ?? []);

	// Comparison insights
	const bestPerformer = $derived(
		metrics.reduce(
			(best: SupplierPerformanceMetric | undefined, current: SupplierPerformanceMetric) => 
				!best || current.on_time_rate > best.on_time_rate ? current : best,
			undefined
		)
	);

	const worstPerformer = $derived(
		metrics.reduce(
			(worst: SupplierPerformanceMetric | undefined, current: SupplierPerformanceMetric) => 
				!worst || current.on_time_rate < worst.on_time_rate ? current : worst,
			undefined
		)
	);

	const averageOnTimeRate = $derived(
		metrics.length > 0 ? metrics.reduce((sum: number, m: SupplierPerformanceMetric) => sum + m.on_time_rate, 0) / metrics.length : 0
	);

	const totalOrderValue = $derived(metrics.reduce((sum: number, m: SupplierPerformanceMetric) => sum + m.total_order_value, 0));

	return {
		comparisonQuery,
		metrics,
		bestPerformer,
		worstPerformer,
		averageOnTimeRate,
		totalOrderValue,
		isLoading: $derived(comparisonQuery.isPending),
		isError: $derived(comparisonQuery.isError),
		error: $derived(comparisonQuery.error)
	};
}

// Hook for performance trends (historical data analysis)
export function useSupplierPerformanceTrends(filters?: SupplierPerformanceFilters) {
	const currentMonth = useSupplierPerformanceReport({ 
		...filters, 
		period: 'month',
		include_inactive: filters?.include_inactive ?? false,
		sort_by: filters?.sort_by ?? 'supplier_name',
		sort_order: filters?.sort_order ?? 'asc'
	});
	const currentQuarter = useSupplierPerformanceReport({ 
		...filters, 
		period: 'quarter',
		include_inactive: filters?.include_inactive ?? false,
		sort_by: filters?.sort_by ?? 'supplier_name',
		sort_order: filters?.sort_order ?? 'asc'
	});
	const currentYear = useSupplierPerformanceReport({ 
		...filters, 
		period: 'year',
		include_inactive: filters?.include_inactive ?? false,
		sort_by: filters?.sort_by ?? 'supplier_name',
		sort_order: filters?.sort_order ?? 'asc'
	});

	// Derived trend analysis
	const trends = $derived(
		currentMonth.metrics.map((monthMetric: SupplierPerformanceMetric) => {
			const quarterMetric = currentQuarter.metrics.find((m: SupplierPerformanceMetric) => m.supplier_id === monthMetric.supplier_id);
			const yearMetric = currentYear.metrics.find((m: SupplierPerformanceMetric) => m.supplier_id === monthMetric.supplier_id);

			return {
				supplier_id: monthMetric.supplier_id,
				supplier_name: monthMetric.supplier_name,
				monthly_on_time_rate: monthMetric.on_time_rate,
				quarterly_on_time_rate: quarterMetric?.on_time_rate ?? 0,
				yearly_on_time_rate: yearMetric?.on_time_rate ?? 0,
				trend_direction:
					monthMetric.on_time_rate > (quarterMetric?.on_time_rate ?? 0) ? 'improving' : 'declining',
				monthly_order_value: monthMetric.total_order_value,
				quarterly_order_value: quarterMetric?.total_order_value ?? 0,
				yearly_order_value: yearMetric?.total_order_value ?? 0
			};
		})
	);

	const improvingSuppliers = trends.filter((t: { trend_direction: string }) => t.trend_direction === 'improving');
	const decliningSuppliers = trends.filter((t: { trend_direction: string }) => t.trend_direction === 'declining');

	return {
		trends,
		improvingSuppliers,
		decliningSuppliers,
		isLoading: $derived(currentMonth.isLoading || currentQuarter.isLoading || currentYear.isLoading)
	};
}
