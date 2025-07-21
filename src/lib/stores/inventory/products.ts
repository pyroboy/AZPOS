import { derived } from 'svelte/store';
import { inventory } from '../inventoryStore';
import { searchTerm, activeCategories, sortOrder } from './filters';

// Derived state for products
export const filteredProducts = derived(
	[inventory, searchTerm, activeCategories, sortOrder],
	([$inventory, $searchTerm, $activeCategories, $sortOrder]) => {
		const st = $searchTerm.toLowerCase();
		return $inventory
			.filter((p) => {
				const matchesSearch =
					st === '' ||
					p.name.toLowerCase().includes(st) ||
					p.sku.toLowerCase().includes(st);
				const matchesCategory =
					$activeCategories.length === 0 || $activeCategories.includes(p.category_id);
				return matchesSearch && matchesCategory;
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
