<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import { useProducts } from '$lib/data/product';
	import { useCategories } from '$lib/data/category.svelte';
	import { useInventory } from '$lib/data/inventory';
	import type { Product, BulkProductUpdate } from '$lib/types/product.schema';
	import type { Category } from '$lib/types/category.schema';
	import type { InventoryItem } from '$lib/types/inventory.schema';

	let {
		open = $bindable(),
		productIds,
		categories = [],
		onClose
	} = $props<{
		open: boolean;
		productIds: string[];
		categories?: Category[];
		onClose?: () => void;
	}>();

	// Get TanStack Query hooks
	const { products, bulkUpdate, isBulkUpdating, bulkUpdateError } = useProducts();
	const { inventoryItems } = useInventory();

	let category_id = $state('');
	let reorderPoint = $state<number | undefined>(undefined);
	let requiresBatchTracking = $state<'yes' | 'no' | 'indeterminate'>('indeterminate');
	let price = $state<number | undefined>(undefined);

	const selectedCategoryLabel = $derived(
		categories.find((category: Category) => category.id === category_id)?.name
	);
	const selectedProductsCount = $derived(productIds.length);

	// Get selected products for preview
	const selectedProducts = $derived(products().filter((p: Product) => productIds.includes(p.id)));
	const selectedInventoryItems = $derived(
		inventoryItems().filter((item: InventoryItem) => productIds.includes(item.product_id))
	);

	$effect(() => {
		if (open && productIds.length > 0 && selectedProducts.length > 0) {
			// Check if all selected products have batch tracking enabled
			// Note: batch tracking is determined by the presence of batch_number in inventory items
			const productHasBatches = selectedInventoryItems.some(
				(item: InventoryItem) => item.batch_number
			);

			// For now, we'll default to 'indeterminate' since requires_batch_tracking
			// is not part of the current product schema
			requiresBatchTracking = 'indeterminate';
		} else if (!open) {
			// Reset form when dialog closes
			category_id = '';
			reorderPoint = undefined;
			requiresBatchTracking = 'indeterminate';
			price = undefined;
		}
	});

	function handleSubmit() {
		if (!productIds.length) return;

		// Build the updates object based on the schema
		const updates: BulkProductUpdate['updates'] = {};

		if (category_id.trim()) {
			updates.category_id = category_id.trim();
		}
		if (reorderPoint !== undefined && reorderPoint !== null) {
			// Note: reorder_point might need to be handled separately as it's not in the bulk update schema
			// For now, we'll include it as a custom field
			(updates as any).reorder_point = reorderPoint;
		}
		if (requiresBatchTracking !== 'indeterminate') {
			// Note: requires_batch_tracking might need to be handled separately as it's not in the bulk update schema
			(updates as any).requires_batch_tracking = requiresBatchTracking === 'yes';
		}
		if (price !== undefined && price !== null) {
			updates.selling_price = price;
		}

		if (Object.keys(updates).length > 0) {
			const bulkUpdateData: BulkProductUpdate = {
				product_ids: productIds,
				updates: updates
			};

			bulkUpdate(bulkUpdateData);
		}

		// Reset form and close modal
		category_id = '';
		reorderPoint = undefined;
		requiresBatchTracking = 'indeterminate';
		price = undefined;
		open = false;
		onClose?.();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title>Bulk Edit Products</Dialog.Title>
			<Dialog.Description>
				Editing {selectedProductsCount} selected item{selectedProductsCount === 1 ? '' : 's'}.
				Fields left blank will not be changed.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-6 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="category_id" class="text-right">Category</Label>
				<div class="col-span-3">
					<Select.Root type="single" bind:value={category_id}>
						<Select.Trigger class="w-full" disabled={isBulkUpdating()}>
							{selectedCategoryLabel || 'Select category...'}
						</Select.Trigger>
						<Select.Content>
							{#each categories as category}
								<Select.Item value={category.id} label={category.name}>{category.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="reorder-point" class="text-right">Reorder Point</Label>
				<Input
					id="reorder-point"
					type="number"
					bind:value={reorderPoint}
					class="col-span-3"
					placeholder="e.g. 20"
					min="0"
					disabled={isBulkUpdating()}
				/>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="requires-batch-tracking" class="text-right">Batch Tracking</Label>
				<div class="col-span-3 flex items-center space-x-2">
					<Switch.Root
						id="requires-batch-tracking"
						checked={requiresBatchTracking === 'yes'}
						data-state={requiresBatchTracking === 'indeterminate'
							? 'indeterminate'
							: requiresBatchTracking === 'yes'
								? 'checked'
							: 'unchecked'}
					disabled={isBulkUpdating()}
					onCheckedChange={(checked) => {
							requiresBatchTracking = checked ? 'yes' : 'no';
						}}
					/>
					<span class="text-sm text-muted-foreground">
						{#if requiresBatchTracking === 'indeterminate'}
							Mixed
						{:else}
							{requiresBatchTracking === 'yes' ? 'Enabled' : 'Disabled'}
						{/if}
					</span>
				</div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="price" class="text-right">Selling Price</Label>
				<div class="col-span-3">
					<Input
						id="price"
						type="number"
						bind:value={price}
						class="col-span-3"
						placeholder="e.g. 29.99"
						step="0.01"
						min="0"
						disabled={isBulkUpdating()}
					/>
				</div>
			</div>
		</div>

		{#if bulkUpdateError}
			<div class="text-red-500 text-sm mb-4 px-4">
			<strong>Error:</strong>
			{bulkUpdateError()?.message || 'Failed to update products'}
		</div>
		{/if}

		<Dialog.Footer>
		<Button variant="outline" onclick={() => (open = false)} disabled={isBulkUpdating()}>
			Cancel
		</Button>
		<Button onclick={handleSubmit} disabled={isBulkUpdating() || selectedProductsCount === 0}>
			{#if isBulkUpdating()}
				<div class="flex items-center space-x-2">
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						<span>Updating...</span>
					</div>
				{:else}
					Save Changes
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
