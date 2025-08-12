<script lang="ts">
	import type { EnhancedReturnRecord } from '$lib/types/returns.schema';
	// import { useReturns } from '$lib/data/returns.svelte'; // Temporarily disabled
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';

	import { updateReturnStatus } from '$lib/remote/returns.remote';

	let {
		open = $bindable(false),
		record,
		onClose
	}: {
		open: boolean;
		record: EnhancedReturnRecord | null;
		onClose: () => void;
	} = $props();

	let rejectionNotes = $state('');
	let isUpdating = $state(false);

	async function approveReturn() {
		if (!record) return;
		
		isUpdating = true;
		try {
			await updateReturnStatus({ 
				return_id: record.id, 
				status: 'approved' 
			});
			toast.success(`Return ${record.id} has been approved.`);
			onClose();
		} catch (error) {
			console.error('Failed to approve return:', error);
			toast.error(`Failed to approve return: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isUpdating = false;
		}
	}

	async function rejectReturn() {
		if (!record) return;
		
		isUpdating = true;
		try {
			await updateReturnStatus({ 
				return_id: record.id, 
				status: 'rejected', 
				admin_notes: rejectionNotes 
			});
			toast.success(`Return ${record.id} has been rejected.`);
			rejectionNotes = '';
			onClose();
		} catch (error) {
			console.error('Failed to reject return:', error);
			toast.error(`Failed to reject return: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isUpdating = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onClose()}>
	{#if record}
		<Dialog.Content class="sm:max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>Return Details: {record.id}</Dialog.Title>
				<Dialog.Description>Review the details of the return and take action.</Dialog.Description>
			</Dialog.Header>

			<div class="grid grid-cols-3 gap-x-8 gap-y-4 my-4 text-sm">
				<div>
					<p class="text-muted-foreground">Customer</p>
					<p class="font-medium">{record.customer_name}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Order ID</p>
					<p class="font-medium">{record.order_id}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Return Date</p>
					<p class="font-medium">{new Date(record.return_date).toLocaleDateString()}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Status</p>
					<p>
						<Badge
							variant={{
								pending: 'secondary',
								approved: 'success',
								rejected: 'destructive',
								processed: 'default'
							}[record.status] as 'secondary' | 'success' | 'destructive' | 'default'}
						>
							{record.status}
						</Badge>
					</p>
				</div>
				<div class="col-span-2">
					<p class="text-muted-foreground">Reason for Return</p>
					<p class="font-medium">{record.reason}</p>
				</div>
				{#if record.notes}
					<div class="col-span-3">
						<p class="text-muted-foreground">Notes</p>
						<p class="font-medium whitespace-pre-wrap">{record.notes}</p>
					</div>
				{/if}
			</div>

			<h4 class="font-semibold mt-6 mb-2">Returned Items</h4>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Product</Table.Head>
						<Table.Head>SKU</Table.Head>
						<Table.Head class="text-right">Quantity</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each record.items as item}
						<Table.Row>
							<Table.Cell class="font-medium">{item.product_name}</Table.Cell>
							<Table.Cell>{item.product_sku}</Table.Cell>
							<Table.Cell class="text-right">{item.quantity}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			{#if record.status === 'pending'}
				<div class="mt-6 pt-6 border-t">
					<h4 class="font-semibold mb-2">Actions</h4>
					<div class="flex justify-end items-start gap-4">
						<div class="flex-grow">
							<label for="rejection-notes" class="text-sm font-medium">Notes (if rejecting)</label>
							<textarea
								id="rejection-notes"
								bind:value={rejectionNotes}
								class="mt-1 w-full h-20 p-2 border rounded-md text-sm"
								placeholder="Provide a reason for rejection..."
							></textarea>
						</div>
						<div class="flex flex-col gap-2 pt-6">
							<Button onclick={approveReturn} variant="default" disabled={isUpdating}
								>Approve</Button
							>
							<Button
								onclick={rejectReturn}
								variant="destructive"
								disabled={!rejectionNotes || isUpdating}>Reject</Button
							>
						</div>
					</div>
				</div>
			{/if}

			<Dialog.Footer class="mt-6">
				<Button variant="outline" onclick={onClose}>Close</Button>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
