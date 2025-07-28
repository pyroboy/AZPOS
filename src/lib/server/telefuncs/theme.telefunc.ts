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
	type: 'light' as const,
	colors: {
		primary: '#3B82F6',
		secondary: '#6B7280',
		accent: '#10B981',
		background: '#FFFFFF',
		surface: '#F9FAFB',
		text: '#111827',
		text_secondary: '#6B7280',
		border: '#E5E7EB',
		success: '#10B981',
		warning: '#F59E0B',
		error: '#EF4444',
		info: '#3B82F6'
	},
	typography: {
		font_family: 'Inter, system-ui, sans-serif',
		font_size_base: 16,
		font_size_scale: 1.25,
		line_height: 1.5,
		letter_spacing: 0,
		font_weights: {
			light: 300,
			normal: 400,
			medium: 500,
			semibold: 600,
			bold: 700
		}
	},
	spacing: {
		base_unit: 4,
		scale: [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]
	},
	border_radius: {
		none: 0,
		sm: 2,
		md: 6,
		lg: 8,
		xl: 12,
		full: 9999
	},
	shadows: {
		none: 'none',
		sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
		md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
		lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
		xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
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
		.select('active_theme_id')
		.eq('user_id', user.id)
		.single();

	if (prefError && prefError.code !== 'PGRST116') {
		console.error('Error fetching theme preferences:', prefError);
	}

	let themeId = preferences?.active_theme_id;

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

	const { data: themes, error } = await supabase.from('themes').select('*').order('name');

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
		type: 'light' as const,
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
			type: customTheme.type,
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
export async function onUpdateTheme(
	themeId: string,
	customizationData: unknown
): Promise<ThemeConfig> {
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
	if (validatedData.colors)
		updateData.colors = { ...existingTheme.colors, ...validatedData.colors };
	if (validatedData.typography)
		updateData.typography = { ...existingTheme.typography, ...validatedData.typography };
	if (validatedData.spacing)
		updateData.spacing = { ...existingTheme.spacing, ...validatedData.spacing };
	if (validatedData.border_radius)
		updateData.border_radius = { ...existingTheme.border_radius, ...validatedData.border_radius };
	if (validatedData.shadows)
		updateData.shadows = { ...existingTheme.shadows, ...validatedData.shadows };

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
	await supabase.from('user_theme_preferences').delete().eq('active_theme_id', themeId);

	// Delete the theme
	const { error } = await supabase.from('themes').delete().eq('id', themeId);

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
export async function onUpdateUserThemePreferences(
	preferencesData: unknown
): Promise<UserThemePreferences> {
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
			active_theme_id: validatedData.active_theme_id,
			auto_switch_enabled: validatedData.auto_switch_enabled || false,
			light_theme_id: validatedData.light_theme_id,
			dark_theme_id: validatedData.dark_theme_id,
			switch_time_light: validatedData.switch_time_light || '06:00',
			switch_time_dark: validatedData.switch_time_dark || '18:00',
			custom_overrides: validatedData.custom_overrides,
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
			type: theme.type,
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
		type: validatedData.theme.type,
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
			type: importedTheme.type,
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
		.select('active_theme_id, auto_switch_enabled');

	if (preferencesError) throw preferencesError;

	// Calculate theme usage
	const activeUsersByTheme: Record<
		string,
		{ theme_id: string; theme_name: string; user_count: number; percentage: number }
	> = {};

	themes?.forEach((theme) => {
		const usageCount = preferences?.filter((p) => p.active_theme_id === theme.id).length || 0;
		activeUsersByTheme[theme.id] = {
			theme_id: theme.id,
			theme_name: theme.name,
			user_count: usageCount,
			percentage: preferences?.length ? (usageCount / preferences.length) * 100 : 0
		};
	});

	const stats: ThemeStats = {
		total_themes: themes?.length || 0,
		system_themes: themes?.filter((t) => t.is_system).length || 0,
		custom_themes: themes?.filter((t) => !t.is_system).length || 0,
		active_users_by_theme: activeUsersByTheme,
		theme_type_breakdown: {
			light: themes?.filter((t) => t.type === 'light').length || 0,
			dark: themes?.filter((t) => t.type === 'dark').length || 0,
			auto: themes?.filter((t) => t.type === 'auto').length || 0
		}
	};

	return stats;
}

// Telefunc to validate theme configuration
export async function onValidateTheme(
	themeData: unknown
): Promise<{ is_valid: boolean; errors: string[] }> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	try {
		themeCustomizationSchema.parse(themeData);
		return { is_valid: true, errors: [] };
	} catch (error: any) {
		const errors = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [
			'Invalid theme configuration'
		];
		return { is_valid: false, errors };
	}
}
