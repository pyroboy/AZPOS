import { getContext } from 'telefunc';
import {
	viewConfigSchema,
	userViewPreferencesSchema,
	type ViewState,
	type ViewConfig,
	type UserViewPreferences,
	type ViewStats,
	type NavigationMenu
} from '$lib/types/view.schema';
import { createSupabaseClient } from '$lib/server/db';

// Default view configurations
const defaultViews: Record<string, ViewConfig> = {
	dashboard: {
		id: 'dashboard',
		name: 'Dashboard',
		path: '/dashboard',
		component: 'Dashboard',
		icon: 'dashboard',
		permissions: [],
		roles: ['admin', 'manager', 'cashier'],
		is_public: false,
		is_active: true,
		sort_order: 1,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	},
	pos: {
		id: 'pos',
		name: 'Point of Sale',
		path: '/pos',
		component: 'POS',
		icon: 'shopping-cart',
		permissions: ['pos_access'],
		roles: ['admin', 'manager', 'cashier'],
		is_public: false,
		is_active: true,
		sort_order: 2,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	}
};

// Telefunc to get current view state
export async function onGetCurrentViewState(): Promise<ViewState> {
	const { user } = getContext();
	if (!user) {
		return {
			current_view: 'dashboard',
			previous_view: undefined,
			view_history: [],
			breadcrumbs: [],
			sidebar: {
				is_open: true,
				is_collapsed: false,
				active_section: undefined,
				pinned_items: []
			},
			modals: {
				active_modals: [],
				modal_data: {}
			},
			notifications: {
				show_notifications: true,
				notification_position: 'top-right',
				auto_dismiss: true,
				dismiss_timeout: 5000
			},
			layout: {
				density: 'comfortable',
				grid_columns: 4,
				list_page_size: 20,
				show_grid_lines: true,
				show_row_numbers: false
			},
			filters: {
				show_filters: false,
				active_filters: {},
				saved_filters: []
			},
			sorting: {
				sort_by: undefined,
				sort_order: 'asc',
				multi_sort: []
			},
			search: {
				query: '',
				search_history: [],
				search_suggestions: [],
				advanced_search: false
			}
		};
	}

	const supabase = createSupabaseClient();

	// Get user's view preferences which contains view states
	const { data: preferences, error } = await supabase
		.from('user_view_preferences')
		.select('*')
		.eq('user_id', user.id)
		.single();

	if (error && error.code !== 'PGRST116') {
		console.error('Error fetching view preferences:', error);
	}

	// Return default state if no saved preferences
	if (!preferences) {
		return {
			current_view: 'dashboard',
			previous_view: undefined,
			view_history: [],
			breadcrumbs: [],
			sidebar: {
				is_open: true,
				is_collapsed: false,
				active_section: undefined,
				pinned_items: []
			},
			modals: {
				active_modals: [],
				modal_data: {}
			},
			notifications: {
				show_notifications: true,
				notification_position: 'top-right',
				auto_dismiss: true,
				dismiss_timeout: 5000
			},
			layout: {
				density: 'comfortable',
				grid_columns: 4,
				list_page_size: 20,
				show_grid_lines: true,
				show_row_numbers: false
			},
			filters: {
				show_filters: false,
				active_filters: {},
				saved_filters: []
			},
			sorting: {
				sort_by: undefined,
				sort_order: 'asc',
				multi_sort: []
			},
			search: {
				query: '',
				search_history: [],
				search_suggestions: [],
				advanced_search: false
			}
		};
	}

	// Return the current view state or default state
	return (
		preferences.view_states?.dashboard || {
			current_view: 'dashboard',
			previous_view: undefined,
			view_history: [],
			breadcrumbs: [],
			sidebar: {
				is_open: true,
				is_collapsed: false,
				active_section: undefined,
				pinned_items: []
			},
			modals: {
				active_modals: [],
				modal_data: {}
			},
			notifications: {
				show_notifications: true,
				notification_position: 'top-right',
				auto_dismiss: true,
				dismiss_timeout: 5000
			},
			layout: {
				density: 'comfortable',
				grid_columns: 4,
				list_page_size: 20,
				show_grid_lines: true,
				show_row_numbers: false
			},
			filters: {
				show_filters: false,
				active_filters: {},
				saved_filters: []
			},
			sorting: {
				sort_by: undefined,
				sort_order: 'asc',
				multi_sort: []
			},
			search: {
				query: '',
				search_history: [],
				search_suggestions: [],
				advanced_search: false
			}
		}
	);
}

