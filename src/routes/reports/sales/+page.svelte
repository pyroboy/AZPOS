<script lang="ts">
	import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

    const totalRevenue = data.sales.reduce((sum: number, sale: any) => sum + sale.totalSale, 0);
</script>

<div class="space-y-4">
    <h2 class="text-2xl font-bold">Sales Report</h2>

    <Card.Root>
        <Card.Header>
            <Card.Title>Total Revenue from Sales</Card.Title>
        </Card.Header>
        <Card.Content>
            <div class="text-2xl font-bold">
                {totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
        </Card.Content>
    </Card.Root>

    <Card.Root>
        <Card.Header>
            <Card.Title>Detailed Sales Log</Card.Title>
        </Card.Header>
        <Card.Content>
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>Date</Table.Head>
                        <Table.Head>Product</Table.Head>
                        <Table.Head>Quantity</Table.Head>
                        <Table.Head>Unit Price</Table.Head>
                        <Table.Head>Total</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if data.sales.length === 0}
                        <Table.Row>
                            <Table.Cell colspan={5} class="text-center">No sales data available.</Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each data.sales as sale: any}
                            <Table.Row>
                                <Table.Cell>{new Date(sale.created_at).toLocaleString()}</Table.Cell>
                                <Table.Cell>{sale.productName}</Table.Cell>
                                <Table.Cell>{Math.abs(sale.quantity_adjusted)}</Table.Cell>
                                <Table.Cell>{sale.pricePerUnit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Table.Cell>
                                <Table.Cell>{sale.totalSale.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Table.Cell>
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </Card.Content>
    </Card.Root>
</div>
