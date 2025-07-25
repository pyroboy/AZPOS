<script lang="ts">
    import { page } from '$app/stores';
    import * as Card from '$lib/components/ui/card';

    $: kpis = {
        potentialRevenue: ($page.data.meta?.potentialRevenue || 0),
        totalInventoryValue: ($page.data.meta?.totalInventoryValue || 0),
        grossProfitMargin: ($page.data.meta?.potentialRevenue || 0) > 0 
            ? ((($page.data.meta?.potentialRevenue || 0) - ($page.data.meta?.totalInventoryValue || 0)) / ($page.data.meta?.potentialRevenue || 0)) * 100 
            : 0
    };
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
