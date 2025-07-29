<!-- Component Integration Guide Applied: TanStack Query + Telefunc Pattern -->
<script lang="ts">
import { useProducts } from '$lib/data/product';
import { useInventory } from '$lib/data/inventory';
	import { useGroceryCart } from '$lib/data/groceryCart';
	import ProductCard from '$lib/components/store/ProductCard.svelte';
	import SearchBar from '$lib/components/store/SearchBar.svelte';
	// import CategoryFilter from '$lib/components/store/CategoryFilter.svelte';
	import CartSidebar from '$lib/components/store/CartSidebar.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { ShoppingCart } from 'lucide-svelte';
	import StaffModeBadge from '$lib/components/ui/StaffModeBadge.svelte';
	import RoleGuard from '$lib/components/ui/RoleGuard.svelte';
	import type { GroceryCartItemInput } from '$lib/types/groceryCart.schema';

	// Reactive state using Svelte 5 runes
	let searchQuery = $state('');
let selectedCategory = $state('all');
let categories = $derived.by(() => {
    // For now, return empty array since categories structure is not defined
    return [];
});
	let showCartSidebar = $state(false);
	let viewMode = $state('grid'); // 'grid' or 'list'

	// TanStack Query hooks for data management
	const { productsQuery, activeProducts, isLoading, isError, error } = useProducts({
		is_active: true
	});

	const { cart, cartTotals, addItem, isAddingItem } = useGroceryCart();

	// Filtered products using $derived - returns a function
	const filteredProducts = $derived(() => {
		return () => {
			if (!activeProducts) return [];

			let filtered = activeProducts;

			// Filter by search query
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(product: any) =>
					product.name.toLowerCase().includes(query) ||
						product.description?.toLowerCase().includes(query) ||
						product.sku.toLowerCase().includes(query)
				);
			}

			// Filter by category using derived categories
			if (selectedCategory !== 'all') {
				const categoryIds = categories.map((cat: any) => cat.id);
				if (categoryIds.includes(selectedCategory)) {
					filtered = filtered.filter((product: any) => product.category_id === selectedCategory);
				}
			}

			return filtered;
		};
	});

	// Handle add to cart with grocery cart model
	function addToCart(product: any, modifiers: any[] = []): void {
		try {
			const itemData: GroceryCartItemInput = {
				product_id: product.id,
				quantity: 1,
				special_instructions: '',
				substitution_allowed: true
			};

			addItem(itemData);
			showCartSidebar = true; // Show cart sidebar after adding item
		} catch (err) {
			console.error('Failed to add to cart:', err);
		}
	}

	function toggleCartSidebar() {
		showCartSidebar = !showCartSidebar;
	}

	// Listen for category selection events from sidebar
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleCategorySelected = (event: CustomEvent) => {
				selectedCategory = event.detail;
			};
			window.addEventListener('categorySelected', handleCategorySelected as EventListener);
			
			// Cleanup
			return () => {
				window.removeEventListener('categorySelected', handleCategorySelected as EventListener);
			};
		}
	});
</script>

<svelte:head>
	<title>AZPOS Store - Browse Products</title>
	<meta name="description" content="Browse and shop from our complete product catalog" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header Section -->
	<div class="border-b bg-card">
		<div class="container mx-auto px-4 py-6">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 class="text-3xl font-bold tracking-tight">AZPOS Store</h1>
					<p class="text-muted-foreground">Browse our complete product catalog</p>
				</div>

				<div class="flex items-center gap-4">
					<!-- Staff Mode Badge -->
					<StaffModeBadge />

					<!-- Cart Button -->
					<Button
						variant="outline"
						class="relative flex items-center gap-2"
						onclick={toggleCartSidebar}
					>
						<ShoppingCart class="h-4 w-4" />
						Cart
						{#if cartTotals && cartTotals.item_count > 0}
							<Badge
								variant="destructive"
								class="absolute -right-2 -top-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
							>
								{cartTotals.item_count}
							</Badge>
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Staff Mode Tools -->
	<RoleGuard requireStaffMode={true} permissions={['inventory:manage', 'store:manage']}>
		<Card class="mb-6 border-primary/20 bg-primary/5">
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Badge variant="default">Staff Mode Active</Badge>
						<span class="text-sm text-muted-foreground"
							>Additional tools and information available</span
						>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" size="sm">Inventory Management</Button>
						<Button variant="outline" size="sm">Price Updates</Button>
						<Button variant="outline" size="sm">Reports</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	</RoleGuard>

	<!-- Main Content -->
	<div class="container mx-auto px-4 py-6">
		<div class="space-y-6">
			<!-- Search and Filter Controls -->
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex-1">
					<SearchBar bind:searchQuery />
				</div>
				<!-- Category filtering temporarily disabled for core functionality -->
			</div>

			<!-- Loading State -->
			{#if isLoading}
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each Array(8) as _}
						<div class="animate-pulse">
							<div class="aspect-square bg-muted rounded-lg mb-4"></div>
							<div class="h-4 bg-muted rounded mb-2"></div>
							<div class="h-4 bg-muted rounded w-2/3"></div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Error State -->
			{#if error}
				<div class="text-center py-12">
					<div class="text-destructive text-lg font-semibold mb-2">Error Loading Products</div>
					<p class="text-muted-foreground mb-4">{error}</p>
					<Button onclick={() => window.location.reload()}>Try Again</Button>
				</div>
			{/if}

			<!-- Products Grid -->
			{#if !isLoading && !error}
				{#if filteredProducts().length === 0}
					<div class="text-center py-12">
						<div class="text-lg font-semibold mb-2">No products found</div>
						<p class="text-muted-foreground mb-4">
							{searchQuery
								? `No results for "${searchQuery}"`
								: 'No products available in this category'}
						</p>
						<Button
							onclick={() => {
								searchQuery = '';
								selectedCategory = 'all';
							}}>Clear Filters</Button
						>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each filteredProducts() as product (product.id)}
							<ProductCard {product} onAddToCart={addToCart} />
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- Cart Sidebar -->
{#if showCartSidebar}
	<CartSidebar bind:open={showCartSidebar} />
{/if}
