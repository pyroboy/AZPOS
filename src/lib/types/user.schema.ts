import { z } from 'zod';

// Schema for user profile
export const userProfileSchema = z.object({
  avatar_url: z.string().url().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string()
  }).optional(),
  date_of_birth: z.string().datetime().optional(),
  preferences: z.object({
    language: z.string().default('en'),
    timezone: z.string().default('UTC'),
    currency: z.string().default('USD'),
    notifications: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      push: z.boolean().default(true)
    }).optional()
  }).optional()
});

// Schema for creating/updating user
export const userInputSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'manager', 'cashier', 'customer']),
  is_active: z.boolean().default(true),
  permissions: z.array(z.string()).optional(), // Custom permissions beyond role
  profile: userProfileSchema.optional(),
  password: z.string().min(8).optional() // Only for creation or password updates
});

// Full user schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  role: z.enum(['admin', 'manager', 'cashier', 'customer']),
  is_active: z.boolean(),
  is_verified: z.boolean().default(false),
  permissions: z.array(z.string()),
  profile: userProfileSchema.optional(),
  last_login_at: z.string().datetime().optional(),
  login_count: z.number().min(0).default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().optional(),
  updated_by: z.string().optional()
});

// Schema for user authentication
export const userAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Schema for password change
export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8)
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

// Schema for password reset
export const resetPasswordSchema = z.object({
  email: z.string().email()
});

// Schema for user filters
export const userFiltersSchema = z.object({
  search: z.string().optional(), // Search by name, email
  role: z.enum(['all', 'admin', 'manager', 'cashier', 'customer']).optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),
  last_login_from: z.string().datetime().optional(),
  last_login_to: z.string().datetime().optional(),
  sort_by: z.enum(['full_name', 'email', 'role', 'created_at', 'last_login_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Schema for user activity log
export const userActivitySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  action: z.string(), // 'login', 'logout', 'create_product', 'process_transaction', etc.
  resource_type: z.string().optional(), // 'product', 'transaction', 'user', etc.
  resource_id: z.string().optional(),
  details: z.record(z.any()).optional(), // Additional context
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.string().datetime()
});

// Schema for user statistics
export const userStatsSchema = z.object({
  total_users: z.number(),
  active_users: z.number(),
  inactive_users: z.number(),
  verified_users: z.number(),
  role_breakdown: z.object({
    admin: z.number(),
    manager: z.number(),
    cashier: z.number(),
    customer: z.number()
  }),
  recent_signups: z.number(), // Last 30 days
  recent_logins: z.number(), // Last 24 hours
  avg_login_frequency: z.number(), // Logins per user per month
  top_active_users: z.array(z.object({
    id: z.string(),
    full_name: z.string(),
    email: z.string(),
    login_count: z.number(),
    last_login_at: z.string().datetime().optional()
  })).optional()
});

// Schema for user session
export const userSessionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  token: z.string(),
  expires_at: z.string().datetime(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime()
});

// Schema for paginated users
export const paginatedUsersSchema = z.object({
  users: z.array(userSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_more: z.boolean()
  }),
  stats: userStatsSchema.optional()
});

// Schema for bulk user operations
export const bulkUserUpdateSchema = z.object({
  user_ids: z.array(z.string()).min(1),
  updates: z.object({
    role: z.enum(['admin', 'manager', 'cashier', 'customer']).optional(),
    is_active: z.boolean().optional(),
    permissions: z.array(z.string()).optional()
  })
});

// Schema for user invitation
export const userInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'cashier', 'customer']),
  full_name: z.string().min(1),
  message: z.string().optional()
});

// Export inferred types
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
export type User = z.infer<typeof userSchema>;
export type UserAuth = z.infer<typeof userAuthSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type UserFilters = z.infer<typeof userFiltersSchema>;
export type UserActivity = z.infer<typeof userActivitySchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type UserSession = z.infer<typeof userSessionSchema>;
export type PaginatedUsers = z.infer<typeof paginatedUsersSchema>;
export type BulkUserUpdate = z.infer<typeof bulkUserUpdateSchema>;
export type UserInvitation = z.infer<typeof userInvitationSchema>;
