<!--
  Main UI for the Product Image Downloader.
  This component orchestrates the others, manages state, and displays progress.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import CsvExporter from './CsvExporter.svelte';
	import ZipDownloader from './ZipDownloader.svelte';
	import ImageSearchTable from './ImageSearchTable.svelte';
	import type { ProductWithStatus } from './types';
	import type { ActionData, SubmitFunction } from './$types';
	import type { ActionResult } from '@sveltejs/kit';

	let { data, form }: { data: { products: ProductWithStatus[] }; form?: ActionData } = $props();

	// Reactive state using Svelte 5 Runes
	let products = $state<ProductWithStatus[]>(data.products || []);
	let isLoading = $state(false);
	let fileInput: any; // Use 'any' to avoid type conflict with shadcn component

	// Derived state for summary
	let status = $derived.by(() => {
		const total = products.length;
		if (total === 0) return { found: 0, total: 0, percent: 0 };

		// A 'found' image is one that has been selected and is different from the original
		const found = products.filter(
			(p) => p.status === 'selected' || (p.imageUrl && p.imageUrl !== p.image_url)
		).length;
		const percent = total > 0 ? Math.round((found / total) * 100) : 0;
		return { found, total, percent };
	});

	// Effect to handle form submission results
	const handleFormSubmit: SubmitFunction = () => {
		isLoading = true;
		return async ({ result, update }) => {
			isLoading = false;
			if (result.type === 'error') {
				toast.error(result.error.message);
				return; // Stop processing on error
			}

			if (result.type === 'success') {
				const data = result.data;
				if (data && 'products' in data && data.products) {
					products = data.products as ProductWithStatus[];
					toast.success(`Loaded ${products.length} products successfully.`);
				} else if (data && 'csv' in data) {
					toast.success('CSV has been generated and will be downloaded.');
				} else if (data && 'zip' in data) {
					toast.success('ZIP file has been created and will be downloaded.');
				}
			}

			// We've handled the data manually, so we can prevent the full page reload.
			await update({ reset: false });
		};
	}
</script>

<div class="space-y-6 p-4 md:p-6">
	<div>
		<h2 class="text-2xl font-bold">Product Image Downloader</h2>
		<p class="text-muted-foreground">
			Load a product CSV, find images, and export the results.
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Controls</Card.Title>
			<Card.Description>Load the master product list or upload your own custom CSV.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4 sm:flex-row">
			<form method="POST" action="?/loadMasterCsv" use:enhance={handleFormSubmit}>
				<Button type="submit" disabled={isLoading} class="w-full sm:w-auto">
					{isLoading ? 'Loading...' : 'Load Master CSV'}
				</Button>
			</form>
			<form method="POST" action="?/uploadCsv" use:enhance={handleFormSubmit} enctype="multipart/form-data">
				<Input
					name="csvfile"
					type="file"
					accept=".csv"
					bind:this={fileInput}
					onchange={() => fileInput.form?.requestSubmit()}
					disabled={isLoading}
					class="hidden"
				/>
				<Button onclick={() => fileInput.click()} disabled={isLoading} variant="secondary" class="w-full sm:w-auto">
					Upload Custom CSV
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Separator />

	{#if products.length > 0}
		<div id="image-table-container" class="space-y-4">
			<div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="text-sm text-muted-foreground">
					Found new images for
					<span class="font-bold text-primary">{status.found}</span> of
					<span class="font-bold">{status.total}</span> products (<span class="font-bold text-primary"
						>{status.percent}%</span
					>)
				</div>
				<div class="flex w-full gap-2 sm:w-auto">
					<CsvExporter products={products} />
					<ZipDownloader products={products} />
				</div>
			</div>
			<ImageSearchTable bind:products />
		</div>
	{/if}
</div>
