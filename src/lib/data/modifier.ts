import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGetModifiers = async (filters?: ModifierFilters): Promise<Modifier[]> => {
	const { onGetModifiers } = await import('$lib/server/telefuncs/modifier.telefunc');
	return onGetModifiers(filters);
};

const onCreateModifier = async (modifierData: ModifierInput): Promise<Modifier> => {
	const { onCreateModifier } = await import('$lib/server/telefuncs/modifier.telefunc');
	return onCreateModifier(modifierData);
};

const onUpdateModifier = async (id: string, data: ModifierInput): Promise<Modifier> => {
	const { onUpdateModifier } = await import('$lib/server/telefuncs/modifier.telefunc');
	return onUpdateModifier(id, data);
};

const onValidateModifierSelection = async (validationData: ValidateModifierSelection): Promise<ValidateModifierSelection> => {
	const { onValidateModifierSelection } = await import('$lib/server/telefuncs/modifier.telefunc');
	return onValidateModifierSelection(validationData);
};

const onGetModifierStats = async (): Promise<ModifierStats> => {
	const { onGetModifierStats } = await import('$lib/server/telefuncs/modifier.telefunc');
	return onGetModifierStats();
};
import type {
	Modifier,
	ModifierInput,
	ModifierFilters,
	ModifierStats,
	ValidateModifierSelection
} from '$lib/types/modifier.schema';

const modifiersQueryKey = ['modifiers'];
const modifierStatsQueryKey = ['modifier-stats'];

