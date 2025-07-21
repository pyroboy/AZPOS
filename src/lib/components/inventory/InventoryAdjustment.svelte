<script lang="ts">
	import { inventory, type ProductWithStock } from '$lib/stores/inventoryStore';
	import type { Product } from '$lib/types';
	import { categories as categoryStore } from '$lib/stores/categoryStore';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import AdjustmentModal from '$lib/components/inventory/AdjustmentModal.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';

	let searchTerm = $state('');
	let isModalOpen = $state(false);
	let selectedProduct = $state<ProductWithStock | null>(null);
	let isBulkMode = $state(false);
	let selectedProductIds = $state(new Set<string>());

	const categoryMap = $derived(Object.fromEntries($categoryStore.map((c) => [c.id, c.name])));

	const filteredProducts = $derived(
		$inventory.filter((p: ProductWithStock) => {
			const search = searchTerm.toLowerCase();
			const categoryName = categoryMap[p.category_id] ?? '';
			return (
				p.name.toLowerCase().includes(search) ||
				p.sku.toLowerCase().includes(search) ||
				categoryName.toLowerCase().includes(search)
			);
		})
	);

	const areAllFilteredSelected = $derived(
		filteredProducts.length > 0 && filteredProducts.every((p: ProductWithStock) => selectedProductIds.has(p.id!))
	);

	function toggleSelectAll() {
		const newSelectedIds = new Set(selectedProductIds);
		if (areAllFilteredSelected) {
			filteredProducts.forEach((p: ProductWithStock) => newSelectedIds.delete(p.id!));
		} else {
			filteredProducts.forEach((p: ProductWithStock) => newSelectedIds.add(p.id!));
		}
		selectedProductIds = newSelectedIds;
	}

	$effect(() => {
		if (!isBulkMode) {
			selectedProductIds = new Set<string>();
		}
	});

	let selectedProductsForModal = $state<ProductWithStock[] | null>(null);

	function openAdjustModal(product: ProductWithStock) {
		selectedProduct = product;
		selectedProductsForModal = null;
		isModalOpen = true;
	}

	function openBulkAdjustModal() {
		const selected = $inventory.filter((p) => selectedProductIds.has(p.id!));
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
					<Table.Head class="w-[150px]">SKU</Table.Head>
					<Table.Head>Name</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head class="text-right">Price</Table.Head>
					<Table.Head class="text-right">Current Stock</Table.Head>
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
					{#each filteredProducts as product (product.id)}
						<Table.Row>
							{#if isBulkMode}
								<Table.Cell>
									<Checkbox
										checked={selectedProductIds.has(product.id)}
										onclick={() => {
											const newSelectedIds = new Set(selectedProductIds);
											if (newSelectedIds.has(product.id)) {
												newSelectedIds.delete(product.id);
											} else {
												newSelectedIds.add(product.id);
											}
											selectedProductIds = newSelectedIds;
										}}
									/>
								</Table.Cell>
							{/if}
							<Table.Cell class="font-mono">{product.sku}</Table.Cell>
							<Table.Cell class="font-medium">{product.name}</Table.Cell>
							<Table.Cell>{categoryMap[product.category_id]}</Table.Cell>
							<Table.Cell class="text-right">${product.price.toFixed(2)}</Table.Cell>
							<Table.Cell class="text-right font-bold">{product.stock}</Table.Cell>
							<Table.Cell class="text-center">
								{#if !isBulkMode}
									<Button variant="outline" size="sm" onclick={() => openAdjustModal(product)}>
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
	product={selectedProduct}
	productList={selectedProductsForModal}
/>
