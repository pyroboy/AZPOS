<script lang="ts">
	import { useInventory } from '$lib/data/inventory';
	import type { InventoryItem } from '$lib/types/inventory.schema';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import AdjustmentModal from '$lib/components/inventory/AdjustmentModal.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';

	// Use data hooks instead of stores
	const { inventoryItems } = useInventory();

	let searchTerm = $state('');
	let isModalOpen = $state(false);
	let selectedProduct = $state<InventoryItem | null>(null);
	let isBulkMode = $state(false);
	let selectedProductIds = $state(new Set<string>());

	const filteredProducts = $derived(
		inventoryItems().filter((item: InventoryItem) => {
			const search = searchTerm.toLowerCase();
			// Note: inventory items may need product info joined
			// This is a simplified version - you may need to adjust based on your data structure
			return (
				item.product_id.toLowerCase().includes(search) ||
				(item.batch_number && item.batch_number.toLowerCase().includes(search))
			);
		})
	);

	const areAllFilteredSelected = $derived(
		filteredProducts.length > 0 &&
			filteredProducts.every((item: InventoryItem) => selectedProductIds.has(item.id))
	);

	function toggleSelectAll() {
		if (areAllFilteredSelected) {
			filteredProducts.forEach((item: InventoryItem) => selectedProductIds.delete(item.id));
		} else {
			filteredProducts.forEach((item: InventoryItem) => selectedProductIds.add(item.id));
		}
		// Trigger reactivity
		selectedProductIds = selectedProductIds;
	}

	$effect(() => {
		if (!isBulkMode) {
			selectedProductIds.clear();
		}
	});

	let selectedProductsForModal = $state<InventoryItem[] | null>(null);

	function openAdjustModal(item: InventoryItem) {
		selectedProduct = item;
		selectedProductsForModal = null;
		isModalOpen = true;
	}

	function openBulkAdjustModal() {
		const selected = inventoryItems().filter((item: InventoryItem) =>
			selectedProductIds.has(item.id)
		);
		selectedProductsForModal = selected.length > 0 ? selected : null;
		selectedProduct = null;
		isModalOpen = true;
	}

	$effect(() => {
		if (!isModalOpen) {
			selectedProduct = null;
			selectedProductsForModal = null;
		}
	});
</script>

<div class="p-4 space-y-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Inventory Adjustments</h1>
		<div class="flex items-center space-x-4">
			<div class="flex items-center space-x-2">
				<Switch id="bulk-mode" bind:checked={isBulkMode} />
				<Label for="bulk-mode">Bulk Adjust</Label>
			</div>
			<div class="w-80">
				<Input placeholder="Search by SKU, Name, or Category..." bind:value={searchTerm} />
			</div>
		</div>
	</div>

	{#if isBulkMode && selectedProductIds.size > 0}
		<div class="flex justify-end">
			<Button onclick={openBulkAdjustModal}>Adjust Selected ({selectedProductIds.size})</Button>
		</div>
	{/if}

	<div class="border rounded-lg">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					{#if isBulkMode}
						<Table.Head class="w-[50px]">
							<Checkbox onclick={toggleSelectAll} checked={areAllFilteredSelected} />
						</Table.Head>
					{/if}
					<Table.Head class="w-[150px]">Product ID</Table.Head>
					<Table.Head>Batch/Item</Table.Head>
					<Table.Head>Location</Table.Head>
					<Table.Head class="text-right">Cost/Unit</Table.Head>
					<Table.Head class="text-right">Available</Table.Head>
					<Table.Head class="w-[120px] text-center">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if filteredProducts.length === 0}
					<Table.Row>
						<Table.Cell colspan={isBulkMode ? 7 : 6} class="h-24 text-center">
							No products found.
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each filteredProducts as item (item.id)}
						<Table.Row>
							{#if isBulkMode}
								<Table.Cell>
									<Checkbox
										checked={selectedProductIds.has(item.id)}
										onclick={() => {
											if (selectedProductIds.has(item.id)) {
												selectedProductIds.delete(item.id);
											} else {
												selectedProductIds.add(item.id);
											}
											// Trigger reactivity
											selectedProductIds = selectedProductIds;
										}}
									/>
								</Table.Cell>
							{/if}
							<Table.Cell class="font-mono">{item.product_id}</Table.Cell>
							<Table.Cell class="font-medium">{item.batch_number || 'N/A'}</Table.Cell>
							<Table.Cell>Location: {item.location_id || 'Default'}</Table.Cell>
							<Table.Cell class="text-right">${(item.cost_per_unit || 0).toFixed(2)}</Table.Cell>
							<Table.Cell class="text-right font-bold">{item.quantity_available}</Table.Cell>
							<Table.Cell class="text-center">
								{#if !isBulkMode}
									<Button variant="outline" size="sm" onclick={() => openAdjustModal(item)}>
										Adjust
									</Button>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<AdjustmentModal
	bind:open={isModalOpen}
	product={selectedProduct as any}
	productList={selectedProductsForModal as any}
/>