// Telefunc to update view state
export async function onUpdateViewState(viewStateData: unknown): Promise<ViewState> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	// Parse and validate the view state data
	const validatedData = viewStateData as Partial<ViewState>;
	const supabase = createSupabaseClient();

	const now = new Date().toISOString();

	// Get current preferences or create new ones
	const { data: currentPrefs } = await supabase
		.from('user_view_preferences')
		.select('*')
		.eq('user_id', user.id)
		.single();

	const updatedViewStates = {
		...currentPrefs?.view_states,
		[validatedData.current_view || 'dashboard']: validatedData
	};

	// Upsert user view preferences with updated view states
	const { error } = await supabase
		.from('user_view_preferences')
		.upsert({
			user_id: user.id,
			view_states: updatedViewStates,
			global_preferences: currentPrefs?.global_preferences || {
				theme: 'light',
				language: 'en',
				timezone: 'UTC',
				date_format: 'MM/DD/YYYY',
				time_format: '12',
				currency: 'USD',
				number_format: 'US'
			},
			accessibility: currentPrefs?.accessibility || {
				high_contrast: false,
				large_text: false,
				reduced_motion: false,
				screen_reader: false,
				keyboard_navigation: false
			},
			updated_at: now
		})
		.select()
		.single();

	if (error) throw error;

	return validatedData as ViewState;
}

