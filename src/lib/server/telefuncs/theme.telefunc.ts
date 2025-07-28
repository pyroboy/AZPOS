import { getContext } from 'telefunc';
import { 
  themeCustomizationSchema,
  userThemePreferencesSchema,
  themeExportSchema,
  type ThemeConfig,
  type ThemeCustomization,
  type UserThemePreferences,
  type ThemeExport,
  type ThemeStats
} from '$lib/types/theme.schema';
import { createSupabaseClient } from '$lib/server/db';

// Default theme configuration
const defaultTheme: ThemeConfig = {
  id: 'default',
  name: 'Default Theme',
  description: 'Default AZPOS theme',
  version: '1.0.0',
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#10B981',
    neutral: '#F3F4F6',
    base_100: '#FFFFFF',
    base_200: '#F9FAFB',
    base_300: '#F3F4F6',
    info: '#3ABFF8',
    success: '#36D399',
    warning: '#FBBD23',
    error: '#F87272'
  },
  typography: {
    font_family_primary: 'Inter, sans-serif',
    font_family_secondary: 'Inter, sans-serif',
    font_size_xs: '0.75rem',
    font_size_sm: '0.875rem',
    font_size_base: '1rem',
    font_size_lg: '1.125rem',
    font_size_xl: '1.25rem',
    font_size_2xl: '1.5rem',
    font_size_3xl: '1.875rem',
    font_weight_normal: '400',
    font_weight_medium: '500',
    font_weight_semibold: '600',
    font_weight_bold: '700',
    line_height_tight: '1.25',
    line_height_normal: '1.5',
    line_height_relaxed: '1.75'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },
  border_radius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    none: '0 0 #0000'
  },
  is_default: true,
  is_system: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Telefunc to get current theme
export async function onGetCurrentTheme(): Promise<ThemeConfig> {
  const { user } = getContext();
  if (!user) return defaultTheme;

  const supabase = createSupabaseClient();

  // Get user's theme preferences
  const { data: preferences, error: prefError } = await supabase
    .from('user_theme_preferences')
    .select('theme_id')
    .eq('user_id', user.id)
    .single();

  if (prefError && prefError.code !== 'PGRST116') {
    console.error('Error fetching theme preferences:', prefError);
  }

  let themeId = preferences?.theme_id;

  // If no user preference, get system default
  if (!themeId) {
    const { data: systemTheme, error: systemError } = await supabase
      .from('themes')
      .select('id')
      .eq('is_default', true)
      .single();

    if (systemError) {
      return defaultTheme;
    }
    themeId = systemTheme.id;
  }

  // Get the theme configuration
  const { data: theme, error: themeError } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .single();

  if (themeError) {
    return defaultTheme;
  }

  return theme;
}

// Telefunc to get all themes
export async function onGetThemes(): Promise<ThemeConfig[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  const { data: themes, error } = await supabase
    .from('themes')
    .select('*')
    .order('name');

  if (error) throw error;

  return themes || [defaultTheme];
}

// Telefunc to create custom theme
export async function onCreateCustomTheme(customizationData: unknown): Promise<ThemeConfig> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = themeCustomizationSchema.parse(customizationData);
  const supabase = createSupabaseClient();

  const now = new Date().toISOString();
  const themeId = crypto.randomUUID();

  // Get base theme if specified
  let baseTheme = defaultTheme;
  if (validatedData.base_theme_id) {
    const { data: base, error: baseError } = await supabase
      .from('themes')
      .select('*')
      .eq('id', validatedData.base_theme_id)
      .single();

    if (!baseError && base) {
      baseTheme = base;
    }
  }

  // Merge customizations with base theme
  const customTheme: ThemeConfig = {
    id: themeId,
    name: validatedData.name,
    description: validatedData.description,
    version: '1.0.0',
    colors: { ...baseTheme.colors, ...validatedData.colors },
    typography: { ...baseTheme.typography, ...validatedData.typography },
    spacing: { ...baseTheme.spacing, ...validatedData.spacing },
    border_radius: { ...baseTheme.border_radius, ...validatedData.border_radius },
    shadows: { ...baseTheme.shadows, ...validatedData.shadows },
    is_default: false,
    is_system: false,
    created_by: user.id,
    created_at: now,
    updated_at: now
  };

  const { data: savedTheme, error } = await supabase
    .from('themes')
    .insert({
      id: customTheme.id,
      name: customTheme.name,
      description: customTheme.description,
      version: customTheme.version,
      colors: customTheme.colors,
      typography: customTheme.typography,
      spacing: customTheme.spacing,
      border_radius: customTheme.border_radius,
      shadows: customTheme.shadows,
      is_default: customTheme.is_default,
      is_system: customTheme.is_system,
      created_by: customTheme.created_by,
      created_at: customTheme.created_at,
      updated_at: customTheme.updated_at
    })
    .select()
    .single();

  if (error) throw error;

  return customTheme;
}

