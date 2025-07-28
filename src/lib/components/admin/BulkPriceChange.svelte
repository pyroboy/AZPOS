<script lang="ts">
	import { products, bulkUpdatePrices } from '$lib/stores/productStore.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, DollarSign, Package, Percent } from 'lucide-svelte';
	import { currency } from '$lib/utils/currency';

	let selectedProductIds = $state(new Set<string>());
	let priceChangeType = $state<'percentage' | 'fixed'>('percentage');
	let priceChangeValue = $state(0);
	let effectiveDate = $state(new Date().toISOString().split('T')[0]);
	let searchTerm = $state('');
	let categoryFilter = $state('');
	let isScheduled = $state(false);

	const filteredProducts = $derived(
		products.filter((product) => {
			if (product.is_archived) return false;
			const matchesSearch =
				product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(product.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCategory = !categoryFilter || product.category_id === categoryFilter;
			return matchesSearch && matchesCategory;
		})
	);

	const categories = $derived(
		[...new Set(products.map((p) => p.category_id).filter(Boolean))].sort()
	);

	const selectedProducts = $derived(products.filter((p) => selectedProductIds.has(p.id!)));

	const totalSelectedValue = $derived(
		selectedProducts.reduce((sum, product) => sum + product.price, 0)
	);

	const previewPrices = $derived(
		selectedProducts.map((product) => {
			let newPrice = product.price;
			if (priceChangeType === 'percentage') {
				newPrice = product.price * (1 + priceChangeValue / 100);
			} else {
				newPrice = product.price + priceChangeValue;
			}
			return {
				...product,
				oldPrice: product.price,
				newPrice: Math.max(0, Number(newPrice.toFixed(2)))
			};
		})
	);

	function selectAllVisible() {
		for (const p of filteredProducts) {
			selectedProductIds.add(p.id!);
		}
	}

	function clearSelection() {
		selectedProductIds.clear();
	}

	async function applyPriceChanges() {
		if (selectedProductIds.size === 0 || priceChangeValue === 0) {
			alert('Please select products and specify a change value.');
			return;
		}

		const updates = previewPrices.map((p) => ({ id: p.id!, price: p.newPrice }));

		await bulkUpdatePrices(updates);

		alert(`Price updated for ${selectedProductIds.size} products.`);
		clearSelection();
	}

	function schedulePriceChange() {
		alert('Scheduling functionality is not yet implemented.');
	}
</script>

<div class="space-y-6">
	<!-- Price Change Controls -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<DollarSign class="h-5 w-5" />
				Bulk Price Change
			</CardTitle>
			<CardDescription>Apply price adjustments to multiple products at once.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="change-type">Change Type</Label>
					<select
						id="change-type"
						bind:value={priceChangeType}
						class="w-full p-2 border rounded-md"
					>
						<option value="percentage">Percentage</option>
						<option value="fixed">Fixed Amount</option>
					</select>
				</div>
				<div class="space-y-2">
					<Label for="change-value">Value</Label>
					<Input
						id="change-value"
						type="number"
						bind:value={priceChangeValue}
						placeholder={priceChangeType === 'percentage'
							? 'e.g., 5 for 5%'
							: 'e.g., -1.50 for -$1.50'}
					/>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<Checkbox id="schedule" bind:checked={isScheduled} />
				<Label for="schedule">Schedule for later (don't apply immediately)</Label>
			</div>
		</CardContent>
	</Card>

	<!-- Product Selection -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Package class="h-5 w-5" />
				Product Selection
			</CardTitle>
			<CardDescription>Filter and select products for price changes</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Filters -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="search">Search Products</Label>
					<Input id="search" placeholder="Search by name or SKU..." bind:value={searchTerm} />
				</div>

				<div class="space-y-2">
					<Label for="category">Filter by Category</Label>
					<select id="category" bind:value={categoryFilter} class="w-full p-2 border rounded-md">
						<option value="">All Categories</option>
						{#each categories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Selection Actions -->
			<div class="flex gap-2 items-center">
				<Button variant="outline" size="sm" onclick={selectAllVisible}>
					Select All Visible ({filteredProducts.length})
				</Button>
				<Button variant="outline" size="sm" onclick={clearSelection}>Clear Selection</Button>
				<Badge variant="secondary">{selectedProductIds.size} selected</Badge>
			</div>

			<!-- Product List -->
			<div class="max-h-96 overflow-y-auto border rounded-md">
				{#each filteredProducts as product (product.id)}
					<div
						class="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
					>
						<div class="flex items-center space-x-3">
							<Checkbox
								checked={selectedProductIds.has(product.id!)}
								onclick={() => {
									if (selectedProductIds.has(product.id!)) {
										selectedProductIds.delete(product.id!);
									} else {
										selectedProductIds.add(product.id!);
									}
								}}
							/>
							<div>
								<div class="font-medium">{product.name}</div>
								<div class="text-sm text-gray-500">
									SKU: {product.sku} | Category: {product.category_id}
								</div>
							</div>
						</div>
						<div class="text-right">
							<div class="font-medium">{currency(product.price)}</div>
						</div>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>

	<!-- Price Preview -->
	{#if selectedProductIds.size > 0}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Percent class="h-5 w-5" />
					Price Change Preview
				</CardTitle>
				<CardDescription>Review the price changes before applying</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<div class="flex justify-between text-sm font-medium">
						<span>Current Total Value: {currency(totalSelectedValue)}</span>
						<span
							>New Total Value: {currency(previewPrices.reduce((sum, p) => sum + p.newPrice, 0))}
						</span>
					</div>

					<div class="max-h-48 overflow-y-auto border rounded-md">
						{#each previewPrices as preview (preview.id)}
							<div class="flex justify-between items-center p-2 border-b last:border-b-0">
								<span class="text-sm">{preview.name}</span>
								<div class="text-sm">
									<span class="text-gray-500">{currency(preview.oldPrice)}</span>
									<span class="mx-2">→</span>
									<span class="font-medium text-green-600">{currency(preview.newPrice)}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="flex gap-2 mt-4">
					{#if isScheduled}
						<Button onclick={schedulePriceChange} class="flex items-center gap-2">
							<Calendar class="h-4 w-4" />
							Schedule Price Change
						</Button>
					{:else}
						<Button onclick={applyPriceChanges} class="flex items-center gap-2">
							<DollarSign class="h-4 w-4" />
							Apply Price Changes Now
						</Button>
					{/if}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
