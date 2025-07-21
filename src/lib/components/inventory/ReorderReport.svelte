<script lang="ts">
	import { products } from '$lib/stores/productStore';
	import { productBatches } from '$lib/stores/productBatchStore';
	import { categories } from '$lib/stores/categoryStore';
	import { suppliers } from '$lib/stores/supplierStore.svelte';
	import type { Product } from '$lib/schemas/models';
	import ExportButton from '$lib/components/ui/button/ExportButton.svelte';


	// Create a derived state for items that need reordering
	const reorderItems = $derived.by(() => {
		// Trigger reactivity when batches change
		const batchTrigger = $productBatches.length;

		return $products.map(p => {
			const currentStock = $productBatches.find(b => b.product_id === p.id)?.quantity_on_hand;
			return {
				...p,
				currentStock
			};
		});
	});

	function getSupplierName(id: string | null): string {
		if (!id || suppliers.suppliers.length === 0) return 'N/A';
		return suppliers.suppliers.find((s: { id: string; }) => s.id === id)?.name ?? 'N/A';
	}
</script>

<div class="p-4 bg-base-100 rounded-lg shadow-md">
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Reorder Report</h2>
        <ExportButton data={reorderItems} filename="reorder-report.csv" disabled={reorderItems.length === 0} reportType="reorder" />
    </div>
    <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Supplier</th>
                    <th class="text-right">Current Stock</th>
                    <th class="text-right">Reorder Point</th>
                    <th class="text-right">Suggested Reorder Qty</th>
                </tr>
            </thead>
            <tbody>
                {#if reorderItems.length === 0}
                    <tr>
                        <td colspan="6" class="text-center">No items need reordering.</td>
                    </tr>
                {/if}
                {#each reorderItems as item (item.id)}
                    {@const currentStock = $productBatches.find(b => b.product_id === item.id)?.quantity_on_hand}
                    <tr>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td>{getSupplierName(item.supplier_id)}</td>
                        <td class="text-right font-mono">{currentStock}</td>
                        <td class="text-right font-mono">{item.reorder_point}</td>
                        <td class="text-right font-mono text-warning font-bold">{item.reorder_point && currentStock ? item.reorder_point - currentStock : 0}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
