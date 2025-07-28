import { getContext } from 'telefunc';
import { 
  settingsUpdateSchema,
  type Settings,
  type SettingsBackup
} from '$lib/types/settings.schema';
import { z } from 'zod';
import { createSupabaseClient } from '$lib/server/db';

// Default settings configuration
const DEFAULT_SETTINGS: Omit<Settings, 'updated_at' | 'updated_by'> = {
  business: {
    name: 'AZPOS Store',
    address: {
      street: '123 Main Street',
      city: 'Anytown',
      state: 'State',
      postal_code: '12345',
      country: 'United States'
    },
    contact: {
      phone: '(555) 123-4567',
      email: 'info@azpos.com',
      website: 'https://azpos.com'
    },
    tax_settings: {
      default_tax_rate: 0.08,
      tax_inclusive: false,
      tax_name: 'Sales Tax'
    },
    currency: {
      code: 'USD',
      symbol: '$',
      decimal_places: 2,
      thousands_separator: ',',
      decimal_separator: '.'
    },
    timezone: 'America/New_York',
    language: 'en',
    date_format: 'MM/DD/YYYY',
    time_format: '12'
  },
  pos: {
    receipt: {
      auto_print: true,
      ask_for_email: false,
      ask_for_phone: false,
      footer_message: 'Thank you for your business!'
    },
    cash_drawer: {
      auto_open: true,
      require_reason_for_open: false,
      starting_cash_amount: 100
    },
    barcode: {
      auto_focus_search: true,
      beep_on_scan: true,
      auto_add_to_cart: true
    },
    display: {
      show_product_images: true,
      grid_columns: 4,
      theme: 'light',
      font_size: 'medium'
    },
    shortcuts: {
      enable_keyboard_shortcuts: true,
      quick_payment_amounts: [5, 10, 20, 50, 100]
    }
  },
  inventory: {
    tracking: {
      track_inventory: true,
      allow_negative_stock: false,
      low_stock_threshold: 10,
      auto_reorder: false,
      reorder_point: 5,
      reorder_quantity: 50
    },
    costing: {
      cost_method: 'fifo',
      include_shipping_in_cost: true,
      include_tax_in_cost: false
    },
    locations: {
      multi_location: false,
      transfer_approval_required: true
    },
    alerts: {
      low_stock_alerts: true,
      out_of_stock_alerts: true,
      expiry_alerts: true,
      expiry_warning_days: 30
    }
  },
  customer: {
    registration: {
      require_registration: false,
      require_email_verification: false,
      allow_guest_checkout: true,
      collect_phone: false,
      collect_address: false
    },
    loyalty: {
      enable_loyalty_program: false,
      points_per_dollar: 1,
      points_redemption_value: 0.01,
      minimum_points_redemption: 100
    },
    privacy: {
      data_retention_days: 365,
      allow_marketing_emails: true,
      require_privacy_consent: true
    }
  },
  notifications: {
    email: {
      enabled: false
    },
    sms: {
      enabled: false
    },
    push: {
      enabled: false
    },
    alerts: {
      low_stock: true,
      failed_payments: true,
      new_orders: true,
      system_errors: true
    }
  },
  security: {
    authentication: {
      require_two_factor: false,
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_symbols: false,
      session_timeout_minutes: 60,
      max_login_attempts: 5,
      lockout_duration_minutes: 15
    },
    access_control: {
      block_tor_access: false,
      require_https: true
    },
    audit: {
      log_user_actions: true,
      log_data_changes: true,
      log_system_events: true,
      retention_days: 365
    }
  },
  integrations: {
    accounting: {
      provider: 'none',
      sync_frequency: 'daily',
      auto_sync_enabled: false
    },
    ecommerce: {
      provider: 'none',
      sync_inventory: false,
      sync_orders: false
    },
    analytics: {
      enable_tracking: false
    }
  }
};

// Telefunc to get current settings
export async function onGetSettings(): Promise<Settings> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  const { data: settings, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }

  // Return default settings if none exist
  if (!settings) {
    return {
      ...DEFAULT_SETTINGS,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
  }

  return {
    business: settings.business || DEFAULT_SETTINGS.business,
    pos: settings.pos || DEFAULT_SETTINGS.pos,
    inventory: settings.inventory || DEFAULT_SETTINGS.inventory,
    customer: settings.customer || DEFAULT_SETTINGS.customer,
    notifications: settings.notifications || DEFAULT_SETTINGS.notifications,
    security: settings.security || DEFAULT_SETTINGS.security,
    integrations: settings.integrations || DEFAULT_SETTINGS.integrations,
    updated_at: settings.updated_at,
    updated_by: settings.updated_by
  };
}