export function useModifiers() {
	const queryClient = useQueryClient();

	// State for filters
	let filters = $state<ModifierFilters>({
		sort_by: 'sort_order',
		sort_order: 'asc'
	});

	// Query for modifiers
	const modifiersQuery = createQuery<Modifier[]>({
		queryKey: $derived([...modifiersQueryKey, filters]),
		queryFn: () => onGetModifiers(filters)
	});

	// Query for modifier statistics
	const statsQuery = createQuery<ModifierStats>({
		queryKey: modifierStatsQueryKey,
		queryFn: onGetModifierStats
	});

	// Mutation to create modifier
	const createModifierMutation = createMutation({
		mutationFn: (modifierData: ModifierInput) => onCreateModifier(modifierData),
		onSuccess: (newModifier) => {
			// Invalidate and refetch modifiers
			queryClient.invalidateQueries({ queryKey: modifiersQueryKey });
			queryClient.invalidateQueries({ queryKey: modifierStatsQueryKey });

			// Optimistically add to cache
			queryClient.setQueryData<Modifier[]>([...modifiersQueryKey, filters], (old) => {
				if (!old) return [newModifier];
				return [...old, newModifier].sort((a, b) => a.sort_order - b.sort_order);
			});
		}
	});

	// Mutation to update modifier
	const updateModifierMutation = createMutation({
		mutationFn: ({ id, data }: { id: string; data: ModifierInput }) => onUpdateModifier(id, data),
		onSuccess: (updatedModifier) => {
			// Invalidate and refetch modifiers
			queryClient.invalidateQueries({ queryKey: modifiersQueryKey });
			queryClient.invalidateQueries({ queryKey: modifierStatsQueryKey });

			// Optimistically update cache
			queryClient.setQueryData<Modifier[]>([...modifiersQueryKey, filters], (old) => {
				if (!old) return [updatedModifier];
				return old
					.map((modifier) => (modifier.id === updatedModifier.id ? updatedModifier : modifier))
					.sort((a, b) => a.sort_order - b.sort_order);
			});
		}
	});

	// Mutation to validate modifier selection
	const validateSelectionMutation = createMutation({
		mutationFn: (validationData: ValidateModifierSelection) =>
			onValidateModifierSelection(validationData)
	});

	// Derived reactive state
	const modifiers = $derived(modifiersQuery.data || []);
	const stats = $derived(statsQuery.data);

	// Filtered modifiers
	const activeModifiers = $derived(modifiers.filter((modifier: Modifier) => modifier.is_active));

	const requiredModifiers = $derived(
		modifiers.filter((modifier: Modifier) => modifier.is_required)
	);

	const singleSelectModifiers = $derived(
		modifiers.filter((modifier: Modifier) => modifier.type === 'single_select')
	);

	const multiSelectModifiers = $derived(
		modifiers.filter((modifier: Modifier) => modifier.type === 'multi_select')
	);

	const textInputModifiers = $derived(
		modifiers.filter((modifier: Modifier) => modifier.type === 'text_input')
	);

	const numberInputModifiers = $derived(
		modifiers.filter((modifier: Modifier) => modifier.type === 'number_input')
	);

	// Get modifiers for specific product or category
	function getModifiersForProduct(productId: string) {
		return modifiers.filter(
			(modifier: Modifier) =>
				modifier.applies_to === 'all_products' ||
				(modifier.applies_to === 'specific_products' && modifier.product_ids?.includes(productId))
		);
	}

	function getModifiersForCategory(categoryId: string) {
		return modifiers.filter(
			(modifier: Modifier) =>
				modifier.applies_to === 'all_products' ||
				(modifier.applies_to === 'specific_categories' &&
					modifier.category_ids?.includes(categoryId))
		);
	}

	// Helper functions
	function updateFilters(newFilters: Partial<ModifierFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function resetFilters() {
		filters = {
			sort_by: 'sort_order',
			sort_order: 'asc'
		};
	}

	function setSearch(search: string) {
		updateFilters({ search: search || undefined });
	}

	function setTypeFilter(type: ModifierFilters['type']) {
		updateFilters({ type });
	}

	function setActiveFilter(is_active: boolean | undefined) {
		updateFilters({ is_active });
	}

	function setRequiredFilter(is_required: boolean | undefined) {
		updateFilters({ is_required });
	}

	function setProductFilter(product_id: string | undefined) {
		updateFilters({ product_id });
	}

	function setCategoryFilter(category_id: string | undefined) {
		updateFilters({ category_id });
	}

	function setSorting(
		sort_by: ModifierFilters['sort_by'],
		sort_order: ModifierFilters['sort_order']
	) {
		updateFilters({ sort_by, sort_order });
	}

// Validation helpers
	function validateSelection(
		modifierId: string,
		selectedOptions?: string[],
		textValue?: string,
		numberValue?: number
	) {
		return validateSelectionMutation.mutateAsync({
			modifier_id: modifierId,
			selected_options: selectedOptions,
			text_value: textValue,
			number_value: numberValue
		});
	}

	// Batch-aware modifier helpers
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function getApplicableModifiersForProductBatch(productId: string, _batchId?: string) {
		const productModifiers = getModifiersForProduct(productId);
		// If batch-specific modifiers are needed, this could be extended
		// For now, return product-level modifiers
		return productModifiers.filter((modifier: Modifier) => 
			modifier.is_active
			// TODO: Add batch_restrictions support when schema is updated
			// (!modifier.batch_restrictions || !_batchId || modifier.batch_restrictions.includes(_batchId))
		);
	}

	// Calculate total modifier price adjustment
	function calculateModifierTotal(selectedModifiers: Modifier[]) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		return selectedModifiers.reduce((total, _modifier) => {
			// TODO: Add price_adjustment support when schema is updated
			return total + 0; // _modifier.price_adjustment || 0
		}, 0);
	}

	// Validate required modifiers are selected
	function validateRequiredModifiers(productId: string, selectedModifierIds: string[]) {
		const productModifiers = getModifiersForProduct(productId);
		const requiredModifiers = productModifiers.filter((m: Modifier) => m.is_required);
		
		const missingRequired = requiredModifiers.filter(
			(required: Modifier) => !selectedModifierIds.includes(required.id)
		);
		
		return {
			isValid: missingRequired.length === 0,
			missingModifiers: missingRequired
		};
	}

	// CRUD operations
	function createModifier(modifierData: ModifierInput) {
		return createModifierMutation.mutateAsync(modifierData);
	}

	function updateModifier(id: string, modifierData: ModifierInput) {
		return updateModifierMutation.mutateAsync({ id, data: modifierData });
	}

	return {
		// Queries and their states
		modifiersQuery,
		statsQuery,

		// Reactive data
		modifiers,
		stats,

		// Filtered data
		activeModifiers,
		requiredModifiers,
		singleSelectModifiers,
		multiSelectModifiers,
		textInputModifiers,
		numberInputModifiers,

		// Current filters
		filters: $derived(filters),

		// Mutations
		createModifier,
		createModifierStatus: $derived(createModifierMutation.status),

		updateModifier,
		updateModifierStatus: $derived(updateModifierMutation.status),

		validateSelection,
		validateSelectionStatus: $derived(validateSelectionMutation.status),
		validationResult: $derived(validateSelectionMutation.data),

		// Filter helpers
		updateFilters,
		resetFilters,
		setSearch,
		setTypeFilter,
		setActiveFilter,
		setRequiredFilter,
		setProductFilter,
		setCategoryFilter,
		setSorting,

		// Product/Category specific helpers
		getModifiersForProduct,
		getModifiersForCategory,
		getApplicableModifiersForProductBatch,

		// Calculation helpers
		calculateModifierTotal,
		validateRequiredModifiers,

		// Loading states
		isLoading: $derived(modifiersQuery.isPending),
		isError: $derived(modifiersQuery.isError),
		error: $derived(modifiersQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
