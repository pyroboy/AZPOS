import { z } from 'zod';

// Schema for color palette
export const colorPaletteSchema = z.object({
	primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	text_secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	border: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	success: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	warning: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	error: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	info: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
});

// Schema for typography settings
export const typographySchema = z.object({
	font_family: z.string().default('Inter, system-ui, sans-serif'),
	font_size_base: z.number().min(12).max(20).default(16),
	font_size_scale: z.number().min(1.1).max(1.5).default(1.25),
	line_height: z.number().min(1.2).max(2.0).default(1.5),
	letter_spacing: z.number().min(-0.05).max(0.1).default(0),
	font_weights: z.object({
		light: z.number().default(300),
		normal: z.number().default(400),
		medium: z.number().default(500),
		semibold: z.number().default(600),
		bold: z.number().default(700)
	})
});

// Schema for spacing system
export const spacingSchema = z.object({
	base_unit: z.number().min(2).max(16).default(4), // Base spacing unit in px
	scale: z.array(z.number()).default([0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64])
});

// Schema for border radius
export const borderRadiusSchema = z.object({
	none: z.number().default(0),
	sm: z.number().default(2),
	md: z.number().default(4),
	lg: z.number().default(8),
	xl: z.number().default(12),
	full: z.number().default(9999)
});

// Schema for shadows
export const shadowSchema = z.object({
	none: z.string().default('none'),
	sm: z.string().default('0 1px 2px 0 rgba(0, 0, 0, 0.05)'),
	md: z.string().default('0 4px 6px -1px rgba(0, 0, 0, 0.1)'),
	lg: z.string().default('0 10px 15px -3px rgba(0, 0, 0, 0.1)'),
	xl: z.string().default('0 20px 25px -5px rgba(0, 0, 0, 0.1)')
});

// Schema for theme configuration
export const themeConfigSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	description: z.string().optional(),
	type: z.enum(['light', 'dark', 'auto']),
	is_default: z.boolean().default(false),
	is_system: z.boolean().default(false), // System themes cannot be deleted
	colors: colorPaletteSchema,
	typography: typographySchema,
	spacing: spacingSchema,
	border_radius: borderRadiusSchema,
	shadows: shadowSchema,
	custom_css: z.string().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	created_by: z.string().optional()
});

// Schema for theme customization
export const themeCustomizationSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	base_theme_id: z.string().optional(), // Theme to base customization on
	colors: colorPaletteSchema.partial().optional(),
	typography: typographySchema.partial().optional(),
	spacing: spacingSchema.partial().optional(),
	border_radius: borderRadiusSchema.partial().optional(),
	shadows: shadowSchema.partial().optional(),
	custom_css: z.string().optional()
});

// Schema for user theme preferences
export const userThemePreferencesSchema = z.object({
	user_id: z.string(),
	active_theme_id: z.string(),
	auto_switch_enabled: z.boolean().default(false),
	light_theme_id: z.string().optional(),
	dark_theme_id: z.string().optional(),
	switch_time_light: z
		.string()
		.regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
		.default('06:00'), // HH:MM format
	switch_time_dark: z
		.string()
		.regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
		.default('18:00'),
	custom_overrides: z
		.object({
			colors: colorPaletteSchema.partial().optional(),
			typography: typographySchema.partial().optional(),
			spacing: spacingSchema.partial().optional(),
			border_radius: borderRadiusSchema.partial().optional(),
			shadows: shadowSchema.partial().optional()
		})
		.optional(),
	updated_at: z.string().datetime()
});

// Schema for theme export/import
export const themeExportSchema = z.object({
	format_version: z.string().default('1.0'),
	exported_at: z.string().datetime(),
	exported_by: z.string(),
	theme: themeConfigSchema.omit({
		id: true,
		created_at: true,
		updated_at: true,
		created_by: true,
		is_default: true,
		is_system: true
	})
});

// Schema for theme statistics
export const themeStatsSchema = z.object({
	total_themes: z.number(),
	system_themes: z.number(),
	custom_themes: z.number(),
	active_users_by_theme: z.record(
		z.string(),
		z.object({
			theme_id: z.string(),
			theme_name: z.string(),
			user_count: z.number(),
			percentage: z.number()
		})
	),
	theme_type_breakdown: z.object({
		light: z.number(),
		dark: z.number(),
		auto: z.number()
	}),
	most_customized_elements: z
		.array(
			z.object({
				element: z.string(),
				customization_count: z.number()
			})
		)
		.optional()
});

// Schema for theme validation
export const themeValidationSchema = z.object({
	is_valid: z.boolean(),
	errors: z.array(
		z.object({
			field: z.string(),
			message: z.string(),
			severity: z.enum(['error', 'warning'])
		})
	),
	warnings: z.array(
		z.object({
			field: z.string(),
			message: z.string(),
			suggestion: z.string().optional()
		})
	),
	accessibility_score: z.number().min(0).max(100).optional(),
	contrast_ratios: z.record(z.string(), z.number()).optional()
});

// Export inferred types
export type ColorPalette = z.infer<typeof colorPaletteSchema>;
export type Typography = z.infer<typeof typographySchema>;
export type Spacing = z.infer<typeof spacingSchema>;
export type BorderRadius = z.infer<typeof borderRadiusSchema>;
export type Shadow = z.infer<typeof shadowSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type ThemeCustomization = z.infer<typeof themeCustomizationSchema>;
export type UserThemePreferences = z.infer<typeof userThemePreferencesSchema>;
export type ThemeExport = z.infer<typeof themeExportSchema>;
export type ThemeStats = z.infer<typeof themeStatsSchema>;
export type ThemeValidation = z.infer<typeof themeValidationSchema>;
