import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { 
  onGetProducts, 
  onGetProductById,
  onCreateProduct, 
  onUpdateProduct,
  onGetProductMeta,
  onBulkUpdateProducts,
  onAdjustStock,
  onDeleteProduct
} from '$lib/server/telefuncs/product.telefunc';
import type { 
  Product,
  ProductInput,
  ProductFilters,
  ProductMeta,
  PaginatedProducts,
  BulkProductUpdate,
  StockAdjustment
} from '$lib/types/product.schema';

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
    gcTime: 1000 * 60 * 10 // 10 minutes
  });

  // Query to fetch product meta information
  const metaQuery = createQuery<ProductMeta>({
    queryKey: productQueryKeys.meta(),
    queryFn: onGetProductMeta,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15 // 15 minutes
  });

  // Mutation to create a new product
  const createProductMutation = createMutation({
    mutationFn: (productData: ProductInput) => onCreateProduct(productData),
    onSuccess: (newProduct) => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });
      
      // Optimistically add the new product to cache
      queryClient.setQueryData<PaginatedProducts>(
        productQueryKeys.list(filters),
        (oldData) => {
          if (!oldData) return { products: [newProduct], pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false } };
          return {
            ...oldData,
            products: [newProduct, ...oldData.products],
            pagination: {
              ...oldData.pagination,
              total: oldData.pagination.total + 1
            }
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to create product:', error);
    }
  });

  // Mutation to update a product
  const updateProductMutation = createMutation({
    mutationFn: ({ productId, productData }: { productId: string; productData: Partial<ProductInput> }) => 
      onUpdateProduct(productId, productData),
    onSuccess: (updatedProduct) => {
      // Update the specific product in all relevant queries
      queryClient.setQueryData<PaginatedProducts>(
        productQueryKeys.list(filters),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            products: oldData.products.map(product => 
              product.id === updatedProduct.id ? updatedProduct : product
            )
          };
        }
      );
      
      // Update detail cache if it exists
      queryClient.setQueryData(
        productQueryKeys.detail(updatedProduct.id),
        updatedProduct
      );
      
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
      queryClient.setQueryData<PaginatedProducts>(
        productQueryKeys.list(filters),
        (oldData) => {
          if (!oldData) return oldData;
          const updatedProductsMap = new Map(updatedProducts.map(p => [p.id, p]));
          return {
            ...oldData,
            products: oldData.products.map(product => 
              updatedProductsMap.get(product.id) || product
            )
          };
        }
      );
      
      // Update individual detail caches
      updatedProducts.forEach(product => {
        queryClient.setQueryData(
          productQueryKeys.detail(product.id),
          product
        );
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
      queryClient.setQueryData<PaginatedProducts>(
        productQueryKeys.list(filters),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            products: oldData.products.map(product => 
              product.id === updatedProduct.id ? updatedProduct : product
            )
          };
        }
      );
      
      // Update detail cache
      queryClient.setQueryData(
        productQueryKeys.detail(updatedProduct.id),
        updatedProduct
      );
      
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
      queryClient.setQueryData<PaginatedProducts>(
        productQueryKeys.list(filters),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            products: oldData.products.map(product => 
              product.id === productId 
                ? { ...product, is_archived: true, is_active: false }
                : product
            ),
            pagination: {
              ...oldData.pagination,
              total: oldData.pagination.total - 1
            }
          };
        }
      );
      
      // Update detail cache to show archived status
      queryClient.setQueryData<Product>(
        productQueryKeys.detail(productId),
        (oldData) => oldData ? { ...oldData, is_archived: true, is_active: false } : oldData
      );
      
      // Invalidate meta
      queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });
    },
    onError: (error) => {
      console.error('Failed to delete product:', error);
    }
  });

  // Derived reactive state using Svelte 5 runes
  const products = $derived(productsQuery.data?.products ?? []);
  const pagination = $derived(productsQuery.data?.pagination);
  const meta = $derived(metaQuery.data);
  
  // Derived filtered states
  const activeProducts = $derived(products.filter((p: Product) => p.is_active && !p.is_archived));
  const archivedProducts = $derived(products.filter((p: Product) => p.is_archived));
  const bundleProducts = $derived(products.filter((p: Product) => p.is_bundle));
  const lowStockProducts = $derived(products.filter((p: Product) => 
    p.min_stock_level && p.stock_quantity < p.min_stock_level
  ));
  const outOfStockProducts = $derived(products.filter((p: Product) => p.stock_quantity === 0));

  // Loading and error states
  const isLoading = $derived(productsQuery.isPending);
  const isError = $derived(productsQuery.isError);
  const error = $derived(productsQuery.error);
  
  const isMetaLoading = $derived(metaQuery.isPending);
  const isMetaError = $derived(metaQuery.isError);

  return {
    // Queries
    productsQuery,
    metaQuery,
    
    // Reactive data
    products,
    pagination,
    meta,
    
    // Filtered data
    activeProducts,
    archivedProducts,
    bundleProducts,
    lowStockProducts,
    outOfStockProducts,
    
    // Loading states
    isLoading,
    isError,
    error,
    isMetaLoading,
    isMetaError,
    
    // Mutations
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    adjustStock: adjustStockMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    
    // Mutation states
    isCreating: $derived(createProductMutation.isPending),
    isUpdating: $derived(updateProductMutation.isPending),
    isBulkUpdating: $derived(bulkUpdateMutation.isPending),
    isAdjustingStock: $derived(adjustStockMutation.isPending),
    isDeleting: $derived(deleteProductMutation.isPending),
    
    createError: $derived(createProductMutation.error),
    updateError: $derived(updateProductMutation.error),
    bulkUpdateError: $derived(bulkUpdateMutation.error),
    adjustStockError: $derived(adjustStockMutation.error),
    deleteError: $derived(deleteProductMutation.error),
    
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
    enabled: !!productId
  });

  const product = $derived(productQuery.data);
  const isLoading = $derived(productQuery.isPending);
  const isError = $derived(productQuery.isError);
  const error = $derived(productQuery.error);

  return {
    productQuery,
    product,
    isLoading,
    isError,
    error,
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
            products: oldData.products.map(product => 
              product.id === productId 
                ? { ...product, ...updates, updated_at: new Date().toISOString() }
                : product
            )
          };
        }
      );
      
      // Update detail cache if it exists
      queryClient.setQueriesData<Product>(
        { queryKey: productQueryKeys.details() },
        (oldData) => 
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
            products: oldData.products.map(product => 
              product.id === productId 
                ? { ...product, stock_quantity: newQuantity, updated_at: new Date().toISOString() }
                : product
            )
          };
        }
      );
      
      queryClient.setQueriesData<Product>(
        { queryKey: productQueryKeys.details() },
        (oldData) => 
          oldData?.id === productId 
            ? { ...oldData, stock_quantity: newQuantity, updated_at: new Date().toISOString() }
            : oldData
      );
    }
  };
}

// Hook for product search with debouncing
export function useProductSearch(searchTerm: string, debounceMs: number = 300) {
  let debouncedSearchTerm = $state(searchTerm);

  // Debounce search term
  $effect(() => {
    const timer = setTimeout(() => {
      debouncedSearchTerm = searchTerm;
    }, debounceMs);

    return () => clearTimeout(timer);
  });

  return useProducts({ search: debouncedSearchTerm });
}
