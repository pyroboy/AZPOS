<script lang="ts">
	import { purchaseOrders, type PurchaseOrder } from '$lib/stores/purchaseOrderStore';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ReceivingWizardModal from './ReceivingWizardModal.svelte';

	let searchTerm = $state('');
	let isWizardOpen = $state(false);
	let selectedPO: PurchaseOrder | null = $state(null);

	const filteredPOs = $derived(
		$purchaseOrders.filter((po) => {
			const search = searchTerm.toLowerCase();
			return (
				po.id.toLowerCase().includes(search) || po.supplierName.toLowerCase().includes(search)
			);
		})
	);

	const getStatusVariant = (status: PurchaseOrder['status']) => {
		switch (status) {
			case 'pending':
				return 'secondary';
			case 'in-transit':
				return 'default';
			case 'arrived':
				return 'success';
			case 'partial':
				return 'outline';
			case 'completed':
				return 'secondary';
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
				{#if filteredPOs.length === 0}
					<Table.Row>
						<Table.Cell colspan={6} class="h-24 text-center"> No purchase orders found. </Table.Cell>
					</Table.Row>
				{:else}
					{#each filteredPOs as po (po.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{po.id}</Table.Cell>
							<Table.Cell>{po.supplierName}</Table.Cell>
							<Table.Cell>{new Date(po.orderDate).toLocaleDateString()}</Table.Cell>
							<Table.Cell>{new Date(po.expectedDate).toLocaleDateString()}</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusVariant(po.status)}>{po.status}</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									onclick={() => receivePO(po)}
									disabled={!['arrived', 'in-transit'].includes(po.status)}
								>
									Receive
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<ReceivingWizardModal bind:open={isWizardOpen} po={selectedPO} onClose={closeWizard} />
