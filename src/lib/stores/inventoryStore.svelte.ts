import type {
	Product,
	ProductBatch,
	InventoryAdjustment,
	CsvAdjustment
} from '$lib/schemas/models';
import { get as getFromIdb, set as setToIdb } from 'idb-keyval';
import { browser } from '$app/environment';
import { debounce } from 'ts-debounce';

/**
 * A harmonized product type that includes calculated stock levels and associated batches.
 */
export type ProductWithStock = Product & {
	stock: number;
	batches: ProductBatch[];
};

/**
 * Svelte 5 inventory management using runes
 * This consolidates all inventory-related functionality into a single class
 */
class InventoryManager {
	// Core reactive state using Svelte 5 runes
	products = $state<Product[]>([]);
	productBatches = $state<ProductBatch[]>([]);

	// Meta information state
	meta = $state({
		totalProducts: 0,
		totalInventoryValue: 0,
		potentialRevenue: 0,
		lowStockCount: 0,
		outOfStockCount: 0
	});

	// Filter state (consolidated from filters.ts)
	searchTerm = $state('');
	activeCategories = $state<string[]>([]);
	sortOrder = $state<
		| 'name_asc'
		| 'name_desc'
		| 'stock_asc'
		| 'stock_desc'
		| 'price_asc'
		| 'price_desc'
		| 'expiry_asc'
		| 'expiry_desc'
	>('name_asc');
	stockStatusFilter = $state<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');

	// Selection state (consolidated from selection.ts)
	selectedProductIds = $state<string[]>([]);

	// Editing state (consolidated from editing.ts)
	editingCell = $state<{ productId: string; field: 'price' | 'stock' } | null>(null);
	editValue = $state('');

	// Modal state (consolidated from modals.ts)
	isBulkEditModalOpen = $state(false);

	// Stock transaction state (consolidated from stockTransactionStore.ts)
	inventoryAdjustments = $state<InventoryAdjustment[]>([
		{
			id: 'adj-sale-1',
			product_id: 'prod-paracetamol-500',
			batch_id: 'batch-para-1',
			quantity_adjusted: -2,
			adjustment_type: 'subtract',
			reason: 'Sale (Order: ord-12345)',
			created_at: new Date('2023-10-15T10:00:00Z').toISOString(),
			user_id: 'user-cashier'
		},
		{
			id: 'adj-stockin-1',
			product_id: 'prod-paracetamol-500',
			batch_id: 'batch-para-1',
			quantity_adjusted: 100,
			adjustment_type: 'add',
			reason: 'Stock In (PO Item: po-item-1)',
			created_at: new Date('2023-10-01T09:00:00Z').toISOString(),
			user_id: 'user-manager'
		}
	]);

