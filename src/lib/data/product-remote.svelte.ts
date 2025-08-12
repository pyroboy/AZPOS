import { browser } from '$app/environment';
import type { Product, ProductFilters, PaginatedProducts, ProductMeta } from '$lib/types/product';
import {
	getProducts,
	getProductById,
	getProductMeta,
	createProduct,
	updateProduct,
	bulkUpdateProducts,
	adjustStock,
	deleteProduct
} from '$lib/remote/products.remote';

export function useProducts(filters?: ProductFilters) {
	// Create reactive state for products query
	let productsData = $state<PaginatedProducts | undefined>(undefined);
	let isLoading = $state(false);
	let isError = $state(false);
	let error = $state<Error | null>(null);

	// Create reactive state for meta query
	let metaData = $state<ProductMeta | undefined>(undefined);
	let isMetaLoading = $state(false);
	let isMetaError = $state(false);

	// Function to fetch products
	async function fetchProducts() {
		if (!browser) return;
		
		try {
			isLoading = true;
			isError = false;
			error = null;
			
			console.log('🔍 [REMOTE HOOK] Fetching products with filters:', filters);
			const result = await getProducts(filters);
			productsData = result;
			console.log('✅ [REMOTE HOOK] Products fetched successfully:', result);
		} catch (err) {
			console.error('❌ [REMOTE HOOK] Error fetching products:', err);
			isError = true;
			error = err as Error;
		} finally {
			isLoading = false;
		}
	}

	// Function to fetch meta
	async function fetchMeta() {
		if (!browser) return;
		
		try {
			isMetaLoading = true;
			isMetaError = false;
			
			const result = await getProductMeta();
			metaData = result;
		} catch (err) {
			console.error('❌ [REMOTE HOOK] Error fetching meta:', err);
			isMetaError = true;
		} finally {
			isMetaLoading = false;
		}
	}

	// Auto-fetch on mount and when filters change
	$effect(() => {
		fetchProducts();
		fetchMeta();
	});

	// Derived state from products data
	const products = $derived(productsData?.products ?? []);
	const pagination = $derived(productsData?.pagination);

	const activeProducts = $derived(products.filter((p) => p.is_active && !p.is_archived));
	const archivedProducts = $derived(products.filter((p) => p.is_archived));
	const bundleProducts = $derived(products.filter((p) => p.is_bundle));
	const lowStockProducts = $derived(
		products.filter((p) => p.stock_quantity <= (p.min_stock_level || 10))
	);
	const outOfStockProducts = $derived(products.filter((p) => p.stock_quantity === 0));

	// Mutation functions
	async function createProductMutation(productData: any) {
		try {
			const newProduct = await createProduct(productData);
			// Optimistically update the local state
			if (productsData) {
				productsData = {
					...productsData,
					products: [newProduct, ...productsData.products],
					pagination: { 
						...productsData.pagination, 
						total: productsData.pagination.total + 1 
					}
				};
			}
			return newProduct;
		} catch (err) {
			console.error('Failed to create product:', err);
			throw err;
		}
	}

	async function updateProductMutation(productId: string, productData: any) {
		try {
			const updatedProduct = await updateProduct(productId, productData);
			// Optimistically update the local state
			if (productsData) {
				productsData = {
					...productsData,
					products: productsData.products.map((product) =>
						product.id === updatedProduct.id ? updatedProduct : product
					)
				};
			}
			return updatedProduct;
		} catch (err) {
			console.error('Failed to update product:', err);
			throw err;
		}
	}

	async function bulkUpdateProductsMutation(productIds: string[], updates: any) {
		try {
			const updatedProducts = await bulkUpdateProducts(productIds, updates);
			// Optimistically update the local state
			if (productsData) {
				const updatedProductsMap = new Map(updatedProducts.map((p: Product) => [p.id, p]));
				productsData = {
					...productsData,
					products: productsData.products.map((product) =>
						updatedProductsMap.get(product.id) || product
					)
				};
			}
			return updatedProducts;
		} catch (err) {
			console.error('Failed to bulk update products:', err);
			throw err;
		}
	}

	async function adjustStockMutation(productId: string, adjustment: number, reason?: string) {
		try {
			const updatedProduct = await adjustStock(productId, adjustment, reason);
			// Optimistically update the local state
			if (productsData) {
				productsData = {
					...productsData,
					products: productsData.products.map((product) =>
						product.id === updatedProduct.id ? updatedProduct : product
					)
				};
			}
			return updatedProduct;
		} catch (err) {
			console.error('Failed to adjust stock:', err);
			throw err;
		}
	}

	async function deleteProductMutation(productId: string) {
		try {
			await deleteProduct(productId);
			// Optimistically update the local state
			if (productsData) {
				productsData = {
					...productsData,
					products: productsData.products.filter((product) => product.id !== productId),
					pagination: { 
						...productsData.pagination, 
						total: productsData.pagination.total - 1 
					}
				};
			}
		} catch (err) {
			console.error('Failed to delete product:', err);
			throw err;
		}
	}

	return {
		// Reactive state (wrapped in getters to preserve reactivity)
		get products() { return products; },
		get pagination() { return pagination; },
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		get meta() { return metaData; },
		get isMetaLoading() { return isMetaLoading; },
		get isMetaError() { return isMetaError; },

		// Derived filtered lists (wrapped in getters to preserve reactivity)
		get activeProducts() { return activeProducts; },
		get archivedProducts() { return archivedProducts; },
		get bundleProducts() { return bundleProducts; },
		get lowStockProducts() { return lowStockProducts; },
		get outOfStockProducts() { return outOfStockProducts; },

		// Mutations
		createProduct: createProductMutation,
		updateProduct: updateProductMutation,
		bulkUpdateProducts: bulkUpdateProductsMutation,
		adjustStock: adjustStockMutation,
		deleteProduct: deleteProductMutation,

		// Utility functions
		refetch: fetchProducts,
		refetchMeta: fetchMeta
	};
}

export function useProduct(productId: string) {
	// Create reactive state for single product query
	let productData = $state<Product | undefined>(undefined);
	let isLoading = $state(false);
	let isError = $state(false);
	let error = $state<Error | null>(null);

	// Function to fetch product
	async function fetchProduct() {
		if (!browser || !productId) return;
		
		try {
			isLoading = true;
			isError = false;
			error = null;
			
			const result = await getProductById(productId);
			productData = result;
		} catch (err) {
			console.error('❌ [REMOTE HOOK] Error fetching product:', err);
			isError = true;
			error = err as Error;
		} finally {
			isLoading = false;
		}
	}

	// Auto-fetch on mount and when productId changes
	$effect(() => {
		fetchProduct();
	});

	return {
		get product() { return productData; },
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		refetch: fetchProduct
	};
}