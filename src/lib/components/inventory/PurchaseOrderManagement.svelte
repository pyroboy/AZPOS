<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { PlusCircle, Search } from 'lucide-svelte';

	// Dummy data for wireframe
	const purchaseOrders = [
		{ id: 'PO-2023-001', supplier: 'Supplier X', status: 'Pending', created: '2023-10-26', expected: '2023-11-10', value: 1500.00 },
		{ id: 'PO-2023-002', supplier: 'Supplier Y', status: 'Received', created: '2023-10-24', expected: '2023-11-05', value: 850.50 },
		{ id: 'PO-2023-003', supplier: 'Supplier Z', status: 'Overdue', created: '2023-09-15', expected: '2023-10-01', value: 3200.75 },
        { id: 'PO-2023-004', supplier: 'Supplier X', status: 'Partial', created: '2023-10-28', expected: '2023-11-15', value: 500.00 },
	];

	const kpis = [
        { title: 'Total POs', value: '125', description: 'All-time' },
        { title: 'Pending Value', value: '$12,450.75', description: 'Awaiting delivery' },
        { title: 'Overdue', value: '3', description: 'Past expected date' }
    ];

	function getStatusVariant(status: string) {
		switch (status.toLowerCase()) {
			case 'received':
				return 'success';
			case 'pending':
				return 'default';
            case 'partial':
                return 'secondary';
			case 'overdue':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<div class="space-y-6 p-4">
    <!-- Header KPIs -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each kpis as kpi}
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Card.Title class="text-sm font-medium">{kpi.title}</Card.Title>
                </Card.Header>
                <Card.Content>
                    <div class="text-2xl font-bold">{kpi.value}</div>
                    <p class="text-xs text-muted-foreground">{kpi.description}</p>
                </Card.Content>
            </Card.Root>
        {/each}
    </div>

	<!-- Filter & PO List Card -->
	<Card.Root>
		<Card.Header>
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <Card.Title>Purchase Orders</Card.Title>
                <div class="flex items-center gap-2 w-full md:w-auto">
                    <div class="relative flex-1 md:flex-initial">
                        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by PO # or Supplier..." class="pl-8 w-full" />
                    </div>
                    <Select.Root type="single">
						<Select.Trigger class="w-[180px]">
							Filter by status
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="pending">Pending</Select.Item>
							<Select.Item value="received">Received</Select.Item>
							<Select.Item value="partial">Partial</Select.Item>
							<Select.Item value="overdue">Overdue</Select.Item>
						</Select.Content>
					</Select.Root>
                    <Button class="w-full md:w-auto">
                        <PlusCircle class="mr-2 h-4 w-4" /> Create New PO
                    </Button>
                </div>
            </div>
		</Card.Header>
		<Card.Content>
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>PO Number</Table.Head>
							<Table.Head>Supplier</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Expected Date</Table.Head>
                            <Table.Head class="text-right">Value</Table.Head>
							<Table.Head class="w-[100px]">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each purchaseOrders as po}
							<Table.Row>
								<Table.Cell class="font-medium">{po.id}</Table.Cell>
								<Table.Cell>{po.supplier}</Table.Cell>
								<Table.Cell>
									<Badge variant={getStatusVariant(po.status)}>{po.status}</Badge>
								</Table.Cell>
								<Table.Cell>{po.expected}</Table.Cell>
                                <Table.Cell class="text-right">${po.value.toFixed(2)}</Table.Cell>
								<Table.Cell>
									<Button variant="outline" size="sm">View</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
