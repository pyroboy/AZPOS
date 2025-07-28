<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter, CardHeader } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Heart, ShoppingCart, Star } from 'lucide-svelte';

	let { searchQuery = '', selectedCategory = 'all' } = $props();

	const sampleItems = [
		{
			id: 1,
			name: 'Organic Bananas',
			category: 'Fresh Produce',
			price: 2.99,
			originalPrice: 3.49,
			image: '🍌',
			rating: 4.5,
			reviews: 124,
			inStock: true,
			organic: true
		},
		{
			id: 2,
			name: 'Fresh Atlantic Salmon',
			category: 'Seafood',
			price: 12.99,
			image: '🐟',
			rating: 4.8,
			reviews: 89,
			inStock: true,
			organic: false
		},
		{
			id: 3,
			name: 'Whole Milk Gallon',
			category: 'Dairy & Eggs',
			price: 4.29,
			image: '🥛',
			rating: 4.2,
			reviews: 256,
			inStock: true,
			organic: false
		},
		{
			id: 4,
			name: 'Artisan Sourdough Bread',
			category: 'Bakery',
			price: 5.99,
			image: '🍞',
			rating: 4.7,
			reviews: 67,
			inStock: false,
			organic: false
		},
		{
			id: 5,
			name: 'Free-Range Chicken Breast',
			category: 'Meat & Poultry',
			price: 8.99,
			originalPrice: 10.99,
			image: '🐔',
			rating: 4.6,
			reviews: 143,
			inStock: true,
			organic: true
		},
		{
			id: 6,
			name: 'Vanilla Ice Cream',
			category: 'Frozen Foods',
			price: 6.49,
			image: '🍦',
			rating: 4.4,
			reviews: 198,
			inStock: true,
			organic: false
		},
		{
			id: 7,
			name: 'Organic Coffee Beans',
			category: 'Beverages',
			price: 14.99,
			image: '☕',
			rating: 4.9,
			reviews: 312,
			inStock: true,
			organic: true
		},
		{
			id: 8,
			name: 'Brown Rice 2lb',
			category: 'Pantry Staples',
			price: 3.99,
			image: '🍚',
			rating: 4.3,
			reviews: 87,
			inStock: true,
			organic: true
		}
	];

	// Filter items based on search and category
	let filteredItems = $derived(
		sampleItems.filter((item: any) => {
			const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
			return matchesSearch && matchesCategory;
		})
	);

	function addToCart(item: any) {
		console.log('Added to cart:', item.name);
		// Add cart logic here
	}

	function toggleWishlist(item: any) {
		console.log('Toggle wishlist:', item.name);
		// Add wishlist logic here
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">
			{filteredItems.length} Products Found
		</h2>

		<div class="flex items-center gap-2">
			<span class="text-sm text-muted-foreground">Sort by:</span>
			<select class="rounded-md border border-input bg-background px-3 py-1 text-sm">
				<option>Price: Low to High</option>
				<option>Price: High to Low</option>
				<option>Customer Rating</option>
				<option>Newest First</option>
			</select>
		</div>
	</div>

	{#if filteredItems.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<div class="text-6xl mb-4">🔍</div>
			<h3 class="text-xl font-semibold mb-2">No products found</h3>
			<p class="text-muted-foreground">Try adjusting your search or filter criteria</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each filteredItems as item (item.id)}
				<Card class="group overflow-hidden transition-all duration-200 hover:shadow-lg">
					<CardHeader class="relative p-0">
						<div
							class="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-6xl"
						>
							{item.image}
						</div>

						<!-- Wishlist button -->
						<Button
							variant="ghost"
							size="sm"
							class="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
							onclick={() => toggleWishlist(item)}
						>
							<Heart class="h-4 w-4" />
						</Button>

						<!-- Badges -->
						<div class="absolute left-2 top-2 flex flex-col gap-1">
							{#if item.organic}
								<Badge variant="secondary" class="text-xs">Organic</Badge>
							{/if}
							{#if item.originalPrice}
								<Badge variant="destructive" class="text-xs">Sale</Badge>
							{/if}
							{#if !item.inStock}
								<Badge variant="outline" class="text-xs">Out of Stock</Badge>
							{/if}
						</div>
					</CardHeader>

					<CardContent class="p-4">
						<div class="space-y-2">
							<h3 class="font-semibold line-clamp-2">{item.name}</h3>

							<div class="flex items-center gap-1">
								<div class="flex items-center">
									{#each Array(5) as _, i}
										<Star
											class="h-3 w-3 {i < Math.floor(item.rating)
												? 'fill-yellow-400 text-yellow-400'
												: 'text-gray-300'}"
										/>
									{/each}
								</div>
								<span class="text-sm text-muted-foreground">({item.reviews})</span>
							</div>

							<div class="flex items-center gap-2">
								<span class="text-lg font-bold">${item.price}</span>
								{#if item.originalPrice}
									<span class="text-sm text-muted-foreground line-through">
										${item.originalPrice}
									</span>
								{/if}
							</div>
						</div>
					</CardContent>

					<CardFooter class="p-4 pt-0">
						<Button class="w-full" disabled={!item.inStock} onclick={() => addToCart(item)}>
							<ShoppingCart class="mr-2 h-4 w-4" />
							{item.inStock ? 'Add to Cart' : 'Out of Stock'}
						</Button>
					</CardFooter>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		overflow: hidden;
	}
</style>