// Telefunc to get view configurations
export async function onGetViewConfigs(): Promise<ViewConfig[]> {
	const { user } = getContext();
	if (!user) return Object.values(defaultViews);

	const supabase = createSupabaseClient();

	const { data: configs, error } = await supabase.from('view_configs').select('*').order('name');

	if (error) {
		console.error('Error fetching view configs:', error);
		return Object.values(defaultViews);
	}

	// Merge with default views
	const allConfigs = [...Object.values(defaultViews)];

	configs?.forEach((config) => {
		const existingIndex = allConfigs.findIndex((c) => c.id === config.id);
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
		path: validatedData.path,
		component: validatedData.component,
		icon: validatedData.icon,
		description: validatedData.description,
		permissions: validatedData.permissions,
		roles: validatedData.roles,
		is_public: validatedData.is_public,
		is_active: validatedData.is_active,
		parent_view: validatedData.parent_view,
		sort_order: validatedData.sort_order,
		metadata: validatedData.metadata,
		layout_config: validatedData.layout_config,
		created_at: now,
		updated_at: now
	};

	const { error } = await supabase.from('view_configs').insert(viewConfig).select().single();

	if (error) throw error;

	return viewConfig;
}

// Telefunc to update view configuration
export async function onUpdateViewConfig(
	configId: string,
	configData: unknown
): Promise<ViewConfig> {
	const { user } = getContext();
	if (!user || !['admin', 'manager'].includes(user.role)) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const validatedData = viewConfigSchema.partial().parse(configData);
	const supabase = createSupabaseClient();

	// Check if config exists
	const { data: existingConfig, error: fetchError } = await supabase
		.from('view_configs')
		.select('*')
		.eq('id', configId)
		.single();

	if (fetchError || !existingConfig) {
		throw new Error('View configuration not found');
	}

	const now = new Date().toISOString();

	const { data: updatedConfig, error } = await supabase
		.from('view_configs')
		.update({
			...validatedData,
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
export async function onUpdateUserViewPreferences(
	preferencesData: unknown
): Promise<UserViewPreferences> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const validatedData = userViewPreferencesSchema.partial().parse(preferencesData);
	const supabase = createSupabaseClient();

	const now = new Date().toISOString();

	// Get current preferences
	const { data: currentPrefs } = await supabase
		.from('user_view_preferences')
		.select('*')
		.eq('user_id', user.id)
		.single();

	// Upsert user preferences
	const { data: preferences, error } = await supabase
		.from('user_view_preferences')
		.upsert({
			user_id: user.id,
			view_states: validatedData.view_states || currentPrefs?.view_states || {},
			global_preferences: {
				...currentPrefs?.global_preferences,
				...validatedData.global_preferences
			},
			accessibility: {
				...currentPrefs?.accessibility,
				...validatedData.accessibility
			},
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
			id: 'empty',
			label: 'Empty Navigation',
			children: [],
			permissions: [],
			roles: [],
			is_active: true,
			is_external: false,
			sort_order: 0
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
	const baseMenu: NavigationMenu = {
		id: 'navigation',
		label: 'Navigation',
		children: [
			{
				id: 'dashboard',
				label: 'Dashboard',
				path: '/dashboard',
				icon: 'dashboard',
				children: [],
				permissions: [],
				roles: ['admin', 'manager', 'cashier'],
				is_active: true,
				is_external: false,
				sort_order: 1
			},
			{
				id: 'pos',
				label: 'Point of Sale',
				path: '/pos',
				icon: 'shopping-cart',
				children: [],
				permissions: [],
				roles: ['admin', 'manager', 'cashier'],
				is_active: true,
				is_external: false,
				sort_order: 2
			}
		],
		permissions: [],
		roles: [],
		is_active: true,
		is_external: false,
		sort_order: 0
	};

	const adminMenu: NavigationMenu = {
		...baseMenu,
		children: [
			...baseMenu.children,
			{
				id: 'inventory',
				label: 'Inventory',
				path: '/inventory',
				icon: 'package',
				children: [],
				permissions: [],
				roles: ['admin', 'manager'],
				is_active: true,
				is_external: false,
				sort_order: 3
			},
			{
				id: 'reports',
				label: 'Reports',
				path: '/reports',
				icon: 'chart-bar',
				children: [],
				permissions: [],
				roles: ['admin', 'manager'],
				is_active: true,
				is_external: false,
				sort_order: 4
			},
			{
				id: 'settings',
				label: 'Settings',
				path: '/settings',
				icon: 'settings',
				children: [],
				permissions: [],
				roles: ['admin'],
				is_active: true,
				is_external: false,
				sort_order: 5
			}
		]
	};

	const managerMenu: NavigationMenu = {
		...baseMenu,
		children: [
			...baseMenu.children,
			{
				id: 'inventory',
				label: 'Inventory',
				path: '/inventory',
				icon: 'package',
				children: [],
				permissions: [],
				roles: ['admin', 'manager'],
				is_active: true,
				is_external: false,
				sort_order: 3
			},
			{
				id: 'reports',
				label: 'Reports',
				path: '/reports',
				icon: 'chart-bar',
				children: [],
				permissions: [],
				roles: ['admin', 'manager'],
				is_active: true,
				is_external: false,
				sort_order: 4
			}
		]
	};

	switch (role) {
		case 'admin':
			return adminMenu;
		case 'manager':
			return managerMenu;
		case 'cashier':
		default:
			return baseMenu;
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
		.select('id, name, is_system, is_active, is_public');

	if (configsError) throw configsError;

	const stats: ViewStats = {
		total_views: viewConfigs?.length || 0,
		active_views: viewConfigs?.filter((v) => v.is_active === true).length || 0,
		public_views: viewConfigs?.filter((v) => v.is_public === true).length || 0,
		protected_views: viewConfigs?.filter((v) => v.is_public !== true).length || 0,
		most_visited_views: [],
		user_engagement: {
			avg_session_duration: 0,
			avg_pages_per_session: 0,
			total_page_views: 0,
			unique_visitors: viewStates?.length || 0
		}
	};

	// Calculate most visited views based on available data
	const viewUsage: Record<string, { count: number; view_name: string }> = {};

	// Since we don't have current_view_id in viewStates, we'll use viewConfigs directly
	viewConfigs?.forEach((config) => {
		viewUsage[config.id] = {
			count: Math.floor(Math.random() * 100), // Placeholder - in real app this would come from analytics
			view_name: config.name
		};
	});

	// Convert to most_visited_views format
	stats.most_visited_views = Object.entries(viewUsage)
		.map(([view_id, data]) => ({
			view_id,
			view_name: data.view_name,
			visit_count: data.count
		}))
		.sort((a, b) => b.visit_count - a.visit_count)
		.slice(0, 5);

	return stats;
}
