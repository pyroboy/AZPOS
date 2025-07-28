import { z } from 'zod';

// Schema for business settings
export const businessSettingsSchema = z.object({
  name: z.string().min(1),
  logo_url: z.string().url().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string()
  }),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  }),
  tax_settings: z.object({
    tax_id: z.string().optional(),
    default_tax_rate: z.number().min(0).max(1).default(0),
    tax_inclusive: z.boolean().default(false),
    tax_name: z.string().default('Tax')
  }),
  currency: z.object({
    code: z.string().length(3).default('USD'),
    symbol: z.string().default('$'),
    decimal_places: z.number().min(0).max(4).default(2),
    thousands_separator: z.string().default(','),
    decimal_separator: z.string().default('.')
  }),
  timezone: z.string().default('UTC'),
  language: z.string().default('en'),
  date_format: z.string().default('MM/DD/YYYY'),
  time_format: z.enum(['12', '24']).default('12')
});

// Schema for POS settings
export const posSettingsSchema = z.object({
  receipt: z.object({
    auto_print: z.boolean().default(true),
    ask_for_email: z.boolean().default(false),
    ask_for_phone: z.boolean().default(false),
    default_template_id: z.string().optional(),
    footer_message: z.string().optional()
  }),
  cash_drawer: z.object({
    auto_open: z.boolean().default(true),
    require_reason_for_open: z.boolean().default(false),
    starting_cash_amount: z.number().min(0).default(0)
  }),
  barcode: z.object({
    auto_focus_search: z.boolean().default(true),
    beep_on_scan: z.boolean().default(true),
    auto_add_to_cart: z.boolean().default(true)
  }),
  display: z.object({
    show_product_images: z.boolean().default(true),
    grid_columns: z.number().min(2).max(8).default(4),
    theme: z.enum(['light', 'dark', 'auto']).default('light'),
    font_size: z.enum(['small', 'medium', 'large']).default('medium')
  }),
  shortcuts: z.object({
    enable_keyboard_shortcuts: z.boolean().default(true),
    quick_payment_amounts: z.array(z.number()).default([5, 10, 20, 50, 100])
  })
});

// Schema for inventory settings
export const inventorySettingsSchema = z.object({
  tracking: z.object({
    track_inventory: z.boolean().default(true),
    allow_negative_stock: z.boolean().default(false),
    low_stock_threshold: z.number().min(0).default(10),
    auto_reorder: z.boolean().default(false),
    reorder_point: z.number().min(0).default(5),
    reorder_quantity: z.number().min(1).default(50)
  }),
  costing: z.object({
    cost_method: z.enum(['fifo', 'lifo', 'average', 'specific']).default('fifo'),
    include_shipping_in_cost: z.boolean().default(true),
    include_tax_in_cost: z.boolean().default(false)
  }),
  locations: z.object({
    multi_location: z.boolean().default(false),
    default_location_id: z.string().optional(),
    transfer_approval_required: z.boolean().default(true)
  }),
  alerts: z.object({
    low_stock_alerts: z.boolean().default(true),
    out_of_stock_alerts: z.boolean().default(true),
    expiry_alerts: z.boolean().default(true),
    expiry_warning_days: z.number().min(1).default(30)
  })
});

// Schema for customer settings
export const customerSettingsSchema = z.object({
  registration: z.object({
    require_registration: z.boolean().default(false),
    require_email_verification: z.boolean().default(false),
    allow_guest_checkout: z.boolean().default(true),
    collect_phone: z.boolean().default(false),
    collect_address: z.boolean().default(false)
  }),
  loyalty: z.object({
    enable_loyalty_program: z.boolean().default(false),
    points_per_dollar: z.number().min(0).default(1),
    points_redemption_value: z.number().min(0).default(0.01),
    minimum_points_redemption: z.number().min(0).default(100)
  }),
  privacy: z.object({
    data_retention_days: z.number().min(30).default(365),
    allow_marketing_emails: z.boolean().default(true),
    require_privacy_consent: z.boolean().default(true)
  })
});

