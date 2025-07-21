<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { products } from '$lib/stores/productStore';
	import { productBatches } from '$lib/stores/productBatchStore';
	import type { Product, ProductBatch } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Download, FileText, Package, Calendar } from 'lucide-svelte';
	import Papa from 'papaparse';

	const dispatch = createEventDispatcher();

	export let isOpen = false;

	let allProducts: Product[] = [];
	let allBatches: ProductBatch[] = [];

	// Subscribe to stores
	products.subscribe(value => {
		allProducts = value.filter(p => !p.is_archived);
	});

	productBatches.subscribe(value => {
		allBatches = value;
	});

	function closeModal() {
		isOpen = false;
		dispatch('close');
	}

	function downloadCSVTemplate() {
		// Create CSV template with headers for bulk inventory adjustments
		const headers = [
			'product_id',
			'sku',
			'product_name',
			'current_stock',
			'adjustment_quantity',
			'adjustment_type',
			'reason',
			'notes',
			'batch_number',
			'expiration_date'
		];

		// Create sample data with current products
		const templateData = allProducts.slice(0, 5).map(product => {
			// Calculate current stock from batches
			const productBatchesForProduct = allBatches.filter(b => b.product_id === product.id);
			const currentStock = productBatchesForProduct.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);

			return {
				product_id: product.id,
				sku: product.sku,
				product_name: product.name,
				current_stock: currentStock,
				adjustment_quantity: '', // To be filled by user
				adjustment_type: 'add', // add, remove, or set
				reason: 'cycle_count', // cycle_count, spoilage, damage, etc.
				notes: '',
				batch_number: '',
				expiration_date: ''
			};
		});

		// Add empty rows for user to fill
		for (let i = 0; i < 10; i++) {
			templateData.push({
				product_id: '',
				sku: '',
				product_name: '',
				current_stock: 0,
				adjustment_quantity: '',
				adjustment_type: 'add',
				reason: 'cycle_count',
				notes: '',
				batch_number: '',
				expiration_date: ''
			});
		}

		const csv = Papa.unparse(templateData, {
			header: true
		});

		downloadFile(csv, 'inventory_adjustment_template.csv', 'text/csv');
	}

	function downloadCurrentInventory() {
		// Export current inventory levels
		const inventoryData = allProducts.map(product => {
			const productBatchesForProduct = allBatches.filter(b => b.product_id === product.id);
			const totalStock = productBatchesForProduct.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);
			const avgCost = productBatchesForProduct.length > 0 
				? productBatchesForProduct.reduce((sum, batch) => sum + batch.purchase_cost, 0) / productBatchesForProduct.length
				: 0;

			return {
				product_id: product.id,
				sku: product.sku,
				product_name: product.name,
				category_id: product.category_id,
				current_stock: totalStock,
				base_unit: product.base_unit,
				reorder_point: product.reorder_point || 0,
				current_price: product.price,
				average_cost: avgCost,
				supplier_id: product.supplier_id,
				aisle: product.aisle || '',
				batch_count: productBatchesForProduct.length
			};
		});

		const csv = Papa.unparse(inventoryData, {
			header: true
		});

		downloadFile(csv, `inventory_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
	}

	function downloadBatchReport() {
		// Export detailed batch information
		const batchData = allBatches.map(batch => {
			const product = allProducts.find(p => p.id === batch.product_id);
			return {
				batch_id: batch.id,
				batch_number: batch.batch_number,
				product_id: batch.product_id,
				sku: product?.sku || 'Unknown',
				product_name: product?.name || 'Unknown Product',
				quantity_on_hand: batch.quantity_on_hand,
				purchase_cost: batch.purchase_cost,
				expiration_date: batch.expiration_date || '',
				created_at: batch.created_at,
				base_unit: product?.base_unit || 'piece'
			};
		});

		const csv = Papa.unparse(batchData, {
			header: true
		});

		downloadFile(csv, `batch_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
	}

	function downloadFile(content: string, filename: string, contentType: string) {
		const blob = new Blob([content], { type: contentType });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-2xl font-bold flex items-center gap-2">
					<Download class="h-6 w-6" />
					Export Inventory Data
				</h2>
				<button 
					onclick={closeModal}
					class="text-gray-500 hover:text-gray-700"
				>
					✕
				</button>
			</div>

			<div class="space-y-4">
				<!-- CSV Template for Bulk Adjustments -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<FileText class="h-5 w-5" />
							Inventory Adjustment Template
						</CardTitle>
						<CardDescription>
							Download a CSV template for bulk inventory adjustments. Fill in the adjustment quantities and upload to apply changes.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="flex items-center justify-between">
							<div>
								<Badge variant="secondary">{allProducts.length} products available</Badge>
								<p class="text-sm text-gray-600 mt-1">
									Includes sample data for first 5 products + empty rows
								</p>
							</div>
							<Button onclick={downloadCSVTemplate} class="flex items-center gap-2">
								<Download class="h-4 w-4" />
								Download Template
							</Button>
						</div>
					</CardContent>
				</Card>

				<!-- Current Inventory Report -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Package class="h-5 w-5" />
							Current Inventory Report
						</CardTitle>
						<CardDescription>
							Export current inventory levels, costs, and product information.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="flex items-center justify-between">
							<div>
								<Badge variant="secondary">{allProducts.length} products</Badge>
								<p class="text-sm text-gray-600 mt-1">
									Includes stock levels, pricing, and supplier info
								</p>
							</div>
							<Button onclick={downloadCurrentInventory} variant="outline" class="flex items-center gap-2">
								<Download class="h-4 w-4" />
								Download Report
							</Button>
						</div>
					</CardContent>
				</Card>

				<!-- Batch Details Report -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Calendar class="h-5 w-5" />
							Batch Details Report
						</CardTitle>
						<CardDescription>
							Export detailed batch information including expiration dates and purchase costs.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="flex items-center justify-between">
							<div>
								<Badge variant="secondary">{allBatches.length} batches</Badge>
								<p class="text-sm text-gray-600 mt-1">
									Includes batch numbers, expiration dates, and costs
								</p>
							</div>
							<Button onclick={downloadBatchReport} variant="outline" class="flex items-center gap-2">
								<Download class="h-4 w-4" />
								Download Report
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div class="flex justify-end mt-6">
				<Button variant="outline" onclick={closeModal}>
					Close
				</Button>
			</div>
		</div>
	</div>
{/if}
