<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatTransactionType(type: string) {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	type DetailedAdjustment = {
		transaction_type: string; // e.g., 'Sale', 'Adjustment', 'Return'
		qty_change: number;
		productName: string;
		userName: string;
	};
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold">Inventory Audit Trail</h2>
	<p class="text-muted-foreground">
		A complete history of all stock movements, sorted by most recent.
	</p>

	<Card.Root>
		<Card.Header>
			<Card.Title>Transaction Log</Card.Title>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Date</Table.Head>
						<Table.Head>Product</Table.Head>
						<Table.Head>Transaction Type</Table.Head>
						<Table.Head>User</Table.Head>
						<Table.Head class="text-right">Quantity Change</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.transactions.length === 0}
						<Table.Row>
							<Table.Cell colspan={5} class="text-center">No transactions found.</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.transactions as tx}
							<Table.Row>
								<Table.Cell>{new Date(tx.created_at).toLocaleString()}</Table.Cell>
								<Table.Cell>{tx.productName}</Table.Cell>
								<Table.Cell>{formatTransactionType(tx.movement_type)}</Table.Cell>
								<Table.Cell>{tx.userName}</Table.Cell>
								<Table.Cell
									class="text-right font-mono {tx.quantity_change < 0
										? 'text-destructive'
										: tx.quantity_change > 0
											? 'text-green-600'
											: ''}"
								>
									{tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
