import type { ThemeConfig } from '$lib/types/theme.schema';

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

// Svelte 5 runes-based theme store
let currentTheme = $state<ThemeConfig>(defaultTheme);
let availableThemes = $state<ThemeConfig[]>([defaultTheme]);

// Helper function to apply theme to document
function applyThemeToDocument(theme: ThemeConfig) {
	if (typeof document === 'undefined') return;
	
	const root = document.documentElement;
	
	// Apply CSS custom properties
	Object.entries(theme.colors).forEach(([key, value]) => {
		root.style.setProperty(`--color-${key.replace('_', '-')}`, value);
	});

	// Apply typography
	root.style.setProperty('--font-family', theme.typography.font_family);
	root.style.setProperty('--font-size-base', `${theme.typography.font_size_base}px`);
	root.style.setProperty('--line-height', theme.typography.line_height.toString());

	// Apply spacing scale
	theme.spacing.scale.forEach((value, index) => {
		root.style.setProperty(`--spacing-${index}`, `${value * theme.spacing.base_unit}px`);
	});

	// Apply border radius
	Object.entries(theme.border_radius).forEach(([key, value]) => {
		root.style.setProperty(`--radius-${key}`, `${value}px`);
	});

	// Apply shadows
	Object.entries(theme.shadows).forEach(([key, value]) => {
		root.style.setProperty(`--shadow-${key}`, value);
	});
}

// Theme store with Svelte 5 runes
export const themeStore = {
	// Getters using $derived
	get current() {
		return currentTheme;
	},
	
	get available() {
		return availableThemes;
	},

	// Actions
	setTheme: (theme: ThemeConfig) => {
		currentTheme = theme;
		applyThemeToDocument(theme);
	},

	loadThemes: async () => {
		// For now, just use the default theme
		// In a real app, this would fetch from the theme telefunc
		availableThemes = [defaultTheme];
	},

	getCurrentTheme: () => currentTheme
};

// Initialize theme on client side with $effect
if (typeof document !== 'undefined') {
	$effect(() => {
		applyThemeToDocument(currentTheme);
	});
}

// Export individual reactive values for convenience
export const theme = {
	get current() {
		return currentTheme;
	}
};
