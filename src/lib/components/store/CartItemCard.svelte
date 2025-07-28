<!-- Agent: agent_coder | File: CartItemCard.svelte | Last Updated: 2025-07-28T17:52:00+08:00 -->
<script lang="ts">
	import { useGroceryCart } from '$lib/data/groceryCart';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Plus, Minus, Trash2, Edit3 } from 'lucide-svelte';
	import type { GroceryCartItem } from '$lib/types/groceryCart.schema';

	// Props
	let { item }: { item: GroceryCartItem } = $props();

	// Get grocery cart actions from the hook
	const {
		updateQuantity,
		updateSpecialInstructions,
		removeItem,
		isUpdatingItem,
		isRemovingItem,
		updateItemStatus
	} = useGroceryCart();

	// Local state
	let editingNotes = $state(false);
	let tempNotes = $state(item.special_instructions || '');

	// Format price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}

	// Update quantity handler
	function handleUpdateQuantity(newQuantity: number): void {
		if (newQuantity <= 0) {
			handleRemoveItem();
		} else {
			updateQuantity(item.id, newQuantity);
		}
	}

	// Remove item handler
	function handleRemoveItem() {
		if (confirm(`Remove ${item.product?.name || 'this item'} from cart?`)) {
			removeItem(item.id);
		}
	}

	// Handle notes editing
	function startEditingNotes(): void {
		tempNotes = item.special_instructions || '';
		editingNotes = true;
	}

	function saveNotes(): void {
		updateSpecialInstructions(item.id, tempNotes);
		editingNotes = false;
	}

	function cancelEditingNotes(): void {
		editingNotes = false;
		tempNotes = item.special_instructions || '';
	}

	function handleNotesKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveNotes();
		} else if (event.key === 'Escape') {
			cancelEditingNotes();
		}
	}

	// Handle direct quantity input
	function handleQuantityInput(event: Event): void {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value);
		if (!isNaN(value) && value >= 0 && value <= 999) {
			handleUpdateQuantity(value);
		}
	}

	// Derived states for UI feedback
	const isUpdating = $derived(isUpdatingItem && updateItemStatus === 'pending');
	const isRemoving = $derived(isRemovingItem && updateItemStatus === 'pending');
</script>

<div class="flex gap-4 p-4 border rounded-lg">
	<!-- Product Image -->
	<div class="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
		{#if item.product?.image_url}
			<img
				src={item.product.image_url}
				alt={item.product.name}
				class="w-full h-full object-cover"
			/>
		{:else}
			<div class="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
				No Image
			</div>
		{/if}
	</div>

	<!-- Item Details -->
	<div class="flex-1 min-w-0">
		<!-- Product Name and SKU -->
		<div class="mb-2">
			<h3 class="font-semibold text-lg mb-1">{item.product?.name || 'Unknown Product'}</h3>
			<p class="text-sm text-muted-foreground">SKU: {item.product?.sku || 'N/A'}</p>
			{#if item.product?.category_name}
				<p class="text-xs text-muted-foreground">{item.product.category_name}</p>
			{/if}
		</div>

		<!-- Product Availability Status -->
		{#if item.product}
			<div class="mb-2">
				{#if item.product.is_available}
					<Badge variant="secondary" class="text-xs text-green-600">
						In Stock ({item.product.stock_quantity || 0} available)
					</Badge>
				{:else}
					<Badge variant="destructive" class="text-xs">Out of Stock</Badge>
				{/if}

				{#if item.substitution_allowed}
					<Badge variant="outline" class="text-xs ml-1">Substitutions OK</Badge>
				{/if}
			</div>
		{/if}

		<!-- Notes Section -->
		<div class="mb-3">
			{#if editingNotes}
				<div class="space-y-2">
					<Textarea
						bind:value={tempNotes}
						placeholder="Add special instructions..."
						maxlength={500}
						class="text-sm"
						rows={2}
						onkeydown={handleNotesKeydown}
					/>
					<div class="flex items-center justify-between">
						<span class="text-xs text-muted-foreground">
							{tempNotes.length}/500 characters
						</span>
						<div class="flex gap-2">
							<Button size="sm" onclick={saveNotes} disabled={isUpdating}>
								{isUpdating ? 'Saving...' : 'Save'}
							</Button>
							<Button size="sm" variant="outline" onclick={cancelEditingNotes}>Cancel</Button>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex items-start gap-2">
					{#if item.special_instructions}
						<div class="flex-1">
							<p class="text-sm text-muted-foreground italic">
								"{item.special_instructions}"
							</p>
						</div>
					{:else}
						<div class="flex-1">
							<p class="text-sm text-muted-foreground">No special instructions</p>
						</div>
					{/if}
					<Button
						size="sm"
						variant="ghost"
						onclick={startEditingNotes}
						class="h-6 w-6 p-0"
						disabled={isUpdating}
					>
						<Edit3 class="h-3 w-3" />
					</Button>
				</div>
			{/if}
		</div>

		<Separator class="my-3" />

		<!-- Quantity Controls and Pricing -->
		<div class="flex items-center justify-between">
			<!-- Quantity Controls -->
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium">Qty:</span>
				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8"
					onclick={() => handleUpdateQuantity(item.quantity - 1)}
					disabled={isUpdating || item.quantity <= 1}
				>
					<Minus class="h-3 w-3" />
				</Button>

				<Input
					type="number"
					min="1"
					max="999"
					value={item.quantity}
					oninput={handleQuantityInput}
					class="w-16 h-8 text-center text-sm"
					disabled={isUpdating}
				/>

				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8"
					onclick={() => handleUpdateQuantity(item.quantity + 1)}
					disabled={isUpdating || item.quantity >= 999 || !item.product?.is_available}
				>
					<Plus class="h-3 w-3" />
				</Button>
			</div>

			<!-- Pricing -->
			<div class="text-right">
				<div class="text-sm text-muted-foreground">
					{formatPrice(item.product?.price || 0)} each
				</div>
				<div class="font-semibold text-lg">
					{formatPrice((item.product?.price || 0) * item.quantity)}
				</div>
			</div>
		</div>

		<!-- Remove Button -->
		<div class="mt-3 flex justify-end">
			<Button
				variant="ghost"
				size="sm"
				onclick={handleRemoveItem}
				class="text-destructive hover:text-destructive gap-2"
				disabled={isRemoving}
			>
				<Trash2 class="h-4 w-4" />
				{isRemoving ? 'Removing...' : 'Remove'}
			</Button>
		</div>
	</div>
</div>
