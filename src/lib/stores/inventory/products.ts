import { derived } from 'svelte/store';
import { inventory, type ProductWithStock } from '../inventoryStore';
import { searchTerm, activeCategories, sortOrder, stockStatusFilter } from './filters';
import type { ProductBatch } from '$lib/schemas/models';

// Derived state for products
export const filteredProducts = derived(
	[inventory, searchTerm, activeCategories, sortOrder, stockStatusFilter],
	([$inventory, $searchTerm, $activeCategories, $sortOrder, $stockStatusFilter]) => {
		const st = $searchTerm.toLowerCase();
		return $inventory
			.filter((p) => {
				const matchesSearch =
					st === '' ||
					p.name.toLowerCase().includes(st) ||
					p.sku.toLowerCase().includes(st);
				
				const matchesStockStatus = (() => {
					switch ($stockStatusFilter) {
						case 'low_stock':
							return p.stock > 0 && p.stock < (p.reorder_point ?? 20);
						case 'out_of_stock':
							return p.stock === 0;
						case 'in_stock':
							return p.stock > 0;
						default:
							return true;
					}
				})();

				const matchesCategory =
					$activeCategories.length === 0 || $activeCategories.includes(p.category_id);
				return matchesSearch && matchesCategory && matchesStockStatus;
			})
			.sort((a, b) => {
				switch ($sortOrder) {
					case 'name_asc':
						return a.name.localeCompare(b.name);
					case 'name_desc':
						return b.name.localeCompare(a.name);
					case 'stock_asc':
						return a.stock - b.stock;
					case 'stock_desc':
						return b.stock - a.stock;
					case 'price_asc':
						return a.price - b.price;
					case 'price_desc':
						return b.price - a.price;
					case 'expiry_asc': {
												const getSoonestExpiry = (p: ProductWithStock) => {
							if (!p.batches || p.batches.length === 0) return null;
							const soonest = p.batches
								.map((b: ProductBatch) => (b.expiration_date ? new Date(b.expiration_date) : null))
								.filter((d): d is Date => d !== null)
								.sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
							return soonest || null;
						};
						const expiryA = getSoonestExpiry(a);
						const expiryB = getSoonestExpiry(b);
						if (expiryA && expiryB) return expiryA.getTime() - expiryB.getTime();
						if (expiryA) return -1;
						if (expiryB) return 1;
						return 0;
					}
					default:
						return 0;
				}
			});
	}
);

export const categories = derived(inventory, ($inventory) => [...new Set($inventory.map((p) => p.category_id))]);

// Derived KPIs
export const itemsToReorderCount = derived(inventory, ($inventory) =>
    $inventory.filter((p) => p.stock < (p.reorder_point ?? 20)).length
);
export const totalSKUs = derived(inventory, ($inventory) => $inventory.length);
export const totalUnits = derived(inventory, ($inventory) =>
    $inventory.reduce((sum, p) => sum + p.stock, 0)
);
export const outOfStockCount = derived(inventory, ($inventory) =>
    $inventory.filter((p) => p.stock === 0).length
);
