<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { users } from '$lib/stores/userStore';
	import { inventory, type ProductWithStock } from '$lib/stores/inventoryStore';
	import type { ProductBatch } from '$lib/types';
	import { currency } from '$lib/utils/currency';

	const kpis = $derived({
		get activeStaff() {
			const staff = $users.filter((u) => u.role === 'pharmacist' || u.role === 'cashier');
			return staff.filter((u) => u.is_active).length;
		},
		get totalInventoryValue() {
			return $inventory.reduce((total: number, product: ProductWithStock) => {
				return total + product.stock * (product.average_cost ?? 0);
			}, 0);
		},
		get lowStockCount() {
			return $inventory.filter((p: ProductWithStock) => p.stock < (p.reorder_point ?? 20)).length;
		},
		get nearExpiryCount() {
			// The dashboard card mentions 'next 60 days'
			const sixtyDaysFromNow = new Date();
			sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

			return $inventory
				.flatMap((p: ProductWithStock) => p.batches)
				.filter((b: ProductBatch) => {
					if (!b.expiration_date) return false;
					const expiryDate = new Date(b.expiration_date);
					return expiryDate > new Date() && expiryDate <= sixtyDaysFromNow;
				}).length;
		}
	});
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