// Telefunc to update theme
export async function onUpdateTheme(themeId: string, customizationData: unknown): Promise<ThemeConfig> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = themeCustomizationSchema.parse(customizationData);
  const supabase = createSupabaseClient();

  // Check if user owns the theme or has admin rights
  const { data: existingTheme, error: fetchError } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .single();

  if (fetchError || !existingTheme) {
    throw new Error('Theme not found');
  }

  if (existingTheme.is_system) {
    throw new Error('Cannot modify system themes');
  }

  if (existingTheme.created_by !== user.id && user.role !== 'admin') {
    throw new Error('Not authorized to update this theme');
  }

  const now = new Date().toISOString();

  const updateData: any = {
    updated_at: now
  };

  if (validatedData.name) updateData.name = validatedData.name;
  if (validatedData.description) updateData.description = validatedData.description;
  if (validatedData.colors) updateData.colors = { ...existingTheme.colors, ...validatedData.colors };
  if (validatedData.typography) updateData.typography = { ...existingTheme.typography, ...validatedData.typography };
  if (validatedData.spacing) updateData.spacing = { ...existingTheme.spacing, ...validatedData.spacing };
  if (validatedData.border_radius) updateData.border_radius = { ...existingTheme.border_radius, ...validatedData.border_radius };
  if (validatedData.shadows) updateData.shadows = { ...existingTheme.shadows, ...validatedData.shadows };

  const { data: updatedTheme, error } = await supabase
    .from('themes')
    .update(updateData)
    .eq('id', themeId)
    .select()
    .single();

  if (error) throw error;

  return updatedTheme;
}

// Telefunc to delete theme
export async function onDeleteTheme(themeId: string): Promise<void> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  // Check if user owns the theme or has admin rights
  const { data: existingTheme, error: fetchError } = await supabase
    .from('themes')
    .select('created_by, is_system, is_default')
    .eq('id', themeId)
    .single();

  if (fetchError || !existingTheme) {
    throw new Error('Theme not found');
  }

  if (existingTheme.is_system || existingTheme.is_default) {
    throw new Error('Cannot delete system or default themes');
  }

  if (existingTheme.created_by !== user.id && user.role !== 'admin') {
    throw new Error('Not authorized to delete this theme');
  }

  // Remove theme from user preferences first
  await supabase
    .from('user_theme_preferences')
    .delete()
    .eq('theme_id', themeId);

  // Delete the theme
  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', themeId);

  if (error) throw error;
}

