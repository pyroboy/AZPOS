import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { 
  onGetCurrentTheme, 
  onGetThemes, 
  onCreateCustomTheme, 
  onUpdateTheme, 
  onDeleteTheme, 
  onGetUserThemePreferences, 
  onUpdateUserThemePreferences, 
  onExportTheme, 
  onImportTheme, 
  onGetThemeStats, 
  onValidateTheme 
} from '$lib/server/telefuncs/theme.telefunc';
import type { 
  ThemeConfig, 
  ThemeCustomization, 
  UserThemePreferences, 
  ThemeExport, 
  ThemeStats
} from '$lib/types/theme.schema';

const currentThemeQueryKey = ['current-theme'];
const themesQueryKey = ['themes'];
const userPreferencesQueryKey = ['user-theme-preferences'];
const themeStatsQueryKey = ['theme-stats'];

export function useTheme() {
  const queryClient = useQueryClient();

  // Query for current theme
  const currentThemeQuery = createQuery<ThemeConfig>({
    queryKey: currentThemeQueryKey,
    queryFn: onGetCurrentTheme,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Query for all themes
  const themesQuery = createQuery<ThemeConfig[]>({
    queryKey: themesQueryKey,
    queryFn: onGetThemes,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Query for user theme preferences
  const userPreferencesQuery = createQuery<UserThemePreferences | null>({
    queryKey: userPreferencesQueryKey,
    queryFn: onGetUserThemePreferences,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Query for theme statistics
  const statsQuery = createQuery<ThemeStats>({
    queryKey: themeStatsQueryKey,
    queryFn: onGetThemeStats
  });

  // Mutation to create custom theme
  const createThemeMutation = createMutation({
    mutationFn: (themeData: ThemeCustomization) => onCreateCustomTheme(themeData),
    onSuccess: (newTheme) => {
      // Invalidate themes list
      queryClient.invalidateQueries({ queryKey: themesQueryKey });
      queryClient.invalidateQueries({ queryKey: themeStatsQueryKey });
      
      // Optimistically add to cache
      queryClient.setQueryData<ThemeConfig[]>(
        themesQueryKey,
        (old) => {
          if (!old) return [newTheme];
          return [...old, newTheme];
        }
      );
    }
  });

  // Mutation to update theme
  const updateThemeMutation = createMutation({
    mutationFn: ({ themeId, themeData }: { themeId: string; themeData: ThemeCustomization }) => 
      onUpdateTheme(themeId, themeData),
    onSuccess: (updatedTheme) => {
      // Update current theme if it's the same
      const currentTheme = queryClient.getQueryData<ThemeConfig>(currentThemeQueryKey);
      if (currentTheme?.id === updatedTheme.id) {
        queryClient.setQueryData(currentThemeQueryKey, updatedTheme);
      }
      
      // Update themes list
      queryClient.setQueryData<ThemeConfig[]>(
        themesQueryKey,
        (old) => {
          if (!old) return [updatedTheme];
          return old.map(theme => theme.id === updatedTheme.id ? updatedTheme : theme);
        }
      );
    }
  });

  // Mutation to delete theme
  const deleteThemeMutation = createMutation({
    mutationFn: (themeId: string) => onDeleteTheme(themeId),
    onSuccess: (_, themeId) => {
      // Remove from themes list
      queryClient.setQueryData<ThemeConfig[]>(
        themesQueryKey,
        (old) => {
          if (!old) return old;
          return old.filter(theme => theme.id !== themeId);
        }
      );
      
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: themeStatsQueryKey });
    }
  });

  // Mutation to update user preferences
  const updatePreferencesMutation = createMutation({
    mutationFn: (preferencesData: UserThemePreferences) => onUpdateUserThemePreferences(preferencesData),
    onSuccess: (updatedPreferences) => {
      // Update preferences in cache
      queryClient.setQueryData(userPreferencesQueryKey, updatedPreferences);
      
      // Invalidate current theme to refresh
      queryClient.invalidateQueries({ queryKey: currentThemeQueryKey });
      queryClient.invalidateQueries({ queryKey: themeStatsQueryKey });
    }
  });

  // Mutation to validate theme
  const validateThemeMutation = createMutation({
    mutationFn: (themeData: ThemeCustomization) => onValidateTheme(themeData)
  });

  // Derived reactive state
  const currentTheme = $derived(currentThemeQuery.data);
  const themes = $derived(themesQuery.data || []);
  const userPreferences = $derived(userPreferencesQuery.data);
  const stats = $derived(statsQuery.data);
  
  // Theme categories
  const systemThemes = $derived(themes.filter((theme: ThemeConfig) => theme.is_system));
  const customThemes = $derived(themes.filter((theme: ThemeConfig) => !theme.is_system));
  const userCreatedThemes = $derived(themes.filter((theme: ThemeConfig) => !theme.is_system && theme.created_by));
  
  // Current theme properties - using schema-compliant properties
  const isDarkMode = $derived(userPreferences?.auto_switch_enabled || false);
  const isHighContrast = $derived(false); // Not in current schema
  const reduceMotion = $derived(false); // Not in current schema
  const fontSizeScale = $derived(1); // Not in current schema

  // Theme operations
  function createCustomTheme(themeData: ThemeCustomization) {
    return createThemeMutation.mutateAsync(themeData);
  }

  function updateTheme(themeId: string, themeData: ThemeCustomization) {
    return updateThemeMutation.mutateAsync({ themeId, themeData });
  }

  function deleteTheme(themeId: string) {
    return deleteThemeMutation.mutateAsync(themeId);
  }

  function updateUserPreferences(preferencesData: UserThemePreferences) {
    return updatePreferencesMutation.mutateAsync(preferencesData);
  }

  function validateTheme(themeData: ThemeCustomization) {
    return validateThemeMutation.mutateAsync(themeData);
  }

  // Convenience functions for common preference updates
  function setTheme(themeId: string) {
    const newPreferences: UserThemePreferences = {
      ...userPreferences,
      user_id: userPreferences?.user_id || '',
      active_theme_id: themeId,
      auto_switch_enabled: userPreferences?.auto_switch_enabled || false,
      switch_time_light: userPreferences?.switch_time_light || '06:00',
      switch_time_dark: userPreferences?.switch_time_dark || '18:00',
      updated_at: new Date().toISOString()
    };
    return updateUserPreferences(newPreferences);
  }

  function toggleDarkMode() {
    const newPreferences: UserThemePreferences = {
      ...userPreferences,
      user_id: userPreferences?.user_id || '',
      active_theme_id: userPreferences?.active_theme_id || 'default',
      auto_switch_enabled: !isDarkMode,
      switch_time_light: userPreferences?.switch_time_light || '06:00',
      switch_time_dark: userPreferences?.switch_time_dark || '18:00',
      updated_at: new Date().toISOString()
    };
    return updateUserPreferences(newPreferences);
  }

  function toggleHighContrast() {
    // High contrast not in schema, keeping for API compatibility
    return Promise.resolve(userPreferences!);
  }

  function toggleReduceMotion() {
    // Reduce motion not in schema, keeping for API compatibility
    return Promise.resolve(userPreferences!);
  }

  function setFontSizeScale(scale: number) {
    // Font size scale not in schema, keeping for API compatibility
    return Promise.resolve(userPreferences!);
  }

  function setCustomCSS(css: string) {
    const newPreferences: UserThemePreferences = {
      ...userPreferences,
      user_id: userPreferences?.user_id || '',
      active_theme_id: userPreferences?.active_theme_id || 'default',
      auto_switch_enabled: userPreferences?.auto_switch_enabled || false,
      switch_time_light: userPreferences?.switch_time_light || '06:00',
      switch_time_dark: userPreferences?.switch_time_dark || '18:00',
      custom_overrides: {
        ...userPreferences?.custom_overrides
      },
      updated_at: new Date().toISOString()
    };
    return updateUserPreferences(newPreferences);
  }

  // Theme export/import
  function exportTheme(themeId: string) {
    return onExportTheme(themeId);
  }

  function importTheme(themeExportData: ThemeExport) {
    return onImportTheme(themeExportData).then(importedTheme => {
      // Invalidate themes list to show new theme
      queryClient.invalidateQueries({ queryKey: themesQueryKey });
      return importedTheme;
    });
  }

  // CSS variable generation
  const cssVariables = $derived(() => {
    if (!currentTheme) return {};
    
    const variables: Record<string, string> = {};
    
    // Colors
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      variables[`--color-${key.replace(/_/g, '-')}`] = value as string;
    });
    
    // Typography
    Object.entries(currentTheme.typography).forEach(([key, value]) => {
      variables[`--${key.replace(/_/g, '-')}`] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
    
    // Spacing
    Object.entries(currentTheme.spacing).forEach(([key, value]) => {
      variables[`--spacing-${key}`] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
    
    // Border radius
    Object.entries(currentTheme.border_radius).forEach(([key, value]) => {
      variables[`--radius-${key}`] = `${value}px`;
    });
    
    // Shadows
    Object.entries(currentTheme.shadows).forEach(([key, value]) => {
      variables[`--shadow-${key}`] = value as string;
    });
    
    // Apply font size scale
    if (fontSizeScale !== 1) {
      Object.entries(currentTheme.typography).forEach(([key, value]) => {
        if (key.startsWith('font_size_')) {
          const scaledValue = parseFloat(String(value)) * fontSizeScale;
          variables[`--${key.replace(/_/g, '-')}`] = `${scaledValue}rem`;
        }
      });
    }
    
    return variables;
  });

  // Apply CSS variables to document
  $effect(() => {
    if (typeof document !== 'undefined' && cssVariables) {
      const root = document.documentElement;
      Object.entries(cssVariables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
      
      // Apply theme classes
      root.classList.toggle('dark-mode', isDarkMode);
      root.classList.toggle('high-contrast', isHighContrast);
      root.classList.toggle('reduce-motion', reduceMotion);
    }
  });

  // Theme helpers
  function getThemeById(themeId: string): ThemeConfig | undefined {
    return themes.find((theme: ThemeConfig) => theme.id === themeId);
  }

  function isCurrentTheme(themeId: string): boolean {
    return currentTheme?.id === themeId;
  }

  function canEditTheme(theme: ThemeConfig): boolean {
    if (theme.is_system) return false;
    // Users can edit their own themes, admins can edit any theme
    return theme.created_by === userPreferences?.user_id || false; // Would need user role check
  }

  function canDeleteTheme(theme: ThemeConfig): boolean {
    if (theme.is_system || theme.is_default) return false;
    return canEditTheme(theme);
  }

  // Color utilities
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const factor = 1 + percent / 100;
    const r = Math.min(255, Math.round(rgb.r * factor));
    const g = Math.min(255, Math.round(rgb.g * factor));
    const b = Math.min(255, Math.round(rgb.b * factor));
    
    return rgbToHex(r, g, b);
  }

  function darkenColor(hex: string, percent: number): string {
    return lightenColor(hex, -percent);
  }

  return {
    // Queries and their states
    currentThemeQuery,
    themesQuery,
    userPreferencesQuery,
    statsQuery,
    
    // Reactive data
    currentTheme,
    themes,
    userPreferences,
    stats,
    
    // Theme categories
    systemThemes,
    customThemes,
    userCreatedThemes,
    
    // Current preferences
    isDarkMode,
    isHighContrast,
    reduceMotion,
    fontSizeScale,
    
    // CSS variables
    cssVariables,
    
    // Theme operations
    createCustomTheme,
    updateTheme,
    deleteTheme,
    updateUserPreferences,
    validateTheme,
    
    // Convenience functions
    setTheme,
    toggleDarkMode,
    toggleHighContrast,
    toggleReduceMotion,
    setFontSizeScale,
    setCustomCSS,
    
    // Export/Import
    exportTheme,
    importTheme,
    
    // Theme helpers
    getThemeById,
    isCurrentTheme,
    canEditTheme,
    canDeleteTheme,
    
    // Color utilities
    hexToRgb,
    rgbToHex,
    lightenColor,
    darkenColor,
    
    // Mutation states
    createThemeStatus: $derived(createThemeMutation.status),
    updateThemeStatus: $derived(updateThemeMutation.status),
    deleteThemeStatus: $derived(deleteThemeMutation.status),
    updatePreferencesStatus: $derived(updatePreferencesMutation.status),
    validateThemeStatus: $derived(validateThemeMutation.status),
    validationResult: $derived(validateThemeMutation.data),
    
    // Loading states
    isLoading: $derived(currentThemeQuery.isPending),
    isThemesLoading: $derived(themesQuery.isPending),
    isPreferencesLoading: $derived(userPreferencesQuery.isPending),
    isError: $derived(currentThemeQuery.isError),
    error: $derived(currentThemeQuery.error),
    
    // Stats loading
    isStatsLoading: $derived(statsQuery.isPending),
    statsError: $derived(statsQuery.error)
  };
}
