import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type {
	Product,
	ProductInput,
	ProductFilters,
	ProductMeta,
	PaginatedProducts,
	BulkProductUpdate,
	StockAdjustment
} from '$lib/types/product.schema';

/**
 * A wrapper for the onGetProducts telefunc to avoid SSR import issues.
 * @param {ProductFilters} filters - The filters for getting products.
 * @returns {Promise<PaginatedProducts>} The result from the telefunc.
 */
const onGetProducts = async (filters?: ProductFilters): Promise<PaginatedProducts> => {
	const { onGetProducts } = await import('$lib/server/telefuncs/product.telefunc');
	return onGetProducts(filters);
};

/**
 * A wrapper for the onGetProductById telefunc to avoid SSR import issues.
 * @param {string} productId - The product ID to retrieve.
 * @returns {Promise<Product | null>} The result from the telefunc.
 */
const onGetProductById = async (productId: string): Promise<Product | null> => {
	const { onGetProductById } = await import('$lib/server/telefuncs/product.telefunc');
	return onGetProductById(productId);
};

/**
 * A wrapper for the onCreateProduct telefunc to avoid SSR import issues.
 * @param {ProductInput} productData - The product data for creation.
 * @returns {Promise<Product>} The result from the telefunc.
 */
const onCreateProduct = async (productData: ProductInput): Promise<Product> => {
	const { onCreateProduct } = await import('$lib/server/telefuncs/product.telefunc');
	return onCreateProduct(productData);
};

/**
 * A wrapper for the onUpdateProduct telefunc to avoid SSR import issues.
 * @param {string} productId - The product ID to update.
 * @param {Partial<ProductInput>} productData - The product data for update.
 * @returns {Promise<Product>} The result from the telefunc.
 */
const onUpdateProduct = async (productId: string, productData: Partial<ProductInput>): Promise<Product> => {
	const { onUpdateProduct } = await import('$lib/server/telefuncs/product.telefunc');
	return onUpdateProduct(productId, productData);
};

/**
 * A wrapper for the onGetProductMeta telefunc to avoid SSR import issues.
 * @returns {Promise<ProductMeta>} The result from the telefunc.
 */
const onGetProductMeta = async (): Promise<ProductMeta> => {
	const { onGetProductMeta } = await import('$lib/server/telefuncs/product.telefunc');
	return onGetProductMeta();
};

/**
 * A wrapper for the onBulkUpdateProducts telefunc to avoid SSR import issues.
 * @param {BulkProductUpdate} updateData - The bulk update data.
 * @returns {Promise<Product[]>} The result from the telefunc.
 */
const onBulkUpdateProducts = async (updateData: BulkProductUpdate): Promise<Product[]> => {
	const { onBulkUpdateProducts } = await import('$lib/server/telefuncs/product.telefunc');
	return onBulkUpdateProducts(updateData);
};

/**
 * A wrapper for the onAdjustStock telefunc to avoid SSR import issues.
 * @param {StockAdjustment} adjustmentData - The stock adjustment data.
 * @returns {Promise<Product>} The result from the telefunc.
 */
const onAdjustStock = async (adjustmentData: StockAdjustment): Promise<Product> => {
	const { onAdjustStock } = await import('$lib/server/telefuncs/product.telefunc');
	return onAdjustStock(adjustmentData);
};

/**
 * A wrapper for the onDeleteProduct telefunc to avoid SSR import issues.
 * @param {string} productId - The product ID to delete.
 * @returns {Promise<void>} The result from the telefunc.
 */
const onDeleteProduct = async (productId: string): Promise<void> => {
	const { onDeleteProduct } = await import('$lib/server/telefuncs/product.telefunc');
	return onDeleteProduct(productId);
};

// Query keys for consistent cache management
const productQueryKeys = {
	all: ['products'] as const,
	lists: () => [...productQueryKeys.all, 'list'] as const,
	list: (filters?: ProductFilters) => [...productQueryKeys.lists(), filters] as const,
	details: () => [...productQueryKeys.all, 'detail'] as const,
	detail: (id: string) => [...productQueryKeys.details(), id] as const,
	meta: () => [...productQueryKeys.all, 'meta'] as const
};

