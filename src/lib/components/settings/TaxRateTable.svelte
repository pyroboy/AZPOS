<script lang="ts">
	import type { SuperForm } from 'sveltekit-superforms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import { Trash2 } from 'lucide-svelte';
	import { settingsSchema } from '$lib/schemas/settingsSchema';
	import type { z } from 'zod';

	let { form } = $props<{ form: SuperForm<z.infer<typeof settingsSchema>> }>();
	const { form: formData } = form;

	function addTaxRate() {
		const currentRates = $formData.tax_rates ?? [];
		$formData.tax_rates = [...currentRates, { name: '', rate: 0 }];
	}

	function removeTaxRate(index: number) {
		const currentRates = $formData.tax_rates ?? [];
		$formData.tax_rates = currentRates.filter((_: unknown, i: number) => i !== index);
	}
</script>

<div class="space-y-4">
	{#if $formData.tax_rates}
		{#each $formData.tax_rates as _, i}
			<div class="grid grid-cols-[1fr_1fr_auto] items-end gap-4">
				<Form.Field {form} name={`tax_rates[${i}].name`}>
					<Form.Control>
						<Form.Label>Tax Name</Form.Label>
						<Input bind:value={$formData.tax_rates[i].name} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name={`tax_rates[${i}].rate`}>
					<Form.Control>
						<Form.Label>Rate (%)</Form.Label>
						<Input type="number" bind:value={$formData.tax_rates[i].rate} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Button
					variant="ghost"
					size="icon"
					type="button"
					onclick={() => removeTaxRate(i)}
					class="mb-1"
				>
					<Trash2 class="h-4 w-4" />
				</Button>
			</div>
		{/each}
	{/if}

	<Button onclick={addTaxRate} variant="outline" size="sm" type="button">
		Add Tax Rate
	</Button>
</div>
