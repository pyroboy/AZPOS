import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type { Product, ProductFilters, PaginatedProducts } from '$lib/types/product.schema';

/**
 * Simplified wrapper for onGetProducts telefunc
 */
const onGetProducts = async (filters?: ProductFilters): Promise<PaginatedProducts> => {
	console.log('📡 [TEST] Fetching products with filters:', filters);
	const { onGetProducts } = await import('$lib/server/telefuncs/product.telefunc');
	return onGetProducts(filters);
};

/**
 * Test version 1: Hardcoded enabled: true
 */
export function useProductsTest1(filters?: ProductFilters) {
	console.log('🧪 [TEST1] useProductsTest1 called with filters:', filters);
	
	const productsQuery = createQuery<PaginatedProducts>({
		queryKey: ['test1-products', filters],
		queryFn: async () => {
			console.log('🔄 [TEST1] Query executing...');
			const result = await onGetProducts(filters);
			console.log('✅ [TEST1] Query completed. Products:', result.products?.length || 0);
			return result;
		},
		enabled: true, // Hardcoded to true
		staleTime: 0,
		gcTime: 0,
		retry: 1
	});

	console.log('🔍 [TEST1] Query state:', {
		status: productsQuery.status,
		isPending: productsQuery.isPending,
		isSuccess: productsQuery.isSuccess,
		isError: productsQuery.isError,
		data: productsQuery.data,
		error: productsQuery.error
	});

	// Simple reactive getters
	const getProducts = () => productsQuery.data?.products ?? [];
	const getActiveProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.is_active && !p.is_archived);
	};
	const getIsLoading = () => productsQuery.isPending;
	const getIsError = () => productsQuery.isError;
	const getError = () => productsQuery.error;

	return {
		productsQuery,
		products: getProducts,
		activeProducts: getActiveProducts,
		isLoading: getIsLoading,
		isError: getIsError,
		error: getError
	};
}

/**
 * Test version 2: browser check enabled
 */
export function useProductsTest2(filters?: ProductFilters) {
	console.log('🧪 [TEST2] useProductsTest2 called with filters:', filters);
	console.log('🧪 [TEST2] Environment:', { browser, windowDefined: typeof window !== 'undefined' });
	
	const productsQuery = createQuery<PaginatedProducts>({
		queryKey: ['test2-products', filters],
		queryFn: async () => {
			console.log('🔄 [TEST2] Query executing...');
			const result = await onGetProducts(filters);
			console.log('✅ [TEST2] Query completed. Products:', result.products?.length || 0);
			return result;
		},
		enabled: browser, // Use browser flag
		staleTime: 0,
		gcTime: 0,
		retry: 1
	});

	console.log('🔍 [TEST2] Query state:', {
		status: productsQuery.status,
		isPending: productsQuery.isPending,
		isSuccess: productsQuery.isSuccess,
		isError: productsQuery.isError,
		data: productsQuery.data,
		error: productsQuery.error,
		enabled: browser
	});

	// Simple reactive getters
	const getProducts = () => productsQuery.data?.products ?? [];
	const getActiveProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.is_active && !p.is_archived);
	};
	const getIsLoading = () => productsQuery.isPending;
	const getIsError = () => productsQuery.isError;
	const getError = () => productsQuery.error;

	return {
		productsQuery,
		products: getProducts,
		activeProducts: getActiveProducts,
		isLoading: getIsLoading,
		isError: getIsError,
		error: getError
	};
}

/**
 * Test version 3: window check enabled
 */
export function useProductsTest3(filters?: ProductFilters) {
	const isClient = typeof window !== 'undefined';
	console.log('🧪 [TEST3] useProductsTest3 called with filters:', filters);
	console.log('🧪 [TEST3] Environment:', { browser, isClient });
	
	const productsQuery = createQuery<PaginatedProducts>({
		queryKey: ['test3-products', filters],
		queryFn: async () => {
			console.log('🔄 [TEST3] Query executing...');
			const result = await onGetProducts(filters);
			console.log('✅ [TEST3] Query completed. Products:', result.products?.length || 0);
			return result;
		},
		enabled: isClient, // Use window check
		staleTime: 0,
		gcTime: 0,
		retry: 1
	});

	console.log('🔍 [TEST3] Query state:', {
		status: productsQuery.status,
		isPending: productsQuery.isPending,
		isSuccess: productsQuery.isSuccess,
		isError: productsQuery.isError,
		data: productsQuery.data,
		error: productsQuery.error,
		enabled: isClient
	});

	// Simple reactive getters
	const getProducts = () => productsQuery.data?.products ?? [];
	const getActiveProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.is_active && !p.is_archived);
	};
	const getIsLoading = () => productsQuery.isPending;
	const getIsError = () => productsQuery.isError;
	const getError = () => productsQuery.error;

	return {
		productsQuery,
		products: getProducts,
		activeProducts: getActiveProducts,
		isLoading: getIsLoading,
		isError: getIsError,
		error: getError
	};
}

/**
 * Test version 4: Original complex configuration
 */
export function useProductsTest4(filters?: ProductFilters) {
	console.log('🧪 [TEST4] useProductsTest4 called with filters:', filters);
	
	// Normalize filters like original
	function normalizeFilters(filters?: ProductFilters | null): Record<string, unknown> | null {
		if (!filters || typeof filters !== 'object') {
			return null;
		}

		const normalized: Record<string, unknown> = {};
		const keys = Object.keys(filters).sort();
		
		for (const key of keys) {
			const value = filters[key as keyof ProductFilters];
			
			if (value !== undefined) {
				if (Array.isArray(value)) {
					normalized[key] = [...value].sort();
				} else {
					normalized[key] = value;
				}
			}
		}

		return Object.keys(normalized).length > 0 ? normalized : null;
	}

	const normalizedFilters = normalizeFilters(filters);
	const queryKey = ['test4-products', 'list', normalizedFilters];
	
	const productsQuery = createQuery<PaginatedProducts>({
		queryKey,
		queryFn: async () => {
			console.log('🔄 [TEST4] Query executing...');
			const result = await onGetProducts(filters);
			console.log('✅ [TEST4] Query completed. Products:', result.products?.length || 0);
			return result;
		},
		enabled: browser, // Use browser flag like original
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		retry: 3,
		retryDelay: 1000
	});

	console.log('🔍 [TEST4] Query state:', {
		status: productsQuery.status,
		isPending: productsQuery.isPending,
		isSuccess: productsQuery.isSuccess,
		isError: productsQuery.isError,
		data: productsQuery.data,
		error: productsQuery.error,
		queryKey,
		enabled: browser
	});

	// Simple reactive getters
	const getProducts = () => productsQuery.data?.products ?? [];
	const getActiveProducts = () => {
		const products = getProducts();
		return products.filter((p: Product) => p.is_active && !p.is_archived);
	};
	const getIsLoading = () => productsQuery.isPending;
	const getIsError = () => productsQuery.isError;
	const getError = () => productsQuery.error;

	return {
		productsQuery,
		products: getProducts,
		activeProducts: getActiveProducts,
		isLoading: getIsLoading,
		isError: getIsError,
		error: getError
	};
}