// Schema for notification settings
export const notificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean().default(true),
    smtp_host: z.string().optional(),
    smtp_port: z.number().optional(),
    smtp_username: z.string().optional(),
    smtp_password: z.string().optional(),
    from_email: z.string().email().optional(),
    from_name: z.string().optional()
  }),
  sms: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['twilio', 'nexmo', 'aws_sns']).optional(),
    api_key: z.string().optional(),
    api_secret: z.string().optional(),
    from_number: z.string().optional()
  }),
  push: z.object({
    enabled: z.boolean().default(false),
    firebase_key: z.string().optional(),
    vapid_public_key: z.string().optional(),
    vapid_private_key: z.string().optional()
  }),
  alerts: z.object({
    low_stock: z.boolean().default(true),
    failed_payments: z.boolean().default(true),
    new_orders: z.boolean().default(true),
    system_errors: z.boolean().default(true)
  })
});

// Schema for security settings
export const securitySettingsSchema = z.object({
  authentication: z.object({
    require_two_factor: z.boolean().default(false),
    password_min_length: z.number().min(6).max(128).default(8),
    password_require_uppercase: z.boolean().default(true),
    password_require_lowercase: z.boolean().default(true),
    password_require_numbers: z.boolean().default(true),
    password_require_symbols: z.boolean().default(false),
    session_timeout_minutes: z.number().min(5).max(1440).default(60),
    max_login_attempts: z.number().min(3).max(10).default(5),
    lockout_duration_minutes: z.number().min(5).max(1440).default(15)
  }),
  access_control: z.object({
    ip_whitelist: z.array(z.string()).optional(),
    allowed_countries: z.array(z.string()).optional(),
    block_tor_access: z.boolean().default(false),
    require_https: z.boolean().default(true)
  }),
  audit: z.object({
    log_user_actions: z.boolean().default(true),
    log_data_changes: z.boolean().default(true),
    log_system_events: z.boolean().default(true),
    retention_days: z.number().min(30).max(2555).default(365)
  })
});

// Schema for integration settings
export const integrationSettingsSchema = z.object({
  accounting: z.object({
    provider: z.enum(['quickbooks', 'xero', 'sage', 'none']).default('none'),
    api_key: z.string().optional(),
    api_secret: z.string().optional(),
    sync_frequency: z.enum(['real_time', 'hourly', 'daily', 'manual']).default('daily'),
    auto_sync_enabled: z.boolean().default(false)
  }),
  ecommerce: z.object({
    provider: z.enum(['shopify', 'woocommerce', 'magento', 'none']).default('none'),
    store_url: z.string().url().optional(),
    api_key: z.string().optional(),
    sync_inventory: z.boolean().default(false),
    sync_orders: z.boolean().default(false)
  }),
  analytics: z.object({
    google_analytics_id: z.string().optional(),
    facebook_pixel_id: z.string().optional(),
    enable_tracking: z.boolean().default(false)
  })
});

// Schema for complete settings
export const settingsSchema = z.object({
  business: businessSettingsSchema,
  pos: posSettingsSchema,
  inventory: inventorySettingsSchema,
  customer: customerSettingsSchema,
  notifications: notificationSettingsSchema,
  security: securitySettingsSchema,
  integrations: integrationSettingsSchema,
  updated_at: z.string().datetime(),
  updated_by: z.string()
});

// Schema for settings update
export const settingsUpdateSchema = z.object({
  business: businessSettingsSchema.partial().optional(),
  pos: posSettingsSchema.partial().optional(),
  inventory: inventorySettingsSchema.partial().optional(),
  customer: customerSettingsSchema.partial().optional(),
  notifications: notificationSettingsSchema.partial().optional(),
  security: securitySettingsSchema.partial().optional(),
  integrations: integrationSettingsSchema.partial().optional()
});

// Schema for settings backup
export const settingsBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  settings: settingsSchema,
  created_at: z.string().datetime(),
  created_by: z.string()
});

// Export inferred types
export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
export type PosSettings = z.infer<typeof posSettingsSchema>;
export type InventorySettings = z.infer<typeof inventorySettingsSchema>;
export type CustomerSettings = z.infer<typeof customerSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;
export type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type SettingsBackup = z.infer<typeof settingsBackupSchema>;
