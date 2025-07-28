<!-- Agent: agent_coder | File: OrderReview.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ShoppingBag } from 'lucide-svelte';
	
	// Props
	let { 
		items = [],
		totals
	} = $props();
	
	// Format price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}
	
	// Get total items count
	let totalItemsCount = $derived(items.reduce((sum, item) => sum + item.quantity, 0));
</script>

<div class="space-y-6">
	<!-- Order Items -->
	<div>
		<div class="flex items-center gap-2 mb-4">
			<ShoppingBag class="h-5 w-5" />
			<h3 class="text-lg font-semibold">
				Order Items ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
			</h3>
		</div>
		
		<div class="space-y-3">
			{#each items as item (item.cart_item_id)}
				<Card>
					<CardContent class="p-4">
						<div class="flex gap-4">
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
								<div class="flex justify-between items-start mb-2">
									<div>
										<h4 class="font-medium">{item.product_name}</h4>
										<p class="text-sm text-muted-foreground">SKU: {item.product_sku}</p>
									</div>
									<div class="text-right">
										<div class="font-semibold">{formatPrice(item.final_price)}</div>
										<div class="text-sm text-muted-foreground">
											{formatPrice(item.base_price)} × {item.quantity}
										</div>
									</div>
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
								
								<!-- Notes -->
								{#if item.notes}
									<div class="mt-2 p-2 bg-muted rounded-md">
										<p class="text-sm text-muted-foreground italic">
											<strong>Note:</strong> {item.notes}
										</p>
									</div>
								{/if}
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	</div>
	
	<!-- Order Summary -->
	<Card>
		<CardHeader>
			<CardTitle>Order Summary</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-3">
				<div class="flex justify-between">
					<span>Subtotal ({totalItemsCount} items)</span>
					<span>{formatPrice(totals.subtotal)}</span>
				</div>
				
				{#if totals.discountAmount > 0}
					<div class="flex justify-between text-green-600">
						<span>Discount Applied</span>
						<span>-{formatPrice(totals.discountAmount)}</span>
					</div>
				{/if}
				
				<div class="flex justify-between">
					<span>Tax (12%)</span>
					<span>{formatPrice(totals.tax)}</span>
				</div>
				
				<Separator />
				
				<div class="flex justify-between font-bold text-lg">
					<span>Total</span>
					<span>{formatPrice(totals.total)}</span>
				</div>
				
				{#if totals.discountAmount > 0}
					<div class="text-center">
						<Badge variant="secondary" class="bg-green-100 text-green-800">
							You saved {formatPrice(totals.discountAmount)}!
						</Badge>
					</div>
				{/if}
			</div>
		</CardContent>
	</Card>
	
	<!-- Order Policies -->
	<Card>
		<CardContent class="p-4">
			<div class="text-sm text-muted-foreground space-y-2">
				<h4 class="font-medium text-foreground mb-2">Order Information</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<p>• Orders are processed immediately upon payment</p>
						<p>• Pickup/delivery times may vary based on availability</p>
						<p>• You will receive confirmation via email (if provided)</p>
					</div>
					<div>
						<p>• All prices include applicable taxes</p>
						<p>• Refunds available within 24 hours of purchase</p>
						<p>• Contact us for any questions or concerns</p>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</div>
