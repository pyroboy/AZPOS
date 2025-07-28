<!-- Agent: agent_coder | File: ProductCard.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { ShoppingCart, Eye } from 'lucide-svelte';
	
	// Props - CustomerProduct from schema
	let { 
		product,
		onAddToCart = () => {}
	} = $props();
	
	// Reactive state
	let isLoading = $state(false);
	
	// Handle add to cart with loading state
	async function handleAddToCart() {
		if (isLoading || !product.in_stock) return;
		
		try {
			isLoading = true;
			await onAddToCart(product, 1, [], '');
		} catch (error) {
			console.error('Error adding to cart:', error);
		} finally {
			isLoading = false;
		}
	}

	// Format price helper
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}

	// Get stock level variant for badge styling
	function getStockLevelVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
		switch (level.toLowerCase()) {
			case 'high': return 'default';
			case 'medium': return 'secondary'; 
			case 'low': return 'destructive';
			case 'out_of_stock': 
			case 'out': return 'outline';
			default: return 'secondary';
		}
	}

	// Handle view product
	function handleViewProduct(): void {
		window.location.href = `/store/product/${product.id}`;
	}
	
	// Get stock level styling
	function getStockLevelColor(level: string): string {
		switch (level) {
			case 'high': return 'default';
			case 'medium': return 'secondary';
			case 'low': return 'destructive';
			case 'out_of_stock': return 'outline';
			default: return 'secondary';
		}
	}
</script>

<Card class="group overflow-hidden transition-all hover:shadow-lg">
	<!-- Product Image -->
	<div class="relative aspect-square overflow-hidden bg-muted">
		{#if product.image_url}
			<img 
				src={product.image_url} 
				alt={product.name}
				class="h-full w-full object-cover transition-transform group-hover:scale-105"
				loading="lazy"
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
				<div class="text-center">
					<div class="text-4xl mb-2">📦</div>
					<div class="text-sm">No Image</div>
				</div>
			</div>
		{/if}
		
		<!-- Stock Level Badge -->
		<div class="absolute top-2 right-2">
			<Badge variant={getStockLevelVariant(product.stock_level)} class="text-xs">
				{product.stock_level.replace('_', ' ').toUpperCase()}
			</Badge>
		</div>
		
		<!-- Quick View Button (overlay on hover) -->
		<div class="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
			<Button 
				variant="secondary" 
				size="sm"
				class="gap-2"
				onclick={() => window.location.href = `/store/product/${product.id}`}
			>
				<Eye class="h-4 w-4" />
				Quick View
			</Button>
		</div>
	</div>
	
	<CardContent class="p-4">
		<!-- Product Category -->
		<div class="text-xs text-muted-foreground mb-1">
			{product.category_name}
		</div>
		
		<!-- Product Name -->
		<h3 class="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
			{product.name}
		</h3>
		
		<!-- Product Description -->
		{#if product.description}
			<p class="text-xs text-muted-foreground line-clamp-2 mb-3">
				{product.description}
			</p>
		{/if}
		
		<!-- SKU -->
		<div class="text-xs text-muted-foreground mb-2">
			SKU: {product.sku}
		</div>
		
		<!-- Price and Unit -->
		<div class="flex items-center justify-between mb-3">
			<div class="font-bold text-lg">
				{formatPrice(product.price)}
			</div>
			<div class="text-xs text-muted-foreground">
				per {product.base_unit}
			</div>
		</div>
		
		<!-- Bundle Components (if applicable) -->
		{#if product.product_type === 'bundle' && product.bundle_components}
			<div class="mb-3">
				<div class="text-xs font-medium mb-1">Bundle includes:</div>
				<div class="text-xs text-muted-foreground">
					{product.bundle_components.map((c: any) => `${c.quantity}x ${c.product_name}`).join(', ')}
				</div>
			</div>
		{/if}
	</CardContent>
	
	<CardFooter class="p-4 pt-0">
		<div class="flex w-full gap-2">
			<!-- Add to Cart Button -->
			<Button 
				class="flex-1 gap-2" 
				onclick={handleAddToCart}
				disabled={!product.in_stock || isLoading}
			>
				<ShoppingCart class="h-4 w-4" />
				{#if isLoading}
					Adding...
				{:else if !product.in_stock}
					Out of Stock
				{:else}
					Add to Cart
				{/if}
			</Button>
			
			<!-- View Details Button -->
			<Button 
				variant="outline" 
				size="icon"
				onclick={() => window.location.href = `/store/product/${product.id}`}
			>
				<Eye class="h-4 w-4" />
			</Button>
		</div>
	</CardFooter>
</Card>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		overflow: hidden;
	}
</style>
