<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Download } from 'lucide-svelte';
	import {
		exportFastMovers,
		exportSlowMovers,
		exportReorderReport,
		exportSupplierPerformanceReport
	} from '$lib/utils/inventoryReports';
	import type {
		FastMover,
		SlowMover,
		ReorderItem,
		SupplierPerformanceData
	} from '$lib/schemas/models';

	let {
		data,
		filename = 'export.csv',
		disabled = false,
		reportType
	}: {
		data: any[];
		filename?: string;
		disabled?: boolean;
		reportType: 'fast-movers' | 'slow-movers' | 'reorder' | 'supplierPerformance';
	} = $props();

	function handleExport() {
		if (!data || data.length === 0) {
			console.warn('Export button: No data to export.');
			return;
		}

		try {
			let csvContent: string;
			switch (reportType) {
				case 'fast-movers':
					csvContent = exportFastMovers(data as FastMover[]);
					break;
				case 'slow-movers':
					csvContent = exportSlowMovers(data as SlowMover[]);
					break;
				case 'reorder':
					csvContent = exportReorderReport(data as ReorderItem[]);
					break;
				case 'supplierPerformance':
					csvContent = exportSupplierPerformanceReport(data as SupplierPerformanceData[]);
					break;
				default:
					console.error('Unknown report type:', reportType);
					return;
			}

			const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			const url = URL.createObjectURL(blob);

			link.setAttribute('href', url);
			link.setAttribute('download', filename);
			link.style.visibility = 'hidden';

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Error exporting CSV:', error);
		}
	}
</script>

<Button onclick={handleExport} {disabled} variant="outline" size="sm">
	<Download class="mr-2 h-4 w-4" />
	Export
</Button>
