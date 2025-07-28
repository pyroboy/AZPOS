import type { Product, ProductBatch } from '$lib/schemas/models';
import { get as getFromIdb, set as setToIdb } from 'idb-keyval';
import { browser } from '$app/environment';

/**
 * A harmonized product type that includes calculated stock levels and associated batches.
 */
export type ProductWithStock = Product & {
	stock: number;
	batches: ProductBatch[];
};

/**
 * Svelte 5 inventory management using runes
 * This replaces the legacy store-based approach with modern reactive state
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

	// Derived inventory that combines products with their stock levels
	inventory = $derived.by(() => {
		return this.products.map((product) => {
			const batchesForProduct = this.productBatches.filter(
				(batch) => batch.product_id === product.id
			);
			const totalStock = batchesForProduct.reduce(
				(sum, batch) => sum + batch.quantity_on_hand,
				0
			);

			return {
				...product,
				stock: totalStock,
				batches: batchesForProduct
			};
		});
	});

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

	updateProduct(updatedProduct: Product) {
		this.products = this.products.map(p => 
			p.id === updatedProduct.id ? { ...updatedProduct, updated_at: new Date().toISOString() } : p
		);
	}

	archiveProduct(productId: string) {
		this.products = this.products.map(p => 
			p.id === productId ? { ...p, is_archived: true, updated_at: new Date().toISOString() } : p
		);
	}

	unarchiveProduct(productId: string) {
		this.products = this.products.map(p => 
			p.id === productId ? { ...p, is_archived: false, updated_at: new Date().toISOString() } : p
		);
	}

	getActiveProducts() {
		return this.products.filter(p => !p.is_archived);
	}

	findProductById(productId: string) {
		return this.products.find(p => p.id === productId);
	}

	// Product Batch management methods
	addBatch(batch: Omit<ProductBatch, 'id' | 'created_at'>) {
		const newBatch: ProductBatch = {
			...batch,
			id: `batch_${crypto.randomUUID()}`,
			created_at: new Date().toISOString()
		};
		this.productBatches = [...this.productBatches, newBatch];
		return newBatch;
	}

	updateBatch(updatedBatch: ProductBatch) {
		this.productBatches = this.productBatches.map(b => 
			b.id === updatedBatch.id ? updatedBatch : b
		);
	}

	deleteBatch(batchId: string) {
		this.productBatches = this.productBatches.filter(b => b.id !== batchId);
	}

	addStockToBatch(batchId: string, quantity: number) {
		this.productBatches = this.productBatches.map(batch => 
			batch.id === batchId 
				? { ...batch, quantity_on_hand: batch.quantity_on_hand + quantity }
				: batch
		);
	}

	removeStockFromBatch(batchId: string, quantity: number) {
		this.productBatches = this.productBatches.map(batch => 
			batch.id === batchId 
				? { ...batch, quantity_on_hand: Math.max(0, batch.quantity_on_hand - quantity) }
				: batch
		);
	}

	setStockForBatch(batchId: string, quantity: number) {
		this.productBatches = this.productBatches.map(batch => 
			batch.id === batchId 
				? { ...batch, quantity_on_hand: Math.max(0, quantity) }
				: batch
		);
	}

	// Utility methods
	getTotalStockForProduct(productId: string): number {
		return this.productBatches
			.filter(batch => batch.product_id === productId)
			.reduce((sum, batch) => sum + batch.quantity_on_hand, 0);
	}

	getBatchesForProduct(productId: string): ProductBatch[] {
		return this.productBatches.filter(batch => batch.product_id === productId);
	}

	// Reset methods
	resetProducts() {
		this.products = [];
	}

	resetBatches() {
		this.productBatches = [];
	}

	resetAll() {
		this.products = [];
		this.productBatches = [];
		this.meta = {
			totalProducts: 0,
			totalInventoryValue: 0,
			potentialRevenue: 0,
			lowStockCount: 0,
			outOfStockCount: 0
		};
	}
}

// Create and export the singleton inventory manager
export const inventoryManager = new InventoryManager();

// Export individual reactive properties for easy access
export const products = inventoryManager.products;
export const productBatches = inventoryManager.productBatches;
export const inventory = inventoryManager.inventory;
export const meta = inventoryManager.meta;

// Export utility functions for backward compatibility
export const getTotalStockForProduct = (productId: string) => 
	inventoryManager.getTotalStockForProduct(productId);

export const getProductById = (productId: string) => 
	inventoryManager.findProductById(productId);

