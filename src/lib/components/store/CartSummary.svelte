<!-- Agent: agent_coder | File: CartSummary.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { ShoppingCart, Tag, CreditCard } from 'lucide-svelte';
	import type { CartTotals } from '$lib/stores/cartStore.svelte';
	
	// Props interface
	interface Props {
		cartTotals: CartTotals;
		onContinueShopping?: (event?: MouseEvent) => void;
		onProceedToCheckout?: (event?: MouseEvent) => void;
	}
	
	// Props
	let { 
		cartTotals,
		onContinueShopping = () => {},
		onProceedToCheckout = () => {}
	}: Props = $props();
	
	// Local state for discount code
	let discountCode = $state('');
	let applyingDiscount = $state(false);
	let discountError = $state('');
	
	// Format price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'PHP'
		}).format(price);
	}
	
	// Apply discount code
	async function applyDiscountCode() {
		if (!discountCode.trim() || applyingDiscount) return;
		
		try {
			applyingDiscount = true;
			discountError = '';
			
			// TODO: Implement actual discount code validation
			// For now, simulate API call
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// Mock validation - in real implementation this would call an API
			if (discountCode.toLowerCase() === 'save10') {
				// Apply 10% discount
				// cart.applyDiscount({ type: 'percentage', value: 10 });
				discountCode = '';
			} else {
				discountError = 'Invalid discount code';
			}
			
		} catch (error) {
			discountError = 'Failed to apply discount code';
		} finally {
			applyingDiscount = false;
		}
	}
	
	// Handle Enter key in discount input
	function handleDiscountKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			applyDiscountCode();
		}
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<ShoppingCart class="h-5 w-5" />
			Order Summary
		</CardTitle>
	</CardHeader>
	
	<CardContent class="space-y-4">
		<!-- Item Count -->
		<div class="flex justify-between text-sm">
			<span>Items ({cartTotals.item_count})</span>
			<span>{formatPrice(cartTotals.subtotal)}</span>
		</div>
		
		<!-- Discount Code Section -->
		<div class="space-y-2">
			<Label for="discount-code" class="text-sm font-medium flex items-center gap-2">
				<Tag class="h-4 w-4" />
				Discount Code
			</Label>
			<div class="flex gap-2">
				<Input
					id="discount-code"
					type="text"
					placeholder="Enter code"
					bind:value={discountCode}
					onkeydown={handleDiscountKeydown}
					class="flex-1"
				/>
				<Button 
					variant="outline" 
					size="sm"
					onclick={applyDiscountCode}
					disabled={!discountCode.trim() || applyingDiscount}
				>
					{applyingDiscount ? 'Applying...' : 'Apply'}
				</Button>
			</div>
			{#if discountError}
				<p class="text-sm text-destructive">{discountError}</p>
			{/if}
		</div>
		
		<Separator />
		
		<!-- Pricing Breakdown -->
		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Subtotal</span>
				<span>{formatPrice(cartTotals.subtotal)}</span>
			</div>
			
			{#if cartTotals.discount_amount > 0}
				<div class="flex justify-between text-sm text-green-600">
					<span>Discount</span>
					<span>-{formatPrice(cartTotals.discount_amount)}</span>
				</div>
			{/if}
			
			<div class="flex justify-between text-sm">
				<span>Tax (12%)</span>
				<span>{formatPrice(cartTotals.tax)}</span>
			</div>
			
			<Separator />
			
			<div class="flex justify-between font-bold text-lg">
				<span>Total</span>
				<span>{formatPrice(cartTotals.total)}</span>
			</div>
		</div>
		
		<!-- Savings Badge -->
		{#if cartTotals.discount_amount > 0}
			<div class="text-center">
				<Badge variant="secondary" class="bg-green-100 text-green-800">
					You saved {formatPrice(cartTotals.discount_amount)}!
				</Badge>
			</div>
		{/if}
		
		<Separator />
		
		<!-- Action Buttons -->
		<div class="space-y-2">
			<Button 
				class="w-full gap-2" 
				size="lg"
				onclick={onProceedToCheckout}
			>
				<CreditCard class="h-5 w-5" />
				Proceed to Checkout
			</Button>
			
			<Button 
				variant="outline" 
				class="w-full" 
				onclick={onContinueShopping}
			>
				Continue Shopping
			</Button>
		</div>
		
		<!-- Security/Trust Indicators -->
		<div class="text-center pt-2">
			<div class="text-xs text-muted-foreground space-y-1">
				<div class="flex items-center justify-center gap-1">
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
					</svg>
					<span>Secure Checkout</span>
				</div>
				<div>Free shipping on orders over $50</div>
			</div>
		</div>
	</CardContent>
</Card>
