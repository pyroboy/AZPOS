<script lang="ts">
	import type { Product } from '$lib/types';
	import { useModifiers } from '$lib/data/modifier';
	import type { Modifier } from '$lib/types';
	import { cn } from '$lib/utils';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { tick } from 'svelte';

	let {
		product,
		onClose,
		onApply
	}: { product: Product; onClose: () => void; onApply: (selectedModifiers: Modifier[]) => void } =
		$props();

	// Use the modifiers hook
	const { getModifiersForProduct, isLoading } = useModifiers();

	let selectedModifiers = $state<Modifier[]>([]);
	let modifierContainer = $state<HTMLDivElement | undefined>(undefined);
	let applyButton = $state<HTMLButtonElement | undefined>(undefined);

	// Get available modifiers for this product
	const availableModifiers = $derived(getModifiersForProduct(product.id));

	function toggleModifier(modifier: Modifier) {
		const isSelected = selectedModifiers.some((m) => m.id === modifier.id);
		if (isSelected) {
			selectedModifiers = selectedModifiers.filter((m) => m.id !== modifier.id);
		} else {
			selectedModifiers = [...selectedModifiers, modifier];
		}
	}

	function handleApply() {
		onApply(selectedModifiers);
		onClose();
	}

	$effect(() => {
		tick().then(() => {
			if (availableModifiers.length > 0) {
				const firstButton = modifierContainer?.querySelector('button');
				firstButton?.focus();
			} else {
				applyButton?.focus();
			}
		});
	});
</script>

<Dialog.Root open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Select Modifiers for {product.name}</Dialog.Title>
			<Dialog.Description>Choose any additional options for this item.</Dialog.Description>
		</Dialog.Header>

		<div class="py-4 space-y-2">
			{#if isLoading}
				<p class="text-muted-foreground text-center">Loading modifiers...</p>
			{:else if availableModifiers.length === 0}
				<p class="text-muted-foreground text-center">No modifiers available for this product.</p>
			{:else}
				<div bind:this={modifierContainer} class="flex flex-wrap gap-2">
					{#each availableModifiers as modifier (modifier.id)}
						<button
							class={cn(
								'p-2 border rounded-md text-sm transition-colors',
								selectedModifiers.some((m) => m.id === modifier.id)
									? 'bg-primary text-primary-foreground border-primary'
									: 'hover:bg-muted'
							)}
							onclick={() => toggleModifier(modifier)}
						>
							{modifier.name}
							{#if modifier.price_adjustment > 0}
								<span class="text-xs ml-1">+${modifier.price_adjustment.toFixed(2)}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button ref={applyButton} onclick={handleApply}>Apply Modifiers</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
