<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import { getProducts, bulkUpdateProducts } from '$lib/remote/products.remote';
	import { getCategories } from '$lib/remote/categories.remote';
	import { getInventoryItems } from '$lib/remote/inventory.remote';
	import type { Product, BulkProductUpdate } from '$lib/types/product.schema';
	import type { Category } from '$lib/types/category.schema';
	import type { InventoryItem } from '$lib/types/inventory.schema';

	let {
		open = $bindable(),
		productIds,
		onClose
	} = $props<{
		open: boolean;
		productIds: string[];
		onClose?: () => void;
	}>();

	// Get data using remote functions
	const productsQuery = getProducts();
	const inventoryQuery = getInventoryItems({});
	const categoriesQuery = getCategories();

	let category_id = $state('');
	let reorderPoint = $state<number | undefined>(undefined);
	let trackInventory = $state<'yes' | 'no' | 'indeterminate'>('indeterminate');
	let price = $state<number | undefined>(undefined);

	// This will be computed in template context with await pattern
	const selectedProductsCount = $derived(productIds.length);

	$effect(() => {
		if (!open) {
			// Reset form when dialog closes
			category_id = '';
			reorderPoint = undefined;
			trackInventory = 'indeterminate';
			price = undefined;
		}
	});

	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	async function handleSubmit() {
		if (!productIds.length) return;

		isSubmitting = true;
		submitError = null;

		try {
			// Build the updates object based on the schema
			const updates: BulkProductUpdate['updates'] = {};

			if (category_id.trim()) {
				updates.category_id = category_id.trim();
			}
			if (reorderPoint !== undefined && reorderPoint !== null) {
				updates.reorder_point = reorderPoint;
			}
			if (trackInventory !== 'indeterminate') {
				updates.track_inventory = trackInventory === 'yes';
			}
			if (price !== undefined && price !== null) {
				updates.selling_price = price;
			}

			if (Object.keys(updates).length > 0) {
				const bulkUpdateData: BulkProductUpdate = {
					product_ids: productIds,
					updates: updates
				};

				await bulkUpdateProducts(bulkUpdateData);
			}

			// Reset form and close modal
			category_id = '';
			reorderPoint = undefined;
			trackInventory = 'indeterminate';
			price = undefined;
			open = false;
			onClose?.();
		} catch (error: any) {
			submitError = error.message || 'Failed to update products';
		} finally {
			isSubmitting = false;
		}
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
					{#await categoriesQuery}
						<Select.Root type="single" bind:value={category_id} disabled>
							<Select.Trigger class="w-full">
								Loading categories...
							</Select.Trigger>
							<Select.Content></Select.Content>
						</Select.Root>
					{:then categories}
						{@const selectedCategoryLabel = categories.find(c => c.id === category_id)?.name}
						<Select.Root type="single" bind:value={category_id}>
							<Select.Trigger class="w-full" disabled={isSubmitting}>
								{selectedCategoryLabel || 'Select category...'}
							</Select.Trigger>
							<Select.Content>
								{#each categories as category}
									<Select.Item value={category.id} label={category.name}>{category.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{:catch error}
						<p class="text-sm text-destructive">Error loading categories: {error.message}</p>
					{/await}
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
					disabled={isSubmitting}
				/>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="track-inventory" class="text-right">Track Inventory</Label>
				<div class="col-span-3 flex items-center space-x-2">
					<Switch.Root
						id="track-inventory"
						checked={trackInventory === 'yes'}
						data-state={trackInventory === 'indeterminate'
							? 'indeterminate'
							: trackInventory === 'yes'
								? 'checked'
							: 'unchecked'}
					disabled={isSubmitting}
					onCheckedChange={(checked) => {
							trackInventory = checked ? 'yes' : 'no';
						}}
					/>
					<span class="text-sm text-muted-foreground">
						{#if trackInventory === 'indeterminate'}
							Mixed
						{:else}
							{trackInventory === 'yes' ? 'Enabled' : 'Disabled'}
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
						disabled={isSubmitting}
					/>
				</div>
			</div>
		</div>

		{#if submitError}
			<div class="text-red-500 text-sm mb-4 px-4">
			<strong>Error:</strong>
			{submitError}
		</div>
		{/if}

		<Dialog.Footer>
		<Button variant="outline" onclick={() => (open = false)} disabled={isSubmitting}>
			Cancel
		</Button>
		<Button onclick={handleSubmit} disabled={isSubmitting || selectedProductsCount === 0}>
			{#if isSubmitting}
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
