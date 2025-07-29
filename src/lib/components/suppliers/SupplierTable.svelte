<script lang="ts">
	import { useSuppliers } from '$lib/data/supplier.svelte';
	import type { Supplier } from '$lib/types/supplier.schema';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator
	} from '$lib/components/ui/dropdown-menu';
	import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight } from 'lucide-svelte';

	const {
		suppliersQuery,
		suppliers,
		activeSuppliers,
		updateSupplier,
		isLoading,
		isError,
		error,
		isUpdating,
		updateError
	} = useSuppliers();

	// Props for handling edit action
	let { onEditSupplier }: { onEditSupplier?: (supplier: Supplier) => void } = $props();

	function handleToggleStatus(supplierId: string) {
		const supplier = suppliers.find((s: Supplier) => s.id === supplierId);
		if (supplier) {
			updateSupplier({
				supplierId,
				supplierData: { is_active: !supplier.is_active }
			});
		}
	}

	function handleEditSupplier(supplier: Supplier) {
		if (onEditSupplier) {
			onEditSupplier(supplier);
		}
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
			{#if $suppliersQuery.isPending}
				<TableRow>
					<TableCell colspan={6} class="h-24 text-center">
						<div class="flex items-center justify-center space-x-2">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
							<span>Loading suppliers...</span>
						</div>
					</TableCell>
				</TableRow>
			{:else if $suppliersQuery.isError}
				<TableRow>
					<TableCell colspan={6} class="h-24 text-center text-red-500">
						Error loading suppliers: {error?.message || 'Unknown error'}
					</TableCell>
				</TableRow>
			{:else if suppliers.length > 0}
				{#each suppliers as supplier (supplier.id)}
					<TableRow>
						<TableCell class="font-medium">{supplier.name}</TableCell>
						<TableCell>
							<Badge variant={supplier.is_active ? 'default' : 'destructive'}>
								{supplier.is_active ? 'Active' : 'Inactive'}
							</Badge>
						</TableCell>
						<TableCell>{supplier.contacts?.[0]?.name ?? 'N/A'}</TableCell>
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
									<DropdownMenuItem onclick={() => handleEditSupplier(supplier)}>
										<Pencil class="mr-2 h-4 w-4" />
										<span>Edit</span>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onclick={() => handleToggleStatus(supplier.id)}
										disabled={isUpdating}
									>
										{#if supplier.is_active}
											<ToggleLeft class="mr-2 h-4 w-4" />
											<span>{isUpdating ? 'Deactivating...' : 'Deactivate'}</span>
										{:else}
											<ToggleRight class="mr-2 h-4 w-4" />
											<span>{isUpdating ? 'Activating...' : 'Activate'}</span>
										{/if}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</TableCell>
					</TableRow>
				{/each}
			{:else}
				<TableRow>
					<TableCell colspan={6} class="h-24 text-center">No suppliers found.</TableCell>
				</TableRow>
			{/if}
		</TableBody>
	</Table>
</div>
