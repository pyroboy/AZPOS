<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Helper to format date strings
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold">Expiration Report</h2>
	<p class="text-muted-foreground">
		This report shows all product batches expiring within the next 90 days.
	</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Near-Expiry Products</Card.Title>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Product Name</Table.Head>
						<Table.Head>Batch Number</Table.Head>
						<Table.Head>Expiration Date</Table.Head>
						<Table.Head class="text-right">Quantity On Hand</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.nearExpiryProducts.length === 0}
						<Table.Row>
							<Table.Cell colspan={4} class="text-center"
								>No products are nearing expiration.</Table.Cell
							>
						</Table.Row>
					{:else}
						{#each data.nearExpiryProducts as item}
							<Table.Row>
								<Table.Cell>{item.productName}</Table.Cell>
								<Table.Cell>{item.batch_number}</Table.Cell>
								<Table.Cell
									>{item.expiration_date ? formatDate(item.expiration_date) : 'N/A'}</Table.Cell
								>
								<Table.Cell class="text-right">{item.quantity_on_hand}</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
