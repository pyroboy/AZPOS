<script lang="ts">
    import { returns } from '$lib/stores/returnStore';
    import * as Table from '$lib/components/ui/table/index.js';
    import { Badge } from '$lib/components/ui/badge';
    import { Button } from '$lib/components/ui/button';
    import type { PageData } from './$types';

    let { data } = $props<{ data: PageData }>();

    // Set the store with data from the load function
    returns.set(data.returns);

    const getStatusVariant = (status: 'pending' | 'approved' | 'rejected') => {
        switch (status) {
            case 'approved': return 'default';
            case 'pending': return 'secondary';
            case 'rejected': return 'destructive';
        }
    };
</script>

<div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Customer Returns</h1>

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
                {#each $returns as r (r.id)}
                    <Table.Row>
                        <Table.Cell class="font-medium">{r.id}</Table.Cell>
                        <Table.Cell>{r.order_id}</Table.Cell>
                        <Table.Cell>{r.customer_name}</Table.Cell>
                        <Table.Cell>{r.reason}</Table.Cell>
                        <Table.Cell>
                            <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
                        </Table.Cell>
                        <Table.Cell>{new Date(r.created_at).toLocaleDateString()}</Table.Cell>
                        <Table.Cell class="text-right">
                            {#if r.status === 'pending'}
                                <div class="flex gap-2 justify-end">
                                    <Button size="sm" onclick={() => returns.approveReturn(r.id)}>Approve</Button>
                                    <Button size="sm" variant="destructive" onclick={() => returns.rejectReturn(r.id)}>Reject</Button>
                                </div>
                            {/if}
                        </Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </div>
</div>
