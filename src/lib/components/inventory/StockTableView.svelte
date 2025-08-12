<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import ImagePreview from '$lib/components/inventory/ImagePreview.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { Product } from '$lib/types/product.schema';

	// Props according to the new pattern
	type Props = {
		products: Product[];
		selectedProductIds?: string[];
	};

	let { products, selectedProductIds = $bindable([]) }: Props = $props();

	// Helper functions for display
	const colors = [
		'#ffadad',
		'#ffd6a5',
		'#fdffb6',
		'#caffbf',
		'#9bf6ff',
		'#a0c4ff',
		'#bdb2ff',
		'#ffc6ff'
	];

	function getInitials(name: string): string {
		return name.substring(0, 2).toUpperCase();
	}

	function getRandomColor(id: string): string {
		// Simple hash function to get a consistent color based on product ID
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash % colors.length);
		return colors[index];
	}

	// Handle selection changes
	function handleSelectProduct(productId: string, checked: boolean): void {
		if (checked) {
			selectedProductIds = [...selectedProductIds, productId];
		} else {
			selectedProductIds = selectedProductIds.filter((id) => id !== productId);
		}
	}

	function handleSelectAll(checked: boolean): void {
		if (checked) {
			selectedProductIds = products.map((p) => p.id);
		} else {
			selectedProductIds = [];
		}
	}

	// Derived state for select all checkbox
	const isAllSelected = $derived(
		products.length > 0 && selectedProductIds.length === products.length
	);
	const isIndeterminate = $derived(
		selectedProductIds.length > 0 && selectedProductIds.length < products.length
	);
</script>

<Table.Root class="rounded-lg border bg-card text-card-foreground shadow-sm">
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[50px]">
				<Checkbox
					checked={isAllSelected}
					indeterminate={isIndeterminate}
					onCheckedChange={handleSelectAll}
					aria-label="Select all products"
				/>
			</Table.Head>
			<Table.Head class="w-[80px]">Image</Table.Head>
			<Table.Head>Name</Table.Head>
			<Table.Head>SKU</Table.Head>
			<Table.Head>Category</Table.Head>
			<Table.Head class="text-right">Stock</Table.Head>
			<Table.Head class="text-right">Price</Table.Head>
		</Table.Row>
	</Table.Header>

	<Table.Body>
		{#each products as product (product.id)}
			<Table.Row>
				<Table.Cell>
					<Checkbox
						checked={selectedProductIds.includes(product.id)}
						onCheckedChange={(checked) => handleSelectProduct(product.id, checked)}
						aria-label={`Select ${product.name}`}
					/>
				</Table.Cell>
				<Table.Cell>
					{#if product.image_url}
						<ImagePreview
							src={product.image_url}
							fallbackSrc={product.image_url}
							alt={product.name}
							{product}
						/>
					{:else}
						<div
							class="flex h-10 w-10 items-center justify-center rounded-md text-xs font-medium text-white"
							style="background-color: {getRandomColor(product.id)}"
						>
							{getInitials(product.name)}
						</div>
					{/if}
				</Table.Cell>
				<Table.Cell class="font-medium">{product.name}</Table.Cell>
				<Table.Cell>{product.sku}</Table.Cell>
				<Table.Cell>{product.category_id}</Table.Cell>
				<Table.Cell class="text-right">{product.stock_quantity || 0}</Table.Cell>
				<Table.Cell class="text-right">${(product.selling_price || 0).toFixed(2)}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
