import { z } from 'zod';

// Schema for session state
export const sessionStateSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(), // null for guest sessions
  session_type: z.enum(['user', 'guest', 'admin', 'pos']),
  status: z.enum(['active', 'inactive', 'expired', 'terminated']),
  device_info: z.object({
    device_id: z.string().optional(),
    device_type: z.enum(['desktop', 'mobile', 'tablet', 'pos_terminal']).optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional()
  }).optional(),
  location_info: z.object({
    store_id: z.string().optional(),
    terminal_id: z.string().optional(),
    register_id: z.string().optional()
  }).optional(),
  created_at: z.string().datetime(),
  last_activity: z.string().datetime(),
  expires_at: z.string().datetime(),
  terminated_at: z.string().datetime().optional()
});

// Schema for session data/context
export const sessionDataSchema = z.object({
  cart: z.object({
    items: z.array(z.any()).default([]),
    totals: z.object({
      subtotal: z.number().default(0),
      tax: z.number().default(0),
      discount: z.number().default(0),
      total: z.number().default(0)
    }).optional(),
    customer_id: z.string().optional(),
    discount_codes: z.array(z.string()).default([])
  }).optional(),
  preferences: z.object({
    language: z.string().default('en'),
    currency: z.string().default('USD'),
    timezone: z.string().default('UTC'),
    theme: z.enum(['light', 'dark', 'auto']).default('light')
  }).optional(),
  navigation: z.object({
    current_page: z.string().optional(),
    previous_page: z.string().optional(),
    breadcrumbs: z.array(z.string()).default([])
  }).optional(),
  ui_state: z.object({
    sidebar_collapsed: z.boolean().default(false),
    active_tab: z.string().optional(),
    modal_stack: z.array(z.string()).default([]),
    notifications: z.array(z.object({
      id: z.string(),
      type: z.enum(['info', 'success', 'warning', 'error']),
      message: z.string(),
      timestamp: z.string().datetime()
    })).default([])
  }).optional(),
  temp_data: z.record(z.any()).optional() // Temporary data storage
});

// Schema for session creation
export const createSessionSchema = z.object({
  user_id: z.string().optional(),
  session_type: z.enum(['user', 'guest', 'admin', 'pos']),
  device_info: z.object({
    device_id: z.string().optional(),
    device_type: z.enum(['desktop', 'mobile', 'tablet', 'pos_terminal']).optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional()
  }).optional(),
  location_info: z.object({
    store_id: z.string().optional(),
    terminal_id: z.string().optional(),
    register_id: z.string().optional()
  }).optional(),
  expires_in_minutes: z.number().min(5).max(1440).default(60)
});

// Schema for session update
export const updateSessionSchema = z.object({
  session_data: sessionDataSchema.optional(),
  extend_expiry: z.boolean().optional(),
  new_expiry_minutes: z.number().min(5).max(1440).optional()
});

// Schema for session filters
export const sessionFiltersSchema = z.object({
  user_id: z.string().optional(),
  session_type: z.enum(['user', 'guest', 'admin', 'pos']).optional(),
  status: z.enum(['active', 'inactive', 'expired', 'terminated']).optional(),
  device_type: z.enum(['desktop', 'mobile', 'tablet', 'pos_terminal']).optional(),
  store_id: z.string().optional(),
  terminal_id: z.string().optional(),
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),
  last_activity_from: z.string().datetime().optional(),
  last_activity_to: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'last_activity', 'expires_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Schema for session statistics
export const sessionStatsSchema = z.object({
  total_sessions: z.number(),
  active_sessions: z.number(),
  expired_sessions: z.number(),
  terminated_sessions: z.number(),
  user_sessions: z.number(),
  guest_sessions: z.number(),
  admin_sessions: z.number(),
  pos_sessions: z.number(),
  avg_session_duration: z.number(), // in minutes
  sessions_today: z.number(),
  sessions_this_week: z.number(),
  sessions_this_month: z.number(),
  device_breakdown: z.record(z.string(), z.object({
    count: z.number(),
    percentage: z.number()
  })),
  hourly_activity: z.array(z.object({
    hour: z.number(),
    session_count: z.number(),
    active_count: z.number()
  })).optional(),
  top_locations: z.array(z.object({
    store_id: z.string(),
    store_name: z.string().optional(),
    session_count: z.number()
  })).optional()
});

// Schema for paginated sessions
export const paginatedSessionsSchema = z.object({
  sessions: z.array(sessionStateSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_more: z.boolean()
  }),
  stats: sessionStatsSchema.optional()
});

// Schema for session activity log
export const sessionActivitySchema = z.object({
  id: z.string(),
  session_id: z.string(),
  action: z.enum(['created', 'updated', 'extended', 'terminated', 'expired', 'data_updated']),
  details: z.record(z.any()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  timestamp: z.string().datetime()
});

// Schema for session cleanup configuration
export const sessionCleanupConfigSchema = z.object({
  auto_cleanup_enabled: z.boolean().default(true),
  cleanup_interval_hours: z.number().min(1).max(168).default(24), // 1 hour to 1 week
  expired_session_retention_days: z.number().min(1).max(365).default(30),
  guest_session_timeout_minutes: z.number().min(5).max(1440).default(60),
  user_session_timeout_minutes: z.number().min(15).max(1440).default(480), // 8 hours
  admin_session_timeout_minutes: z.number().min(15).max(1440).default(240), // 4 hours
  pos_session_timeout_minutes: z.number().min(30).max(1440).default(720) // 12 hours
});

// Export inferred types
export type SessionState = z.infer<typeof sessionStateSchema>;
export type SessionData = z.infer<typeof sessionDataSchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
export type UpdateSession = z.infer<typeof updateSessionSchema>;
export type SessionFilters = z.infer<typeof sessionFiltersSchema>;
export type SessionStats = z.infer<typeof sessionStatsSchema>;
export type PaginatedSessions = z.infer<typeof paginatedSessionsSchema>;
export type SessionActivity = z.infer<typeof sessionActivitySchema>;
export type SessionCleanupConfig = z.infer<typeof sessionCleanupConfigSchema>;
