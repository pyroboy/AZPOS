<script lang="ts">
	import type { PageData } from './$types';
	let { data } = $props<{ data: PageData }>();

	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { settingsSchema } from '$lib/schemas/settingsSchema';
	import { toast } from 'svelte-sonner';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form';
	import { Separator } from '$lib/components/ui/separator';
	import TaxRateTable from '$lib/components/settings/TaxRateTable.svelte';

	const form = superForm(data.form, {
		validators: zod(settingsSchema),
		dataType: 'json',
		onUpdated: ({ form }) => {
			if (form.message) {
				toast.success('Settings updated successfully!');
			}
		}
	});

	const { form: formData, enhance } = form;

	// Helper to track original tax rates for PIN logic
	const originalTaxRates = JSON.stringify($formData.tax_rates);

	let taxRatesChanged = $state(originalTaxRates !== JSON.stringify($formData.tax_rates));
</script>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Store Settings</h3>
		<p class="text-sm text-muted-foreground">Manage your store's details and tax information.</p>
	</div>
	<Separator />

	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Product Images</Card.Title>
			<Card.Description>Manage product images and download them for external use.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.totalProducts > 0}
				<div class="text-sm text-muted-foreground">
					<span class="font-bold text-foreground"
						>{data.productsWithImages} / {data.totalProducts}</span
					>
					products have images ({Math.round(
						(data.productsWithImages / data.totalProducts) * 100
					)}%).
				</div>
			{:else}
				<div class="text-sm text-muted-foreground">Could not load product stats.</div>
			{/if}
		</Card.Content>
		<Card.Footer>
			<a href="/admin/settings/product-image-downloader">
				<Button>Manage Images</Button>
			</a>
		</Card.Footer>
	</Card.Root>

	<form method="POST" use:enhance class="space-y-8">
		<Card.Root>
			<Card.Header>
				<Card.Title>Store Details</Card.Title>
				<Card.Description>Update your store's name, address, and TIN.</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-6">
				<Form.Field {form} name="store_name">
					<Form.Control>
						<Form.Label>Store Name</Form.Label>
						<Input bind:value={$formData.store_name} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} name="address">
					<Form.Control>
						<Form.Label>Address</Form.Label>
						<Input bind:value={$formData.address} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<div class="grid grid-cols-2 gap-4">
					<Form.Field {form} name="tin">
						<Form.Control>
							<Form.Label>TIN</Form.Label>
							<Input bind:value={$formData.tin} />
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="currency">
						<Form.Control>
							<Form.Label>Currency</Form.Label>
							<Input bind:value={$formData.currency} />
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Tax Rates</Card.Title>
				<Card.Description>
					Manage tax rates. Changing these requires PIN confirmation.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<TaxRateTable {form} />
				{#if taxRatesChanged}
					<div class="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
						<Form.Field {form} name="pin">
							<Form.Control>
								<Form.Label>Admin PIN</Form.Label>
								<Input
									type="password"
									placeholder="Enter PIN to confirm tax changes"
									bind:value={$formData.pin}
								/>
							</Form.Control>
							<Form.FieldErrors />
						</Form.Field>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="flex justify-end">
			<Button type="submit">Save Changes</Button>
		</div>
	</form>
</div>
