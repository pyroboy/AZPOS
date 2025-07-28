<script lang="ts">
	import { returns } from '$lib/stores/returnsStore.svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Eye } from 'lucide-svelte';
	import ReturnDetailsModal from './ReturnDetailsModal.svelte';
	import type { ReturnRecord } from '$lib/schemas/models';
	let searchTerm = $state('');
	let isModalOpen = $state(false);
	let selectedReturn: ReturnRecord | null = $state(null);

	const filteredReturns = $derived(
		returns.filter((r) => {
			const lowerSearch = searchTerm.toLowerCase();
			if (!lowerSearch) return true;
			return (
				r.id.toLowerCase().includes(lowerSearch) ||
				r.order_id.toLowerCase().includes(lowerSearch) ||
				r.customer_name.toLowerCase().includes(lowerSearch)
			);
		})
	);

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function viewDetails(record: ReturnRecord) {
		selectedReturn = record;
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		// Delay clearing the record to prevent UI flicker during modal close animation
		setTimeout(() => {
			selectedReturn = null;
		}, 300);
	}
</script>

<div class="p-4 space-y-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Returns Processing</h1>
		<div class="w-1/3">
			<Input placeholder="Search by Return ID, Order ID, or Customer..." bind:value={searchTerm} />
		</div>
	</div>

	<div class="border rounded-lg">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[120px]">Return ID</Table.Head>
					<Table.Head class="w-[120px]">Order ID</Table.Head>
					<Table.Head>Customer</Table.Head>
					<Table.Head>Items</Table.Head>
					<Table.Head class="w-[150px]">Date</Table.Head>
					<Table.Head class="w-[120px]">Status</Table.Head>
					<Table.Head class="w-[100px] text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if filteredReturns.length === 0}
					<Table.Row>
						<Table.Cell colspan={7} class="h-24 text-center">
							No returns found.
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each filteredReturns as ret (ret.id)}
						<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => viewDetails(ret)}>
							<Table.Cell class="font-medium">{ret.id}</Table.Cell>
							<Table.Cell>{ret.order_id}</Table.Cell>
							<Table.Cell>{ret.customer_name}</Table.Cell>
							<Table.Cell>{ret.items.reduce((sum, i) => sum + i.quantity, 0)}</Table.Cell>
							<Table.Cell>{formatDate(ret.return_date)}</Table.Cell>
							<Table.Cell>
								<Badge
									variant={{
										pending: 'secondary',
										approved: 'success',
										rejected: 'destructive',
										completed: 'default',
										processing: 'default'
									}[ret.status] as 'secondary' | 'success' | 'destructive' | 'default'}
								>
									{ret.status}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									variant="ghost"
									size="icon"
									onclick={(e) => {
										e.stopPropagation();
										viewDetails(ret);
									}}
								>
									<Eye class="h-4 w-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<ReturnDetailsModal bind:open={isModalOpen} record={selectedReturn} onClose={closeModal} />
