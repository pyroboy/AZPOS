import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGetCategories = async (filters?: CategoryFilters): Promise<Category[]> => {
  const { onGetCategories } = await import('$lib/server/telefuncs/category.telefunc');
  return onGetCategories(filters);
};

const onGetCategoryTree = async (): Promise<CategoryTree[]> => {
  const { onGetCategoryTree } = await import('$lib/server/telefuncs/category.telefunc');
  return onGetCategoryTree();
};

const onCreateCategory = async (categoryData: unknown): Promise<Category> => {
  const { onCreateCategory } = await import('$lib/server/telefuncs/category.telefunc');
  return onCreateCategory(categoryData);
};

const onUpdateCategory = async (categoryId: string, categoryData: unknown): Promise<Category> => {
  const { onUpdateCategory } = await import('$lib/server/telefuncs/category.telefunc');
  return onUpdateCategory(categoryId, categoryData);
};

const onGetCategoryStats = async (): Promise<CategoryStats> => {
  const { onGetCategoryStats } = await import('$lib/server/telefuncs/category.telefunc');
  return onGetCategoryStats();
};

const onMoveCategory = async (moveData: unknown): Promise<void> => {
  const { onMoveCategory } = await import('$lib/server/telefuncs/category.telefunc');
  return onMoveCategory(moveData);
};
import type {
	Category,
	CategoryTree,
	CategoryFilters,
	CategoryStats
} from '$lib/types/category.schema';

// Query keys for consistent cache management
const categoryQueryKeys = {
	all: ['categories'] as const,
	lists: () => [...categoryQueryKeys.all, 'list'] as const,
	list: (filters?: CategoryFilters) => [...categoryQueryKeys.lists(), filters] as const,
	tree: () => [...categoryQueryKeys.all, 'tree'] as const,
	stats: () => [...categoryQueryKeys.all, 'stats'] as const
};

export function useCategories(filters?: CategoryFilters) {
	const queryClient = useQueryClient();

	// Query to fetch categories with filters
	const categoriesQuery = createQuery<Category[]>({
		queryKey: categoryQueryKeys.list(filters),
		queryFn: () => onGetCategories(filters),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser
	});

	// Query to fetch category tree
	const treeQuery = createQuery<CategoryTree[]>({
		queryKey: categoryQueryKeys.tree(),
		queryFn: onGetCategoryTree,
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		enabled: browser
	});

	// Query to fetch category stats
	const statsQuery = createQuery<CategoryStats>({
		queryKey: categoryQueryKeys.stats(),
		queryFn: onGetCategoryStats,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser
	});

	// Mutation to create a new category
	const createCategoryMutation = createMutation({
		mutationFn: (categoryData: unknown) => onCreateCategory(categoryData),
		onSuccess: (newCategory) => {
			// Invalidate and refetch categories
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.tree() });
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.stats() });

			// Optimistically add the new category to cache
			queryClient.setQueryData<Category[]>(categoryQueryKeys.list(filters), (oldData) =>
				oldData ? [newCategory, ...oldData] : [newCategory]
			);
		},
		onError: (error) => {
			console.error('Failed to create category:', error);
		}
	});

	// Mutation to update a category
	const updateCategoryMutation = createMutation({
		mutationFn: ({ categoryId, categoryData }: { categoryId: string; categoryData: unknown }) =>
			onUpdateCategory(categoryId, categoryData),
		onSuccess: (updatedCategory) => {
			// Update the specific category in all relevant queries
			queryClient.setQueryData<Category[]>(
				categoryQueryKeys.list(filters),
				(oldData) =>
					oldData?.map((category) =>
						category.id === updatedCategory.id ? updatedCategory : category
					) || []
			);

			// Invalidate tree and stats for fresh calculations
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.tree() });
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to update category:', error);
		}
	});

	// Mutation to move a category
	const moveCategoryMutation = createMutation({
		mutationFn: (moveData: unknown) => onMoveCategory(moveData),
		onSuccess: () => {
			// Moving changes hierarchy, so invalidate all cached data
			queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
		},
		onError: (error) => {
			console.error('Failed to move category:', error);
		}
	});

	// Derived reactive state using Svelte 5 runes
	const categories = $derived(categoriesQuery.data ?? []);
	const categoryTree = $derived(treeQuery.data ?? []);
	const stats = $derived(statsQuery.data);

	// Derived filtered states
	const activeCategories = $derived(categories.filter((c: Category) => c.is_active));
	const rootCategories = $derived(categories.filter((c: Category) => !c.parent_id));
	const categoriesWithProducts = $derived(categories.filter((c: Category) => c.product_count > 0));

	// Create category map for quick lookups
	const categoryMap = $derived(Object.fromEntries(categories.map((c: Category) => [c.id, c])));
	const categoryNameMap = $derived(
		Object.fromEntries(categories.map((c: Category) => [c.id, c.name]))
	);

	// Loading and error states
	const isLoading = $derived(categoriesQuery.isPending);
	const isError = $derived(categoriesQuery.isError);
	const error = $derived(categoriesQuery.error);

	const isTreeLoading = $derived(treeQuery.isPending);
	const isStatsLoading = $derived(statsQuery.isPending);

	return {
		// Queries
		categoriesQuery,
		treeQuery,
		statsQuery,

		// Reactive data
		categories,
		categoryTree,
		stats,

		// Filtered data
		activeCategories,
		rootCategories,
		categoriesWithProducts,

		// Utility maps
		categoryMap,
		categoryNameMap,

		// Loading states
		isLoading,
		isError,
		error,
		isTreeLoading,
		isStatsLoading,

		// Mutations
		createCategory: createCategoryMutation.mutate,
		updateCategory: updateCategoryMutation.mutate,
		moveCategory: moveCategoryMutation.mutate,

		// Mutation states
		isCreating: $derived(createCategoryMutation.isPending),
		isUpdating: $derived(updateCategoryMutation.isPending),
		isMoving: $derived(moveCategoryMutation.isPending),

		createError: $derived(createCategoryMutation.error),
		updateError: $derived(updateCategoryMutation.error),
		moveError: $derived(moveCategoryMutation.error),

		// Utility functions
		refetch: () => queryClient.invalidateQueries({ queryKey: categoryQueryKeys.lists() }),
		refetchTree: () => queryClient.invalidateQueries({ queryKey: categoryQueryKeys.tree() }),
		refetchStats: () => queryClient.invalidateQueries({ queryKey: categoryQueryKeys.stats() }),

		// Helper functions
		getCategoryById: (id: string) => categoryMap[id],
		getCategoryNameById: (id: string) => categoryNameMap[id] || 'Unknown Category'
	};
}

// Hook for optimistic category updates
export function useOptimisticCategoryUpdate() {
	const queryClient = useQueryClient();

	return {
		// Optimistically update category in cache before server response
		updateCategoryOptimistic: (categoryId: string, updates: Partial<Category>) => {
			// Update all relevant queries optimistically
			queryClient.setQueriesData<Category[]>(
				{ queryKey: categoryQueryKeys.lists() },
				(oldData) =>
					oldData?.map((category) =>
						category.id === categoryId
							? { ...category, ...updates, updated_at: new Date().toISOString() }
							: category
					) || []
			);
		}
	};
}
