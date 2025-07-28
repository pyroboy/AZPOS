<script lang="ts">
	import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import { Badge } from '$lib/components/ui/badge';
    import { useProfitMarginReport } from '$lib/data/profitMargin';
    import { useAuth } from '$lib/data/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    // Use data hooks
    const { 
        salesWithProfit, 
        totalRevenue, 
        totalCogs, 
        totalProfit, 
        averageMargin,
        profitMarginQuery
    } = useProfitMarginReport();
    
    const { user, canViewReports } = useAuth();

    // Role-based access control
    onMount(() => {
        if (user && !canViewReports) {
            goto('/');
        }
    });

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
</script>

<div class="space-y-4">
    <h2 class="text-2xl font-bold">Profit Margin Report</h2>
    <p class="text-muted-foreground">Analyzes profit margins for each sale using FIFO (First-In, First-Out) costing.</p>

    <!-- Loading State -->
    {#if $profitMarginQuery.isPending}
        <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span class="ml-2 text-muted-foreground">Loading profit margin data...</span>
        </div>
    <!-- Error State -->
    {:else if $profitMarginQuery.isError}
        <Card.Root class="border-destructive">
            <Card.Header>
                <Card.Title class="text-destructive">Error Loading Data</Card.Title>
            </Card.Header>
            <Card.Content>
                <p class="text-sm text-muted-foreground mb-4">
                    {$profitMarginQuery.error?.message || 'Failed to load profit margin report. Please try again.'}
                </p>
                <button 
                    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    onclick={() => $profitMarginQuery.refetch()}
                >
                    Retry
                </button>
            </Card.Content>
        </Card.Root>
    <!-- Data State -->
    {:else}
        <div class="grid gap-4 md:grid-cols-3">
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Card.Title class="text-sm font-medium">Total Profit</Card.Title>
                </Card.Header>
                <Card.Content>
                    <div class="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
                </Card.Content>
            </Card.Root>
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Card.Title class="text-sm font-medium">Total Revenue</Card.Title>
                </Card.Header>
                <Card.Content>
                    <div class="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                </Card.Content>
            </Card.Root>
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Card.Title class="text-sm font-medium">Average Margin</Card.Title>
                </Card.Header>
                <Card.Content>
                    <div class="text-2xl font-bold">{averageMargin.toFixed(2)}%</div>
                </Card.Content>
            </Card.Root>
        </div>

        <Card.Root>
            <Card.Header>
                <Card.Title>Detailed Sales Analysis</Card.Title>
            </Card.Header>
            <Card.Content>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Product</Table.Head>
                            <Table.Head class="text-right">Revenue</Table.Head>
                            <Table.Head class="text-right">COGS (FIFO)</Table.Head>
                            <Table.Head class="text-right">Profit</Table.Head>
                            <Table.Head class="text-right">Margin</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if salesWithProfit.length === 0}
                            <Table.Row>
                                <Table.Cell colspan={5} class="text-center">No sales data to analyze.</Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each salesWithProfit as sale}
                                <Table.Row>
                                    <Table.Cell>{sale.productName}</Table.Cell>
                                    <Table.Cell class="text-right">{formatCurrency(sale.revenue)}</Table.Cell>
                                    <Table.Cell class="text-right">{formatCurrency(sale.costOfGoodsSold)}</Table.Cell>
                                    <Table.Cell class="text-right font-mono {sale.profit < 0 ? 'text-destructive' : sale.profit > 0 ? 'text-green-600' : ''}">
                                        {formatCurrency(sale.profit)}
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <Badge variant={sale.profitMargin < 0 ? 'destructive' : 'default'}>{sale.profitMargin.toFixed(2)}%</Badge>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </Card.Content>
        </Card.Root>
    {/if}
</div>
