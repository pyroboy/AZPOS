<!-- Agent: agent_coder | File: +page.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { CheckCircle, Download, ArrowLeft, ShoppingBag, Clock, MapPin } from 'lucide-svelte';
	import { page } from '$app/stores';
	
	// Type definitions
	interface OrderModifier {
		modifier_id: string;
		modifier_name: string;
		price_adjustment: number;
	}
	
	interface OrderItem {
		cart_item_id: string;
		product_name: string;
		product_sku: string;
		quantity: number;
		base_price: number;
		final_price: number;
		image_url?: string;
		selected_modifiers: OrderModifier[];
		applied_discounts: any[];
	}
	
	interface OrderData {
		transaction_id: string;
		order_number: string;
		status: string;
		created_at: string;
		customer_info: {
			name: string;
			email: string;
			phone: string;
		};
		payment_method: string;
		items: OrderItem[];
		totals: {
			subtotal: number;
			discountAmount: number;
			tax: number;
			total: number;
		};
		estimated_ready_time: string;
		pickup_location: string;
	}
	
	// Get transaction ID from URL params
	let transactionId = $derived($page.params.transaction_id);
	
	// Mock order data - in real app, this would be fetched from API
	let orderData = $state<OrderData>({
		transaction_id: $page.params.transaction_id || '',
		order_number: 'ORD-2024-001234',
		status: 'confirmed',
		created_at: new Date().toISOString(),
		customer_info: {
			name: 'John Doe',
			email: 'john@example.com',
			phone: '(555) 123-4567'
		},
		payment_method: 'credit_card',
		items: [
			{
				cart_item_id: '1',
				product_name: 'Acetaminophen 500mg',
				product_sku: 'ACE-500-24',
				quantity: 2,
				base_price: 12.99,
				final_price: 25.98,
				image_url: '/api/placeholder/100/100',
				selected_modifiers: [
					{
						modifier_id: 'mod1',
						modifier_name: 'Extra Strength',
						price_adjustment: 2.00
					}
				],
				applied_discounts: []
			}
		],
		totals: {
			subtotal: 25.98,
			discountAmount: 0,
			tax: 3.12,
			total: 29.10
		},
		estimated_ready_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
		pickup_location: 'Main Counter'
	});
	
	let loading = $state<boolean>(true);
	let error = $state<string | null>(null);
	
	// Format price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(price);
	}
	
	// Format date/time
	function formatDateTime(dateString: string): string {
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
	// Format time only
	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
	// Get payment method display name
	function getPaymentMethodName(method: string): string {
		const methods: Record<string, string> = {
			cash: 'Cash',
			credit_card: 'Credit Card',
			debit_card: 'Debit Card'
		};
		return methods[method] || method;
	}
	
	// Get status badge variant
	function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
		switch (status) {
			case 'confirmed': return 'default';
			case 'preparing': return 'secondary';
			case 'ready': return 'default';
			case 'completed': return 'default';
			case 'cancelled': return 'destructive';
			default: return 'secondary';
		}
	}
	
	// Handle print receipt
	function printReceipt() {
		window.print();
	}
	
	// Handle download receipt
	function downloadReceipt() {
		// In a real app, this would generate and download a PDF
		console.log('Downloading receipt for order:', orderData.order_number);
	}
	
	// Continue shopping
	function continueShopping() {
		goto('/store');
	}
	
	// Load order data
	onMount(async () => {
		try {
			// In a real app, fetch order data from API
			// const response = await fetch(`/store/api/orders/${transactionId}`);
			// if (!response.ok) throw new Error('Order not found');
			// orderData = await response.json();
			
			// Simulate loading delay
			await new Promise(resolve => setTimeout(resolve, 1000));
			loading = false;
		} catch (error) {
			error = error as string;
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Order Confirmation - AZPOS Store</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	{#if loading}
		<div class="flex items-center justify-center min-h-[400px]">
			<div class="text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
				<p class="text-muted-foreground">Loading order details...</p>
			</div>
		</div>
	{:else if error}
		<div class="text-center py-12">
			<div class="text-destructive text-6xl mb-4">⚠️</div>
			<h1 class="text-2xl font-bold mb-2">Order Not Found</h1>
			<p class="text-muted-foreground mb-6">{error}</p>
			<Button onclick={continueShopping}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Store
			</Button>
		</div>
	{:else}
		<!-- Success Header -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
				<CheckCircle class="h-8 w-8 text-green-600" />
			</div>
			<h1 class="text-3xl font-bold mb-2">Order Confirmed!</h1>
			<p class="text-lg text-muted-foreground">
				Thank you for your order. We'll have it ready for you soon.
			</p>
		</div>
		
		<!-- Order Summary Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<!-- Order Info -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<ShoppingBag class="h-5 w-5" />
						Order Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Order Number</span>
						<span class="font-mono">{orderData.order_number}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Transaction ID</span>
						<span class="font-mono text-sm">{orderData.transaction_id}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Order Date</span>
						<span>{formatDateTime(orderData.created_at)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Status</span>
						<Badge variant={getStatusVariant(orderData.status)}>
							{orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
						</Badge>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Payment Method</span>
						<span>{getPaymentMethodName(orderData.payment_method)}</span>
					</div>
				</CardContent>
			</Card>
			
			<!-- Pickup Info -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Clock class="h-5 w-5" />
						Pickup Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Estimated Ready</span>
						<span class="font-semibold">{formatTime(orderData.estimated_ready_time)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Pickup Location</span>
						<span>{orderData.pickup_location}</span>
					</div>
					{#if orderData.customer_info.phone}
						<div class="text-sm text-muted-foreground">
							We'll send you a text when your order is ready at {orderData.customer_info.phone}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
		
		<!-- Order Items -->
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>Order Items</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					{#each orderData.items as item (item.cart_item_id)}
						<div class="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
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
							<div class="flex-1">
								<div class="flex justify-between items-start">
									<div>
										<h4 class="font-medium">{item.product_name}</h4>
										<p class="text-sm text-muted-foreground">SKU: {item.product_sku}</p>
										<p class="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
									</div>
									<div class="text-right">
										<div class="font-semibold">{formatPrice(item.final_price)}</div>
									</div>
								</div>
								
								<!-- Modifiers -->
								{#if item.selected_modifiers && item.selected_modifiers.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each item.selected_modifiers as modifier}
											<Badge variant="secondary" class="text-xs">
												{modifier.modifier_name}
											</Badge>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
		
		<!-- Order Total -->
		<Card class="mb-8">
			<CardHeader>
				<CardTitle>Order Total</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					<div class="flex justify-between">
						<span>Subtotal</span>
						<span>{formatPrice(orderData.totals.subtotal)}</span>
					</div>
					
					{#if orderData.totals.discountAmount > 0}
						<div class="flex justify-between text-green-600">
							<span>Discount Applied</span>
							<span>-{formatPrice(orderData.totals.discountAmount)}</span>
						</div>
					{/if}
					
					<div class="flex justify-between">
						<span>Tax</span>
						<span>{formatPrice(orderData.totals.tax)}</span>
					</div>
					
					<Separator />
					
					<div class="flex justify-between font-bold text-lg">
						<span>Total</span>
						<span>{formatPrice(orderData.totals.total)}</span>
					</div>
				</div>
			</CardContent>
		</Card>
		
		<!-- Action Buttons -->
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<Button variant="outline" onclick={printReceipt}>
				<Download class="mr-2 h-4 w-4" />
				Print Receipt
			</Button>
			<Button variant="outline" onclick={downloadReceipt}>
				<Download class="mr-2 h-4 w-4" />
				Download Receipt
			</Button>
			<Button onclick={continueShopping}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Continue Shopping
			</Button>
		</div>
		
		<!-- Customer Support -->
		<div class="text-center mt-8 p-4 bg-muted rounded-lg">
			<p class="text-sm text-muted-foreground">
				Questions about your order? Contact us at <strong>(555) 123-4567</strong> or email <strong>support@azpos.com</strong>
			</p>
		</div>
	{/if}
</div>

<style>

</style>
