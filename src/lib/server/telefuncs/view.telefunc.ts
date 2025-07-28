import { getContext } from 'telefunc';
import { 
  viewConfigSchema,
  userViewPreferencesSchema,
  viewFiltersSchema,
  type ViewState,
  type ViewConfig,
  type UserViewPreferences,
  type ViewFilters,
  type PaginatedViews,
  type ViewStats,
  type NavigationMenu,
  type ViewAnalytics
} from '$lib/types/view.schema';
import { createSupabaseClient } from '$lib/server/db';

// Default view configurations
const defaultViews: Record<string, ViewConfig> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    route: '/dashboard',
    layout: 'default',
    sidebar_visible: true,
    header_visible: true,
    footer_visible: true,
    breadcrumbs_visible: true,
    search_visible: true,
    notifications_visible: true,
    quick_actions_visible: true,
    widgets: ['sales_summary', 'recent_transactions', 'low_stock_alerts', 'quick_stats'],
    grid_columns: 12,
    responsive_breakpoints: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    },
    custom_css: '',
    permissions_required: [],
    is_default: true,
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  pos: {
    id: 'pos',
    name: 'Point of Sale',
    route: '/pos',
    layout: 'fullscreen',
    sidebar_visible: false,
    header_visible: false,
    footer_visible: false,
    breadcrumbs_visible: false,
    search_visible: false,
    notifications_visible: false,
    quick_actions_visible: true,
    widgets: ['product_grid', 'cart', 'payment_methods', 'customer_display'],
    grid_columns: 12,
    responsive_breakpoints: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    },
    custom_css: '',
    permissions_required: ['pos_access'],
    is_default: false,
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

// Telefunc to get current view state
export async function onGetCurrentViewState(): Promise<ViewState> {
  const { user } = getContext();
  if (!user) {
    return {
      current_route: '/',
      current_view_id: 'dashboard',
      sidebar_collapsed: false,
      active_modal: null,
      breadcrumbs: [],
      page_title: 'AZPOS',
      meta_description: 'AZPOS - Point of Sale System',
      loading_states: {},
      error_states: {},
      form_states: {},
      selection_states: {},
      filter_states: {},
      sort_states: {},
      pagination_states: {},
      last_updated: new Date().toISOString()
    };
  }

  const supabase = createSupabaseClient();

  // Get user's view state
  const { data: viewState, error } = await supabase
    .from('user_view_states')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching view state:', error);
  }

  // Return default state if no saved state
  if (!viewState) {
    return {
      current_route: '/',
      current_view_id: 'dashboard',
      sidebar_collapsed: false,
      active_modal: null,
      breadcrumbs: [],
      page_title: 'AZPOS',
      meta_description: 'AZPOS - Point of Sale System',
      loading_states: {},
      error_states: {},
      form_states: {},
      selection_states: {},
      filter_states: {},
      sort_states: {},
      pagination_states: {},
      last_updated: new Date().toISOString()
    };
  }

  return viewState;
}

// Telefunc to update view state
export async function onUpdateViewState(viewStateData: unknown): Promise<ViewState> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  // Parse and validate the view state data
  const validatedData = viewStateData as Partial<ViewState>;
  const supabase = createSupabaseClient();

  const now = new Date().toISOString();

  // Upsert user view state
  const { data: updatedState, error } = await supabase
    .from('user_view_states')
    .upsert({
      user_id: user.id,
      current_route: validatedData.current_route,
      current_view_id: validatedData.current_view_id,
      sidebar_collapsed: validatedData.sidebar_collapsed,
      active_modal: validatedData.active_modal,
      breadcrumbs: validatedData.breadcrumbs,
      page_title: validatedData.page_title,
      meta_description: validatedData.meta_description,
      loading_states: validatedData.loading_states,
      error_states: validatedData.error_states,
      form_states: validatedData.form_states,
      selection_states: validatedData.selection_states,
      filter_states: validatedData.filter_states,
      sort_states: validatedData.sort_states,
      pagination_states: validatedData.pagination_states,
      last_updated: now
    })
    .select()
    .single();

  if (error) throw error;

  return updatedState;
}

