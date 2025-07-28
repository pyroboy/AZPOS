<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import { inventory, type ProductWithStock } from '$lib/stores/inventoryStore.svelte';
	import { categories } from '$lib/stores/categoryStore.svelte';
	import type { Product } from '$lib/types';
	import { bulkUpdateProducts } from '$lib/stores/productStore.svelte';

	let { open = $bindable(), productIds, onclose } = $props<{ open: boolean; productIds: string[]; onclose: () => void }>();

	let category_id = $state('');
	let reorderPoint = $state<number | undefined>(undefined);
	let requiresBatchTracking = $state<'yes' | 'no' | 'indeterminate'>('indeterminate');

	let selectedCategoryLabel = $derived(categories.find((category) => category.id === category_id)?.name);
	const selectedProductsCount = $derived(productIds.length);

	$effect(() => {
		if (open && productIds.length > 0) {
			const selectedProducts = inventory.filter((p: ProductWithStock) => productIds.includes(p.id));
			const firstProductTracking = selectedProducts[0].requires_batch_tracking;
			const allSame = selectedProducts.every((p: ProductWithStock) => p.requires_batch_tracking === firstProductTracking);
			
			if (allSame) {
				requiresBatchTracking = firstProductTracking ? 'yes' : 'no';
			} else {
				requiresBatchTracking = 'indeterminate';
			}
		} else {
			onclose?.();
		}
	});

	function handleSubmit() {
		if (!productIds.length) return;

		const updates: Partial<Omit<Product, 'id'>> = {};
		if (category_id.trim()) {
			updates.category_id = category_id.trim();
		}
		if (reorderPoint !== undefined && reorderPoint !== null) {
			updates.reorder_point = reorderPoint;
		}
		if (requiresBatchTracking !== 'indeterminate') {
			updates.requires_batch_tracking = requiresBatchTracking === 'yes';
		}

		if (Object.keys(updates).length > 0) {
			bulkUpdateProducts(productIds, updates);
		}

		// Reset form and close modal
		category_id = '';
		reorderPoint = undefined;
		requiresBatchTracking = 'indeterminate';
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title>Bulk Edit Products</Dialog.Title>
			<Dialog.Description>
				Editing {selectedProductsCount} selected item{selectedProductsCount === 1 ? '' : 's'}. Fields left
				blank will not be changed.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-6 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="category_id" class="text-right">Category</Label>
				<div class="col-span-3">
					<Select.Root type="single" bind:value={category_id}>
						<Select.Trigger class="w-full">
							{selectedCategoryLabel}
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
				<Input id="reorder-point" type="number" bind:value={reorderPoint} class="col-span-3" placeholder="e.g. 20" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="requires-batch-tracking" class="text-right">Batch Tracking</Label>
				<div class="col-span-3 flex items-center space-x-2">
					<Switch.Root 
						id="requires-batch-tracking" 
						checked={requiresBatchTracking === 'yes'}
						data-state={requiresBatchTracking === 'indeterminate' ? 'indeterminate' : (requiresBatchTracking === 'yes' ? 'checked' : 'unchecked')}
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
				<Label for="price" class="text-right">Price</Label>
				<div class="col-span-3">
					<Input id="price" type="number" placeholder="Price updates disabled for now" disabled />
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSubmit}>Save Changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

