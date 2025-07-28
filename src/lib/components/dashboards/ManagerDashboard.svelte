<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import type { User } from '$lib/schemas/models';
	import { currency } from '$lib/utils/currency';

	$: kpis = {
		totalInventoryValue: $page.data.meta?.totalInventoryValue || 0,
		lowStockCount: $page.data.meta?.lowStockCount || 0,
		nearExpiryCount: $page.data.meta?.nearExpiryCount || 0,
		activeStaff: ($page.data.users || []).filter(
			(u: User) => ['pharmacist', 'cashier'].includes(u.role) && u.is_active
		).length
	};
</script>

<div class="space-y-4">
	<h2 class="text-2xl font-bold">Manager Dashboard</h2>
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Inventory Value</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{currency(kpis.totalInventoryValue)}
				</div>
				<p class="text-xs text-muted-foreground">Current value of all stock</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Active Staff</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{kpis.activeStaff}</div>
				<p class="text-xs text-muted-foreground">Total active employees</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Low Stock Items</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{kpis.lowStockCount}</div>
				<p class="text-xs text-muted-foreground">Items below reorder point</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Near-Expiry Batches</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{kpis.nearExpiryCount}</div>
				<p class="text-xs text-muted-foreground">Batches expiring in next 60 days</p>
			</Card.Content>
		</Card.Root>
	</div>
</div>
