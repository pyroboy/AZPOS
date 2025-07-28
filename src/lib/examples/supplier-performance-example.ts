/**
 * Example usage of the Supplier Performance Report integration
 *
 * This file demonstrates how to use the new supplier performance features:
 * - Schema validation with Zod
 * - Telefunc business logic functions
 * - Data hooks with TanStack Query and Svelte 5 runes
 */

import {
	useSupplierPerformanceReport,
	useSupplierPerformanceDetail,
	useSupplierPerformanceComparison
} from '$lib/data/supplier-performance';

import type {
	SupplierPerformanceFilters,
	SupplierPerformanceReport
} from '$lib/types/supplier-performance.schema';

// Example 1: Basic usage of the performance report hook
export function ExampleBasicUsage() {
	// Get current month performance for all suppliers
	const performance = useSupplierPerformanceReport();

	// Reactive values automatically update when data changes
	const totalSuppliers = performance.totalSuppliers;
	const overallOnTimeRate = performance.overallOnTimeRate;
	const topPerformers = performance.topPerformers;

	return {
		isLoading: performance.isLoading,
		metrics: performance.metrics,
		stats: performance.stats,
		topPerformers
	};
}

// Example 2: Filtered performance report
export function ExampleFilteredReport() {
	const filters: SupplierPerformanceFilters = {
		period: 'quarter',
		sort_by: 'on_time_rate',
		sort_order: 'desc',
		include_inactive: false
	};

	const performance = useSupplierPerformanceReport(filters);

	// Get performance categories
	const excellentPerformers = performance.excellentPerformers;
	const poorPerformers = performance.poorPerformers;

	return {
		quarterlyReport: performance.report,
		topQuarterPerformers: excellentPerformers,
		needsImprovement: poorPerformers
	};
}

// Example 3: Detailed supplier analysis
export function ExampleSupplierDetail(supplierId: string) {
	const detail = useSupplierPerformanceDetail(supplierId, 'month');

	return {
		supplierInfo: detail.supplierInfo,
		currentMetrics: detail.currentPeriod,
		recentOrders: detail.recentOrders,
		recentOnTimeRate: detail.recentOnTimeRate
	};
}

// Example 4: Supplier comparison
export function ExampleSupplierComparison(supplierIds: string[]) {
	const comparison = useSupplierPerformanceComparison(supplierIds, 'quarter');

	return {
		comparisonMetrics: comparison.metrics,
		bestPerformer: comparison.bestPerformer,
		worstPerformer: comparison.worstPerformer,
		averageOnTimeRate: comparison.averageOnTimeRate
	};
}

// Example 5: Export functionality
export function ExampleExportReport() {
	const performance = useSupplierPerformanceReport();

	const exportToCsv = () => {
		performance.exportReport({
			filters: { period: 'month' },
			format: 'csv'
		});
	};

	return {
		exportToCsv,
		isExporting: performance.isExporting,
		exportError: performance.exportError
	};
}

// Example 6: Using helper functions
export function ExampleHelperFunctions() {
	const performance = useSupplierPerformanceReport();

	// Helper functions for formatting and analysis
	const getSupplierStatus = (supplierId: string) => {
		const metric = performance.getSupplierMetric(supplierId);
		if (!metric) return 'Not found';

		const category = performance.getPerformanceCategory(metric.on_time_rate);
		const color = performance.getPerformanceCategoryColor(metric.on_time_rate);
		const formattedValue = performance.formatCurrency(metric.total_order_value);
		const formattedRate = performance.formatPercentage(metric.on_time_rate);

		return {
			category,
			color,
			totalValue: formattedValue,
			onTimeRate: formattedRate
		};
	};

	return { getSupplierStatus };
}

// Example 7: Complete component integration
export function ExampleComponentIntegration() {
	// This shows how you might use it in a Svelte 5 component
	const performance = useSupplierPerformanceReport({
		period: 'month',
		sort_by: 'on_time_rate',
		sort_order: 'desc'
	});

	// Reactive derived state
	const hasData = $derived(performance.metrics.length > 0);
	const needsAttention = $derived(performance.suppliersWithIssues.length > 0);

	const performanceInsights = $derived(() => ({
		totalSuppliers: performance.totalSuppliers,
		overallHealth: performance.overallOnTimeRate > 85 ? 'Good' : 'Needs Improvement',
		topPerformer: performance.topPerformers[0]?.supplier_name || 'N/A',
		issueCount: performance.suppliersWithIssues.length
	}));

	return {
		performance,
		hasData,
		needsAttention,
		performanceInsights,
		refetch: performance.refetch
	};
}

/**
 * Migration guide from the old +page.server.ts approach:
 *
 * OLD WAY (in +page.server.ts):
 * ```typescript
 * const allSuppliers = supplierStore.suppliers;
 * const allPOs = get(poStore);
 * const performanceData = allSuppliers.map(supplier => {
 *   // ... manual calculation logic
 * });
 * ```
 *
 * NEW WAY (with hooks):
 * ```typescript
 * const performance = useSupplierPerformanceReport();
 * const performanceData = performance.metrics.map(metric => ({
 *   supplierId: metric.supplier_id,
 *   supplierName: metric.supplier_name,
 *   onTimeRate: metric.on_time_rate,
 *   avgCostVariance: metric.average_cost_variance,
 *   totalPOs: metric.total_pos
 * }));
 * ```
 *
 * Benefits of the new approach:
 * - ✅ Proper schema validation with Zod
 * - ✅ Centralized business logic in telefunc
 * - ✅ Reactive state management with TanStack Query
 * - ✅ Better error handling and loading states
 * - ✅ Automatic caching and invalidation
 * - ✅ Type safety throughout the stack
 * - ✅ More comprehensive performance metrics
 * - ✅ Export functionality built-in
 */
