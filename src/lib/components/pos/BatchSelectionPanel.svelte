<script lang="ts">
	import type { Product, ProductBatch } from '$lib/types';
	import { productBatches } from '$lib/stores/productBatchStore';
	import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';

	let { open = $bindable(), product, onSelect }: {
		open?: boolean;
		product: Product | null;
		onSelect: (batch: ProductBatch) => void;
	} = $props();

	let batches: ProductBatch[] = $state([]);
	let selectedBatchId = $state<string | undefined>(undefined);

	$effect(() => {
		if (open && product) {
			const sortedBatches = $productBatches
				.filter((b) => b.product_id === product.id && b.quantity_on_hand > 0)
				.sort((a: ProductBatch, b: ProductBatch) => {
					const dateA = a.expiration_date ? new Date(a.expiration_date).getTime() : Infinity;
					const dateB = b.expiration_date ? new Date(b.expiration_date).getTime() : Infinity;
					return dateA - dateB;
				});
			batches = sortedBatches;
			selectedBatchId = sortedBatches.length > 0 ? sortedBatches[0].id : undefined;
		} else {
			batches = [];
			selectedBatchId = undefined;
		}
	});

	function handleCancel() {
		open = false;
	}

	function handleSelect() {
		if (selectedBatchId) {
			const selectedBatch = batches.find(b => b.id === selectedBatchId);
			if (selectedBatch) {
				onSelect(selectedBatch);
				open = false;
			}
		}
	}
</script>

<Sheet bind:open>
	<SheetContent>
		<SheetHeader>
			<SheetTitle>Select Batch for {product?.name ?? 'Product'}</SheetTitle>
			<SheetDescription>
				Choose a batch to add to the cart. Batches are sorted by the soonest expiration date.
			</SheetDescription>
		</SheetHeader>

		{#if batches.length > 0}
			<div class="py-4">
				<RadioGroup bind:value={selectedBatchId} class="gap-4">
					{#each batches as batch (batch.id)}
						<div class="flex items-center space-x-2 rounded-md border p-4 hover:bg-accent hover:text-accent-foreground">
							<RadioGroupItem value={batch.id} id={batch.id} />
							<Label for={batch.id} class="flex-1 cursor-pointer">
								<div class="font-medium">Batch: {batch.batch_number}</div>
								<div class="text-sm text-muted-foreground">
									<span>Qty: {batch.quantity_on_hand}</span>
									{#if batch.expiration_date}
										<span class="ml-4">Expires: {new Date(batch.expiration_date).toLocaleDateString()}</span>
									{/if}
								</div>
							</Label>
						</div>
					{/each}
				</RadioGroup>
			</div>
		{:else}
			<div class="py-4 text-center text-muted-foreground">
				<p>No available batches for this product.</p>
			</div>
		{/if}

		<SheetFooter>
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button onclick={handleSelect} disabled={!selectedBatchId}>Add to Cart</Button>
		</SheetFooter>
	</SheetContent>
</Sheet>
