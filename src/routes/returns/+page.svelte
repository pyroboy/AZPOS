<script lang="ts">
    import { useReturns } from '$lib/data/returns';
    import * as Table from '$lib/components/ui/table/index.js';
    import { Badge } from '$lib/components/ui/badge';
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';

    // Use the returns hook
    const { 
        returns, 
        returnsQuery, 
        updateStatus, 
        isLoading, 
        isError, 
        error, 
        isUpdating,
        refetch
    } = useReturns();

    const getStatusVariant = (status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processing') => {
        switch (status) {
            case 'approved': return 'default';
            case 'pending': return 'secondary';
            case 'rejected': return 'destructive';
            case 'completed': return 'outline';
            case 'processing': return 'secondary';
            default: return 'secondary';
        }
    };

    const handleApprove = async (returnId: string) => {
        try {
            await updateStatus({ id: returnId, status: 'approved' });
            toast.success(`Return ${returnId} has been approved`);
        } catch (error) {
            toast.error(`Failed to approve return: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleReject = async (returnId: string) => {
        try {
            await updateStatus({ id: returnId, status: 'rejected' });
            toast.error(`Return ${returnId} has been rejected`);
        } catch (error) {
            toast.error(`Failed to reject return: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Customer Returns</h1>

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
			<span class="ml-2">Loading returns...</span>
		</div>
	{:else if isError}
		<!-- Error state -->
		<div class="bg-red-50 border border-red-200 rounded-md p-4">
			<div class="flex items-start justify-between">
				<div class="ml-3 flex-1">
					<h3 class="text-sm font-medium text-red-800">Error loading returns</h3>
					<div class="mt-2 text-sm text-red-700">
						<p>{error?.message || 'An unexpected error occurred'}</p>
					</div>
				</div>
				<Button variant="outline" onclick={refetch} class="ml-4">
					Retry
				</Button>
			</div>
		</div>
	{:else}
		<!-- Data loaded successfully -->
		<div class="border rounded-lg">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Return ID</Table.Head>
						<Table.Head>Order Number</Table.Head>
						<Table.Head>Customer</Table.Head>
						<Table.Head>Reason</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Created At</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each returns as r (r.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{r.id}</Table.Cell>
							<Table.Cell>{r.order_id}</Table.Cell>
							<Table.Cell>{r.customer_name}</Table.Cell>
							<Table.Cell>{r.reason}</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
							</Table.Cell>
							<Table.Cell>{new Date(r.return_date).toLocaleDateString()}</Table.Cell>
							<Table.Cell class="text-right">
								{#if r.status === 'pending'}
									<div class="flex gap-2 justify-end">
										<Button
											size="sm"
											disabled={isUpdating}
											onclick={() => handleApprove(r.id)}
										>
											{#if isUpdating}
												<div
													class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"
												></div>
											{/if}
											Approve
										</Button>
										<Button
											size="sm"
											variant="destructive"
											disabled={isUpdating}
											onclick={() => handleReject(r.id)}
										>
											{#if isUpdating}
												<div
													class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"
												></div>
											{/if}
											Reject
										</Button>
									</div>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
