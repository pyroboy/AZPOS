import type {
	FastMover,
	SlowMover,
	ReorderItem,
	SupplierPerformanceData
} from '$lib/schemas/models';

function escapeCsvCell(cell: unknown): string {
	if (cell === null || cell === undefined) {
		return '';
	}
	const cellStr = String(cell);
	// If the cell contains a comma, a quote, or a newline, wrap it in double quotes.
	if (/[,"\n\r]/.test(cellStr)) {
		// Within a quoted cell, any existing double quotes must be escaped by doubling them.
		return `"${cellStr.replace(/"/g, '""')}"`;
	}
	return cellStr;
}

function convertToCsv<T extends Record<string, unknown>>(
	data: T[],
	headers: Record<keyof T, string>
): string {
	const headerRow = Object.values(headers).map(escapeCsvCell).join(',');
	const keys = Object.keys(headers) as (keyof T)[];

	const dataRows = data.map((row) => {
		return keys.map((key) => escapeCsvCell(row[key])).join(',');
	});

	return [headerRow, ...dataRows].join('\n');
}

export function exportFastMovers(data: FastMover[]): string {
	const headers: Record<keyof FastMover, string> = {
		id: 'ID',
		product_id: 'Product ID',
		sku: 'SKU',
		name: 'Product Name',
		units_sold: 'Total Units Sold (Last 30 days)',
		last_sale_date: 'Last Sale Date'
	};
	const formattedData = data.map((item) => ({
		...item,
		last_sale_date: new Date(item.last_sale_date).toLocaleDateString()
	}));
	return convertToCsv(formattedData, headers);
}

export function exportSlowMovers(data: SlowMover[]): string {
	const headers: Record<keyof SlowMover, string> = {
		product_id: 'Product ID',
		sku: 'SKU',
		name: 'Product Name',
		stock_on_hand: 'Current Stock',
		last_sale_date: 'Last Sale Date'
	};
	// Format the date for CSV export
	const formattedData = data.map((item) => ({
		...item,
		last_sale_date: item.last_sale_date ? new Date(item.last_sale_date).toLocaleDateString() : 'N/A'
	}));
	return convertToCsv(formattedData, headers);
}

export function exportReorderReport(data: ReorderItem[]): string {
	const headers: Record<keyof ReorderItem, string> = {
		sku: 'SKU',
		name: 'Product Name',
		supplier_name: 'Supplier',
		stock_on_hand: 'Current Stock',
		reorder_point: 'Reorder Point',
		suggested_reorder_qty: 'Suggested Reorder Qty'
	};
	return convertToCsv(data, headers);
}

export function exportSupplierPerformanceReport(data: SupplierPerformanceData[]): string {
	const headers: Record<keyof SupplierPerformanceData, string> = {
		supplier_name: 'Supplier Name',
		on_time_rate: 'On-Time Rate',
		avg_cost_variance: 'Avg. Cost Variance',
		total_pos: 'Total POs'
	};
	const formattedData = data.map((item) => ({
		...item,
		on_time_rate: `${(item.on_time_rate * 100).toFixed(2)}%`,
		avg_cost_variance: item.avg_cost_variance.toFixed(2)
	}));
	return convertToCsv(formattedData, headers);
}
