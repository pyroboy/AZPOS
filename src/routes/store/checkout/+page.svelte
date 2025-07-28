<!-- Agent: agent_coder | File: +page.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { useCart } from '$lib/data/cart';
	import CheckoutForm from '$lib/components/store/CheckoutForm.svelte';
	import OrderReview from '$lib/components/store/OrderReview.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ArrowLeft, Lock } from 'lucide-svelte';

	// Initialize cart hook
	const cart = useCart();

	// Reactive cart state
	let cartState = $derived(cart.cartState);
	let cartTotals = $derived(cart.cartTotals);

	// Checkout state
	let checkoutStep = $state(1); // 1: Review, 2: Payment, 3: Confirmation
	let customerInfo = $state({
		name: '',
		email: '',
		phone: ''
	});
	let paymentMethod = $state('cash');
	let specialInstructions = $state('');
	let processing = $state(false);
	let error = $state<string | null>(null);

	// Redirect if cart is empty
	onMount(() => {
		if (cartState.items.length === 0) {
			window.location.href = '/store';
		}
	});

	// Navigation functions
	function goBack() {
		if (checkoutStep > 1) {
			checkoutStep--;
		} else {
			window.location.href = '/store/cart';
		}
	}

	function continueToPayment() {
		checkoutStep = 2;
	}

	function processOrder() {
		checkoutStep = 3;
		// TODO: Implement actual order processing
		submitOrder();
	}

	// Submit order
	async function submitOrder() {
		try {
			processing = true;
			error = null;

			const orderData = {
				payment_method: paymentMethod,
				customer_info: customerInfo,
				special_instructions: specialInstructions,
				items: cartState.items,
				totals: cartTotals
			};

			// TODO: Replace with actual API call
			const response = await fetch('/store/api/checkout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(orderData)
			});

			if (!response.ok) {
				throw new Error('Failed to process order');
			}

			const result = await response.json();

			// Clear cart and redirect to confirmation
			cart.clearCart();
			window.location.href = `/store/confirmation/${result.transaction_id}`;
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
			console.error('Checkout error:', err);
		} finally {
			processing = false;
		}
	}

	// Format price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}
</script>

<svelte:head>
	<title>Checkout - AZPOS Store</title>
	<meta name="description" content="Complete your purchase securely" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<div class="border-b bg-card">
		<div class="container mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button variant="ghost" size="sm" onclick={goBack} class="gap-2">
						<ArrowLeft class="h-4 w-4" />
						{checkoutStep === 1 ? 'Back to Cart' : 'Back'}
					</Button>

					<div>
						<h1 class="text-2xl font-bold flex items-center gap-2">
							<Lock class="h-6 w-6" />
							Secure Checkout
						</h1>
						<p class="text-muted-foreground">
							Step {checkoutStep} of 3
						</p>
					</div>
				</div>

				<!-- Progress Indicator -->
				<div class="hidden md:flex items-center gap-2">
					<div class="flex items-center gap-2">
						<div
							class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
								checkoutStep >= 1
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground'
							}`}
						>
							1
						</div>
						<span
							class={`text-sm ${checkoutStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}
						>
							Review
						</span>
					</div>

					<div class="w-8 h-px bg-border"></div>

					<div class="flex items-center gap-2">
						<div
							class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
								checkoutStep >= 2
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground'
							}`}
						>
							2
						</div>
						<span
							class={`text-sm ${checkoutStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}
						>
							Payment
						</span>
					</div>

					<div class="w-8 h-px bg-border"></div>

					<div class="flex items-center gap-2">
						<div
							class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
								checkoutStep >= 3
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground'
							}`}
						>
							3
						</div>
						<span
							class={`text-sm ${checkoutStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}
						>
							Complete
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		{#if error}
			<!-- Error State -->
			<Card class="mb-6">
				<CardContent class="p-6">
					<div class="text-center text-destructive">
						<h3 class="font-semibold mb-2">Checkout Error</h3>
						<p>{error}</p>
						<Button class="mt-4" onclick={() => (error = null)}>Try Again</Button>
					</div>
				</CardContent>
			</Card>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Main Checkout Content -->
			<div class="lg:col-span-2">
				{#if checkoutStep === 1}
					<!-- Step 1: Order Review -->
					<Card>
						<CardHeader>
							<CardTitle>Review Your Order</CardTitle>
						</CardHeader>
						<CardContent>
							<OrderReview items={cartState.items} totals={cartTotals} />

							<div class="mt-6 flex justify-end">
								<Button size="lg" onclick={continueToPayment}>Continue to Payment</Button>
							</div>
						</CardContent>
					</Card>
				{:else if checkoutStep === 2}
					<!-- Step 2: Payment & Customer Info -->
					<CheckoutForm
						bind:customerInfo
						bind:paymentMethod
						bind:specialInstructions
						onSubmit={processOrder}
						{processing}
					/>
				{:else if checkoutStep === 3}
					<!-- Step 3: Processing -->
					<Card>
						<CardContent class="p-12 text-center">
							<div
								class="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
							></div>
							<h3 class="text-xl font-semibold mb-2">Processing Your Order</h3>
							<p class="text-muted-foreground">
								Please wait while we process your payment and prepare your order...
							</p>
						</CardContent>
					</Card>
				{/if}
			</div>

			<!-- Order Summary Sidebar -->
			<div class="lg:col-span-1">
				<div class="sticky top-4">
					<Card>
						<CardHeader>
							<CardTitle class="text-lg">Order Summary</CardTitle>
						</CardHeader>
						<CardContent class="space-y-4">
							<!-- Items Summary -->
							<div class="space-y-2">
								{#each cartState.items as item}
									<div class="flex justify-between text-sm">
										<span class="flex-1 truncate">
											{item.quantity}× {item.product_name}
										</span>
										<span class="font-medium">
											{formatPrice(item.final_price)}
										</span>
									</div>
								{/each}
							</div>

							<div class="border-t pt-4 space-y-2">
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
									<span>Tax</span>
									<span>{formatPrice(cartTotals.tax)}</span>
								</div>

								<div class="flex justify-between font-bold text-lg border-t pt-2">
									<span>Total</span>
									<span>{formatPrice(cartTotals.total)}</span>
								</div>
							</div>

							<!-- Security Badge -->
							<div class="text-center pt-4 border-t">
								<div class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
									<Lock class="h-4 w-4" />
									<span>Secure SSL Encryption</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	</div>
</div>
