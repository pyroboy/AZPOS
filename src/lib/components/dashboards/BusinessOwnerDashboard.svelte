<script lang="ts">
	import * as Card from '$lib/components/ui/card';
    import { inventory, type ProductWithStock } from '$lib/stores/inventoryStore';

    const kpis = $derived.by(() => {
        const allProducts = $inventory;

        const totalInventoryValue = allProducts.reduce((total: number, product: ProductWithStock) => {
            return total + (product.stock * (product.average_cost ?? 0));
        }, 0);

        const potentialRevenue = allProducts.reduce((total: number, product: ProductWithStock) => {
            if (product.is_archived) return total;
            return total + (product.stock * (product.price ?? 0));
        }, 0);

        const grossProfitMargin = potentialRevenue > 0
            ? ((potentialRevenue - totalInventoryValue) / potentialRevenue) * 100
            : 0;

        return {
            potentialRevenue,
            totalInventoryValue,
            grossProfitMargin
        };
    });
</script>

<div class="space-y-4">
    <h2 class="text-2xl font-bold">Business Owner Dashboard</h2>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card.Root>
            <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Potential Revenue</Card.Title>
            </Card.Header>
            <Card.Content>
                <div class="text-2xl font-bold">
                    {kpis.potentialRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
                <p class="text-xs text-muted-foreground">Total value of inventory at sale price</p>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Inventory Value (Cost)</Card.Title>
            </Card.Header>
            <Card.Content>
                <div class="text-2xl font-bold">
                     {kpis.totalInventoryValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
                <p class="text-xs text-muted-foreground">Total cost of all stock on hand</p>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Potential Gross Margin</Card.Title>
            </Card.Header>
            <Card.Content>
                <div class="text-2xl font-bold">{kpis.grossProfitMargin.toFixed(1)}%</div>
                <p class="text-xs text-muted-foreground">Based on current inventory</p>
            </Card.Content>
        </Card.Root>
    </div>
</div>