// Telefunc to get view configurations
export async function onGetViewConfigs(): Promise<ViewConfig[]> {
  const { user } = getContext();
  if (!user) return Object.values(defaultViews);

  const supabase = createSupabaseClient();

  const { data: configs, error } = await supabase
    .from('view_configs')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching view configs:', error);
    return Object.values(defaultViews);
  }

  // Merge with default views
  const allConfigs = [...Object.values(defaultViews)];
  
  configs?.forEach(config => {
    const existingIndex = allConfigs.findIndex(c => c.id === config.id);
    if (existingIndex >= 0) {
      allConfigs[existingIndex] = config;
    } else {
      allConfigs.push(config);
    }
  });

  return allConfigs;
}

// Telefunc to create view configuration
export async function onCreateViewConfig(configData: unknown): Promise<ViewConfig> {
  const { user } = getContext();
  if (!user || !['admin', 'manager'].includes(user.role)) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = viewConfigSchema.parse(configData);
  const supabase = createSupabaseClient();

  const now = new Date().toISOString();
  const configId = crypto.randomUUID();

  const viewConfig: ViewConfig = {
    id: configId,
    name: validatedData.name,
    route: validatedData.route,
    layout: validatedData.layout,
    sidebar_visible: validatedData.sidebar_visible,
    header_visible: validatedData.header_visible,
    footer_visible: validatedData.footer_visible,
    breadcrumbs_visible: validatedData.breadcrumbs_visible,
    search_visible: validatedData.search_visible,
    notifications_visible: validatedData.notifications_visible,
    quick_actions_visible: validatedData.quick_actions_visible,
    widgets: validatedData.widgets,
    grid_columns: validatedData.grid_columns,
    responsive_breakpoints: validatedData.responsive_breakpoints,
    custom_css: validatedData.custom_css,
    permissions_required: validatedData.permissions_required,
    is_default: false,
    is_system: false,
    created_by: user.id,
    created_at: now,
    updated_at: now
  };

  const { data: savedConfig, error } = await supabase
    .from('view_configs')
    .insert({
      id: viewConfig.id,
      name: viewConfig.name,
      route: viewConfig.route,
      layout: viewConfig.layout,
      sidebar_visible: viewConfig.sidebar_visible,
      header_visible: viewConfig.header_visible,
      footer_visible: viewConfig.footer_visible,
      breadcrumbs_visible: viewConfig.breadcrumbs_visible,
      search_visible: viewConfig.search_visible,
      notifications_visible: viewConfig.notifications_visible,
      quick_actions_visible: viewConfig.quick_actions_visible,
      widgets: viewConfig.widgets,
      grid_columns: viewConfig.grid_columns,
      responsive_breakpoints: viewConfig.responsive_breakpoints,
      custom_css: viewConfig.custom_css,
      permissions_required: viewConfig.permissions_required,
      is_default: viewConfig.is_default,
      is_system: viewConfig.is_system,
      created_by: viewConfig.created_by,
      created_at: viewConfig.created_at,
      updated_at: viewConfig.updated_at
    })
    .select()
    .single();

  if (error) throw error;

  return viewConfig;
}

// Telefunc to update view configuration
export async function onUpdateViewConfig(configId: string, configData: unknown): Promise<ViewConfig> {
  const { user } = getContext();
  if (!user || !['admin', 'manager'].includes(user.role)) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = viewConfigSchema.parse(configData);
  const supabase = createSupabaseClient();

  // Check if config exists and is not system
  const { data: existingConfig, error: fetchError } = await supabase
    .from('view_configs')
    .select('*')
    .eq('id', configId)
    .single();

  if (fetchError || !existingConfig) {
    throw new Error('View configuration not found');
  }

  if (existingConfig.is_system) {
    throw new Error('Cannot modify system view configurations');
  }

  const now = new Date().toISOString();

  const { data: updatedConfig, error } = await supabase
    .from('view_configs')
    .update({
      name: validatedData.name,
      route: validatedData.route,
      layout: validatedData.layout,
      sidebar_visible: validatedData.sidebar_visible,
      header_visible: validatedData.header_visible,
      footer_visible: validatedData.footer_visible,
      breadcrumbs_visible: validatedData.breadcrumbs_visible,
      search_visible: validatedData.search_visible,
      notifications_visible: validatedData.notifications_visible,
      quick_actions_visible: validatedData.quick_actions_visible,
      widgets: validatedData.widgets,
      grid_columns: validatedData.grid_columns,
      responsive_breakpoints: validatedData.responsive_breakpoints,
      custom_css: validatedData.custom_css,
      permissions_required: validatedData.permissions_required,
      updated_at: now
    })
    .eq('id', configId)
    .select()
    .single();

  if (error) throw error;

  return updatedConfig;
}

