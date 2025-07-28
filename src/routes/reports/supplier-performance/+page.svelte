<script lang="ts">
	import { useSupplierPerformanceReport } from '$lib/data/supplier-performance';
	import { Button } from '$lib/components/ui/button';
	import { Download, AlertCircle, RefreshCw } from 'lucide-svelte';

	// Use the supplier performance hook
	const { metrics, isLoading, isError, error, exportReport, isExporting, exportError, refetch } =
		useSupplierPerformanceReport();

	// Transform metrics to match the expected format for the table
	const performanceData = $derived(
		metrics.map((metric) => ({
			supplierId: metric.supplier_id,
			supplierName: metric.supplier_name,
			onTimeRate: metric.on_time_rate,
			avgCostVariance: metric.average_cost_variance,
			totalPOs: metric.total_pos
		}))
	);

	// Handle CSV export
	function handleExport() {
		if (performanceData.length === 0) {
			console.warn('No data to export.');
			return;
		}

		exportReport({ format: 'csv' });
	}
</script>

<div class="p-4 sm:p-6">
	<div class="flex justify-between items-center mb-4">
		<h1 class="text-2xl font-bold">Supplier Performance Report</h1>
		<div class="flex gap-2">
			{#if isError}
				<Button onclick={refetch} variant="outline" size="sm">
					<RefreshCw class="mr-2 h-4 w-4" />
					Retry
				</Button>
			{/if}
			<Button
				onclick={handleExport}
				disabled={performanceData.length === 0 || isExporting || isLoading}
				variant="outline"
				size="sm"
			>
				<Download class="mr-2 h-4 w-4" />
				{isExporting ? 'Exporting...' : 'Export'}
			</Button>
		</div>
	</div>

	{#if exportError}
		<div class="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
			<AlertCircle class="h-5 w-5 text-error" />
			<span class="text-error">Export failed: {exportError.message}</span>
		</div>
	{/if}

	{#if isError}
		<div class="bg-base-100 p-8 rounded-lg shadow-md">
			<div class="text-center">
				<AlertCircle class="mx-auto h-12 w-12 text-error mb-4" />
				<h3 class="text-lg font-semibold text-error mb-2">
					Failed to Load Supplier Performance Data
				</h3>
				<p class="text-gray-600 mb-4">
					{error?.message || 'An error occurred while fetching the supplier performance report.'}
				</p>
				<Button onclick={refetch} variant="outline">
					<RefreshCw class="mr-2 h-4 w-4" />
					Try Again
				</Button>
			</div>
		</div>
	{:else}
		<div class="bg-base-100 p-4 rounded-lg shadow-md">
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>Supplier Name</th>
							<th class="text-right">On-Time Delivery Rate</th>
							<th class="text-right">Average Cost Variance</th>
							<th class="text-right">Total POs</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<!-- Loading skeleton rows -->
							{#each Array(5) as _, i}
								<tr>
									<td><div class="skeleton h-4 w-32"></div></td>
									<td class="text-right"><div class="skeleton h-4 w-16 ml-auto"></div></td>
									<td class="text-right"><div class="skeleton h-4 w-20 ml-auto"></div></td>
									<td class="text-right"><div class="skeleton h-4 w-12 ml-auto"></div></td>
								</tr>
							{/each}
						{:else if performanceData.length === 0}
							<tr>
								<td colspan="4" class="text-center py-8 text-gray-500">
									No supplier performance data available.
								</td>
							</tr>
						{:else}
							{#each performanceData as performance (performance.supplierId)}
								<tr>
									<td class="font-medium">{performance.supplierName}</td>
									<td class="text-right font-mono">
										<span
											class={performance.onTimeRate >= 90
												? 'text-success'
												: performance.onTimeRate >= 80
													? 'text-warning'
													: 'text-error'}
										>
											{performance.onTimeRate.toFixed(2)}%
										</span>
									</td>
									<td class="text-right font-mono">
										<span
											class={performance.avgCostVariance < 0
												? 'text-success'
												: performance.avgCostVariance > 1000
													? 'text-error'
													: ''}
										>
											${performance.avgCostVariance.toFixed(2)}
										</span>
									</td>
									<td class="text-right font-mono">{performance.totalPOs}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
