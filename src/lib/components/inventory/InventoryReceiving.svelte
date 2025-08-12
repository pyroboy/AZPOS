<script lang="ts">
	import { getPurchaseOrders } from '$lib/remote/purchaseOrders.remote';
	import type { PurchaseOrder } from '$lib/types/purchaseOrder.schema';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ReceivingWizardModal from './ReceivingWizardModal.svelte';

	let searchTerm = $state('');
	let isWizardOpen = $state(false);
	let selectedPO: PurchaseOrder | null = $state(null);

	// Get data using remote functions
	const purchaseOrdersQuery = getPurchaseOrders({ 
		status: 'confirmed'
	});
	

	const getStatusVariant = (status: PurchaseOrder['status']) => {
		switch (status) {
			case 'draft':
				return 'secondary';
			case 'sent':
				return 'secondary';
			case 'confirmed':
				return 'default';
			case 'partially_received':
				return 'outline';
			case 'received':
				return 'success';
			case 'cancelled':
				return 'destructive';
			default:
				return 'secondary';
		}
	};

	function receivePO(po: PurchaseOrder) {
		selectedPO = po;
		isWizardOpen = true;
	}

	function closeWizard() {
		isWizardOpen = false;
		setTimeout(() => {
			selectedPO = null;
		}, 300);
	}
</script>

<div class="p-4 space-y-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Purchase Order Receiving</h1>
		<div class="w-1/3">
			<Input placeholder="Search by PO Number or Supplier..." bind:value={searchTerm} />
		</div>
	</div>

	<div class="border rounded-lg">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[120px]">PO Number</Table.Head>
					<Table.Head>Supplier</Table.Head>
					<Table.Head class="w-[150px]">Order Date</Table.Head>
					<Table.Head class="w-[150px]">Expected Date</Table.Head>
					<Table.Head class="w-[120px]">Status</Table.Head>
					<Table.Head class="w-[120px] text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#await purchaseOrdersQuery}
					<Table.Row>
						<Table.Cell colspan={6} class="h-24 text-center">Loading purchase orders...</Table.Cell>
					</Table.Row>
				{:then data}
					{@const filteredPOs = data.purchaseOrders.filter((po) => {
						const search = searchTerm.toLowerCase();
						return (
							po.id.toLowerCase().includes(search) ||
							(po.supplier_id && po.supplier_id.toLowerCase().includes(search))
						);
					})}
					{#if filteredPOs.length === 0}
						<Table.Row>
							<Table.Cell colspan={6} class="h-24 text-center">No purchase orders found.</Table.Cell>
						</Table.Row>
					{:else}
						{#each filteredPOs as po (po.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{po.po_number}</Table.Cell>
								<Table.Cell>{po.supplier_id || 'Unknown Supplier'}</Table.Cell>
								<Table.Cell>{new Date(po.order_date).toLocaleDateString()}</Table.Cell>
								<Table.Cell
									>{po.expected_delivery_date
										? new Date(po.expected_delivery_date).toLocaleDateString()
										: 'N/A'}</Table.Cell
								>
								<Table.Cell>
									<Badge variant={getStatusVariant(po.status)}>{po.status.replace('_', ' ')}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										onclick={() => receivePO(po)}
										disabled={!['confirmed', 'sent', 'partially_received'].includes(po.status)}
									>
										Receive
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				{:catch error}
					<Table.Row>
						<Table.Cell colspan={6} class="h-24 text-center text-destructive">
							Error: {error?.message || 'Failed to load purchase orders'}
						</Table.Cell>
					</Table.Row>
				{/await}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<ReceivingWizardModal bind:open={isWizardOpen} po={selectedPO} onClose={closeWizard} />
