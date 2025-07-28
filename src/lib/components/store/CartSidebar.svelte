<!-- Agent: agent_coder | File: CartSidebar.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { cart } from '$lib/stores/cartStore';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '$lib/components/ui/sheet';
	import { Separator } from '$lib/components/ui/separator';
	import { ShoppingCart, Minus, Plus, Trash2, X } from 'lucide-svelte';
	
	// Props
	let { 
		open = $bindable(false)
	} = $props();
	
	// Reactive cart state
	let cartState = $derived($cart);
	let cartTotals = $derived(cart.totals);
	
	// Format price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}
	
	// Update item quantity
	function updateQuantity(itemId: string, newQuantity: number): void {
		if (newQuantity <= 0) {
			cart.removeItem(itemId);
		} else {
			cart.updateQuantity(itemId, newQuantity);
		}
	}
	
	// Remove item from cart
	function removeItem(itemId: string): void {
		cart.removeItem(itemId);
	}
	
	// Navigate to checkout
	function goToCheckout() {
		open = false;
		window.location.href = '/store/checkout';
	}
	
	// Continue shopping
	function continueShopping() {
		open = false;
	}
</script>

<Sheet bind:open>
	<SheetContent side="right" class="w-full sm:max-w-lg">
		<SheetHeader>
			<SheetTitle class="flex items-center gap-2">
				<ShoppingCart class="h-5 w-5" />
				Shopping Cart
				{#if $cartTotals.item_count > 0}
					<Badge variant="secondary">{$cartTotals.item_count} items</Badge>
				{/if}
			</SheetTitle>
		</SheetHeader>
		
		<div class="flex flex-col h-full">
			<!-- Cart Items -->
			<div class="flex-1 overflow-y-auto py-4">
				{#if cartState.items.length === 0}
					<!-- Empty Cart State -->
					<div class="flex flex-col items-center justify-center h-full text-center py-12">
						<div class="text-6xl mb-4">🛒</div>
						<h3 class="text-lg font-semibold mb-2">Your cart is empty</h3>
						<p class="text-muted-foreground mb-4">Add some products to get started</p>
						<Button onclick={continueShopping}>
							Continue Shopping
						</Button>
					</div>
				{:else}
					<!-- Cart Items List -->
					<div class="space-y-4">
						{#each cartState.items as item (item.cart_item_id)}
							<div class="flex gap-3 p-3 border rounded-lg">
								<!-- Product Image -->
								<div class="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
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
									<h4 class="font-medium text-sm line-clamp-2 mb-1">
										{item.product_name}
									</h4>
									<p class="text-xs text-muted-foreground mb-2">
										SKU: {item.product_sku}
									</p>
									
									<!-- Modifiers -->
									{#if item.selected_modifiers && item.selected_modifiers.length > 0}
										<div class="text-xs text-muted-foreground mb-2">
											{item.selected_modifiers.map(m => m.modifier_name).join(', ')}
										</div>
									{/if}
									
									<!-- Notes -->
									{#if item.notes}
										<div class="text-xs text-muted-foreground mb-2 italic">
											Note: {item.notes}
										</div>
									{/if}
									
									<!-- Quantity Controls -->
									<div class="flex items-center gap-2 mb-2">
										<Button
											variant="outline"
											size="icon"
											class="h-6 w-6"
											onclick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
										>
											<Minus class="h-3 w-3" />
										</Button>
										
										<span class="text-sm font-medium w-8 text-center">
											{item.quantity}
										</span>
										
										<Button
											variant="outline"
											size="icon"
											class="h-6 w-6"
											onclick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
											disabled={item.quantity >= 999}
										>
											<Plus class="h-3 w-3" />
										</Button>
										
										<Button
											variant="ghost"
											size="icon"
											class="h-6 w-6 text-destructive hover:text-destructive"
											onclick={() => removeItem(item.cart_item_id)}
										>
											<Trash2 class="h-3 w-3" />
										</Button>
									</div>
									
									<!-- Price -->
									<div class="flex items-center justify-between">
										<span class="text-xs text-muted-foreground">
											{formatPrice(item.base_price)} each
										</span>
										<span class="font-semibold text-sm">
											{formatPrice(item.final_price)}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Cart Summary (only show if items exist) -->
			{#if cartState.items.length > 0}
				<div class="border-t pt-4 space-y-4">
					<!-- Totals -->
					<div class="space-y-2">
						<div class="flex justify-between text-sm">
							<span>Subtotal</span>
							<span>{formatPrice($cartTotals.subtotal)}</span>
						</div>
						
						{#if $cartTotals.discount_amount > 0}
							<div class="flex justify-between text-sm text-green-600">
								<span>Discount</span>
								<span>-{formatPrice($cartTotals.discount_amount)}</span>
							</div>
						{/if}
						
						<div class="flex justify-between text-sm">
							<span>Tax</span>
							<span>{formatPrice($cartTotals.tax)}</span>
						</div>
						
						<Separator />
						
						<div class="flex justify-between font-semibold">
							<span>Total</span>
							<span>{formatPrice($cartTotals.total)}</span>
						</div>
					</div>
					
					<!-- Action Buttons -->
					<div class="space-y-2">
						<Button class="w-full" onclick={goToCheckout}>
							Proceed to Checkout
						</Button>
						<Button variant="outline" class="w-full" onclick={continueShopping}>
							Continue Shopping
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</SheetContent>
</Sheet>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		overflow: hidden;
	}
</style>
