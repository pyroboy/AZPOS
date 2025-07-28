import { get as getFromIdb, set as setToIdb } from 'idb-keyval';
import type { Product, BundleComponent } from '$lib/schemas/models';
import { browser } from '$app/environment';

/**
 * Svelte 5 product management using runes
 * This replaces the legacy store-based approach with modern reactive state
 */
class ProductManager {
	// Core reactive state using Svelte 5 runes
	products = $state<Product[]>([]);
	
	// Loading and pagination state
	isLoading = $state(false);
	currentPage = $state(1);
	totalProducts = $state(0);
	hasMore = $state(true);
	
	// Meta information state
	meta = $state({
		totalProducts: 0,
		totalInventoryValue: 0,
		potentialRevenue: 0,
		lowStockCount: 0,
		outOfStockCount: 0
	});

	// Derived active products
	activeProducts = $derived(this.products.filter(p => !p.is_archived));

	async loadMeta(fetchFn: typeof fetch = fetch) {
		try {
			const res = await fetchFn('/api/products/meta');
			if (!res.ok) throw new Error('Failed to fetch meta');
			const data = await res.json();
			this.meta = data;
		} catch (e) {
			console.error('Failed to load product meta', e);
		}
	}

	async loadProducts(fetchFn: typeof fetch = fetch) {
		// Reset state for a fresh load
		this.currentPage = 1;
		this.hasMore = true;
		this.isLoading = false;
		
		// On the server, this store acts as a request-level cache.
		// On the client, it's a long-lived cache.
		if (this.products.length > 0) {
			return;
		}

		// Check IndexedDB (only in browser)
		if (browser) {
			try {
				const cachedProducts = await getFromIdb<Product[]>('products');
				if (cachedProducts && cachedProducts.length > 0) {
					console.log('[productStore] Loading products from IndexedDB cache.');
					this.products = cachedProducts;
					return;
				}
			} catch (e) {
				console.error('[productStore] Could not read from IndexedDB.', e);
			}
		}

		// Fetch from API if cache is empty or on server
		try {
			console.log('[productStore] No cache found. Fetching from API...');
			const response = await fetchFn('/api/products?page=1&limit=100');
			if (!response.ok) throw new Error('Network response was not ok.');

			const data = await response.json();
			const initialProducts: Product[] = data.products;
			this.totalProducts = data.total;

			if (initialProducts && initialProducts.length > 0) {
				this.products = initialProducts;
				if (browser) {
					await setToIdb('products', initialProducts);
					console.log('[productStore] Fetched, processed, and cached initial 100 products.');
				}
				await this.loadMeta(fetchFn);
			}
		} catch (error) {
			console.error('Failed to load and parse products from API:', error);
			this.products = [];
		}
	}

	async loadMoreProducts(fetchFn: typeof fetch = fetch) {
		if (this.isLoading || !this.hasMore) return;

		this.isLoading = true;
		console.log(`[productStore] Loading more products, page: ${this.currentPage + 1}`);

		try {
			const nextPage = this.currentPage + 1;
			const response = await fetchFn(`/api/products?page=${nextPage}&limit=100`);
			if (!response.ok) throw new Error('Network response was not ok.');

			const data = await response.json();
			const newProducts: Product[] = data.products;

			if (newProducts.length > 0) {
				const updatedProducts = [...this.products, ...newProducts];
				this.products = updatedProducts;
				if (browser) {
					setToIdb('products', updatedProducts);
				}
				this.currentPage = nextPage;
			} 

			if (this.products.length >= this.totalProducts) {
				this.hasMore = newProducts.length === 100; // 100 == full page
			}

		} catch (error) {
			console.error('Failed to load more products:', error);
		} finally {
			this.isLoading = false;
		}
	}

	addProduct(product: Omit<Product, 'id'>) {
		const newProduct: Product = {
			id: crypto.randomUUID(),
			...product,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
		this.products = [...this.products, newProduct];
		return newProduct;
	}

	updateProduct(id: string, data: Partial<Omit<Product, 'id'>>) {
		const index = this.products.findIndex(p => p.id === id);
		if (index !== -1) {
			this.products[index] = {
				...this.products[index],
				...data,
				updated_at: new Date().toISOString()
			};
		}
	}

	bulkUpdatePrices(updates: { id: string; price: number }[]) {
		const updatesMap = new Map(updates.map(u => [u.id, u.price]));
		this.products = this.products.map(p => {
			if (p.id) {
				const newPrice = updatesMap.get(p.id);
				if (newPrice !== undefined) {
					return { ...p, price: newPrice, updated_at: new Date().toISOString() };
				}
			}
			return p;
		});
	}

	bulkUpdateProducts(updates: { ids: string[], data: Partial<Omit<Product, 'id'>> }) {
		this.products = this.products.map(p => {
			if (p.id && updates.ids.includes(p.id)) {
				return { ...p, ...updates.data, updated_at: new Date().toISOString() };
			}
			return p;
		});
	}

	archiveProduct(productId: string) {
		const productToArchive = this.products.find(p => p.id === productId);
		if (!productToArchive) {
			throw new Error('Product not found');
		}

		const activeVariants = this.products.filter(p =>
			p.master_product_id === productId && !p.is_archived
		);

		const parentBundles = this.products.filter(p => 
			p.product_type === 'bundle' && 
			!p.is_archived &&
			p.bundle_components?.some((c: BundleComponent) => c.product_id === productId)
		);

		if (parentBundles.length > 0) {
			const bundleNames = parentBundles.map(p => p.name).join(', ');
			throw new Error(`Cannot archive product: it is a component in the following active bundle(s): ${bundleNames}.`);
		}

		if (activeVariants.length > 0) {
			throw new Error(`Cannot archive product: ${activeVariants.length} active variant(s) still exist. Archive variants first.`);
		}

		const index = this.products.findIndex(p => p.id === productId);
		if (index !== -1) {
			this.products[index] = {
				...this.products[index],
				is_archived: true,
				updated_at: new Date().toISOString()
			};
		}
	}

	unarchiveProduct(productId: string) {
		const index = this.products.findIndex(p => p.id === productId);
		if (index !== -1) {
			this.products[index] = {
				...this.products[index],
				is_archived: false,
				updated_at: new Date().toISOString()
			};
		}
	}

	findById(productId: string): Product | undefined {
		return this.products.find(p => p.id === productId);
	}

	setProducts(newProducts: Product[]) {
		this.products = newProducts;
	}

	reset() {
		this.products = [];
		this.currentPage = 1;
		this.hasMore = true;
		this.isLoading = false;
		this.totalProducts = 0;
	}
}

// Create and export the singleton product manager
export const productManager = new ProductManager();

// Export individual reactive properties for easy access
export const {
	products,
	activeProducts,
	meta,
	isLoading,
	currentPage,
	totalProducts,
	hasMore
} = productManager;

// Export utility functions for backward compatibility
export const getProductById = (id: string) => productManager.findById(id);
