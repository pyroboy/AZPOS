<script lang="ts">
	
	import type { Product, ProductBatch } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
	import { Badge } from '$lib/components/ui/badge';

	let { 
		product,
		batches,
		onClose,
		onSelect
	}: {
		product: Product;
		batches: ProductBatch[];
		onClose: () => void;
		onSelect: (e: CustomEvent<{ product: Product; batch: ProductBatch }>) => void;
	} = $props();

	function handleSelect(batch: ProductBatch) {
		const event = new CustomEvent('select', { detail: { product, batch } });
		onSelect(event);
	}

	function isExpired(expirationDate?: string) {
		if (!expirationDate) return false;
		return new Date(expirationDate) < new Date();
	}
</script>

<div role="dialog" aria-modal="true" tabindex="-1" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onkeydown={handleKeydown}>
	<div role="document" class="w-full max-w-md">
		<Card>
			<CardHeader>
				<CardTitle>Select a Batch for: {product.name}</CardTitle>
				<p class="text-sm text-muted-foreground">Choose which batch to sell from. Batches are sorted by expiration date (FIFO).</p>
			</CardHeader>
			<CardContent class="max-h-[60vh] overflow-y-auto space-y-3">
				{#each batches as batch (batch.id)}
					<button 
						type="button"
						class="p-4 border-b cursor-pointer hover:bg-muted/50 text-left w-full"
						onclick={() => handleSelect(batch)}
					>
						<p class="font-semibold">Batch #: {batch.batch_number}</p>
						<p class="text-sm text-muted-foreground">Quantity: {batch.quantity_on_hand}</p>
						{#if batch.expiration_date}
							<p class="text-sm text-muted-foreground">Expires: {batch.expiration_date}</p>
						{/if}
					</button>
				{/each}
			</CardContent>
			<CardFooter class="flex justify-end pt-4">
				<Button variant="outline" onclick={onClose}>Cancel</Button>
			</CardFooter>
		</Card>
	</div>
</div>
