<!-- Agent: agent_coder | File: CartItemCard.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { cart } from '$lib/stores/cartStore';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Plus, Minus, Trash2, Edit3 } from 'lucide-svelte';
	
	// Props
	let { item } = $props();
	
	// Local state
	let editingNotes = $state(false);
	let tempNotes = $state(item.notes || '');
	
	// Format price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}
	
	// Update quantity
	function updateQuantity(newQuantity: number): void {
		if (newQuantity <= 0) {
			removeItem();
		} else {
			cart.updateQuantity(item.cart_item_id, newQuantity);
		}
	}
	
	// Remove item
	function removeItem() {
		if (confirm(`Remove ${item.product_name} from cart?`)) {
			cart.removeItem(item.cart_item_id);
		}
	}
	
	// Handle notes editing
	function startEditingNotes(): void {
		tempNotes = item.notes || '';
		editingNotes = true;
	}
	
	function saveNotes(): void {
		cart.updateNotes(item.cart_item_id, tempNotes);
		editingNotes = false;
	}
	
	function cancelEditingNotes(): void {
		editingNotes = false;
		tempNotes = item.notes || '';
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
			updateQuantity(value);
		}
	}
</script>

<div class="flex gap-4 p-4 border rounded-lg">
	<!-- Product Image -->
	<div class="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
		{#if item.image_url}
			<img 
				src={item.image_url} 
				alt={item.product_name}
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
			<h3 class="font-semibold text-lg mb-1">{item.product_name}</h3>
			<p class="text-sm text-muted-foreground">SKU: {item.product_sku}</p>
		</div>
		
		<!-- Modifiers -->
		{#if item.selected_modifiers && item.selected_modifiers.length > 0}
			<div class="mb-2">
				<div class="flex flex-wrap gap-1">
					{#each item.selected_modifiers as modifier}
						<Badge variant="secondary" class="text-xs">
							{modifier.modifier_name}
							{#if modifier.price_adjustment !== 0}
								({modifier.price_adjustment > 0 ? '+' : ''}{formatPrice(modifier.price_adjustment)})
							{/if}
						</Badge>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- Applied Discounts -->
		{#if item.applied_discounts && item.applied_discounts.length > 0}
			<div class="mb-2">
				<div class="flex flex-wrap gap-1">
					{#each item.applied_discounts as discount}
						<Badge variant="outline" class="text-xs text-green-600">
							{discount.discount_name} (-{formatPrice(discount.discount_amount)})
						</Badge>
					{/each}
				</div>
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
					/>
					<div class="flex items-center justify-between">
						<span class="text-xs text-muted-foreground">
							{tempNotes.length}/500 characters
						</span>
						<div class="flex gap-2">
							<Button size="sm" onclick={saveNotes}>Save</Button>
							<Button size="sm" variant="outline" onclick={cancelEditingNotes}>Cancel</Button>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex items-start gap-2">
					{#if item.notes}
						<div class="flex-1">
							<p class="text-sm text-muted-foreground italic">
								"{item.notes}"
							</p>
						</div>
					{:else}
						<div class="flex-1">
							<p class="text-sm text-muted-foreground">
								No special instructions
							</p>
						</div>
					{/if}
					<Button 
						size="sm" 
						variant="ghost" 
						onclick={startEditingNotes}
						class="h-6 w-6 p-0"
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
					onclick={() => updateQuantity(item.quantity - 1)}
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
				/>
				
				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8"
					onclick={() => updateQuantity(item.quantity + 1)}
					disabled={item.quantity >= 999}
				>
					<Plus class="h-3 w-3" />
				</Button>
			</div>
			
			<!-- Pricing -->
			<div class="text-right">
				<div class="text-sm text-muted-foreground">
					{formatPrice(item.base_price)} each
				</div>
				<div class="font-semibold text-lg">
					{formatPrice(item.final_price)}
				</div>
			</div>
		</div>
		
		<!-- Remove Button -->
		<div class="mt-3 flex justify-end">
			<Button
				variant="ghost"
				size="sm"
				onclick={removeItem}
				class="text-destructive hover:text-destructive gap-2"
			>
				<Trash2 class="h-4 w-4" />
				Remove
			</Button>
		</div>
	</div>
</div>
