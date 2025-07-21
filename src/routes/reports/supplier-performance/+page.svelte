<script lang="ts">
	import ExportButton from '$lib/components/ui/button/ExportButton.svelte';

	let { data } = $props();
</script>

<div class="p-4 sm:p-6">
	<div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Supplier Performance Report</h1>
        <ExportButton data={data.performanceData} filename="supplier-performance.csv" disabled={data.performanceData.length === 0} reportType="supplierPerformance" />
    </div>

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
					{#if data.performanceData.length === 0}
						<tr>
							<td colspan="4" class="text-center">No supplier data available.</td>
						</tr>
					{/if}
                    {#each data.performanceData as performance (performance.supplierId)}
                        <tr>
                            <td>{performance.supplierName}</td>
                            <td class="text-right font-mono">{performance.onTimeRate.toFixed(2)}%</td>
                            <td class="text-right font-mono">${performance.avgCostVariance.toFixed(2)}</td>
                            <td class="text-right font-mono">{performance.totalPOs}</td>
                        </tr>
                    {/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