	// Derived inventory that combines products with their stock levels
	inventory = $derived.by(() => {
		return this.products.map((product) => {
			const batchesForProduct = this.productBatches.filter(
				(batch) => batch.product_id === product.id
			);
			const totalStock = batchesForProduct.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);

			return {
				...product,
				stock: totalStock,
				batches: batchesForProduct
			};
		});
	});

	// Derived filtered products (consolidated from products.ts)
	filteredProducts = $derived.by(() => {
		const st = this.searchTerm.toLowerCase();
		return this.inventory
			.filter((p) => {
				const matchesSearch =
					st === '' || p.name.toLowerCase().includes(st) || p.sku.toLowerCase().includes(st);

				const matchesStockStatus = (() => {
					switch (this.stockStatusFilter) {
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
					this.activeCategories.length === 0 || this.activeCategories.includes(p.category_id);
				return matchesSearch && matchesCategory && matchesStockStatus;
			})
			.sort((a, b) => {
				switch (this.sortOrder) {
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
							const validBatches = p.batches.filter((b) => b.expiration_date);
							return validBatches.length > 0
								? new Date(
										Math.min(...validBatches.map((b) => new Date(b.expiration_date!).getTime()))
									)
								: null;
						};
						const expiryA = getSoonestExpiry(a);
						const expiryB = getSoonestExpiry(b);
						if (expiryA && expiryB) return expiryA.getTime() - expiryB.getTime();
						if (expiryA) return -1;
						if (expiryB) return 1;
						return 0;
					}
					case 'expiry_desc': {
						const getSoonestExpiry = (p: ProductWithStock) => {
							const validBatches = p.batches.filter((b) => b.expiration_date);
							return validBatches.length > 0
								? new Date(
										Math.min(...validBatches.map((b) => new Date(b.expiration_date!).getTime()))
									)
								: null;
						};
						const expiryA = getSoonestExpiry(a);
						const expiryB = getSoonestExpiry(b);
						if (expiryA && expiryB) return expiryB.getTime() - expiryA.getTime();
						if (expiryB) return -1;
						if (expiryA) return 1;
						return 0;
					}
					default:
						return 0;
				}
			});
	});

	// Derived selection state
	areAllVisibleRowsSelected = $derived(
		this.filteredProducts.length > 0 &&
			this.selectedProductIds.length === this.filteredProducts.length
	);

	// Debounced search function
	setSearchDebounced = debounce((value: string) => {
		this.searchTerm = value;
	}, 300);

	// Product management methods
	async loadProducts(fetchFn: typeof fetch = fetch) {
		try {
			// Check cache first (browser only)
			if (browser && this.products.length === 0) {
				const cachedProducts = await getFromIdb<Product[]>('products');
				if (cachedProducts?.length) {
					this.products = cachedProducts;
					return;
				}
			}

			// Fetch from API
			const res = await fetchFn('/api/products');
			if (!res.ok) throw new Error('Failed to fetch products');
			const data = await res.json();

			this.products = data;

			// Cache in browser
			if (browser) {
				await setToIdb('products', data);
			}
		} catch (error) {
			console.error('Failed to load products:', error);
		}
	}

	async loadMeta(fetchFn: typeof fetch = fetch) {
		try {
			const res = await fetchFn('/api/products/meta');
			if (!res.ok) throw new Error('Failed to fetch meta');
			const data = await res.json();
			this.meta = data;
		} catch (error) {
			console.error('Failed to load product meta:', error);
		}
	}

	// Product CRUD operations
	addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
		const newProduct: Product = {
			...product,
			id: `prod-${crypto.randomUUID()}`,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
		this.products = [...this.products, newProduct];
		return newProduct;
	}

	updateProduct(id: string, updates: Partial<Product>) {
		const index = this.products.findIndex((p) => p.id === id);
		if (index !== -1) {
			this.products[index] = {
				...this.products[index],
				...updates
			};
		}
	}

	deleteProduct(id: string) {
		this.products = this.products.filter((p) => p.id !== id);
		// Also remove associated batches
		this.productBatches = this.productBatches.filter((b) => b.product_id !== id);
	}

	// Batch management methods
	addBatch(batch: Omit<ProductBatch, 'id' | 'created_at'>) {
		const newBatch: ProductBatch = {
			...batch,
			id: `batch-${crypto.randomUUID()}`,
			created_at: new Date().toISOString()
		};
		this.productBatches = [...this.productBatches, newBatch];
		return newBatch;
	}

	updateBatch(id: string, updates: Partial<ProductBatch>) {
		const index = this.productBatches.findIndex((b) => b.id === id);
		if (index !== -1) {
			this.productBatches[index] = {
				...this.productBatches[index],
				...updates
			};
		}
	}

	deleteBatch(id: string) {
		this.productBatches = this.productBatches.filter((b) => b.id !== id);
	}

	// Enhanced batch management methods (consolidated from productBatchStore.ts)
	addStockToBatch(batchId: string, quantity: number) {
		const index = this.productBatches.findIndex((b) => b.id === batchId);
		if (index !== -1) {
			this.productBatches[index] = {
				...this.productBatches[index],
				quantity_on_hand: this.productBatches[index].quantity_on_hand + quantity
			};
		}
	}

	removeStockFromBatch(batchId: string, quantity: number) {
		const index = this.productBatches.findIndex((b) => b.id === batchId);
		if (index !== -1) {
			this.productBatches[index] = {
				...this.productBatches[index],
				quantity_on_hand: Math.max(0, this.productBatches[index].quantity_on_hand - quantity)
			};
		}
	}

	setStockForBatch(batchId: string, quantity: number) {
		const index = this.productBatches.findIndex((b) => b.id === batchId);
		if (index !== -1) {
			this.productBatches[index] = {
				...this.productBatches[index],
				quantity_on_hand: Math.max(0, quantity)
			};
		}
	}

	// Stock transaction methods (consolidated from stockTransactionStore.ts)
	addInventoryAdjustment(adjustment: Omit<InventoryAdjustment, 'id' | 'created_at'>) {
		const newAdjustment: InventoryAdjustment = {
			id: `adj-${crypto.randomUUID()}`,
			created_at: new Date().toISOString(),
			...adjustment
		};
		this.inventoryAdjustments = [...this.inventoryAdjustments, newAdjustment];
		return newAdjustment;
	}

	getAllAdjustments(): InventoryAdjustment[] {
		return [...this.inventoryAdjustments];
	}

	resetAdjustments() {
		this.inventoryAdjustments = [];
	}

	// CSV adjustment methods
	processCsvAdjustments(adjustments: CsvAdjustment[]) {
		adjustments.forEach((adj) => {
			const batch = this.productBatches.find(
				(b) => b.product_id === adj.product_id && b.batch_number === adj.batch_number
			);
			if (batch) {
				const oldQuantity = batch.quantity_on_hand;
				this.setStockForBatch(batch.id, adj.adjustment_quantity);
				this.addInventoryAdjustment({
					product_id: adj.product_id,
					batch_id: batch.id,
					quantity_adjusted: adj.adjustment_quantity - oldQuantity,
					adjustment_type: adj.adjustment_type === 'add' ? 'add' : 'subtract',
					reason: adj.reason || 'CSV Import Adjustment',
					user_id: 'system'
				});
			}
		});
	}

	// Filter methods (consolidated from filters.ts)
	toggleCategory(category: string) {
		if (this.activeCategories.includes(category)) {
			this.activeCategories = this.activeCategories.filter((c) => c !== category);
		} else {
			this.activeCategories = [...this.activeCategories, category];
		}
	}

	clearFilters() {
		this.searchTerm = '';
		this.activeCategories = [];
		this.stockStatusFilter = 'all';
	}

	// Selection methods (consolidated from selection.ts)
	handleRowSelect(productId: string) {
		if (this.selectedProductIds.includes(productId)) {
			this.selectedProductIds = this.selectedProductIds.filter((id) => id !== productId);
		} else {
			this.selectedProductIds = [...this.selectedProductIds, productId];
		}
	}

	toggleSelectAll() {
		const allIds = this.filteredProducts.map((p) => p.id);
		this.selectedProductIds = this.selectedProductIds.length === allIds.length ? [] : allIds;
	}

	// Editing methods (consolidated from editing.ts)
	startEditing(productId: string, field: 'price' | 'stock', currentValue: number | string) {
		this.editingCell = { productId, field };
		this.editValue = String(currentValue);
	}

	cancelEdit() {
		this.editingCell = null;
		this.editValue = '';
	}

	saveEdit() {
		if (!this.editingCell) return;

		const { productId, field } = this.editingCell;
		const numericValue = parseFloat(this.editValue);

		if (isNaN(numericValue)) {
			this.cancelEdit();
			return;
		}

		const productToUpdate = this.products.find((p) => p.id === productId);
		if (productToUpdate) {
			this.updateProduct(productId, { [field]: numericValue });
		}

		this.cancelEdit();
	}

	// Modal methods (consolidated from modals.ts)
	openBulkEditModal() {
		this.isBulkEditModalOpen = true;
	}

	closeBulkEditModal() {
		this.isBulkEditModalOpen = false;
	}

	// Utility methods
	getTotalStockForProduct(productId: string): number {
		return this.productBatches
			.filter((batch) => batch.product_id === productId)
			.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);
	}

	getProductById(productId: string): Product | undefined {
		return this.products.find((p) => p.id === productId);
	}

	getProductWithStock(productId: string): ProductWithStock | undefined {
		return this.inventory.find((p) => p.id === productId);
	}

	getBatchesForProduct(productId: string): ProductBatch[] {
		return this.productBatches.filter((b) => b.product_id === productId);
	}

	getAdjustmentsForProduct(productId: string): InventoryAdjustment[] {
		return this.inventoryAdjustments.filter((adj) => adj.product_id === productId);
	}

	getAdjustmentsForBatch(batchId: string): InventoryAdjustment[] {
		return this.inventoryAdjustments.filter((adj) => adj.batch_id === batchId);
	}
}

// Create and export the singleton inventory manager
export const inventoryManager = new InventoryManager();

// Export individual reactive properties for easy access
export const {
	products,
	productBatches,
	inventory,
	filteredProducts,
	meta,
	searchTerm,
	activeCategories,
	sortOrder,
	stockStatusFilter,
	selectedProductIds,
	areAllVisibleRowsSelected,
	editingCell,
	editValue,
	isBulkEditModalOpen,
	inventoryAdjustments
} = inventoryManager;

// Export utility functions for backward compatibility
export const getTotalStockForProduct = (productId: string) =>
	inventoryManager.getTotalStockForProduct(productId);
export const getProductById = (productId: string) => inventoryManager.getProductById(productId);
export const getProductWithStock = (productId: string) =>
	inventoryManager.getProductWithStock(productId);
export const getBatchesForProduct = (productId: string) =>
	inventoryManager.getBatchesForProduct(productId);
