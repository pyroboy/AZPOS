<script lang="ts">
	import { products } from '$lib/stores/productStore';
	import { productBatches } from '$lib/stores/productBatchStore';
	import type { CsvAdjustment } from '$lib/schemas/models';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Upload, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-svelte';
	import Papa from 'papaparse';
	import { adjustmentReasons } from '$lib/schemas/models';

	let {
		show = $bindable(false),
		onClose,
		onImportSuccess
	}: {
		show?: boolean;
		onClose: () => void;
		onImportSuccess: (summary: { valid: number; invalid: number }) => void;
	} = $props();

	const allProducts = products.getActiveProducts();
	const validReasons = Object.values(adjustmentReasons);

	let selectedFile = $state<File | null>(null);
	let validationResult = $state<{ valid: CsvAdjustment[]; invalid: any[] } | null>(null);
	let isProcessing = $state(false);
	let dialog: HTMLDialogElement;

	let validRows = $derived(validationResult?.valid ?? []);
	let invalidRows = $derived(validationResult?.invalid ?? []);

	$effect(() => {
		if (dialog && show) {
			dialog.showModal();
		} else if (dialog && !show) {
			dialog.close();
		}
	});

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
			validateCSV();
		}
	}

	function validateCSV() {
		if (!selectedFile) return;

		Papa.parse(selectedFile, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				const valid: CsvAdjustment[] = [];
				const invalid: any[] = [];

				results.data.forEach((row: any, index: number) => {
					const errors: string[] = [];
					const product = allProducts.find(
						(p) => p.id === row.product_id || p.name === row.product_name
					);

					if (!product) {
						errors.push('Product not found.');
					}

					const quantity = Number(row.adjustment_quantity);
					if (isNaN(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
						errors.push('Adjustment quantity must be a positive integer.');
					}

					if (!validReasons.includes(row.reason)) {
						errors.push(`Invalid reason. Must be one of: ${validReasons.join(', ')}`);
					}

					if (errors.length > 0) {
						invalid.push({ ...row, _errors: errors, _row: index + 2 });
					} else {
						valid.push({ 
							...row, 
							product_id: product!.id, 
							adjustment_quantity: quantity, 
							adjustment_type: row.adjustment_type || 'add',
							reason: row.reason 
						});
					}
				});

				validationResult = { valid, invalid };
			}
		});
	}

	async function processImport() {
		if (validRows.length === 0) return;

		isProcessing = true;
		try {
			productBatches.bulkAdjustFromCsv(validRows);

			onImportSuccess({
				valid: validRows.length,
				invalid: invalidRows.length
			});
			handleClose();
		} catch (error) {
			console.error('Error processing import:', error);
		} finally {
			isProcessing = false;
		}
	}

	function handleClose() {
		selectedFile = null;
		validationResult = null;
		isProcessing = false;
		onClose();
	}
</script>

<dialog bind:this={dialog} onclose={handleClose} class="p-0 bg-transparent backdrop:bg-black/60">
	<div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
		<!-- Header -->
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-2xl font-bold flex items-center gap-2">
				<Upload class="h-6 w-6" />
				Import Inventory Adjustments
			</h2>
			<button onclick={handleClose} class="text-gray-500 hover:text-gray-700">
				✕
			</button>
		</div>

		<!-- Content -->
		<div class="space-y-6">
			<!-- File Upload -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<FileText class="h-5 w-5" />
						Step 1: Upload CSV File
					</CardTitle>
					<CardDescription>
						Select a CSV file with columns: product_id or product_name, adjustment_quantity, reason.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-4">
						<Label for="csv-upload" class="flex-grow">
							<Input
								id="csv-upload"
								type="file"
								accept=".csv"
								onchange={handleFileSelect}
								class="hidden"
							/>
							<Button variant="outline" class="w-full cursor-pointer" onclick={() => document.getElementById('csv-upload')?.click()}>
								<span>
									{#if selectedFile}
										{selectedFile.name}
									{:else}
										Choose File...
									{/if}
								</span>
							</Button>
						</Label>
					</div>
				</CardContent>
			</Card>

			<!-- Validation Results -->
			{#if validationResult}
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							{#if invalidRows.length === 0}
								<CheckCircle class="h-5 w-5 text-green-600" />
							{:else}
								<AlertTriangle class="h-5 w-5 text-yellow-600" />
							{/if}
							Validation Results
						</CardTitle>
						<CardDescription>
							Review validation results before processing the import.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{#if invalidRows.length > 0}
							<div class="mb-4">
								<h4 class="font-medium text-red-600 mb-2 flex items-center gap-2">
									<XCircle class="h-4 w-4" />
									Invalid Rows ({invalidRows.length})
								</h4>
								<div class="max-h-48 overflow-y-auto border rounded-md">
									{#each invalidRows as row}
										<div class="p-3 border-b bg-red-50">
											<div class="font-medium">Row {row._row}</div>
											<div class="text-sm text-gray-600">
												Product: {row.product_name || row.product_id}
											</div>
											<div class="text-sm text-red-600 mt-1">
												{#each row._errors as error}
													<div>• {error}</div>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if validRows.length > 0}
							<div>
								<h4 class="font-medium text-green-600 mb-2 flex items-center gap-2">
									<CheckCircle class="h-4 w-4" />
									Valid Rows ({validRows.length})
								</h4>
								<div class="max-h-48 overflow-y-auto border rounded-md">
									{#each validRows.slice(0, 10) as row}
										<div class="p-3 border-b bg-green-50">
											<div class="flex justify-between">
												<div>
													<div class="font-medium">{row.product_name || row.product_id}</div>
													<div class="text-sm text-gray-600">
														{row.adjustment_quantity} units
													</div>
												</div>
												<div class="text-sm text-gray-500">
													Reason: {row.reason}
												</div>
											</div>
										</div>
									{/each}
									{#if validRows.length > 10}
										<div class="p-2 text-center text-sm text-gray-500">
											... and {validRows.length - 10} more rows
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-between mt-6">
			<Button variant="outline" onclick={handleClose}>
				Cancel
			</Button>

			{#if validRows.length > 0}
				<Button
					onclick={processImport}
					disabled={isProcessing}
					class="flex items-center gap-2"
				>
					{#if isProcessing}
						Processing...
					{:else}
						<Upload class="h-4 w-4" />
						Process {validRows.length} Adjustments
					{/if}
				</Button>
			{/if}
		</div>
	</div>
</dialog>