export function useProducts(filters?: ProductFilters) {
	const queryClient = useQueryClient();

	// Query to fetch paginated products with filters
	const productsQuery = createQuery<PaginatedProducts>({
		queryKey: productQueryKeys.list(filters),
		queryFn: () => onGetProducts(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		enabled: browser // Only run on client-side
	});

	// Query to fetch product meta information
	const metaQuery = createQuery<ProductMeta>({
		queryKey: productQueryKeys.meta(),
		queryFn: onGetProductMeta,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser // Only run on client-side
	});

	// Mutation to create a new product
	const createProductMutation = createMutation({
		mutationFn: (productData: ProductInput) => onCreateProduct(productData),
		onSuccess: (newProduct) => {
			// Invalidate and refetch products list
			queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });

			// Optimistically add the new product to cache
			queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
				if (!oldData)
					return {
						products: [newProduct],
						pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false }
					};
				return {
					...oldData,
					products: [newProduct, ...oldData.products],
					pagination: {
						...oldData.pagination,
						total: oldData.pagination.total + 1
					}
				};
			});
		},
		onError: (error) => {
			console.error('Failed to create product:', error);
		}
	});

	// Mutation to update a product
	const updateProductMutation = createMutation({
		mutationFn: ({
			productId,
			productData
		}: {
			productId: string;
			productData: Partial<ProductInput>;
		}) => onUpdateProduct(productId, productData),
		onSuccess: (updatedProduct) => {
			// Update the specific product in all relevant queries
			queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					products: oldData.products.map((product) =>
						product.id === updatedProduct.id ? updatedProduct : product
					)
				};
			});

			// Update detail cache if it exists
			queryClient.setQueryData(productQueryKeys.detail(updatedProduct.id), updatedProduct);

			// Invalidate meta to get fresh calculations
			queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });
		},
		onError: (error) => {
			console.error('Failed to update product:', error);
		}
	});

	// Mutation for bulk product updates
	const bulkUpdateMutation = createMutation({
		mutationFn: (updateData: BulkProductUpdate) => onBulkUpdateProducts(updateData),
		onSuccess: (updatedProducts) => {
			// Update all affected products in cache
			queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
				if (!oldData) return oldData;
				const updatedProductsMap = new Map(updatedProducts.map((p) => [p.id, p]));
				return {
					...oldData,
					products: oldData.products.map((product) => updatedProductsMap.get(product.id) || product)
				};
			});

			// Update individual detail caches
			updatedProducts.forEach((product) => {
				queryClient.setQueryData(productQueryKeys.detail(product.id), product);
			});

			// Invalidate meta
			queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });
		},
		onError: (error) => {
			console.error('Failed to bulk update products:', error);
		}
	});

	// Mutation for stock adjustment
	const adjustStockMutation = createMutation({
		mutationFn: (adjustmentData: StockAdjustment) => onAdjustStock(adjustmentData),
		onSuccess: (updatedProduct) => {
			// Update product in all relevant caches
			queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					products: oldData.products.map((product) =>
						product.id === updatedProduct.id ? updatedProduct : product
					)
				};
			});

			// Update detail cache
			queryClient.setQueryData(productQueryKeys.detail(updatedProduct.id), updatedProduct);

			// Invalidate meta for fresh stock calculations
			queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });
		},
		onError: (error) => {
			console.error('Failed to adjust stock:', error);
		}
	});

	// Mutation to delete a product
	const deleteProductMutation = createMutation({
		mutationFn: (productId: string) => onDeleteProduct(productId),
		onSuccess: (_, productId) => {
			// Remove from all lists (or mark as archived)
			queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					products: oldData.products.map((product) =>
						product.id === productId ? { ...product, is_archived: true, is_active: false } : product
					),
					pagination: {
						...oldData.pagination,
						total: oldData.pagination.total - 1
					}
				};
			});

			// Update detail cache to show archived status
			queryClient.setQueryData<Product>(productQueryKeys.detail(productId), (oldData) =>
				oldData ? { ...oldData, is_archived: true, is_active: false } : oldData
			);

			// Invalidate meta
			queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });
		},
		onError: (error) => {
			console.error('Failed to delete product:', error);
		}
	});

	// Reactive data getters (compatible with both Svelte 4 and 5)
	const getProducts = () => productsQuery.data?.products ?? [];
	const getPagination = () => productsQuery.data?.pagination;
	const getMeta = () => metaQuery.data;

	// Filtered state getters
	const getActiveProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.is_active && !p.is_archived);
	};
	const getArchivedProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.is_archived);
	};
	const getBundleProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.is_bundle);
	};
	const getLowStockProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.min_stock_level && p.stock_quantity < p.min_stock_level);
	};
	const getOutOfStockProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.stock_quantity === 0);
	};

	// Loading and error state getters
	const getIsLoading = () => productsQuery.isPending;
	const getIsError = () => productsQuery.isError;
	const getError = () => productsQuery.error;

	const getIsMetaLoading = () => metaQuery.isPending;
	const getIsMetaError = () => metaQuery.isError;

	return {
		// Queries
		productsQuery,
		metaQuery,

		// Reactive data getters
		products: getProducts,
		pagination: getPagination,
		meta: getMeta,

		// Filtered data getters
		activeProducts: getActiveProducts,
		archivedProducts: getArchivedProducts,
		bundleProducts: getBundleProducts,
		lowStockProducts: getLowStockProducts,
		outOfStockProducts: getOutOfStockProducts,

		// Loading state getters
		isLoading: getIsLoading,
		isError: getIsError,
		error: getError,
		isMetaLoading: getIsMetaLoading,
		isMetaError: getIsMetaError,

		// Mutations
		createProduct: createProductMutation.mutate,
		updateProduct: updateProductMutation.mutate,
		bulkUpdate: bulkUpdateMutation.mutate,
		adjustStock: adjustStockMutation.mutate,
		deleteProduct: deleteProductMutation.mutate,

		// Mutation state getters
		isCreating: () => createProductMutation.isPending,
		isUpdating: () => updateProductMutation.isPending,
		isBulkUpdating: () => bulkUpdateMutation.isPending,
		isAdjustingStock: () => adjustStockMutation.isPending,
		isDeleting: () => deleteProductMutation.isPending,

		createError: () => createProductMutation.error,
		updateError: () => updateProductMutation.error,
		bulkUpdateError: () => bulkUpdateMutation.error,
		adjustStockError: () => adjustStockMutation.error,
		deleteError: () => deleteProductMutation.error,

		// Utility functions
		refetch: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() }),
		refetchMeta: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() })
	};
}

