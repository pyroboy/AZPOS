<script lang="ts">
	import {
		discounts,
		addDiscount,
		updateDiscount,
		toggleActivation,
		deleteDiscount
	} from '$lib/stores/discountStore.svelte';
	import type { Discount } from '$lib/schemas/models';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { tick } from 'svelte';

	let {
		open = $bindable(false),
		onApply
	}: {
		open?: boolean;
		onApply: (discount: Discount) => void;
	} = $props();

	const activeDiscounts = $derived(discounts.filter((d) => d.is_active));
	let selectedDiscountId = $state<string | undefined>(undefined);
	let focusContainer = $state<HTMLDivElement | undefined>(undefined);

	$effect(() => {
		if (open) {
			tick().then(() => {
				focusContainer?.focus();
			});
		}
	});

	function handleApply() {
		if (selectedDiscountId) {
			const selectedDiscount = activeDiscounts.find((d) => d.id === selectedDiscountId);
			if (selectedDiscount) {
				onApply(selectedDiscount);
				open = false;
			}
		}
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>Apply Discount</DialogTitle>
			<DialogDescription>Select an active discount to apply to the order.</DialogDescription>
		</DialogHeader>

		{#if activeDiscounts.length > 0}
			<div
				bind:this={focusContainer}
				tabindex="-1"
				class="max-h-[60vh] overflow-y-auto py-4 outline-none"
			>
				<RadioGroup bind:value={selectedDiscountId} class="gap-4">
					{#each activeDiscounts as discount (discount.id)}
						<div
							class="flex items-center space-x-2 rounded-md border p-4 hover:bg-accent hover:text-accent-foreground"
						>
							<RadioGroupItem value={discount.id} id={discount.id} />
							<Label for={discount.id} class="flex-1 cursor-pointer">
								<div class="font-medium">{discount.name}</div>
								<div class="text-sm text-muted-foreground">
									{discount.type === 'percentage'
										? `${discount.value}% off`
										: `$${discount.value.toFixed(2)} off`}
								</div>
							</Label>
						</div>
					{/each}
				</RadioGroup>
			</div>
		{:else}
			<div class="py-4 text-center text-muted-foreground">
				<p>No active discounts available.</p>
			</div>
		{/if}

		<DialogFooter>
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button onclick={handleApply} disabled={!selectedDiscountId || activeDiscounts.length === 0}
				>Apply</Button
			>
		</DialogFooter>
	</DialogContent>
</Dialog>
