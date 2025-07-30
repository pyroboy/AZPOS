import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { SvelteDate } from 'svelte/reactivity';
import type {
	Category,
	CategoryTree,
	CategoryFilters,
	CategoryInput,
	CategoryStats,
	MoveCategory
} from '$lib/types/category.schema';

/**
 * A wrapper for the onGetCategories telefunc to avoid SSR import issues.
 * @param {CategoryFilters} filters - The filters for getting categories.
 * @returns {Promise<Category[]>} The result from the telefunc.
 */
const onGetCategories = async (filters?: CategoryFilters): Promise<Category[]> => {
	const { onGetCategories } = await import('$lib/server/telefuncs/category.telefunc');
	return onGetCategories(filters);
};

/**
 * A wrapper for the onGetCategoryTree telefunc to avoid SSR import issues.
 * @returns {Promise<CategoryTree[]>} The result from the telefunc.
 */
const onGetCategoryTree = async (): Promise<CategoryTree[]> => {
	const { onGetCategoryTree } = await import('$lib/server/telefuncs/category.telefunc');
	return onGetCategoryTree();
};

/**
 * A wrapper for the onCreateCategory telefunc to avoid SSR import issues.
 * @param {CategoryInput} categoryData - The category data for creation.
 * @returns {Promise<Category>} The result from the telefunc.
 */
const onCreateCategory = async (categoryData: CategoryInput): Promise<Category> => {
	const { onCreateCategory } = await import('$lib/server/telefuncs/category.telefunc');
	return onCreateCategory(categoryData);
};

/**
 * A wrapper for the onUpdateCategory telefunc to avoid SSR import issues.
 * @param {string} categoryId - The category ID to update.
 * @param {Partial<CategoryInput>} categoryData - The category data for update.
 * @returns {Promise<Category>} The result from the telefunc.
 */
const onUpdateCategory = async (categoryId: string, categoryData: Partial<CategoryInput>): Promise<Category> => {
	const { onUpdateCategory } = await import('$lib/server/telefuncs/category.telefunc');
	return onUpdateCategory(categoryId, categoryData);
};

/**
 * A wrapper for the onGetCategoryStats telefunc to avoid SSR import issues.
 * @returns {Promise<CategoryStats>} The result from the telefunc.
 */
const onGetCategoryStats = async (): Promise<CategoryStats> => {
	const { onGetCategoryStats } = await import('$lib/server/telefuncs/category.telefunc');
	return onGetCategoryStats();
};

/**
 * A wrapper for the onMoveCategory telefunc to avoid SSR import issues.
 * @param {MoveCategory} moveData - The move data for category.
 * @returns {Promise<Category>} The result from the telefunc.
 */
const onMoveCategory = async (moveData: MoveCategory): Promise<Category> => {
	const { onMoveCategory } = await import('$lib/server/telefuncs/category.telefunc');
	return onMoveCategory(moveData);
};

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
		mutationFn: (categoryData: CategoryInput) => onCreateCategory(categoryData),
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
		mutationFn: ({ categoryId, categoryData }: { categoryId: string; categoryData: Partial<CategoryInput> }) =>
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
		mutationFn: (moveData: MoveCategory) => onMoveCategory(moveData),
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

	// Mutation states
	const isCreating = $derived(createCategoryMutation.isPending);
	const isUpdating = $derived(updateCategoryMutation.isPending);
	const isMoving = $derived(moveCategoryMutation.isPending);

	const createError = $derived(createCategoryMutation.error);
	const updateError = $derived(updateCategoryMutation.error);
	const moveError = $derived(moveCategoryMutation.error);

	return {
		// Queries
		categoriesQuery,
		treeQuery,
		statsQuery,

		// Reactive data
		get categories() { return categories; },
		get categoryTree() { return categoryTree; },
		get stats() { return stats; },

		// Filtered data
		get activeCategories() { return activeCategories; },
		get rootCategories() { return rootCategories; },
		get categoriesWithProducts() { return categoriesWithProducts; },

		// Utility maps
		get categoryMap() { return categoryMap; },
		get categoryNameMap() { return categoryNameMap; },

		// Loading states
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		get isTreeLoading() { return isTreeLoading; },
		get isStatsLoading() { return isStatsLoading; },

		// Mutations
		createCategory: createCategoryMutation.mutate,
		updateCategory: updateCategoryMutation.mutate,
		moveCategory: updateCategoryMutation.mutate,

		// Mutation states
		get isCreating() { return isCreating; },
		get isUpdating() { return isUpdating; },
		get isMoving() { return isMoving; },

		get createError() { return createError; },
		get updateError() { return updateError; },
		get moveError() { return moveError; },

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
							? { ...category, ...updates, updated_at: new SvelteDate().toISOString() }
							: category
					) || []
			);
		}
	};
}