// Hook for fetching a single product by ID
export function useProduct(productId: string) {
	const queryClient = useQueryClient();

	const productQuery = createQuery<Product | null>({
		queryKey: productQueryKeys.detail(productId),
		queryFn: () => onGetProductById(productId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser && !!productId // Only run on client-side
	});

	// Reactive data getters
	const getProduct = () => productQuery.data;
	const getIsLoading = () => productQuery.isPending;
	const getIsError = () => productQuery.isError;
	const getError = () => productQuery.error;

	return {
		productQuery,
		product: getProduct,
		isLoading: getIsLoading,
		isError: getIsError,
		error: getError,
		refetch: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) })
	};
}

// Hook for optimistic product updates
export function useOptimisticProductUpdate() {
	const queryClient = useQueryClient();

	return {
		// Optimistically update product in cache before server response
		updateProductOptimistic: (productId: string, updates: Partial<Product>) => {
			// Update all relevant queries optimistically
			queryClient.setQueriesData<PaginatedProducts>(
				{ queryKey: productQueryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						products: oldData.products.map((product) =>
							product.id === productId
								? { ...product, ...updates, updated_at: new Date().toISOString() }
								: product
						)
					};
				}
			);

			// Update detail cache if it exists
			queryClient.setQueriesData<Product>({ queryKey: productQueryKeys.details() }, (oldData) =>
				oldData?.id === productId
					? { ...oldData, ...updates, updated_at: new Date().toISOString() }
					: oldData
			);
		},

		// Optimistically adjust stock
		adjustStockOptimistic: (productId: string, newQuantity: number) => {
			queryClient.setQueriesData<PaginatedProducts>(
				{ queryKey: productQueryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						products: oldData.products.map((product) =>
							product.id === productId
								? { ...product, stock_quantity: newQuantity, updated_at: new Date().toISOString() }
								: product
						)
					};
				}
			);

			queryClient.setQueriesData<Product>({ queryKey: productQueryKeys.details() }, (oldData) =>
				oldData?.id === productId
					? { ...oldData, stock_quantity: newQuantity, updated_at: new Date().toISOString() }
					: oldData
			);
		}
	};
}

// Note: Product search with debouncing should be implemented in Svelte components
// using $derived and $effect runes, as they can only be used in .svelte files
