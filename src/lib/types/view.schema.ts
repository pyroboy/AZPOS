import { z } from 'zod';

// Schema for view state
export const viewStateSchema = z.object({
  current_view: z.string(),
  previous_view: z.string().optional(),
  view_history: z.array(z.string()).default([]),
  breadcrumbs: z.array(z.object({
    label: z.string(),
    path: z.string(),
    icon: z.string().optional()
  })).default([]),
  sidebar: z.object({
    is_open: z.boolean().default(true),
    is_collapsed: z.boolean().default(false),
    active_section: z.string().optional(),
    pinned_items: z.array(z.string()).default([])
  }),
  modals: z.object({
    active_modals: z.array(z.string()).default([]),
    modal_data: z.record(z.any()).default({})
  }),
  notifications: z.object({
    show_notifications: z.boolean().default(true),
    notification_position: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left']).default('top-right'),
    auto_dismiss: z.boolean().default(true),
    dismiss_timeout: z.number().default(5000)
  }),
  layout: z.object({
    density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
    grid_columns: z.number().min(1).max(12).default(4),
    list_page_size: z.number().min(10).max(100).default(20),
    show_grid_lines: z.boolean().default(true),
    show_row_numbers: z.boolean().default(false)
  }),
  filters: z.object({
    show_filters: z.boolean().default(false),
    active_filters: z.record(z.any()).default({}),
    saved_filters: z.array(z.object({
      id: z.string(),
      name: z.string(),
      filters: z.record(z.any())
    })).default([])
  }),
  sorting: z.object({
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
    multi_sort: z.array(z.object({
      field: z.string(),
      order: z.enum(['asc', 'desc'])
    })).default([])
  }),
  search: z.object({
    query: z.string().default(''),
    search_history: z.array(z.string()).default([]),
    search_suggestions: z.array(z.string()).default([]),
    advanced_search: z.boolean().default(false)
  })
});

// Schema for user view preferences
export const userViewPreferencesSchema = z.object({
  user_id: z.string(),
  view_states: z.record(viewStateSchema.partial()),
  global_preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('light'),
    language: z.string().default('en'),
    timezone: z.string().default('UTC'),
    date_format: z.string().default('MM/DD/YYYY'),
    time_format: z.enum(['12', '24']).default('12'),
    currency: z.string().default('USD'),
    number_format: z.enum(['US', 'EU', 'IN']).default('US')
  }),
  accessibility: z.object({
    high_contrast: z.boolean().default(false),
    large_text: z.boolean().default(false),
    reduced_motion: z.boolean().default(false),
    screen_reader: z.boolean().default(false),
    keyboard_navigation: z.boolean().default(false)
  }),
  updated_at: z.string().datetime()
});

// Schema for view configuration
export const viewConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  component: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  roles: z.array(z.string()).default([]),
  is_public: z.boolean().default(false),
  is_active: z.boolean().default(true),
  parent_view: z.string().optional(),
  sort_order: z.number().default(0),
  metadata: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    category: z.string().optional(),
    tags: z.array(z.string()).default([])
  }).optional(),
  layout_config: z.object({
    sidebar_enabled: z.boolean().default(true),
    header_enabled: z.boolean().default(true),
    footer_enabled: z.boolean().default(true),
    breadcrumbs_enabled: z.boolean().default(true),
    search_enabled: z.boolean().default(true),
    filters_enabled: z.boolean().default(true)
  }).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Schema for navigation menu
const navigationMenuSchemaBase = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string().optional(),
  icon: z.string().optional(),
  badge: z.object({
    text: z.string(),
    color: z.string(),
    variant: z.enum(['default', 'success', 'warning', 'error'])
  }).optional(),
  permissions: z.array(z.string()).default([]),
  roles: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  is_external: z.boolean().default(false),
  sort_order: z.number().default(0),
  metadata: z.record(z.any()).optional()
});

type NavigationMenuType = z.infer<typeof navigationMenuSchemaBase> & {
  children: NavigationMenuType[];
};

export const navigationMenuSchema: z.ZodType<NavigationMenuType> = navigationMenuSchemaBase.extend({
  children: z.array(z.lazy(() => navigationMenuSchema)).default([])
});

// Schema for view analytics
export const viewAnalyticsSchema = z.object({
  view_id: z.string(),
  view_name: z.string(),
  total_visits: z.number(),
  unique_visitors: z.number(),
  avg_time_spent: z.number(), // in seconds
  bounce_rate: z.number(), // percentage
  most_common_actions: z.array(z.object({
    action: z.string(),
    count: z.number(),
    percentage: z.number()
  })),
  popular_filters: z.array(z.object({
    filter: z.string(),
    usage_count: z.number()
  })),
  search_queries: z.array(z.object({
    query: z.string(),
    count: z.number(),
    results_found: z.number()
  })),
  device_breakdown: z.record(z.string(), z.object({
    count: z.number(),
    percentage: z.number()
  })),
  hourly_traffic: z.array(z.object({
    hour: z.number(),
    visits: z.number()
  })).optional()
});

// Schema for view filters
export const viewFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  is_public: z.boolean().optional(),
  has_permissions: z.boolean().optional(),
  parent_view: z.string().optional(),
  sort_by: z.enum(['name', 'path', 'sort_order', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

// Schema for view statistics
export const viewStatsSchema = z.object({
  total_views: z.number(),
  active_views: z.number(),
  public_views: z.number(),
  protected_views: z.number(),
  most_visited_views: z.array(z.object({
    view_id: z.string(),
    view_name: z.string(),
    visit_count: z.number()
  })),
  user_engagement: z.object({
    avg_session_duration: z.number(),
    avg_pages_per_session: z.number(),
    total_page_views: z.number(),
    unique_visitors: z.number()
  }),
  performance_metrics: z.object({
    avg_load_time: z.number(),
    slowest_views: z.array(z.object({
      view_id: z.string(),
      view_name: z.string(),
      avg_load_time: z.number()
    }))
  }).optional()
});

// Export inferred types
export type ViewState = z.infer<typeof viewStateSchema>;
export type UserViewPreferences = z.infer<typeof userViewPreferencesSchema>;
export type ViewConfig = z.infer<typeof viewConfigSchema>;
export type NavigationMenu = z.infer<typeof navigationMenuSchemaBase> & {
  children: NavigationMenu[];
};
export type ViewAnalytics = z.infer<typeof viewAnalyticsSchema>;
export type ViewFilters = z.infer<typeof viewFiltersSchema>;
export type ViewStats = z.infer<typeof viewStatsSchema>;
