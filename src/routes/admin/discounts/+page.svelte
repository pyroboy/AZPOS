<script lang="ts">
	import { useDiscounts } from '$lib/data/discount.svelte';

	// Initialize discount hook
	const discountHook = useDiscounts();
	const discounts = $derived(discountHook.discounts);
	import type { Discount } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { PlusCircle, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-svelte';

	let showDiscountDialog = $state(false);
	let editingDiscount = $state<Discount | null>(null);

	// Form state
	let discountName = $state('');
	let discountType = $state<'fixed_amount' | 'percentage'>('percentage');
	let discountValue = $state(0);
	let discountScope = $state<'all_items' | 'specific_product' | 'specific_category'>('all_items');

	const selectedDiscountTypeLabel = $derived(
		discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'
	);

	function openNewDiscountDialog() {
		editingDiscount = null;
		discountName = '';
		discountType = 'percentage';
		discountValue = 0;
		showDiscountDialog = true;
	}

	function openEditDiscountDialog(discount: Discount) {
		editingDiscount = discount;
		discountName = discount.name;
		discountType = discount.type;
		discountValue = discount.value;
		showDiscountDialog = true;
	}

	function handleSaveChanges() {
		if (!discountName || discountValue <= 0) {
			alert('Please fill in all fields with valid values.');
			return;
		}

		if (editingDiscount) {
			// Use fallback for missing methods
			if (discountHook.updateDiscount) {
				discountHook.updateDiscount({
					...editingDiscount,
					name: discountName,
					type: discountType,
					value: discountValue
				});
			} else {
				console.log('Update discount method not available');
			}
		} else {
			// Use fallback for missing methods
			if (discountHook.addDiscount) {
				discountHook.addDiscount({
					name: discountName,
					type: discountType,
					value: discountValue,
					applicable_scope: discountScope
				});
			} else {
				console.log('Add discount method not available');
			}
		}

		showDiscountDialog = false;
	}

	function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this discount?')) {
			if (discountHook.deleteDiscount) {
				discountHook.deleteDiscount(id);
			} else {
				console.log('Delete discount method not available');
			}
		}
	}
</script>

<div class="p-4 md:p-8">
	<Card>
		<CardHeader class="flex flex-row items-center justify-between">
			<div>
				<CardTitle>Discount Management</CardTitle>
				<CardDescription>Add, edit, or remove discounts for your store.</CardDescription>
			</div>
			<Button onclick={openNewDiscountDialog}>
				<PlusCircle class="mr-2 h-4 w-4" />
				Add Discount
			</Button>
		</CardHeader>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Value</TableHead>
						<TableHead>Status</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each discounts as discount (discount.id)}
						<TableRow>
							<TableCell class="font-medium">{discount.name}</TableCell>
							<TableCell>{discount.type}</TableCell>
							<TableCell
								>{discount.type === 'percentage'
									? `${discount.value}%`
									: `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(discount.value)}`}</TableCell
							>
							<TableCell>
								<Badge variant={discount.is_active ? 'default' : 'secondary'}>
									{discount.is_active ? 'Active' : 'Inactive'}
								</Badge>
							</TableCell>
							<TableCell class="text-right">
								<Button
									variant="ghost"
									size="icon"
	onclick={() => discountHook.toggleActivation ? discountHook.toggleActivation(discount.id) : console.log('Toggle method not available')}
									title={discount.is_active ? 'Deactivate' : 'Activate'}
								>
									{#if discount.is_active}
										<ToggleRight class="h-4 w-4" />
									{:else}
										<ToggleLeft class="h-4 w-4" />
									{/if}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => openEditDiscountDialog(discount)}
									title="Edit"
								>
									<Pencil class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive"
									onclick={() => handleDelete(discount.id)}
									title="Delete"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>

<Dialog bind:open={showDiscountDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{editingDiscount ? 'Edit' : 'Add'} Discount</DialogTitle>
			<DialogDescription>
				{editingDiscount
					? 'Update the details for this discount.'
					: 'Create a new discount for your store.'}
			</DialogDescription>
		</DialogHeader>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="name" class="text-right">Name</Label>
				<Input id="name" bind:value={discountName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="type" class="text-right">Type</Label>
				<Select type="single" bind:value={discountType}>
					<SelectTrigger class="col-span-3">
						{selectedDiscountTypeLabel}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="percentage">Percentage</SelectItem>
						<SelectItem value="fixed_amount">Fixed Amount</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="value" class="text-right">Value</Label>
				<Input id="value" type="number" bind:value={discountValue} class="col-span-3" />
			</div>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (showDiscountDialog = false)}>Cancel</Button>
			<Button onclick={handleSaveChanges}>Save Changes</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
