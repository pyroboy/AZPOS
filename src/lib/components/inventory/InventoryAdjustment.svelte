<script lang="ts">
	import { getInventoryItems } from '$lib/remote/inventory.remote';
	import type { InventoryItem } from '$lib/types/inventory.schema';
	import type { Product } from '$lib/types/product.schema';

	// Extended InventoryItem type that includes embedded product data
	type InventoryItemWithProduct = InventoryItem & {
		product?: {
			name?: string;
			sku?: string;
			id?: string;
		};
	};
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import AdjustmentModal from '$lib/components/inventory/AdjustmentModal.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';

	// Accept shared queries from parent
	let { queries }: { queries?: any } = $props();

	// Use shared queries if provided, otherwise create new ones (fallback)
	const inventoryQuery = queries?.inventory || getInventoryItems({});
	const productsQuery = queries?.products || Promise.resolve({ products: [] });

	console.log('🔍 [InventoryAdjustment] Using data fetching', {
		usingSharedQueries: !!queries,
		timestamp: new Date().toISOString()
	});

	let searchTerm = $state('');
	let isModalOpen = $state(false);
	let selectedProduct = $state<InventoryItemWithProduct | null>(null);
	let isBulkMode = $state(false);
	let selectedProductIds = $state(new Set<string>());

	// Helper function to get product info - prefer embedded product data, fallback to products array
	function getProductInfo(item: InventoryItemWithProduct, products: Product[]) {
		// First try to use embedded product data from the join
		if (item.product && typeof item.product === 'object') {
			return {
				name: item.product.name || 'Unknown Product',
				sku: item.product.sku || item.product_id.slice(0, 8)
			};
		}
		
		// Fallback to finding in products array
		const product = products.find(p => p.id === item.product_id);
		return product || { name: 'Unknown Product', sku: item.product_id.slice(0, 8) };
	}

	function toggleSelectAll(filteredProducts: any[], areAllFilteredSelected: boolean) {
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

	let selectedProductsForModal = $state<InventoryItemWithProduct[] | null>(null);

	function openAdjustModal(item: InventoryItemWithProduct) {
		selectedProduct = item;
		selectedProductsForModal = null;
		isModalOpen = true;
	}

	function openBulkAdjustModal(inventoryItems: InventoryItemWithProduct[]) {
		const selected = inventoryItems.filter((item: InventoryItemWithProduct) =>
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

{#await Promise.all([inventoryQuery, productsQuery])}
	<div class="p-4 space-y-4">
		<div class="text-center">Loading inventory...</div>
	</div>
{:then [inventoryData, productsData]}
	{@const inventoryItems = inventoryData?.inventory_items || []}
	{@const products = productsData?.products || []}
	{@const filteredProducts = Array.isArray(inventoryItems) ? inventoryItems.filter((item) => {
		const search = searchTerm.toLowerCase();
		const productInfo = getProductInfo(item, products);
		return (
			productInfo.name.toLowerCase().includes(search) ||
			productInfo.sku.toLowerCase().includes(search) ||
			item.product_id.toLowerCase().includes(search) ||
			(item.batch_number && item.batch_number.toLowerCase().includes(search))
		);
	}) : []}
	{@const areAllFilteredSelected = filteredProducts.length > 0 && 
		filteredProducts.every((item) => selectedProductIds.has(item.id))}
	<div class="p-4 space-y-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Inventory Adjustments</h1>
		<div class="flex items-center space-x-4">
			<div class="flex items-center space-x-2">
				<Switch id="bulk-mode" bind:checked={isBulkMode} />
				<Label for="bulk-mode">Bulk Adjust</Label>
			</div>
			<div class="w-80">
				<Input placeholder="Search by product name, SKU, or batch..." bind:value={searchTerm} />
			</div>
		</div>
	</div>

	{#if isBulkMode && selectedProductIds.size > 0}
		<div class="flex justify-end">
			<Button onclick={() => openBulkAdjustModal(inventoryItems)}>Adjust Selected ({selectedProductIds.size})</Button>
		</div>
	{/if}

	<div class="border rounded-lg">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					{#if isBulkMode}
						<Table.Head class="w-[50px]">
							<Checkbox onclick={() => toggleSelectAll(filteredProducts, areAllFilteredSelected)} checked={areAllFilteredSelected} />
						</Table.Head>
					{/if}
					<Table.Head class="w-[200px]">Product</Table.Head>
					<Table.Head class="w-[120px]">SKU</Table.Head>
					<Table.Head>Batch</Table.Head>
					<Table.Head>Location</Table.Head>
					<Table.Head class="text-right">Cost/Unit</Table.Head>
					<Table.Head class="text-right">Available</Table.Head>
					<Table.Head class="w-[120px] text-center">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if filteredProducts.length === 0}
					<Table.Row>
						<Table.Cell colspan={isBulkMode ? 8 : 7} class="h-24 text-center">
							No inventory items found matching your search.
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each filteredProducts as item (item.id)}
						{@const productInfo = getProductInfo(item, products)}
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
							<Table.Cell class="font-medium">{productInfo.name}</Table.Cell>
							<Table.Cell class="font-mono text-sm">{productInfo.sku}</Table.Cell>
							<Table.Cell class="font-medium">{item.batch_number || 'No Batch'}</Table.Cell>
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
{:catch error}
	<div class="p-4 space-y-4">
		<div class="text-center text-red-500">
			Error loading inventory: {error.message}
		</div>
	</div>
{/await}

<AdjustmentModal
	bind:open={isModalOpen}
	product={selectedProduct as any}
	productList={selectedProductsForModal as any}
/>
