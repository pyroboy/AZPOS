<script lang="ts">
	import { suppliers } from '$lib/stores/supplierStore';
	import { products } from '$lib/stores/productStore';
	import type { PurchaseOrder, Supplier } from '$lib/schemas/models';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
	import { ChevronDown, ChevronRight, Edit } from 'lucide-svelte';
	import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '$lib/components/ui/dropdown-menu';
	import { MoreHorizontal } from 'lucide-svelte';
	import { Pencil } from 'lucide-svelte';
	import { ToggleLeft, ToggleRight } from 'lucide-svelte';
    import { Toggle } from '$lib/components/ui/toggle';

	let expandedSupplierId = $state<string | null>(null);


	function getProduct(id: string) {
		return products.findById(id);
	}

	function handleToggleStatus(supplierId: string) {
		suppliers.toggleSupplierActive(supplierId);
	}
</script>

<div class="border rounded-lg">
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead class="w-[250px]">Name</TableHead>
				<TableHead>Status</TableHead>
				<TableHead>Contact Person</TableHead>
				<TableHead>Email</TableHead>
				<TableHead>Phone</TableHead>
				<TableHead class="text-right">Actions</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#if suppliers.suppliers.length > 0}
				{#each suppliers.suppliers as supplier (supplier.id)}
					<TableRow>
						<TableCell class="font-medium">{supplier.name}</TableCell>
						<TableCell>
							<Badge variant={supplier.is_active ? 'default' : 'destructive'}>
								{supplier.is_active ? 'Active' : 'Inactive'}
							</Badge>
						</TableCell>
						<TableCell>{supplier.contact_person ?? 'N/A'}</TableCell>
						<TableCell>{supplier.email ?? 'N/A'}</TableCell>
						<TableCell>{supplier.phone ?? 'N/A'}</TableCell>
						<TableCell class="text-right">
							<DropdownMenu>
								<DropdownMenuTrigger>
									<Button variant="ghost" class="h-8 w-8 p-0">
										<span class="sr-only">Open menu</span>
										<MoreHorizontal class="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<!-- on:click is not supported here, will be handled by dialog -->
									<DropdownMenuItem>
										<Pencil class="mr-2 h-4 w-4" />
										<span>Edit</span>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem>
										{#if supplier.is_active}
											<ToggleLeft class="mr-2 h-4 w-4" />
											<span>Deactivate</span>
										{:else}
											<ToggleRight class="mr-2 h-4 w-4" />
											<span>Activate</span>
										{/if}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</TableCell>
					</TableRow>
				{/each}
			{:else}
				<TableRow>
					<TableCell colspan={6} class="h-24 text-center">
						No suppliers found.
					</TableCell>
				</TableRow>
			{/if}
		</TableBody>
	</Table>
</div>
