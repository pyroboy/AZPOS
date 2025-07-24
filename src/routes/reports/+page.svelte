<script lang="ts">
    import type { PageData } from './$types';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { FileText, BarChart2, CalendarClock, Zap, Target, Truck } from 'lucide-svelte';

    let { data } = $props<{ data: PageData }>();

    const REPORT_META = {
        'sales': { title: 'Sales Report', description: 'Daily sales logs and totals.', icon: BarChart2 },
        'audit-trail': { title: 'Inventory Audit Trail', description: 'Immutable stock movement log.', icon: FileText },
        'expiration': { title: 'Expiration Report', description: 'Items expiring in ≤ 90 days.', icon: CalendarClock },
        'inventory-velocity': { title: 'Velocity Report', description: 'Fast and slow moving items.', icon: Zap },
        'profit-margin': { title: 'Profit Margin Report', description: 'FIFO cost vs. revenue.', icon: Target },
        'supplier-performance': { title: 'Supplier Performance', description: 'PO on-time & cost variance.', icon: Truck }
    } as const;

    type ReportKey = keyof typeof REPORT_META;
</script>

<section class="p-4 md:p-6 space-y-6">
    <div>
        <h1 class="text-2xl font-bold">Reports Dashboard</h1>
        <p class="text-muted-foreground">Welcome, {data.user.full_name}. Select a report to view.</p>
    </div>

    {#if data.allowedReports.length === 0}
        <p class="text-muted-foreground">No reports are available for your role.</p>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each data.allowedReports as key}
                {@const Icon = REPORT_META[key as ReportKey].icon}
                {@const title = REPORT_META[key as ReportKey].title}
                {@const description = REPORT_META[key as ReportKey].description}
                <Card.Root>
                    <Card.Header class="flex flex-row items-center gap-4 space-y-0">
                        <div class="p-3 rounded-full bg-primary/10 text-primary">
                            <Icon class="h-6 w-6" />
                        </div>
                        <div>
                            <Card.Title>{title}</Card.Title>
                            <Card.Description>{description}</Card.Description>
                        </div>
                    </Card.Header>
                    <Card.Footer>
                        <Button variant="outline" class="w-full">
                            <a href="/reports/{key}">View Report</a>
                        </Button>
                    </Card.Footer>
                </Card.Root>
            {/each}
        </div>
    {/if}
</section>
