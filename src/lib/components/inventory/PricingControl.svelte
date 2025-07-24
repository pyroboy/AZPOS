<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Search } from 'lucide-svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Switch } from '$lib/components/ui/switch';

	// Dummy data for wireframe
	const products = [
		{ id: 'PROD-001', name: 'Product A', category: 'Category 1', supplier: 'Supplier X', currentPrice: 10.00, newPrice: 10.00 },
		{ id: 'PROD-002', name: 'Product B', category: 'Category 2', supplier: 'Supplier Y', currentPrice: 25.50, newPrice: 25.50 },
		{ id: 'PROD-003', name: 'Product C', category: 'Category 1', supplier: 'Supplier X', currentPrice: 5.75, newPrice: 5.75 },
	];

	let scheduleEnabled = false;

</script>

<div class="space-y-6 p-4">
	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Bulk Price Change</Card.Title>
			<Card.Description>Apply system-wide price adjustments, either immediately or scheduled for a future date.</Card.Description>
		</Card.Header>
	</Card.Root>

	<!-- Filter & Table Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Product Filters</Card.Title>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
				<!-- Filter by Category -->
				<Select.Root type="single">
					<Select.Trigger class="w-full">
						Select a category
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="category1">Category 1</Select.Item>
						<Select.Item value="category2">Category 2</Select.Item>
					</Select.Content>
				</Select.Root>
				<!-- Filter by Supplier -->
				<Select.Root type="single">
					<Select.Trigger class="w-full md:w-[180px]">
						Filter by Supplier
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="supplierX">Supplier X</Select.Item>
						<Select.Item value="supplierY">Supplier Y</Select.Item>
					</Select.Content>
				</Select.Root>
				<!-- Filter by SKU/Name -->
				<div class="relative md:col-span-2">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search by SKU or Product Name..." class="pl-8 w-full" />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Product</Table.Head>
							<Table.Head>Current Price</Table.Head>
							<Table.Head class="w-[150px]">New Price</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each products as product}
							<Table.Row>
								<Table.Cell>
									<div class="font-medium">{product.name}</div>
									<div class="text-sm text-muted-foreground">{product.id}</div>
								</Table.Cell>
								<Table.Cell>${product.currentPrice.toFixed(2)}</Table.Cell>
								<Table.Cell>
									<Input type="number" bind:value={product.newPrice} class="w-full" />
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Bulk Actions & Scheduling Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Bulk Actions</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="flex flex-col md:flex-row items-center gap-4">
				<ToggleGroup.Root type="single" variant="outline">
					<ToggleGroup.Item value="percentage">Add %</ToggleGroup.Item>
					<ToggleGroup.Item value="fixed">Add Fixed</ToggleGroup.Item>
				</ToggleGroup.Root>
				<Input placeholder="e.g., 10 for 10% or 1.50 for $1.50" class="max-w-xs" />
			</div>
			<div class="flex items-center space-x-2">
				<Switch id="schedule-mode" bind:checked={scheduleEnabled} />
				<label for="schedule-mode">Schedule for later</label>
			</div>
			{#if scheduleEnabled}
				<div class="p-4 border rounded-lg">
					<p>Date/Time Picker will go here.</p>
				</div>
			{/if}
		</Card.Content>
		<Card.Footer class="flex justify-end gap-2">
			<Button variant="outline">Cancel</Button>
			<Button disabled={!scheduleEnabled}>Save Schedule</Button>
			<Button>Apply Now</Button>
		</Card.Footer>
	</Card.Root>
</div>
