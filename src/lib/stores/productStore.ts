import { writable, get } from 'svelte/store';
import { get as getFromIdb, set as setToIdb } from 'idb-keyval';
import type { Product, BundleComponent } from '$lib/schemas/models';
import { productBatches } from './productBatchStore';
import { browser } from '$app/environment';

// --- Store ---
function createProductStore() {
	const store = writable<Product[]>([]);
	const { subscribe, set, update } = store;

	async function loadProductsCached(fetchFn: typeof fetch = fetch) {
		// On the server, this store acts as a request-level cache.
		// On the client, it's a long-lived cache.
		if (get(store).length > 0) {
			return;
		}

		// 2. Check IndexedDB (only in browser)
		if (browser) {
			try {
				const cachedProducts = await getFromIdb<Product[]>('products');
				if (cachedProducts && cachedProducts.length > 0) {
					console.log('[productStore] Loading products from IndexedDB cache.');
					set(cachedProducts);
					return;
				}
			} catch (e) {
				console.error('[productStore] Could not read from IndexedDB.', e);
			}
		}

		// 3. Fetch from API if cache is empty or on server
		try {
			console.log('[productStore] No cache found. Fetching from API...');
			const response = await fetchFn('/api/products?page=1&limit=100'); // Use injected fetch
			if (!response.ok) throw new Error('Network response was not ok.');

			const data = await response.json();
			const initialProducts: Product[] = data.products;

			if (initialProducts && initialProducts.length > 0) {
				productBatches.clear(); // Reset batches for a clean import

				// The batch creation logic from the old function is preserved here
				initialProducts.forEach((product) => {
					// Type-safe check for non-schema properties from a potentially old data source
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const initialStock = Number((product as any).stock);
					if (initialStock > 0) {
						productBatches.addBatch({
							product_id: product.id,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							batch_number: String((product as any).batch_number ?? 'INITIAL-STOCK'),
							expiration_date: product.expiration_date ? new Date(product.expiration_date as string).toISOString() : undefined,
							quantity_on_hand: initialStock,
							purchase_cost: product.average_cost
						});
					}
				});

				set(initialProducts);
				if (browser) {
					await setToIdb('products', initialProducts);
					console.log('[productStore] Fetched, processed, and cached initial 100 products.');
				}
			}
		} catch (error) {
			console.error('Failed to load and parse products from API:', error);
			set([]); // Set to empty array on error
		}
	}

	return {
		subscribe,
		set,
		loadProducts: loadProductsCached,
		addProduct: (product: Omit<Product, 'id'>) => {
			const newProduct: Product = {
				id: crypto.randomUUID(),
				...product,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};
			update((p) => [...p, newProduct]);
		},
		updateProduct: (id: string, data: Partial<Omit<Product, 'id'>>) => {
			update((products) =>
				products.map((p) => (p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p))
			);
		},
		bulkUpdatePrices: (updates: { id: string; price: number }[]) => {
			update(products => {
				const updatesMap = new Map(updates.map(u => [u.id, u.price]));
				return products.map(p => {
					if (p.id) {
						const newPrice = updatesMap.get(p.id);
						if (newPrice !== undefined) {
							return { ...p, price: newPrice, updated_at: new Date().toISOString() };
						}
					}
					return p;
				});
			});
		},
		bulkUpdateProducts: (updates: { ids: string[], data: Partial<Omit<Product, 'id'>> }) => {
			update(products => {
				return products.map(p => {
					if (p.id && updates.ids.includes(p.id)) {
						return { ...p, ...updates.data, updated_at: new Date().toISOString() };
					}
					return p;
				});
			});
		},
		archiveProduct: (productId: string) => {
			const productsList = get(store);
			const productToArchive = productsList.find(p => p.id === productId);
			if (!productToArchive) {
				throw new Error('Product not found');
			}

			const activeVariants = productsList.filter(p =>
				p.master_product_id === productId && !p.is_archived
			);

						const parentBundles = productsList.filter(p => 
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

			update(products =>
				products.map(p =>
					p.id === productId
						? { ...p, is_archived: true, updated_at: new Date().toISOString() }
						: p
				)
			);
		},
		unarchiveProduct: (productId: string) => {
			update(products =>
				products.map(p =>
					p.id === productId
						? { ...p, is_archived: false, updated_at: new Date().toISOString() }
						: p
				)
			);
		},
		getActiveProducts: () => {
			return get(store).filter(p => !p.is_archived);
		},
		findById: (productId: string) => {
			return get(store).find(p => p.id === productId);
		},
		reset: () => set([])
	};
}

export const products = createProductStore();

export function getProductById(id: string): Product | undefined {
    return get(products).find(p => p.id === id);
}