// Telefunc to get user view preferences
export async function onGetUserViewPreferences(): Promise<UserViewPreferences | null> {
  const { user } = getContext();
  if (!user) return null;

  const supabase = createSupabaseClient();

  const { data: preferences, error } = await supabase
    .from('user_view_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return preferences;
}

// Telefunc to update user view preferences
export async function onUpdateUserViewPreferences(preferencesData: unknown): Promise<UserViewPreferences> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = userViewPreferencesSchema.parse(preferencesData);
  const supabase = createSupabaseClient();

  const now = new Date().toISOString();

  // Upsert user preferences
  const { data: preferences, error } = await supabase
    .from('user_view_preferences')
    .upsert({
      user_id: user.id,
      default_view_id: validatedData.default_view_id,
      sidebar_width: validatedData.sidebar_width,
      table_page_size: validatedData.table_page_size,
      date_format: validatedData.date_format,
      time_format: validatedData.time_format,
      currency_format: validatedData.currency_format,
      number_format: validatedData.number_format,
      language: validatedData.language,
      timezone: validatedData.timezone,
      auto_save_forms: validatedData.auto_save_forms,
      show_tooltips: validatedData.show_tooltips,
      enable_animations: validatedData.enable_animations,
      compact_mode: validatedData.compact_mode,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw error;

  return preferences;
}

// Telefunc to get navigation menu
export async function onGetNavigationMenu(): Promise<NavigationMenu> {
  const { user } = getContext();
  if (!user) {
    return {
      main_menu: [],
      quick_actions: [],
      user_menu: [],
      footer_links: []
    };
  }

  const supabase = createSupabaseClient();

  // Get user's navigation preferences or default
  const { data: navConfig, error } = await supabase
    .from('navigation_configs')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching navigation config:', error);
  }

  // Return default navigation based on user role
  const defaultNav = getDefaultNavigationForRole(user.role);
  
  return navConfig?.menu_config || defaultNav;
}

// Helper function to get default navigation based on role
function getDefaultNavigationForRole(role: string): NavigationMenu {
  const baseMenu = [
    { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'dashboard', order: 1 },
    { id: 'pos', label: 'Point of Sale', route: '/pos', icon: 'shopping-cart', order: 2 }
  ];

  const adminMenu = [
    ...baseMenu,
    { id: 'inventory', label: 'Inventory', route: '/inventory', icon: 'package', order: 3 },
    { id: 'products', label: 'Products', route: '/products', icon: 'box', order: 4 },
    { id: 'customers', label: 'Customers', route: '/customers', icon: 'users', order: 5 },
    { id: 'reports', label: 'Reports', route: '/reports', icon: 'chart-bar', order: 6 },
    { id: 'settings', label: 'Settings', route: '/settings', icon: 'settings', order: 7 }
  ];

  const managerMenu = [
    ...baseMenu,
    { id: 'inventory', label: 'Inventory', route: '/inventory', icon: 'package', order: 3 },
    { id: 'products', label: 'Products', route: '/products', icon: 'box', order: 4 },
    { id: 'customers', label: 'Customers', route: '/customers', icon: 'users', order: 5 },
    { id: 'reports', label: 'Reports', route: '/reports', icon: 'chart-bar', order: 6 }
  ];

  const cashierMenu = [
    ...baseMenu,
    { id: 'customers', label: 'Customers', route: '/customers', icon: 'users', order: 3 }
  ];

  switch (role) {
    case 'admin':
      return {
        main_menu: adminMenu,
        quick_actions: [
          { id: 'new-sale', label: 'New Sale', action: 'navigate', target: '/pos', icon: 'plus' },
          { id: 'add-product', label: 'Add Product', action: 'modal', target: 'add-product', icon: 'package' }
        ],
        user_menu: [
          { id: 'profile', label: 'Profile', route: '/profile', icon: 'user' },
          { id: 'settings', label: 'Settings', route: '/settings', icon: 'settings' },
          { id: 'logout', label: 'Logout', action: 'logout', icon: 'log-out' }
        ],
        footer_links: [
          { id: 'help', label: 'Help', route: '/help', icon: 'help-circle' },
          { id: 'support', label: 'Support', route: '/support', icon: 'life-buoy' }
        ]
      };
    case 'manager':
      return {
        main_menu: managerMenu,
        quick_actions: [
          { id: 'new-sale', label: 'New Sale', action: 'navigate', target: '/pos', icon: 'plus' },
          { id: 'add-product', label: 'Add Product', action: 'modal', target: 'add-product', icon: 'package' }
        ],
        user_menu: [
          { id: 'profile', label: 'Profile', route: '/profile', icon: 'user' },
          { id: 'logout', label: 'Logout', action: 'logout', icon: 'log-out' }
        ],
        footer_links: [
          { id: 'help', label: 'Help', route: '/help', icon: 'help-circle' }
        ]
      };
    case 'cashier':
      return {
        main_menu: cashierMenu,
        quick_actions: [
          { id: 'new-sale', label: 'New Sale', action: 'navigate', target: '/pos', icon: 'plus' }
        ],
        user_menu: [
          { id: 'profile', label: 'Profile', route: '/profile', icon: 'user' },
          { id: 'logout', label: 'Logout', action: 'logout', icon: 'log-out' }
        ],
        footer_links: [
          { id: 'help', label: 'Help', route: '/help', icon: 'help-circle' }
        ]
      };
    default:
      return {
        main_menu: baseMenu,
        quick_actions: [],
        user_menu: [
          { id: 'logout', label: 'Logout', action: 'logout', icon: 'log-out' }
        ],
        footer_links: []
      };
  }
}

// Telefunc to get view statistics
export async function onGetViewStats(): Promise<ViewStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: viewStates, error: statesError } = await supabase
    .from('user_view_states')
    .select('current_view_id, current_route, last_updated');

  if (statesError) throw statesError;

  const { data: viewConfigs, error: configsError } = await supabase
    .from('view_configs')
    .select('id, name, is_system');

  if (configsError) throw configsError;

  const stats: ViewStats = {
    total_views: viewConfigs?.length || 0,
    system_views: viewConfigs?.filter(v => v.is_system).length || 0,
    custom_views: viewConfigs?.filter(v => !v.is_system).length || 0,
    active_users: viewStates?.length || 0,
    view_usage: {},
    route_usage: {},
    most_popular_view: '',
    most_popular_route: '',
    avg_session_duration_minutes: 0
  };

  // Calculate view usage
  const viewUsage: Record<string, { count: number; percentage: number; view_name: string }> = {};
  const routeUsage: Record<string, { count: number; percentage: number }> = {};

  viewStates?.forEach(state => {
    // View usage
    if (state.current_view_id) {
      if (!viewUsage[state.current_view_id]) {
        const config = viewConfigs?.find(v => v.id === state.current_view_id);
        viewUsage[state.current_view_id] = {
          count: 0,
          percentage: 0,
          view_name: config?.name || state.current_view_id
        };
      }
      viewUsage[state.current_view_id].count++;
    }

    // Route usage
    if (state.current_route) {
      if (!routeUsage[state.current_route]) {
        routeUsage[state.current_route] = { count: 0, percentage: 0 };
      }
      routeUsage[state.current_route].count++;
    }
  });

  // Calculate percentages
  const totalUsers = viewStates?.length || 0;
  Object.keys(viewUsage).forEach(viewId => {
    viewUsage[viewId].percentage = totalUsers > 0 ? (viewUsage[viewId].count / totalUsers) * 100 : 0;
  });

  Object.keys(routeUsage).forEach(route => {
    routeUsage[route].percentage = totalUsers > 0 ? (routeUsage[route].count / totalUsers) * 100 : 0;
  });

  // Find most popular
  let mostPopularView = '';
  let mostPopularRoute = '';
  let maxViewCount = 0;
  let maxRouteCount = 0;

  Object.entries(viewUsage).forEach(([viewId, usage]) => {
    if (usage.count > maxViewCount) {
      maxViewCount = usage.count;
      mostPopularView = viewId;
    }
  });

  Object.entries(routeUsage).forEach(([route, usage]) => {
    if (usage.count > maxRouteCount) {
      maxRouteCount = usage.count;
      mostPopularRoute = route;
    }
  });

  stats.view_usage = viewUsage;
  stats.route_usage = routeUsage;
  stats.most_popular_view = mostPopularView;
  stats.most_popular_route = mostPopularRoute;

  return stats;
}