// Telefunc to update settings
export async function onUpdateSettings(settingsData: unknown): Promise<Settings> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = settingsUpdateSchema.parse(settingsData);
  const supabase = createSupabaseClient();

  // Get current settings
  const currentSettings = await onGetSettings();

  // Merge updates with current settings
  const updatedSettings: Settings = {
    business: { ...currentSettings.business, ...validatedData.business },
    pos: { ...currentSettings.pos, ...validatedData.pos },
    inventory: { ...currentSettings.inventory, ...validatedData.inventory },
    customer: { ...currentSettings.customer, ...validatedData.customer },
    notifications: { ...currentSettings.notifications, ...validatedData.notifications },
    security: { ...currentSettings.security, ...validatedData.security },
    integrations: { ...currentSettings.integrations, ...validatedData.integrations },
    updated_at: new Date().toISOString(),
    updated_by: user.id
  };

  // Validate critical settings
  if (updatedSettings.security.authentication.password_min_length < 6) {
    throw new Error('Password minimum length cannot be less than 6 characters');
  }

  if (updatedSettings.security.authentication.session_timeout_minutes < 5) {
    throw new Error('Session timeout cannot be less than 5 minutes');
  }

  // Save settings
  const { error } = await supabase
    .from('settings')
    .upsert({
      id: 1, // Single row for global settings
      business: updatedSettings.business,
      pos: updatedSettings.pos,
      inventory: updatedSettings.inventory,
      customer: updatedSettings.customer,
      notifications: updatedSettings.notifications,
      security: updatedSettings.security,
      integrations: updatedSettings.integrations,
      updated_at: updatedSettings.updated_at,
      updated_by: updatedSettings.updated_by
    })
    .select()
    .single();

  if (error) throw error;

  // Log settings change
  await supabase
    .from('settings_history')
    .insert({
      settings_data: updatedSettings,
      changed_by: user.id,
      changed_at: updatedSettings.updated_at,
      changes: validatedData
    });

  return updatedSettings;
}

// Telefunc to reset settings to defaults
export async function onResetSettings(): Promise<Settings> {
  const { user } = getContext();
  if (!user || user.role !== 'admin') {
    throw new Error('Not authorized - admin access required');
  }

  const supabase = createSupabaseClient();

  const defaultSettings: Settings = {
    ...DEFAULT_SETTINGS,
    updated_at: new Date().toISOString(),
    updated_by: user.id
  };

  const { error } = await supabase
    .from('settings')
    .upsert({
      id: 1,
      ...defaultSettings
    })
    .select()
    .single();

  if (error) throw error;

  // Log settings reset
  await supabase
    .from('settings_history')
    .insert({
      settings_data: defaultSettings,
      changed_by: user.id,
      changed_at: defaultSettings.updated_at,
      changes: { action: 'reset_to_defaults' }
    });

  return defaultSettings;
}

// Telefunc to create settings backup
export async function onCreateSettingsBackup(name: string, description?: string): Promise<SettingsBackup> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  // Get current settings
  const currentSettings = await onGetSettings();

  const backup: SettingsBackup = {
    id: crypto.randomUUID(),
    name,
    description,
    settings: currentSettings,
    created_at: new Date().toISOString(),
    created_by: user.id
  };

  const { error } = await supabase
    .from('settings_backups')
    .insert(backup)
    .select()
    .single();

  if (error) throw error;

  return backup;
}

// Telefunc to restore settings from backup
export async function onRestoreSettingsBackup(backupId: string): Promise<Settings> {
  const { user } = getContext();
  if (!user || user.role !== 'admin') {
    throw new Error('Not authorized - admin access required');
  }

  const supabase = createSupabaseClient();

  // Get backup
  const { data: backup, error: backupError } = await supabase
    .from('settings_backups')
    .select('*')
    .eq('id', backupId)
    .single();

  if (backupError || !backup) {
    throw new Error('Backup not found');
  }

  // Restore settings
  const restoredSettings: Settings = {
    ...backup.settings,
    updated_at: new Date().toISOString(),
    updated_by: user.id
  };

  const { error } = await supabase
    .from('settings')
    .upsert({
      id: 1,
      ...restoredSettings
    })
    .select()
    .single();

  if (error) throw error;

  // Log settings restore
  await supabase
    .from('settings_history')
    .insert({
      settings_data: restoredSettings,
      changed_by: user.id,
      changed_at: restoredSettings.updated_at,
      changes: { action: 'restore_from_backup', backup_id: backupId }
    });

  return restoredSettings;
}

// Telefunc to get settings backups
export async function onGetSettingsBackups(): Promise<SettingsBackup[]> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: backups, error } = await supabase
    .from('settings_backups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return backups || [];
}

// Telefunc to delete settings backup
export async function onDeleteSettingsBackup(backupId: string): Promise<{ success: boolean }> {
  const { user } = getContext();
  if (!user || user.role !== 'admin') {
    throw new Error('Not authorized - admin access required');
  }

  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('settings_backups')
    .delete()
    .eq('id', backupId);

  if (error) throw error;

  return { success: true };
}

// Telefunc to validate settings
export async function onValidateSettings(settingsData: unknown): Promise<{ isValid: boolean; errors: string[] }> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  try {
    settingsUpdateSchema.parse(settingsData);
    return { isValid: true, errors: [] };
  } catch (error) {
    const zodError = error as z.ZodError;
    const errors = zodError.errors?.map((err) => `${err.path.join('.')}: ${err.message}`) || ['Invalid settings data'];
    return { isValid: false, errors };
  }
}
