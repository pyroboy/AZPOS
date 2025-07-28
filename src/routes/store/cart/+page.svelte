<!-- Component Integration Guide Applied: TanStack Query + Telefunc Pattern -->
<script lang="ts">
	// Using grocery cart model as requested
	import { useGroceryCart } from '$lib/data/groceryCart';
	import CartItemCard from '$lib/components/store/CartItemCard.svelte';
	import CartSummary from '$lib/components/store/CartSummary.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ArrowLeft, ShoppingCart } from 'lucide-svelte';
	
	// TanStack Query hook for grocery cart management
	const {
		groceryCartQuery,
		cart,
		cartItems,
		cartTotals,
		clearCart,
		isLoading,
		isError,
		error,
		isClearingCart
	} = useGroceryCart();
	
	// Navigate functions
	function continueShopping() {
		window.location.href = '/store';
	}
	
	function proceedToCheckout() {
		window.location.href = '/store/checkout';
	}
	
	function handleClearCart() {
		if (confirm('Are you sure you want to clear your cart?')) {
			clearCart();
		}
	}
</script>

<svelte:head>
	<title>Shopping Cart - AZPOS Store</title>
	<meta name="description" content="Review and manage items in your shopping cart" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<div class="border-b bg-card">
		<div class="container mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button 
						variant="ghost" 
						size="sm"
						onclick={continueShopping}
						class="gap-2"
					>
						<ArrowLeft class="h-4 w-4" />
						Continue Shopping
					</Button>
					
					<div>
						<h1 class="text-2xl font-bold flex items-center gap-2">
							<ShoppingCart class="h-6 w-6" />
							Shopping Cart
						</h1>
						<p class="text-muted-foreground">
							{cartTotals.item_count} {cartTotals.item_count === 1 ? 'item' : 'items'} in your cart
						</p>
					</div>
				</div>
				
				{#if cartItems.length > 0}
					<Button 
						variant="outline" 
						size="sm"
						onclick={handleClearCart}
						class="text-destructive hover:text-destructive"
						disabled={isClearingCart}
					>
						{isClearingCart ? 'Clearing...' : 'Clear Cart'}
					</Button>
				{/if}
			</div>
		</div>
	</div>
	
	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		<!-- Loading State -->
		{#if isLoading}
			<div class="text-center py-16">
				<div class="text-4xl mb-4">⏳</div>
				<p class="text-muted-foreground">Loading your cart...</p>
			</div>
		<!-- Error State -->
		{:else if isError}
			<div class="text-center py-16">
				<div class="text-4xl mb-4">❌</div>
				<h2 class="text-2xl font-bold mb-4">Error Loading Cart</h2>
				<p class="text-muted-foreground mb-8">Failed to load your cart. Please try again.</p>
				<Button onclick={() => window.location.reload()}>Reload Page</Button>
			</div>
		<!-- Empty Cart State -->
		{:else if cartTotals.item_count === 0}
			<div class="text-center py-16">
				<div class="text-8xl mb-6">🛒</div>
				<h2 class="text-2xl font-bold mb-4">Your cart is empty</h2>
				<p class="text-muted-foreground mb-8 max-w-md mx-auto">
					Looks like you haven't added any items to your cart yet. 
					Start shopping to fill it up!
				</p>
				<Button size="lg" onclick={continueShopping}>
					Start Shopping
				</Button>
			</div>
		<!-- Cart Content -->
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Cart Items -->
				<div class="lg:col-span-2 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Cart Items</CardTitle>
						</CardHeader>
						<CardContent class="space-y-4">
							{#each cartItems as item (item.id)}
								<CartItemCard {item} />
							{/each}
						</CardContent>
					</Card>
				</div>
				
				<!-- Cart Summary -->
				<div class="lg:col-span-1">
					<div class="sticky top-4">
						<CartSummary 
							cartTotals={cartTotals}
							onContinueShopping={continueShopping}
							onProceedToCheckout={proceedToCheckout}
						/>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
