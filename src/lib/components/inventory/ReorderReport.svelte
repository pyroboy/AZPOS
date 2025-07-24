<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { Checkbox } from '$lib/components/ui/checkbox';
    import { AlertTriangle, FilePlus2 } from 'lucide-svelte';

	// Dummy data for wireframe
	let lowStockItems = [
		{ id: 'PROD-004', name: 'Product D', supplier: 'Supplier X', stock: 8, reorderPoint: 10, reorderQty: 20, selected: true },
		{ id: 'PROD-005', name: 'Product E', supplier: 'Supplier Y', stock: 3, reorderPoint: 5, reorderQty: 10, selected: true },
		{ id: 'PROD-006', name: 'Product F', supplier: 'Supplier X', stock: 12, reorderPoint: 15, reorderQty: 15, selected: false },
	];

    const kpis = [
        { title: 'Items Below Reorder Point', value: '42', icon: AlertTriangle },
        { title: 'Suppliers to Contact', value: '8', icon: FilePlus2 }
    ];

    let selectedItems = lowStockItems.filter(item => item.selected);
    let allSelected = selectedItems.length === lowStockItems.length;

        function toggleAll(checked: boolean) {
        lowStockItems.forEach(item => item.selected = checked);
        lowStockItems = lowStockItems; // Trigger reactivity
    }

    function updateSelectedState() {
        selectedItems = lowStockItems.filter(item => item.selected);
        const selectedCount = selectedItems.length;
        if (selectedCount === 0) {
            allSelected = false;
        } else if (selectedCount === lowStockItems.length) {
            allSelected = true;
        } else {
            allSelected = false; // Or 'indeterminate' if your checkbox supports it visually
        }
    }

        $: lowStockItems, updateSelectedState();
    $: if (allSelected !== undefined) toggleAll(allSelected);

</script>

<div class="space-y-6 p-4">
    <!-- Header KPIs -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {#each kpis as kpi}
            <Card.Root>
                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Card.Title class="text-sm font-medium">{kpi.title}</Card.Title>
                    <svelte:component this={kpi.icon} class="h-4 w-4 text-muted-foreground" />
                </Card.Header>
                <Card.Content>
                    <div class="text-2xl font-bold">{kpi.value}</div>
                </Card.Content>
            </Card.Root>
        {/each}
    </div>

	<!-- Reorder List Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Low Stock Items</Card.Title>
            <Card.Description>Select items to add to a new purchase order.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
                            <Table.Head class="w-[50px]">
                                <Checkbox bind:checked={allSelected} aria-label="Select all rows" />
                            </Table.Head>
							<Table.Head>Product</Table.Head>
							<Table.Head>Supplier</Table.Head>
							<Table.Head class="text-center">Current Stock</Table.Head>
							<Table.Head class="text-center">Reorder Point</Table.Head>
                            <Table.Head class="text-center">Recommended Qty</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each lowStockItems as item (item.id)}
							<Table.Row data-state={item.selected ? 'selected' : 'deselected'}>
                                <Table.Cell>
                                    <Checkbox bind:checked={item.selected} aria-label={`Select row ${item.name}`} />
                                </Table.Cell>
								<Table.Cell>
                                    <div class="font-medium">{item.name}</div>
									<div class="text-sm text-muted-foreground">{item.id}</div>
                                </Table.Cell>
								<Table.Cell>{item.supplier}</Table.Cell>
								<Table.Cell class="text-center font-mono text-destructive">{item.stock}</Table.Cell>
								<Table.Cell class="text-center font-mono">{item.reorderPoint}</Table.Cell>
                                <Table.Cell class="text-center font-mono">{item.reorderQty}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
        <Card.Footer class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
                {selectedItems.length} of {lowStockItems.length} item(s) selected.
            </div>
            <Button disabled={selectedItems.length === 0}>
                <FilePlus2 class="mr-2 h-4 w-4" />
                Create Purchase Order
            </Button>
        </Card.Footer>
	</Card.Root>
</div>
