<script lang="ts">
	import ExportButton from '$lib/components/ui/button/ExportButton.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const fastMovingThreshold = 7; // Days
	const slowMovingThreshold = 30; // Days
</script>

<div class="p-4 sm:p-6">
	<h1 class="text-2xl font-bold mb-4">Inventory Velocity Report</h1>

	<div class="bg-base-100 p-4 rounded-lg shadow-md">
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-xl font-semibold">
				Fast-Moving Items (Sold within last {fastMovingThreshold} days)
			</h2>
			<ExportButton
				reportType="fast-movers"
				data={data.fastMovers}
				filename="fast-movers.csv"
				disabled={data.fastMovers.length === 0}
			/>
		</div>
		<div class="overflow-x-auto mb-8">
			<table class="table table-zebra w-full">
				<thead>
					<tr>
						<th>SKU</th>
						<th>Product Name</th>
						<th class="text-right">Total Units Sold (Last 30 days)</th>
						<th class="text-right">Last Sale Date</th>
					</tr>
				</thead>
				<tbody>
					{#if data.fastMovers.length === 0}
						<tr>
							<td colspan="4" class="text-center">No fast-moving items found.</td>
						</tr>
					{/if}
					{#each data.fastMovers as item (item.product_id)}
						<tr>
							<td>{item.sku}</td>
							<td>{item.name}</td>
							<td class="text-right font-mono">{item.units_sold}</td>
							<td class="text-right font-mono"
								>{new Date(item.last_sale_date).toLocaleDateString()}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="flex justify-between items-center mb-4">
			<h2 class="text-xl font-semibold">
				Slow-Moving Items (Not sold in last {slowMovingThreshold} days)
			</h2>
			<ExportButton
				reportType="slow-movers"
				data={data.slowMovers}
				filename="slow-movers.csv"
				disabled={data.slowMovers.length === 0}
			/>
		</div>
		<div class="overflow-x-auto">
			<table class="table table-zebra w-full">
				<thead>
					<tr>
						<th>SKU</th>
						<th>Product Name</th>
						<th class="text-right">Current Stock</th>
						<th class="text-right">Last Sale Date</th>
					</tr>
				</thead>
				<tbody>
					{#if data.slowMovers.length === 0}
						<tr>
							<td colspan="4" class="text-center">No slow-moving items found.</td>
						</tr>
					{/if}
					{#each data.slowMovers as item (item.product_id)}
						<tr>
							<td>{item.sku}</td>
							<td>{item.name}</td>
							<td class="text-right font-mono">{item.stock_on_hand}</td>
							<td class="text-right font-mono"
								>{item.last_sale_date
									? new Date(item.last_sale_date).toLocaleDateString()
									: 'N/A'}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
