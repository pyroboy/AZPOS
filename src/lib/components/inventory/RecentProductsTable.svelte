<script lang="ts">
	import { inventory, type ProductWithStock } from '$lib/stores/inventoryStore';
	import * as Table from '$lib/components/ui/table';
	import { currency } from '$lib/utils/currency';

	// Sort once by internal created_at DESC and take the first 10 rows.
	// Note: inventory is now a reactive value, not a store, so no $ prefix needed
	const recentProducts: ProductWithStock[] = $derived(
		inventory
			.slice() // Create a shallow copy to avoid mutating the original
			.sort((a: ProductWithStock, b: ProductWithStock) => {
				const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
				const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
				return bDate - aDate;
			})
			.slice(0, 10)
	);
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head style="width: 60px;">Image</Table.Head>
			<Table.Head>Name</Table.Head>
			<Table.Head style="width: 120px;">SKU</Table.Head>
			<Table.Head style="width: 80px; text-align: right;">Stock</Table.Head>
			<Table.Head style="width: 100px; text-align: right;">Price</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#if recentProducts.length > 0}
			{#each recentProducts as product (product.id)}
				<Table.Row>
					<Table.Cell>
						<img
							src={product.image_url || 'https://via.placeholder.com/40'}
							alt={product.name}
							class="h-10 w-10 rounded-full object-cover"
						/>
					</Table.Cell>
					<Table.Cell class="font-bold">{product.name}</Table.Cell>
					<Table.Cell class="font-mono">{product.sku}</Table.Cell>
					<Table.Cell class="text-right">{product.stock}</Table.Cell>
					<Table.Cell class="text-right">{currency(product.price)}</Table.Cell>
				</Table.Row>
			{/each}
		{:else}
			<Table.Row>
				<Table.Cell colspan={5} class="text-center">
					No products yet. Add one to see it here.
				</Table.Cell>
			</Table.Row>
		{/if}
	</Table.Body>
</Table.Root>
