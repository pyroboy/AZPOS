import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type { Product, ProductInput, ProductFilters, PaginatedProducts, ProductMeta } from '$lib/types/product';

// Telefunc helper function
async function callTelefunc(functionName: string, args: any[] = []) {
	const response = await fetch('/api/telefunc', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			telefuncName: functionName,
			telefuncArgs: args
		})
	});

	if (!response.ok) {
		throw new Error(`Telefunc call failed: ${response.statusText}`);
	}

	const result = await response.json();
	return result.ret; // Unwrap the Telefunc response
}

// Use Telefunc to fetch products with filters
async function fetchProducts(filters?: ProductFilters): Promise<PaginatedProducts> {
	console.log('📡 [TELEFUNC] Fetching products with filters:', filters);
	// Pass an empty array if filters are not provided, otherwise pass the filters.
	return callTelefunc('onGetProducts', filters ? [filters] : []);
}

// Query keys for consistent cache management
const productQueryKeys = {
	all: ['products'] as const,
	lists: () => [...productQueryKeys.all, 'list'] as const,
	list: (filters?: ProductFilters | null) => {
		const normalizedFilters = normalizeFilters(filters);
		return [...productQueryKeys.lists(), normalizedFilters] as const;
	},
	detail: (id: string) => [...productQueryKeys.all, 'detail', id] as const,
	meta: () => [...productQueryKeys.all, 'meta'] as const
};

// Normalize filters to ensure consistent cache keys
function normalizeFilters(filters?: ProductFilters | null): ProductFilters | null {
	if (!filters) return null;
	
	// Remove undefined/null values and sort keys for consistent cache keys
	const normalized: ProductFilters = {};
	Object.keys(filters).sort().forEach(key => {
		const value = (filters as any)[key];
		if (value !== undefined && value !== null && value !== '') {
			(normalized as any)[key] = value;
		}
	});
	
	return Object.keys(normalized).length > 0 ? normalized : null;
}

