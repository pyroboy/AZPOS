export const SORT_OPTIONS = [
	{ value: 'name_asc', label: 'Name (A-Z)' },
	{ value: 'name_desc', label: 'Name (Z-A)' },
	{ value: 'stock_asc', label: 'Stock (Low to High)' },
	{ value: 'stock_desc', label: 'Stock (High to Low)' },
	{ value: 'price_asc', label: 'Price (Low to High)' },
	{ value: 'price_desc', label: 'Price (High to Low)' },
	{ value: 'expiry_asc', label: 'Expiry (Soonest First)' }
];

export const STOCK_STATUS_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'in_stock', label: 'In Stock' },
	{ value: 'low_stock', label: 'Low Stock' },
	{ value: 'out_of_stock', label: 'Out of Stock' }
];
