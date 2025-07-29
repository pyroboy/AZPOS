import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	onGetSettings,
	onUpdateSettings,
	onResetSettings,
	onCreateSettingsBackup,
	onRestoreSettingsBackup,
	onGetSettingsBackups,
	onDeleteSettingsBackup,
	onValidateSettings
} from '$lib/server/telefuncs/settings.telefunc.js';
import type { Settings, SettingsUpdate, SettingsBackup } from '$lib/types/settings.schema';

const settingsQueryKey = ['settings'];
const settingsBackupsQueryKey = ['settings-backups'];

export function useSettings() {
	const queryClient = useQueryClient();

	// Query for current settings
	const settingsQuery = createQuery<Settings>({
		queryKey: settingsQueryKey,
		queryFn: onGetSettings,
		staleTime: 5 * 60 * 1000 // 5 minutes
	});

	// Query for settings backups
	const backupsQuery = createQuery<SettingsBackup[]>({
		queryKey: settingsBackupsQueryKey,
		queryFn: onGetSettingsBackups
	});

	// Mutation to update settings
	const updateSettingsMutation = createMutation({
		mutationFn: (settingsData: SettingsUpdate) => onUpdateSettings(settingsData),
		onSuccess: (updatedSettings) => {
			// Update settings in cache
			queryClient.setQueryData(settingsQueryKey, updatedSettings);

			// Invalidate backups to refresh list
			queryClient.invalidateQueries({ queryKey: settingsBackupsQueryKey });
		}
	});

	// Mutation to reset settings
	const resetSettingsMutation = createMutation({
		mutationFn: onResetSettings,
		onSuccess: (defaultSettings) => {
			// Update settings in cache
			queryClient.setQueryData(settingsQueryKey, defaultSettings);

			// Invalidate backups to refresh list
			queryClient.invalidateQueries({ queryKey: settingsBackupsQueryKey });
		}
	});

	// Mutation to create backup
	const createBackupMutation = createMutation({
		mutationFn: ({ name, description }: { name: string; description?: string }) =>
			onCreateSettingsBackup(name, description),
		onSuccess: (newBackup) => {
			// Invalidate and refetch backups
			queryClient.invalidateQueries({ queryKey: settingsBackupsQueryKey });

			// Optimistically add to cache
			queryClient.setQueryData<SettingsBackup[]>(settingsBackupsQueryKey, (old) => {
				if (!old) return [newBackup];
				return [newBackup, ...old];
			});
		}
	});

	// Mutation to restore backup
	const restoreBackupMutation = createMutation({
		mutationFn: (backupId: string) => onRestoreSettingsBackup(backupId),
		onSuccess: (restoredSettings) => {
			// Update settings in cache
			queryClient.setQueryData(settingsQueryKey, restoredSettings);

			// Invalidate backups to refresh list
			queryClient.invalidateQueries({ queryKey: settingsBackupsQueryKey });
		}
	});

	// Mutation to delete backup
	const deleteBackupMutation = createMutation({
		mutationFn: (backupId: string) => onDeleteSettingsBackup(backupId),
		onSuccess: (_, backupId) => {
			// Remove from cache
			queryClient.setQueryData<SettingsBackup[]>(settingsBackupsQueryKey, (old) => {
				if (!old) return old;
				return old.filter((backup) => backup.id !== backupId);
			});
		}
	});

	// Mutation to validate settings
	const validateSettingsMutation = createMutation({
		mutationFn: (settingsData: SettingsUpdate) => onValidateSettings(settingsData)
	});

	// Derived reactive state
	const settings = $derived(settingsQuery.data);
	const backups = $derived(backupsQuery.data || []);

	// Individual setting sections
	const businessSettings = $derived(settings?.business);
	const posSettings = $derived(settings?.pos);
	const inventorySettings = $derived(settings?.inventory);
	const customerSettings = $derived(settings?.customer);
	const notificationSettings = $derived(settings?.notifications);
	const securitySettings = $derived(settings?.security);
	const integrationSettings = $derived(settings?.integrations);

	// Helper functions for common settings
	const currency = $derived(businessSettings?.currency);
	const timezone = $derived(businessSettings?.timezone);
	const language = $derived(businessSettings?.language);
	const dateFormat = $derived(businessSettings?.date_format);
	const timeFormat = $derived(businessSettings?.time_format);

	// Tax settings helpers
	const taxRate = $derived(businessSettings?.tax_settings?.default_tax_rate || 0);
	const taxInclusive = $derived(businessSettings?.tax_settings?.tax_inclusive || false);
	const taxName = $derived(businessSettings?.tax_settings?.tax_name || 'Tax');

	// POS settings helpers
	const autoPrintReceipts = $derived(posSettings?.receipt?.auto_print || false);
	const autoOpenCashDrawer = $derived(posSettings?.cash_drawer?.auto_open || false);
	const trackInventory = $derived(inventorySettings?.tracking?.track_inventory || false);
	const allowNegativeStock = $derived(inventorySettings?.tracking?.allow_negative_stock || false);

	// Security settings helpers
	const requireTwoFactor = $derived(securitySettings?.authentication?.require_two_factor || false);
	const sessionTimeout = $derived(securitySettings?.authentication?.session_timeout_minutes || 60);
	const passwordMinLength = $derived(securitySettings?.authentication?.password_min_length || 8);

	// Settings operations
	function updateSettings(settingsData: SettingsUpdate) {
		return updateSettingsMutation.mutateAsync(settingsData);
	}

	function resetSettings() {
		return resetSettingsMutation.mutateAsync();
	}

	function createBackup(name: string, description?: string) {
		return createBackupMutation.mutateAsync({ name, description });
	}

	function restoreBackup(backupId: string) {
		return restoreBackupMutation.mutateAsync(backupId);
	}

	function deleteBackup(backupId: string) {
		return deleteBackupMutation.mutateAsync(backupId);
	}

	function validateSettings(settingsData: SettingsUpdate) {
		return validateSettingsMutation.mutateAsync(settingsData);
	}

	// Convenience functions for updating specific sections
	function updateBusinessSettings(businessData: Partial<typeof businessSettings>) {
		return updateSettings({ business: businessData });
	}

	function updatePosSettings(posData: Partial<typeof posSettings>) {
		return updateSettings({ pos: posData });
	}

	function updateInventorySettings(inventoryData: Partial<typeof inventorySettings>) {
		return updateSettings({ inventory: inventoryData });
	}

	function updateCustomerSettings(customerData: Partial<typeof customerSettings>) {
		return updateSettings({ customer: customerData });
	}

	function updateNotificationSettings(notificationData: Partial<typeof notificationSettings>) {
		return updateSettings({ notifications: notificationData });
	}

	function updateSecuritySettings(securityData: Partial<typeof securitySettings>) {
		return updateSettings({ security: securityData });
	}

	function updateIntegrationSettings(integrationData: Partial<typeof integrationSettings>) {
		return updateSettings({ integrations: integrationData });
	}

	// Format helpers
	function formatCurrency(amount: number): string {
		if (!currency) return amount.toString();

		const formatter = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.code,
			minimumFractionDigits: currency.decimal_places,
			maximumFractionDigits: currency.decimal_places
		});

		return formatter.format(amount);
	}

	function formatDate(date: Date | string): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;

		if (!dateFormat) return dateObj.toLocaleDateString();

		// Convert our format to Intl.DateTimeFormat options
		const options: Intl.DateTimeFormatOptions = {};

		if (dateFormat.includes('MM')) options.month = '2-digit';
		if (dateFormat.includes('DD')) options.day = '2-digit';
		if (dateFormat.includes('YYYY')) options.year = 'numeric';

		return new Intl.DateTimeFormat('en-US', options).format(dateObj);
	}

	function formatTime(date: Date | string): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;

		const options: Intl.DateTimeFormatOptions = {
			hour12: timeFormat === '12'
		};

		return new Intl.DateTimeFormat('en-US', options).format(dateObj);
	}

	return {
		// Queries and their states
		settingsQuery,
		backupsQuery,

		// Reactive data
		settings,
		backups,

		// Individual sections
		businessSettings,
		posSettings,
		inventorySettings,
		customerSettings,
		notificationSettings,
		securitySettings,
		integrationSettings,

		// Common settings
		currency,
		timezone,
		language,
		dateFormat,
		timeFormat,
		taxRate,
		taxInclusive,
		taxName,
		autoPrintReceipts,
		autoOpenCashDrawer,
		trackInventory,
		allowNegativeStock,
		requireTwoFactor,
		sessionTimeout,
		passwordMinLength,

		// Settings operations
		updateSettings,
		resetSettings,
		createBackup,
		restoreBackup,
		deleteBackup,
		validateSettings,

		// Section-specific updates
		updateBusinessSettings,
		updatePosSettings,
		updateInventorySettings,
		updateCustomerSettings,
		updateNotificationSettings,
		updateSecuritySettings,
		updateIntegrationSettings,

		// Format helpers
		formatCurrency,
		formatDate,
		formatTime,

		// Mutation states
		updateSettingsStatus: $derived(updateSettingsMutation.status),
		resetSettingsStatus: $derived(resetSettingsMutation.status),
		createBackupStatus: $derived(createBackupMutation.status),
		restoreBackupStatus: $derived(restoreBackupMutation.status),
		deleteBackupStatus: $derived(deleteBackupMutation.status),
		validateSettingsStatus: $derived(validateSettingsMutation.status),
		validationResult: $derived(validateSettingsMutation.data),

		// Loading states
		isLoading: $derived(settingsQuery.isPending),
		isError: $derived(settingsQuery.isError),
		error: $derived(settingsQuery.error),

		// Backups loading
		isBackupsLoading: $derived(backupsQuery.isPending),
		backupsError: $derived(backupsQuery.error)
	};
}
