import { writable, get } from 'svelte/store';
import Papa from 'papaparse';
import type { Product, BundleComponent } from '$lib/schemas/models';
import { productBatches } from './productBatchStore';

// --- Store ---
function createProductStore() {
	const store = writable<Product[]>([]);
	const { subscribe, set, update } = store;

	// loadProducts must be called from a server-side context
	// with event.fetch to load data during SSR.
		async function loadProducts(fetcher: typeof fetch) {
		try {
			const response = await fetcher('/products_master.csv');
						const csvText = await response.text();
			Papa.parse(csvText, {
				header: true,
				dynamicTyping: true,
				skipEmptyLines: true,
								complete: (results) => {
										if (results.errors.length > 0) {
						console.error('[productStore] Papaparse errors:', results.errors);
					}

					if (results.data) {
						productBatches.clear(); // Reset batches for a clean import
						const productsData = results.data as Record<string, unknown>[];
						const parsedProducts: Product[] = [];

						productsData.forEach((item: Record<string, unknown>) => {
							const pType = item.product_type as string;
							const now = new Date().toISOString();

							const product: Product = {
								id: String(item.id ?? crypto.randomUUID()),
								sku: String(item.sku ?? ''),
								name: String(item.name ?? 'Unknown Product'),
								description: item.description ? String(item.description) : undefined,
								category_id: String(item.category_id ?? 'uncategorized'),
								price: Number(item.price) || 0,
								image_url: (item.image_url as string | undefined) ?? undefined,
								supplier_id: String(item.supplier_id ?? 'default-supplier'),
								average_cost: Number(item.average_cost) || 0,
								base_unit: (item.base_unit as Product['base_unit']) ?? 'piece',
								reorder_point: item.reorder_point ? Number(item.reorder_point) : undefined,
								aisle: item.aisle ? String(item.aisle) : undefined,
								requires_batch_tracking: String(item.requires_batch_tracking).toUpperCase() === 'TRUE',
								product_type: pType === 'variant' || pType === 'bundle' ? pType : 'standard',
								master_product_id: item.master_product_id ? String(item.master_product_id) : undefined,
								is_archived: Boolean(item.is_archived ?? false),
								storage_requirement: (item.storage_requirement as Product['storage_requirement']) ?? 'room_temperature',
								created_at: (item.created_at as string) ?? now,
								updated_at: (item.updated_at as string) ?? now
							};
							parsedProducts.push(product);

							// Create initial stock batch if stock is provided
							const initialStock = Number(item.stock);
							if (initialStock > 0) {
								productBatches.addBatch({
									product_id: product.id,
									batch_number: String(item.batch_number ?? 'INITIAL-STOCK'),
									expiration_date: item.expiration_date ? new Date(item.expiration_date as string).toISOString() : undefined,
									quantity_on_hand: initialStock,
									purchase_cost: product.average_cost
								});
							}
						});

						console.log('Parsed products from CSV:', parsedProducts);
						set(parsedProducts);
					}
				}
			});
		} catch (error) {
			console.error('Failed to load and parse products:', error);
			set([]); // Set to empty array on error
		}
	}

	return {
		subscribe,
		set,
		loadProducts,
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
			const productsList = get({ subscribe });
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
			return get({ subscribe }).filter(p => !p.is_archived);
		},
		findById: (productId: string) => {
			return get({ subscribe }).find(p => p.id === productId);
		},
		reset: () => set([])
	};
}

export const products = createProductStore();

export function getProductById(id: string): Product | undefined {
    return get(products).find(p => p.id === id);
}
