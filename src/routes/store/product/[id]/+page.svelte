<!-- Agent: agent_coder | File: +page.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { page } from '$app/stores';
	import { useGroceryCart } from '$lib/data/groceryCart';
	import { useProduct } from '$lib/data/product';

	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, ShoppingCart, Plus, Minus, Heart } from 'lucide-svelte';
	import type { Product, ProductBatch, Modifier } from '$lib/schemas/models';

	// Type definitions for customer-facing product data
	interface CustomerProduct extends Product {
		category_name?: string;
		stock_level?: 'high' | 'medium' | 'low' | 'out_of_stock';
		in_stock?: boolean;
		available_modifiers?: Array<{
			id: string;
			name: string;
			price_adjustment: number;
		}>;
		bundle_components?: Array<{
			product_id: string;
			product_name: string;
			quantity: number;
		}>;
	}

	interface ProductModifier {
		modifier_id: string;
		modifier_name: string;
		price_adjustment: number;
	}

	// Get product ID from URL
	let productId = $derived($page.params.id);

	// Initialize hooks
	const cart = useGroceryCart();
	const productHook = useProduct($page.params.id);

	// Reactive product data
	let product = $derived(productHook.product());
	let isLoading = $derived(productHook.isLoading());
	let isError = $derived(productHook.isError());
	let error = $derived(productHook.error());

	// Reactive state using Svelte 5 runes
	let quantity = $state<number>(1);
	let selectedModifiers = $state<ProductModifier[]>([]);
	let notes = $state<string>('');
	let addingToCart = $state<boolean>(false);

	// Reactive cart totals
	let cartTotals = $derived(cart.cartTotals);

	// Handle quantity changes
	function updateQuantity(change: number): void {
		const newQuantity = quantity + change;
		if (newQuantity >= 1 && newQuantity <= 999) {
			quantity = newQuantity;
		}
	}

	// Handle modifier selection
	function toggleModifier(
		modifierId: string,
		modifierData: { name: string; price_adjustment: number }
	): void {
		const index = selectedModifiers.findIndex((m) => m.modifier_id === modifierId);

		if (index >= 0) {
			// Remove modifier
			selectedModifiers = selectedModifiers.filter((m) => m.modifier_id !== modifierId);
		} else {
			// Add modifier
			selectedModifiers = [
				...selectedModifiers,
				{
					modifier_id: modifierId,
					modifier_name: modifierData.name,
					price_adjustment: modifierData.price_adjustment
				}
			];
		}
	}

	// Calculate total price with modifiers
	let totalPrice = $derived.by(() => {
		if (!product) return 0;

		const modifierPrice = selectedModifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
		return (product.price + modifierPrice) * quantity;
	});

// Handle add to grocery cart
async function handleAddToCart(): Promise<void> {
	if (!product || addingToCart) return;

	try {
		addingToCart = true;

		// Define grocery cart item input
		const itemData = {
			product_id: product.id,
			quantity: quantity,
			special_instructions: notes,
			substitution_allowed: true
		};

		await cart.addItem(itemData);

		// Show success feedback (could be a toast in the future)
		console.log('Added to grocery cart successfully');
	} catch (err) {
		console.error('Error adding to grocery cart:', err);
	} finally {
		addingToCart = false;
	}
}

	// Format price for display
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}

	// Get stock level styling
	function getStockLevelVariant(
		level: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (level) {
			case 'high':
				return 'default';
			case 'medium':
				return 'secondary';
			case 'low':
				return 'destructive';
			case 'out_of_stock':
				return 'outline';
			default:
				return 'secondary';
		}
	}
</script>

