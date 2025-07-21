<script lang="ts">
	import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import { products } from '$lib/stores/productStore';
	import type { Product } from '$lib/types';
    import { inventory } from '$lib/stores/inventoryStore';

    // Reactive state for low-stock products
    const lowStockProducts = $derived(
        $inventory.filter(p => p.stock < (p.reorder_point ?? 10)).slice(0, 5)
    );

    // Reactive state for near-expiry products (expiring in the next 90 days)
    const nearExpiryProducts = $derived(
        $inventory
            .flatMap(p => 
                p.batches.map(b => ({ ...p, ...b, product_name: p.name }))
            )
            .filter(b => {
                if (!b.expiration_date) return false;
                const expiryDate = new Date(b.expiration_date);
                const ninetyDaysFromNow = new Date();
                ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
                return expiryDate > new Date() && expiryDate <= ninetyDaysFromNow;
            })
            .slice(0, 5)
    );

</script>

<div class="space-y-4">
    <h2 class="text-2xl font-bold">Pharmacist Dashboard</h2>
    
    <div class="grid gap-4 md:grid-cols-2">
        <Card.Root>
            <Card.Header>
                <Card.Title>Near-Expiry Medicines</Card.Title>
            </Card.Header>
            <Card.Content>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Product</Table.Head>
                            <Table.Head>Batch #</Table.Head>
                            <Table.Head>Expires</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if nearExpiryProducts.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={3} class="text-center">No medicines are expiring soon.</Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each nearExpiryProducts as item}
                                <Table.Row>
                                    <Table.Cell>{item.product_name}</Table.Cell>
                                    <Table.Cell>{item.batch_number}</Table.Cell>
                                    <Table.Cell>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'}</Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header>
                <Card.Title>Low Stock Medicines</Card.Title>
            </Card.Header>
            <Card.Content>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Product</Table.Head>
                            <Table.Head>Stock</Table.Head>
                            <Table.Head>Reorder Point</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if lowStockProducts.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={3} class="text-center">All stock levels are sufficient.</Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each lowStockProducts as item}
                                <Table.Row>
                                    <Table.Cell>{item.name}</Table.Cell>
                                    <Table.Cell>{item.stock}</Table.Cell>
                                    <Table.Cell>{item.reorder_point}</Table.Cell>
                                    <Table.Cell>{item.reorder_point}</Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </Card.Content>
        </Card.Root>
    </div>
</div>
