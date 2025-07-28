<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Button from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { AlertCircle, RefreshCw } from 'lucide-svelte';
	import { inventoryAdjustments } from '$lib/stores/stockTransactionStore.svelte';
	import { products } from '$lib/stores/productStore.svelte';
	import type { InventoryAdjustment, Product } from '$lib/types';

	// Reactive state for loading and error handling
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let isRetrying = $state(false);

	// Derived sales data from inventory adjustments
	const salesData = $derived(() => {
		if (isLoading) return [];

		const allAdjustments = inventoryAdjustments;
		const allProducts: Product[] = products;

		return allAdjustments
			.filter(
				(adj: InventoryAdjustment) =>
					adj.adjustment_type === 'subtract' && adj.reason.startsWith('Sale')
			)
			.map((sale: InventoryAdjustment) => {
				const product = allProducts.find((p: Product) => p.id === sale.product_id);
				const saleAmount = product ? Math.abs(sale.quantity_adjusted) * product.price : 0;
				return {
					...sale,
					productName: product?.name ?? 'Unknown Product',
					pricePerUnit: product?.price ?? 0,
					totalSale: saleAmount
				};
			})
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	});

	// Derived total revenue
	const totalRevenue = $derived(() => {
		if (isLoading) return 0;
		return salesData().reduce((sum: number, sale: any) => sum + sale.totalSale, 0);
	});

	// Simulate loading state on component mount
	$effect(() => {
		isLoading = true;
		error = null;

		// Simulate async loading with potential for error
		const timer = setTimeout(() => {
			// Simulate occasional errors (5% chance)
			if (Math.random() < 0.05) {
				error = 'Failed to load sales data. Please try again.';
				isLoading = false;
				return;
			}

			// Check if stores have data
			if (!inventoryAdjustments || !products) {
				error = 'Required data stores are not available.';
				isLoading = false;
				return;
			}

			isLoading = false;
		}, 300);

		return () => clearTimeout(timer);
	});

	// Retry function
	function handleRetry() {
		isRetrying = true;
		error = null;
		isLoading = true;

		setTimeout(() => {
			isLoading = false;
			isRetrying = false;
			// In a real scenario, you might refresh the stores here
			// For now, we simulate successful retry
		}, 1000);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">Sales Report</h2>
		{#if error}
			<Button.Root variant="outline" size="sm" onclick={handleRetry} disabled={isRetrying}>
				<RefreshCw class="h-4 w-4 mr-2" class:animate-spin={isRetrying} />
				Retry
			</Button.Root>
		{/if}
	</div>

	{#if error}
		<Card.Root class="border-red-200 bg-red-50">
			<Card.Content class="pt-6">
				<div class="flex items-center space-x-2 text-red-600">
					<AlertCircle class="h-5 w-5" />
					<span class="font-medium">Error loading sales data</span>
				</div>
				<p class="text-sm text-red-500 mt-2">{error}</p>
				<Button.Root
					variant="outline"
					size="sm"
					onclick={handleRetry}
					class="mt-3"
					disabled={isRetrying}
				>
					<RefreshCw class="h-4 w-4 mr-2" class:animate-spin={isRetrying} />
					Try again
				</Button.Root>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Total Revenue from Sales</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if isLoading}
					<Skeleton class="h-8 w-32" />
				{:else}
					<div class="text-2xl font-bold">
						{totalRevenue().toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Detailed Sales Log</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if isLoading}
					<div class="space-y-2">
						<Skeleton class="h-10 w-full" />
						<Skeleton class="h-8 w-full" />
						<Skeleton class="h-8 w-full" />
						<Skeleton class="h-8 w-full" />
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Date</Table.Head>
								<Table.Head>Product</Table.Head>
								<Table.Head>Quantity</Table.Head>
								<Table.Head>Unit Price</Table.Head>
								<Table.Head>Total</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if salesData().length === 0}
								<Table.Row>
									<Table.Cell colspan={5} class="text-center text-muted-foreground py-8">
										No sales data available.
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each salesData() as sale}
									<Table.Row>
										<Table.Cell>{new Date(sale.created_at).toLocaleString()}</Table.Cell>
										<Table.Cell class="font-medium">{sale.productName}</Table.Cell>
										<Table.Cell>{Math.abs(sale.quantity_adjusted)}</Table.Cell>
										<Table.Cell
											>{sale.pricePerUnit.toLocaleString('en-US', {
												style: 'currency',
												currency: 'USD'
											})}</Table.Cell
										>
										<Table.Cell class="font-medium"
											>{sale.totalSale.toLocaleString('en-US', {
												style: 'currency',
												currency: 'USD'
											})}</Table.Cell
										>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
