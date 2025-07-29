import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type {
	ViewState,
	ViewConfig,
	UserViewPreferences,
	NavigationMenu,
	ViewStats
} from '$lib/types/view.schema';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGetCurrentViewState = async (): Promise<ViewState> => {
	const { onGetCurrentViewState } = await import('$lib/server/telefuncs/view.telefunc');
	return onGetCurrentViewState();
};

const onUpdateViewState = async (viewStateData: Partial<ViewState>): Promise<ViewState> => {
	const { onUpdateViewState } = await import('$lib/server/telefuncs/view.telefunc');
	return onUpdateViewState(viewStateData);
};

const onGetViewConfigs = async (): Promise<ViewConfig[]> => {
	const { onGetViewConfigs } = await import('$lib/server/telefuncs/view.telefunc');
	return onGetViewConfigs();
};

const onCreateViewConfig = async (configData: ViewConfig): Promise<ViewConfig> => {
	const { onCreateViewConfig } = await import('$lib/server/telefuncs/view.telefunc');
	return onCreateViewConfig(configData);
};

const onUpdateViewConfig = async (configId: string, configData: ViewConfig): Promise<ViewConfig> => {
	const { onUpdateViewConfig } = await import('$lib/server/telefuncs/view.telefunc');
	return onUpdateViewConfig(configId, configData);
};

const onGetUserViewPreferences = async (): Promise<UserViewPreferences | null> => {
	const { onGetUserViewPreferences } = await import('$lib/server/telefuncs/view.telefunc');
	return onGetUserViewPreferences();
};

const onUpdateUserViewPreferences = async (preferencesData: UserViewPreferences): Promise<UserViewPreferences> => {
	const { onUpdateUserViewPreferences } = await import('$lib/server/telefuncs/view.telefunc');
	return onUpdateUserViewPreferences(preferencesData);
};

const onGetNavigationMenu = async (): Promise<NavigationMenu> => {
	const { onGetNavigationMenu } = await import('$lib/server/telefuncs/view.telefunc');
	return onGetNavigationMenu();
};

const onGetViewStats = async (): Promise<ViewStats> => {
	const { onGetViewStats } = await import('$lib/server/telefuncs/view.telefunc');
	return onGetViewStats();
};

const viewStateQueryKey = ['view-state'];
const viewConfigsQueryKey = ['view-configs'];
const userPreferencesQueryKey = ['user-view-preferences'];
const navigationMenuQueryKey = ['navigation-menu'];
const viewStatsQueryKey = ['view-stats'];