export function useProducts(filters?: ProductFilters) {
	const queryClient = useQueryClient();

	// Query to fetch products with filters
	const productsQuery = createQuery<PaginatedProducts>({
		queryKey: productQueryKeys.list(filters),
		queryFn: async () => {
			try {
				console.log('🔍 [QUERY] Fetching products with filters:', filters);
				const result = await fetchProducts(filters);
				console.log('✅ [QUERY] Products fetched successfully:', result);
				return result;
			} catch (error) {
				console.error('❌ [QUERY] Error fetching products:', error);
				throw error;
			}
		},
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		enabled: browser, // Only run on client-side
		retry: 3,
		retryDelay: 1000
	});

	// Query to fetch product meta information
	const metaQuery = createQuery<ProductMeta>({
		queryKey: productQueryKeys.meta(),
		queryFn: () => callTelefunc('onGetProductMeta'),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser // Only run on client-side
	});

	// --- SVELTE 5 RUNES UPDATE ---
	// Use $derived for reactive state. No more imports needed.
	const _products = $derived(productsQuery.data?.products ?? []);
	const _pagination = $derived(productsQuery.data?.pagination);
	const _isLoading = $derived(productsQuery.isPending);
	const _isError = $derived(productsQuery.isError);
	const _error = $derived(productsQuery.error);

	const _meta = $derived(metaQuery.data);
	const _isMetaLoading = $derived(metaQuery.isPending);
	const _isMetaError = $derived(metaQuery.isError);

	const activeProducts = $derived(_products.filter((p) => p.is_active && !p.is_archived));
	const archivedProducts = $derived(_products.filter((p) => p.is_archived));
	const bundleProducts = $derived(_products.filter((p) => p.is_bundle));
	const lowStockProducts = $derived(
		_products.filter((p) => p.stock_quantity <= (p.low_stock_threshold || 10))
	);
	const outOfStockProducts = $derived(_products.filter((p) => p.stock_quantity === 0));
	// --- END UPDATE ---

	// Mutation to create a new product
	const createProductMutation = createMutation({
		mutationFn: (productData: ProductInput) => callTelefunc('onCreateProduct', [productData]),
		onSuccess: (newProduct) => {
			queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
				if (!oldData) 
					return {
						products: [newProduct],
						pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false }
					};
				return {
					...oldData,
					products: [newProduct, ...oldData.products],
					pagination: { ...oldData.pagination, total: oldData.pagination.total + 1 }
				};
			});
		}
		// ... (onError handlers)
	});

	// ... (other mutations remain the same) ...
    // Mutation to update a product
    const updateProductMutation = createMutation({
        mutationFn: ({
            productId,
            productData
        }: {
            productId: string;
            productData: Partial<ProductInput>;
        }) => callTelefunc('onUpdateProduct', [productId, productData]),
        onSuccess: (updatedProduct) => {
            queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    products: oldData.products.map((product) =>
                        product.id === updatedProduct.id ? updatedProduct : product
                    )
                };
            });
        }
    });

    // Mutation to bulk update products
    const bulkUpdateProductsMutation = createMutation({
        mutationFn: ({
            productIds,
            updates
        }: {
            productIds: string[];
            updates: Partial<ProductInput>;
        }) => callTelefunc('onBulkUpdateProducts', [productIds, updates]),
        onSuccess: (updatedProducts) => {
            queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
                if (!oldData) return oldData;
                const updatedProductsMap = new Map(updatedProducts.map((p: Product) => [p.id, p]));
                return {
                    ...oldData,
                    products: oldData.products.map((product) =>
                        updatedProductsMap.get(product.id) || product
                    )
                };
            });
        }
    });

    // Mutation to adjust stock
    const adjustStockMutation = createMutation({
        mutationFn: ({
            productId,
            adjustment,
            reason
        }: {
            productId: string;
            adjustment: number;
            reason?: string;
        }) => callTelefunc('onAdjustStock', [productId, adjustment, reason]),
        onSuccess: (updatedProduct) => {
            queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    products: oldData.products.map((product) =>
                        product.id === updatedProduct.id ? updatedProduct : product
                    )
                };
            });
        }
    });

    // Mutation to delete a product
    const deleteProductMutation = createMutation({
        mutationFn: (productId: string) => callTelefunc('onDeleteProduct', [productId]),
        onSuccess: (_, productId) => {
            queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    products: oldData.products.filter((product) => product.id !== productId),
                    pagination: { ...oldData.pagination, total: oldData.pagination.total - 1 }
                };
            });
        }
    });

	return {
		// Original queries
		productsQuery,
		metaQuery,

		// Derived state (wrapped in getters to preserve reactivity)
		get products() { return _products; },
		get pagination() { return _pagination; },
		get isLoading() { return _isLoading; },
		get isError() { return _isError; },
		get error() { return _error; },
		get meta() { return _meta; },
		get isMetaLoading() { return _isMetaLoading; },
		get isMetaError() { return _isMetaError; },

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
		deleteProduct: deleteProductMutation
	};
}

export function useProduct(productId: string) {
	const queryClient = useQueryClient();

	// Query to fetch a single product
	const productQuery = createQuery<Product>({
		queryKey: productQueryKeys.detail(productId),
		queryFn: () => callTelefunc('onGetProduct', [productId]),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser && !!productId // Only run on client-side and when productId is provided
	});

	// --- SVELTE 5 RUNES UPDATE ---
	const _product = $derived(productQuery.data);
	const _isLoading = $derived(productQuery.isPending);
	const _isError = $derived(productQuery.isError);
	const _error = $derived(productQuery.error);
	// --- END UPDATE ---

	return {
		productQuery,
		get product() { return _product; },
		get isLoading() { return _isLoading; },
		get isError() { return _isError; },
		get error() { return _error; },
		refetch: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) })
	};
}