<svelte:head>
	{#if product}
		<title>{product.name} - AZPOS Store</title>
		<meta
			name="description"
			content={product.description || `${product.name} - Available at AZPOS Store`}
		/>
	{:else}
		<title>Product Details - AZPOS Store</title>
	{/if}
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header with Back Button -->
	<div class="border-b bg-card">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center gap-4">
				<Button variant="ghost" size="sm" onclick={() => window.history.back()} class="gap-2">
					<ArrowLeft class="h-4 w-4" />
					Back to Store
				</Button>

				{#if cart.itemCount > 0}
					<div class="ml-auto">
						<Button
							variant="outline"
							size="sm"
							onclick={() => (window.location.href = '/store/cart')}
							class="gap-2"
						>
							<ShoppingCart class="h-4 w-4" />
							Cart ({cart.itemCount})
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		{#if isLoading}
			<!-- Loading State -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div class="animate-pulse">
					<div class="aspect-square bg-muted rounded-lg mb-4"></div>
				</div>
				<div class="animate-pulse space-y-4">
					<div class="h-8 bg-muted rounded w-3/4"></div>
					<div class="h-4 bg-muted rounded w-1/2"></div>
					<div class="h-20 bg-muted rounded"></div>
					<div class="h-10 bg-muted rounded w-1/4"></div>
				</div>
			</div>
		{:else if isError}
			<!-- Error State -->
			<div class="text-center py-12">
				<div class="text-destructive text-lg font-semibold mb-2">Product Not Found</div>
				<p class="text-muted-foreground mb-4">{error || 'Failed to load product'}</p>
				<Button onclick={() => (window.location.href = '/store')}>Back to Store</Button>
			</div>
		{:else if product}
			<!-- Product Details -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- Product Image -->
				<div class="space-y-4">
					<div class="aspect-square overflow-hidden rounded-lg bg-muted">
						{#if product.image_url}
							<img src={product.image_url} alt={product.name} class="h-full w-full object-cover" />
						{:else}
							<div class="flex h-full w-full items-center justify-center text-muted-foreground">
								<div class="text-center">
									<div class="text-6xl mb-4">📦</div>
									<div class="text-lg">No Image Available</div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Product Information -->
				<div class="space-y-6">
					<!-- Basic Info -->
					<div>
						<div class="flex items-center gap-2 mb-2">
							<Badge variant="secondary" class="text-xs">
								{product.category_name || 'Uncategorized'}
							</Badge>
							{#if product.stock_level}
								<Badge variant={getStockLevelVariant(product.stock_level)} class="text-xs">
									{product.stock_level.replace('_', ' ').toUpperCase()}
								</Badge>
							{:else}
								<Badge variant="secondary" class="text-xs">IN STOCK</Badge>
							{/if}
						</div>

						<h1 class="text-3xl font-bold mb-2">{product.name}</h1>
						<p class="text-muted-foreground mb-4">SKU: {product.sku}</p>

						{#if product.description}
							<p class="text-muted-foreground leading-relaxed">
								{product.description}
							</p>
						{/if}
					</div>

					<!-- Bundle Components -->
					{#if product.product_type === 'bundle' && product.bundle_components}
						<Card>
							<CardHeader>
								<CardTitle class="text-lg">Bundle Includes</CardTitle>
							</CardHeader>
							<CardContent>
								<div class="space-y-2">
									{#each product.bundle_components as component}
										<div class="flex justify-between">
											<span>{component.product_name || `Product ${component.product_id}`}</span>
											<span class="text-muted-foreground">×{component.quantity}</span>
										</div>
									{/each}
								</div>
							</CardContent>
						</Card>
					{/if}

					<!-- Modifiers -->
					{#if product.available_modifiers && product.available_modifiers.length > 0}
						<div class="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle class="text-lg">Available Options</CardTitle>
								</CardHeader>
								<CardContent>
									<div class="space-y-2">
										{#each product.available_modifiers as modifier}
											<label
												class="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted"
											>
												<div class="flex items-center gap-2">
													<input
														type="checkbox"
														name="modifier_{modifier.id}"
														value={modifier.id}
														onchange={() => toggleModifier(modifier.id, modifier)}
														class="rounded"
													/>
													<span>{modifier.name}</span>
												</div>
												<span class="text-sm text-muted-foreground">
													{modifier.price_adjustment > 0 ? '+' : ''}{formatPrice(
														modifier.price_adjustment
													)}
												</span>
											</label>
										{/each}
									</div>
								</CardContent>
							</Card>
						</div>
					{/if}

					<!-- Quantity and Notes -->
					<div class="space-y-4">
						<div>
							<Label for="quantity" class="text-sm font-medium">Quantity</Label>
							<div class="flex items-center gap-2 mt-1">
								<Button
									variant="outline"
									size="icon"
									onclick={() => updateQuantity(-1)}
									disabled={quantity <= 1}
								>
									<Minus class="h-4 w-4" />
								</Button>

								<Input
									id="quantity"
									type="number"
									min="1"
									max="999"
									bind:value={quantity}
									class="w-20 text-center"
								/>

								<Button
									variant="outline"
									size="icon"
									onclick={() => updateQuantity(1)}
									disabled={quantity >= 999}
								>
									<Plus class="h-4 w-4" />
								</Button>

								<span class="text-sm text-muted-foreground ml-2">
									per {product.base_unit}
								</span>
							</div>
						</div>

						<div>
							<Label for="notes" class="text-sm font-medium">Special Instructions (Optional)</Label>
							<Textarea
								rows={3}
								placeholder="Any special requests or notes..."
								bind:value={notes}
								maxlength={500}
								class="mt-1"
							/>
							<div class="text-xs text-muted-foreground mt-1">
								{notes.length}/500 characters
							</div>
						</div>
					</div>

					<!-- Price and Add to Cart -->
					<div class="space-y-4">
						<Separator />

						<div class="space-y-2">
							<div class="flex justify-between text-lg">
								<span>Unit Price:</span>
								<span>{formatPrice(product.price)}</span>
							</div>

							{#if selectedModifiers.length > 0}
								{#each selectedModifiers as modifier}
									<div class="flex justify-between text-sm text-muted-foreground">
										<span>{modifier.modifier_name}:</span>
										<span
											>{modifier.price_adjustment > 0 ? '+' : ''}{formatPrice(
												modifier.price_adjustment
											)}</span
										>
									</div>
								{/each}
							{/if}

							{#if quantity > 1}
								<div class="flex justify-between text-sm text-muted-foreground">
									<span>Quantity:</span>
									<span>×{quantity}</span>
								</div>
							{/if}

							<Separator />

							<div class="flex justify-between text-xl font-bold">
								<span>Total:</span>
								<span>{formatPrice(totalPrice)}</span>
							</div>
						</div>

						<Button
							class="w-full gap-2"
							size="lg"
					onclick={handleAddToCart}
					disabled={!product?.in_stock || cart.isAddingItem}
						>
							<ShoppingCart class="h-5 w-5" />
					{#if cart.isAddingItem}
						Adding to Cart...
					{:else if !product?.in_stock}
								Out of Stock
							{:else}
								Add to Cart
							{/if}
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