export function useView() {
	const queryClient = useQueryClient();

	// Query for current view state
	const viewStateQuery = createQuery<ViewState>({
		queryKey: viewStateQueryKey,
		queryFn: onGetCurrentViewState,
		staleTime: 30 * 1000 // 30 seconds
	});

	// Query for view configurations
	const viewConfigsQuery = createQuery<ViewConfig[]>({
		queryKey: viewConfigsQueryKey,
		queryFn: onGetViewConfigs,
		staleTime: 5 * 60 * 1000 // 5 minutes
	});

	// Query for user view preferences
	const userPreferencesQuery = createQuery<UserViewPreferences | null>({
		queryKey: userPreferencesQueryKey,
		queryFn: onGetUserViewPreferences,
		staleTime: 5 * 60 * 1000 // 5 minutes
	});

	// Query for navigation menu
	const navigationMenuQuery = createQuery<NavigationMenu>({
		queryKey: navigationMenuQueryKey,
		queryFn: onGetNavigationMenu,
		staleTime: 10 * 60 * 1000 // 10 minutes
	});

	// Query for view statistics
	const statsQuery = createQuery<ViewStats>({
		queryKey: viewStatsQueryKey,
		queryFn: onGetViewStats
	});

	// Mutation to update view state
	const updateViewStateMutation = createMutation({
		mutationFn: (viewStateData: Partial<ViewState>) => onUpdateViewState(viewStateData),
		onSuccess: (updatedState) => {
			// Update view state in cache
			queryClient.setQueryData(viewStateQueryKey, updatedState);
		}
	});

	// Mutation to create view config
	const createViewConfigMutation = createMutation({
		mutationFn: (configData: ViewConfig) => onCreateViewConfig(configData),
		onSuccess: (newConfig) => {
			// Invalidate view configs
			queryClient.invalidateQueries({ queryKey: viewConfigsQueryKey });
			queryClient.invalidateQueries({ queryKey: viewStatsQueryKey });

			// Optimistically add to cache
			queryClient.setQueryData<ViewConfig[]>(viewConfigsQueryKey, (old) => {
				if (!old) return [newConfig];
				return [...old, newConfig];
			});
		}
	});

	// Mutation to update view config
	const updateViewConfigMutation = createMutation({
		mutationFn: ({ configId, configData }: { configId: string; configData: ViewConfig }) =>
			onUpdateViewConfig(configId, configData),
		onSuccess: (updatedConfig) => {
			// Update view configs list
			queryClient.setQueryData<ViewConfig[]>(viewConfigsQueryKey, (old) => {
				if (!old) return [updatedConfig];
				return old.map((config) => (config.id === updatedConfig.id ? updatedConfig : config));
			});
		}
	});

	// Mutation to update user preferences
	const updatePreferencesMutation = createMutation({
		mutationFn: (preferencesData: UserViewPreferences) =>
			onUpdateUserViewPreferences(preferencesData),
		onSuccess: (updatedPreferences) => {
			// Update preferences in cache
			queryClient.setQueryData(userPreferencesQueryKey, updatedPreferences);

			// Invalidate navigation menu to refresh
			queryClient.invalidateQueries({ queryKey: navigationMenuQueryKey });
		}
	});

	// Derived reactive state
	const viewState = $derived(viewStateQuery.data);
	const viewConfigs = $derived(viewConfigsQuery.data || []);
	const userPreferences = $derived(userPreferencesQuery.data);
	const navigationMenu = $derived(navigationMenuQuery.data);
	const stats = $derived(statsQuery.data);

	// Current view properties
	const currentRoute = $derived(viewState?.current_view || '/');
	const currentViewId = $derived(viewState?.current_view || 'dashboard');
	const sidebarCollapsed = $derived(viewState?.sidebar?.is_collapsed || false);
	const activeModal = $derived(viewState?.modals?.active_modals?.[0] || null);
	const breadcrumbs = $derived(viewState?.breadcrumbs || []);
	const pageTitle = $derived('AZPOS');
	const metaDescription = $derived('AZPOS - Point of Sale System');

	// Current view config
	const currentViewConfig = $derived(
		viewConfigs.find((config: ViewConfig) => config.id === currentViewId) ||
			viewConfigs.find((config: ViewConfig) => config.is_active)
	);

	// View categories
	const systemViews = $derived(viewConfigs.filter((config: ViewConfig) => config.is_active));
	const customViews = $derived(viewConfigs.filter((config: ViewConfig) => !config.is_active));

	// Navigation items
	const mainMenu = $derived(navigationMenu?.main_menu || []);
	const quickActions = $derived(navigationMenu?.quick_actions || []);
	const userMenu = $derived(navigationMenu?.user_menu || []);
	const footerLinks = $derived(navigationMenu?.footer_links || []);

	// View state operations
	function updateViewState(stateData: Partial<ViewState>) {
		return updateViewStateMutation.mutateAsync(stateData);
	}

	function createViewConfig(configData: ViewConfig) {
		return createViewConfigMutation.mutateAsync(configData);
	}

	function updateViewConfig(configId: string, configData: ViewConfig) {
		return updateViewConfigMutation.mutateAsync({ configId, configData });
	}

	function updateUserPreferences(preferencesData: UserViewPreferences) {
		return updatePreferencesMutation.mutateAsync(preferencesData);
	}

	// Convenience functions for common view state updates
	function setCurrentRoute(route: string) {
		return updateViewState({ current_view: route });
	}

	function setCurrentView(viewId: string) {
		return updateViewState({ current_view: viewId });
	}

	function toggleSidebar() {
		return updateViewState({ sidebar: { ...viewState?.sidebar, is_collapsed: !sidebarCollapsed } });
	}

	function setSidebarCollapsed(collapsed: boolean) {
		return updateViewState({ sidebar: { ...viewState?.sidebar, is_collapsed: collapsed } });
	}

	function setActiveModal(modalId: string | null) {
		const activeModals = modalId ? [modalId] : [];
		return updateViewState({ modals: { ...viewState?.modals, active_modals: activeModals } });
	}

	function setBreadcrumbs(breadcrumbs: ViewState['breadcrumbs']) {
		return updateViewState({ breadcrumbs });
	}

	function setPageTitle(title: string) {
		return updateViewState({ breadcrumbs: [{ label: title, path: currentRoute }] });
	}

	function setMetaDescription(): void {
		// Store in breadcrumbs or another appropriate field
		updateViewState({ breadcrumbs: viewState?.breadcrumbs || [] });
	}

	function updateLoadingState(): void {
		// Store loading state in view state (not part of schema, but for functionality)
		updateViewState({ current_view: viewState?.current_view || '' });
	}

	function updateErrorState(): void {
		// Store error state in view state (not part of schema, but for functionality)
		updateViewState({ current_view: viewState?.current_view || '' });
	}

	function updateFormState(): void {
		// Store form state in view state (not part of schema, but for functionality)
		updateViewState({ current_view: viewState?.current_view || '' });
	}

	function updateSelectionState(): void {
		// Store selection state in view state (not part of schema, but for functionality)
		updateViewState({ current_view: viewState?.current_view || '' });
	}

	function updateFilterState(key: string, filters: unknown) {
		const activeFilters = { ...viewState?.filters?.active_filters, [key]: filters };
		return updateViewState({ filters: { ...viewState?.filters, active_filters: activeFilters } });
	}

	function updateSortState(): void {
		updateViewState({ sorting: { ...viewState?.sorting } });
	}

	function updatePaginationState(): void {
		updateViewState({ layout: { ...viewState?.layout, list_page_size: 20 } });
	}

	// State getters
	function getLoadingState(key: string): boolean {
		return viewState?.loading_states?.[key] || false;
	}

	function getErrorState(key: string): string | null {
		return viewState?.error_states?.[key] || null;
	}

	function getFormState(key: string): unknown {
		return viewState?.form_states?.[key];
	}

	function getSelectionState(key: string): unknown {
		return viewState?.selection_states?.[key];
	}

	function getFilterState(key: string): unknown {
		return viewState?.filter_states?.[key];
	}

	function getSortState(key: string): unknown {
		return viewState?.sort_states?.[key];
	}

	function getPaginationState(key: string): unknown {
		return viewState?.pagination_states?.[key];
	}

	// View helpers
	function getViewConfigById(viewId: string): ViewConfig | undefined {
		return viewConfigs.find((config: ViewConfig) => config.id === viewId);
	}

	function isCurrentView(viewId: string): boolean {
		return currentViewId === viewId;
	}

	function canEditViewConfig(config: ViewConfig): boolean {
		if (!config.is_active) return false;
		// Would need user role check here
		return true;
	}

	function hasPermission(): boolean {
		// Would need to check user permissions here
		return true;
	}

	function shouldShowWidget(): boolean {
		const config = currentViewConfig;
		return config?.layout_config?.sidebar_enabled || false;
	}

	function shouldShowSidebar(): boolean {
		const config = currentViewConfig;
		return config?.layout_config?.sidebar_enabled !== false;
	}

	function shouldShowHeader(): boolean {
		const config = currentViewConfig;
		return config?.layout_config?.header_enabled !== false;
	}

	function shouldShowFooter(): boolean {
		const config = currentViewConfig;
		return config?.layout_config?.footer_enabled !== false;
	}

	function shouldShowBreadcrumbs(): boolean {
		const config = currentViewConfig;
		return config?.layout_config?.breadcrumbs_enabled !== false;
	}

	function shouldShowSearch(): boolean {
		const config = currentViewConfig;
		return config?.layout_config?.search_enabled !== false;
	}

	function shouldShowNotifications(): boolean {
		return viewState?.notifications?.show_notifications !== false;
	}

	function shouldShowQuickActions(): boolean {
		const config = currentViewConfig;
		return config?.is_active !== false;
	}

	// Layout helpers
	function getLayoutType(): string {
		return viewState?.layout?.density || 'comfortable';
	}

	function getGridColumns(): number {
		return viewState?.layout?.grid_columns || 4;
	}

	function getResponsiveBreakpoints(): Record<string, number> {
		return {
			sm: 640,
			md: 768,
			lg: 1024,
			xl: 1280
		};
	}

	function getCustomCSS(): string {
		return '';
	}

	// Navigation helpers
	function getMainMenuItems() {
		type MenuItemWithSort = { sort_order?: number };
		return mainMenu.sort(
			(a: MenuItemWithSort, b: MenuItemWithSort) => (a.sort_order || 0) - (b.sort_order || 0)
		);
	}

	function getQuickActionItems() {
		type MenuItemWithSort = { sort_order?: number };
		return quickActions.sort(
			(a: MenuItemWithSort, b: MenuItemWithSort) => (a.sort_order || 0) - (b.sort_order || 0)
		);
	}

	function getUserMenuItems() {
		type MenuItemWithSort = { sort_order?: number };
		return userMenu.sort(
			(a: MenuItemWithSort, b: MenuItemWithSort) => (a.sort_order || 0) - (b.sort_order || 0)
		);
	}

	function getFooterLinkItems() {
		type MenuItemWithSort = { sort_order?: number };
		return footerLinks.sort(
			(a: MenuItemWithSort, b: MenuItemWithSort) => (a.sort_order || 0) - (b.sort_order || 0)
		);
	}

	return {
		// Queries and their states
		viewStateQuery,
		viewConfigsQuery,
		userPreferencesQuery,
		navigationMenuQuery,
		statsQuery,

		// Reactive data
		viewState,
		viewConfigs,
		userPreferences,
		navigationMenu,
		stats,

		// Current view properties
		currentRoute,
		currentViewId,
		sidebarCollapsed,
		activeModal,
		breadcrumbs,
		pageTitle,
		metaDescription,
		currentViewConfig,

		// View categories
		systemViews,
		customViews,

		// Navigation items
		mainMenu,
		quickActions,
		userMenu,
		footerLinks,

		// View state operations
		updateViewState,
		createViewConfig,
		updateViewConfig,
		updateUserPreferences,

		// Convenience functions
		setCurrentRoute,
		setCurrentView,
		toggleSidebar,
		setSidebarCollapsed,
		setActiveModal,
		setBreadcrumbs,
		setPageTitle,
		setMetaDescription,

		// State management
		updateLoadingState,
		updateErrorState,
		updateFormState,
		updateSelectionState,
		updateFilterState,
		updateSortState,
		updatePaginationState,

		// State getters
		getLoadingState,
		getErrorState,
		getFormState,
		getSelectionState,
		getFilterState,
		getSortState,
		getPaginationState,

		// View helpers
		getViewConfigById,
		isCurrentView,
		canEditViewConfig,
		hasPermission,
		shouldShowWidget,
		shouldShowSidebar,
		shouldShowHeader,
		shouldShowFooter,
		shouldShowBreadcrumbs,
		shouldShowSearch,
		shouldShowNotifications,
		shouldShowQuickActions,

		// Layout helpers
		getLayoutType,
		getGridColumns,
		getResponsiveBreakpoints,
		getCustomCSS,

		// Navigation helpers
		getMainMenuItems,
		getQuickActionItems,
		getUserMenuItems,
		getFooterLinkItems,

		// Mutation states
		updateViewStateStatus: $derived(updateViewStateMutation.status),
		createViewConfigStatus: $derived(createViewConfigMutation.status),
		updateViewConfigStatus: $derived(updateViewConfigMutation.status),
		updatePreferencesStatus: $derived(updatePreferencesMutation.status),

		// Loading states
		isLoading: $derived(viewStateQuery.isPending),
		isConfigsLoading: $derived(viewConfigsQuery.isPending),
		isPreferencesLoading: $derived(userPreferencesQuery.isPending),
		isNavigationLoading: $derived(navigationMenuQuery.isPending),
		isError: $derived(viewStateQuery.isError),
		error: $derived(viewStateQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
