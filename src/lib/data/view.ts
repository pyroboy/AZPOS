import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { 
  onGetCurrentViewState, 
  onUpdateViewState, 
  onGetViewConfigs, 
  onCreateViewConfig, 
  onUpdateViewConfig, 
  onGetUserViewPreferences, 
  onUpdateUserViewPreferences, 
  onGetNavigationMenu, 
  onGetViewStats 
} from '$lib/server/telefuncs/view.telefunc';
import type { 
  ViewState, 
  ViewConfig, 
  UserViewPreferences, 
  NavigationMenu, 
  ViewStats
} from '$lib/types/view.schema';

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
      queryClient.setQueryData<ViewConfig[]>(
        viewConfigsQueryKey,
        (old) => {
          if (!old) return [newConfig];
          return [...old, newConfig];
        }
      );
    }
  });

  // Mutation to update view config
  const updateViewConfigMutation = createMutation({
    mutationFn: ({ configId, configData }: { configId: string; configData: ViewConfig }) => 
      onUpdateViewConfig(configId, configData),
    onSuccess: (updatedConfig) => {
      // Update view configs list
      queryClient.setQueryData<ViewConfig[]>(
        viewConfigsQueryKey,
        (old) => {
          if (!old) return [updatedConfig];
          return old.map(config => config.id === updatedConfig.id ? updatedConfig : config);
        }
      );
    }
  });

  // Mutation to update user preferences
  const updatePreferencesMutation = createMutation({
    mutationFn: (preferencesData: UserViewPreferences) => onUpdateUserViewPreferences(preferencesData),
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
  const currentRoute = $derived(viewState?.current_route || '/');
  const currentViewId = $derived(viewState?.current_view_id || 'dashboard');
  const sidebarCollapsed = $derived(viewState?.sidebar_collapsed || false);
  const activeModal = $derived(viewState?.active_modal);
  const breadcrumbs = $derived(viewState?.breadcrumbs || []);
  const pageTitle = $derived(viewState?.page_title || 'AZPOS');
  const metaDescription = $derived(viewState?.meta_description || 'AZPOS - Point of Sale System');
  
  // Current view config
  const currentViewConfig = $derived(() => {
    return viewConfigs.find(config => config.id === currentViewId) || viewConfigs.find(config => config.is_default);
  });
  
  // View categories
  const systemViews = $derived(viewConfigs.filter(config => config.is_system));
  const customViews = $derived(viewConfigs.filter(config => !config.is_system));
  
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
    return updateViewState({ current_route: route });
  }

  function setCurrentView(viewId: string) {
    return updateViewState({ current_view_id: viewId });
  }

  function toggleSidebar() {
    return updateViewState({ sidebar_collapsed: !sidebarCollapsed });
  }

  function setSidebarCollapsed(collapsed: boolean) {
    return updateViewState({ sidebar_collapsed: collapsed });
  }

  function setActiveModal(modalId: string | null) {
    return updateViewState({ active_modal: modalId });
  }

  function setBreadcrumbs(breadcrumbs: ViewState['breadcrumbs']) {
    return updateViewState({ breadcrumbs });
  }

  function setPageTitle(title: string) {
    return updateViewState({ page_title: title });
  }

  function setMetaDescription(description: string) {
    return updateViewState({ meta_description: description });
  }

  function updateLoadingState(key: string, loading: boolean) {
    const loadingStates = { ...viewState?.loading_states, [key]: loading };
    return updateViewState({ loading_states: loadingStates });
  }

  function updateErrorState(key: string, error: string | null) {
    const errorStates = { ...viewState?.error_states };
    if (error) {
      errorStates[key] = error;
    } else {
      delete errorStates[key];
    }
    return updateViewState({ error_states: errorStates });
  }

  function updateFormState(key: string, formData: any) {
    const formStates = { ...viewState?.form_states, [key]: formData };
    return updateViewState({ form_states: formStates });
  }

  function updateSelectionState(key: string, selection: any) {
    const selectionStates = { ...viewState?.selection_states, [key]: selection };
    return updateViewState({ selection_states: selectionStates });
  }

  function updateFilterState(key: string, filters: any) {
    const filterStates = { ...viewState?.filter_states, [key]: filters };
    return updateViewState({ filter_states: filterStates });
  }

  function updateSortState(key: string, sort: any) {
    const sortStates = { ...viewState?.sort_states, [key]: sort };
    return updateViewState({ sort_states: sortStates });
  }

  function updatePaginationState(key: string, pagination: any) {
    const paginationStates = { ...viewState?.pagination_states, [key]: pagination };
    return updateViewState({ pagination_states: paginationStates });
  }

  // State getters
  function getLoadingState(key: string): boolean {
    return viewState?.loading_states?.[key] || false;
  }

  function getErrorState(key: string): string | null {
    return viewState?.error_states?.[key] || null;
  }

  function getFormState(key: string): any {
    return viewState?.form_states?.[key];
  }

  function getSelectionState(key: string): any {
    return viewState?.selection_states?.[key];
  }

  function getFilterState(key: string): any {
    return viewState?.filter_states?.[key];
  }

  function getSortState(key: string): any {
    return viewState?.sort_states?.[key];
  }

  function getPaginationState(key: string): any {
    return viewState?.pagination_states?.[key];
  }

  // View helpers
  function getViewConfigById(viewId: string): ViewConfig | undefined {
    return viewConfigs.find(config => config.id === viewId);
  }

  function isCurrentView(viewId: string): boolean {
    return currentViewId === viewId;
  }

  function canEditViewConfig(config: ViewConfig): boolean {
    if (config.is_system) return false;
    // Would need user role check here
    return true;
  }

  function hasPermission(permission: string): boolean {
    // Would need to check user permissions here
    return true;
  }

  function shouldShowWidget(widgetId: string): boolean {
    return currentViewConfig?.widgets?.includes(widgetId) || false;
  }

  function shouldShowSidebar(): boolean {
    return currentViewConfig?.sidebar_visible !== false;
  }

  function shouldShowHeader(): boolean {
    return currentViewConfig?.header_visible !== false;
  }

  function shouldShowFooter(): boolean {
    return currentViewConfig?.footer_visible !== false;
  }

  function shouldShowBreadcrumbs(): boolean {
    return currentViewConfig?.breadcrumbs_visible !== false;
  }

  function shouldShowSearch(): boolean {
    return currentViewConfig?.search_visible !== false;
  }

  function shouldShowNotifications(): boolean {
    return currentViewConfig?.notifications_visible !== false;
  }

  function shouldShowQuickActions(): boolean {
    return currentViewConfig?.quick_actions_visible !== false;
  }

  // Layout helpers
  function getLayoutType(): string {
    return currentViewConfig?.layout || 'default';
  }

  function getGridColumns(): number {
    return currentViewConfig?.grid_columns || 12;
  }

  function getResponsiveBreakpoints(): Record<string, number> {
    return currentViewConfig?.responsive_breakpoints || {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    };
  }

  function getCustomCSS(): string {
    return currentViewConfig?.custom_css || '';
  }

  // Navigation helpers
  function getMainMenuItems() {
    return mainMenu.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function getQuickActionItems() {
    return quickActions.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function getUserMenuItems() {
    return userMenu.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function getFooterLinkItems() {
    return footerLinks.sort((a, b) => (a.order || 0) - (b.order || 0));
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
