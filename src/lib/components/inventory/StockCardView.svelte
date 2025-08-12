<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import ImagePreview from '$lib/components/inventory/ImagePreview.svelte';
	import type { Product } from '$lib/types/product.schema';

	// Props according to the new pattern
	type Props = {
		products: Product[];
		selectedProductIds?: string[];
	};

	let { products, selectedProductIds = $bindable([]) }: Props = $props();

	const colors = [
		'#ffadad',
		'#ffd6a5',
		'#fdffb6',
		'#caffbf',
		'#9bf6ff',
		'#a0c4ff',
		'#bdb2ff',
		'#ffc6ff'
	];

	function getInitials(name: string): string {
		return name.substring(0, 2).toUpperCase();
	}

	function getRandomColor(id: string): string {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash % colors.length);
		return colors[index];
	}

	function getStockBadgeColor(
		stock: number
	): 'destructive' | 'secondary' | 'outline' | 'default' | 'success' {
		if (stock === 0) return 'destructive';
		if (stock < 20) return 'secondary';
		return 'outline';
	}

	// Handle selection changes
	function handleSelectProduct(productId: string, checked: boolean): void {
		if (checked) {
			selectedProductIds = [...selectedProductIds, productId];
		} else {
			selectedProductIds = selectedProductIds.filter((id) => id !== productId);
		}
	}
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
	{#each products as product (product.id)}
		<Card class="relative">
			<div class="absolute top-2 left-2 z-10">
				<Checkbox
					checked={selectedProductIds.includes(product.id)}
					onCheckedChange={(checked) => handleSelectProduct(product.id, checked)}
					aria-label={`Select ${product.name}`}
					class="bg-white border-2"
				/>
			</div>
			<CardHeader class="p-0">
				{#if product.image_url}
					<ImagePreview src={product.image_url} {product} fallbackSrc={product.image_url} />
				{:else}
					<div
						class="flex h-48 w-full items-center justify-center rounded-t-lg text-2xl font-bold text-white"
						style="background-color: {getRandomColor(product.id)}"
					>
						{getInitials(product.name)}
					</div>
				{/if}
			</CardHeader>

			<CardContent class="p-4 space-y-2">
				<div class="flex justify-between items-start">
					<CardTitle class="text-lg">{product.name}</CardTitle>
					<Badge variant={getStockBadgeColor(product.stock_quantity || 0)}>
						{product.stock_quantity || 0} in stock
					</Badge>
				</div>
				<CardDescription class="space-y-1">
					<div class="flex items-center gap-2">
						<span class="font-mono text-xs">{product.sku}</span>
						{#if product.category?.name}
							<Badge variant="outline" class="text-xs">{product.category.name}</Badge>
						{/if}
					</div>
					{#if product.aisle_location}
						<div class="text-xs text-muted-foreground">
							📍 Aisle: {product.aisle_location}
						</div>
					{/if}
				</CardDescription>
			</CardContent>

			<CardFooter class="p-4 pt-0">
				<div class="flex justify-between items-center w-full">
					<div class="text-sm text-muted-foreground">
						{#if (product.stock_quantity || 0) < (product.reorder_point || product.min_stock_level || 10)}
							<Badge variant="destructive" class="text-xs">Reorder</Badge>
						{:else if product.supplier?.name}
							<span class="text-xs">by {product.supplier.name}</span>
						{/if}
					</div>
					<div class="text-xl font-semibold">
						${(product.selling_price || 0).toFixed(2)}
					</div>
				</div>
			</CardFooter>
		</Card>
	{/each}
</div>