// Telefunc to get user theme preferences
export async function onGetUserThemePreferences(): Promise<UserThemePreferences | null> {
  const { user } = getContext();
  if (!user) return null;

  const supabase = createSupabaseClient();

  const { data: preferences, error } = await supabase
    .from('user_theme_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return preferences;
}

// Telefunc to update user theme preferences
export async function onUpdateUserThemePreferences(preferencesData: unknown): Promise<UserThemePreferences> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = userThemePreferencesSchema.parse(preferencesData);
  const supabase = createSupabaseClient();

  const now = new Date().toISOString();

  // Upsert user preferences
  const { data: preferences, error } = await supabase
    .from('user_theme_preferences')
    .upsert({
      user_id: user.id,
      theme_id: validatedData.theme_id,
      dark_mode: validatedData.dark_mode,
      high_contrast: validatedData.high_contrast,
      reduce_motion: validatedData.reduce_motion,
      font_size_scale: validatedData.font_size_scale,
      custom_css: validatedData.custom_css,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw error;

  return preferences;
}

// Telefunc to export theme
export async function onExportTheme(themeId: string): Promise<ThemeExport> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  const { data: theme, error } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .single();

  if (error || !theme) {
    throw new Error('Theme not found');
  }

  const themeExport: ThemeExport = {
    format_version: '1.0',
    exported_at: new Date().toISOString(),
    exported_by: user.id,
    theme: {
      name: theme.name,
      description: theme.description,
      version: theme.version,
      colors: theme.colors,
      typography: theme.typography,
      spacing: theme.spacing,
      border_radius: theme.border_radius,
      shadows: theme.shadows
    }
  };

  return themeExport;
}

// Telefunc to import theme
export async function onImportTheme(themeExportData: unknown): Promise<ThemeConfig> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = themeExportSchema.parse(themeExportData);
  const supabase = createSupabaseClient();

  const now = new Date().toISOString();
  const themeId = crypto.randomUUID();

  const importedTheme: ThemeConfig = {
    id: themeId,
    name: `${validatedData.theme.name} (Imported)`,
    description: validatedData.theme.description,
    version: validatedData.theme.version,
    colors: validatedData.theme.colors,
    typography: validatedData.theme.typography,
    spacing: validatedData.theme.spacing,
    border_radius: validatedData.theme.border_radius,
    shadows: validatedData.theme.shadows,
    is_default: false,
    is_system: false,
    created_by: user.id,
    created_at: now,
    updated_at: now
  };

  const { data: savedTheme, error } = await supabase
    .from('themes')
    .insert({
      id: importedTheme.id,
      name: importedTheme.name,
      description: importedTheme.description,
      version: importedTheme.version,
      colors: importedTheme.colors,
      typography: importedTheme.typography,
      spacing: importedTheme.spacing,
      border_radius: importedTheme.border_radius,
      shadows: importedTheme.shadows,
      is_default: importedTheme.is_default,
      is_system: importedTheme.is_system,
      created_by: importedTheme.created_by,
      created_at: importedTheme.created_at,
      updated_at: importedTheme.updated_at
    })
    .select()
    .single();

  if (error) throw error;

  return importedTheme;
}

// Telefunc to get theme statistics
export async function onGetThemeStats(): Promise<ThemeStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: themes, error: themesError } = await supabase
    .from('themes')
    .select('id, name, is_system, is_default, created_at');

  if (themesError) throw themesError;

  const { data: preferences, error: preferencesError } = await supabase
    .from('user_theme_preferences')
    .select('theme_id, dark_mode, high_contrast');

  if (preferencesError) throw preferencesError;

  const stats: ThemeStats = {
    total_themes: themes?.length || 0,
    system_themes: themes?.filter(t => t.is_system).length || 0,
    custom_themes: themes?.filter(t => !t.is_system).length || 0,
    users_with_preferences: preferences?.length || 0,
    dark_mode_users: preferences?.filter(p => p.dark_mode).length || 0,
    high_contrast_users: preferences?.filter(p => p.high_contrast).length || 0,
    theme_usage: {}
  };

  // Calculate theme usage
  const themeUsage: Record<string, { count: number; percentage: number; theme_name: string }> = {};
  
  themes?.forEach(theme => {
    const usageCount = preferences?.filter(p => p.theme_id === theme.id).length || 0;
    themeUsage[theme.id] = {
      count: usageCount,
      percentage: preferences?.length ? (usageCount / preferences.length) * 100 : 0,
      theme_name: theme.name
    };
  });

  stats.theme_usage = themeUsage;

  return stats;
}

// Telefunc to validate theme configuration
export async function onValidateTheme(themeData: unknown): Promise<{ is_valid: boolean; errors: string[] }> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  try {
    themeCustomizationSchema.parse(themeData);
    return { is_valid: true, errors: [] };
  } catch (error: any) {
    const errors = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || ['Invalid theme configuration'];
    return { is_valid: false, errors };
  }
}
