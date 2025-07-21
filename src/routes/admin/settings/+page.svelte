<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { settingsSchema } from '$lib/schemas/models';
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Trash2 } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { Label } from '$lib/components/ui/label';

	let { data }: { data: PageData } = $props();

	const superform = superForm(data.form, {
		validators: zod(settingsSchema)
	});
	const { form, errors, enhance } = superform;

	const isReadOnly = data.userRole !== 'admin';

	function addTaxRate() {
		const currentRates = $form.tax_rates ?? [];
		$form.tax_rates = [...currentRates, { name: '', rate: 0 }];
	}

	function removeTaxRate(index: number) {
		const currentRates = $form.tax_rates ?? [];
		$form.tax_rates = currentRates.filter((_, i) => i !== index);
	}
</script>

<div class="p-4 md:p-8">
	<h1 class="text-2xl font-bold">System Settings</h1>
	<p class="text-muted-foreground">
		{isReadOnly
			? 'Viewing system configuration.'
			: 'Manage your store details and system configurations.'}
	</p>

	<Separator class="my-6" />

	<form method="POST" action="?/update" use:enhance class="space-y-8">
		<Card.Root>
			<Card.Header>
				<Card.Title>Store Information</Card.Title>
				<Card.Description>Update your public store details.</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-6 md:grid-cols-2">
<div class="grid grid-cols-4 items-center gap-4">
	<Label for="store_name" class="text-right">Store Name</Label>
	<Input id="store_name" name="store_name" bind:value={$form.store_name} disabled={isReadOnly} />
</div>

<div class="grid grid-cols-4 items-center gap-4">
	<Label for="currency" class="text-right">Currency</Label>
	<Input id="currency" name="currency" bind:value={$form.currency} disabled={isReadOnly} />
</div>

<div class="grid grid-cols-4 items-center gap-4">
	<Label for="address" class="text-right">Address</Label>
	<Input id="address" name="address" bind:value={$form.address} disabled={isReadOnly} />
</div>

<div class="grid grid-cols-4 items-center gap-4">
	<Label for="tin" class="text-right">Tax Identification Number (TIN)</Label>
	<Input id="tin" name="tin" bind:value={$form.tin} disabled={isReadOnly} />
</div>

			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Tax Rates</Card.Title>
				<Card.Description>Manage different tax rates for your store.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if $form.tax_rates}
					{#each $form.tax_rates as taxRate, i}
						<div class="grid grid-cols-[1fr_auto_auto] items-end gap-2">
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="tax_rates[{i}].name" class="text-right">Tax Name</Label>
								<Input id="tax_rates[{i}].name" name="tax_rates[{i}].name" bind:value={$form.tax_rates[i].name} disabled={isReadOnly} />
							</div>
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="tax_rates[{i}].rate" class="text-right">Rate (%)</Label>
								<Input id="tax_rates[{i}].rate" name="tax_rates[{i}].rate" bind:value={$form.tax_rates[i].rate} disabled={isReadOnly} />
							</div>
							{#if !isReadOnly}
								<Button
									variant="ghost"
									size="icon"
									onclick={() => removeTaxRate(i)}
									type="button"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					{/each}
				{/if}
				{#if !isReadOnly}
					<Button onclick={addTaxRate} variant="outline" size="sm" type="button">
						Add Tax Rate
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>

		{#if !isReadOnly}
			<div class="flex justify-end">
				<Button type="submit">Update Settings</Button>
			</div>
		{/if}
	</form>
</div>
						