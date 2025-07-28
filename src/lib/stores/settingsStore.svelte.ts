import type { Settings } from '$lib/schemas/settingsSchema';

// Default settings object
const defaultSettings: Omit<Settings, 'pin'> = {
    store_name: 'AZPOS Demo Store',
    address: '123 Tech Lane, Silicon Valley, CA',
    tin: '00-0000000',
    currency: 'USD',
    tax_rates: [
        { name: 'VAT', rate: 12 },
        { name: 'Sales Tax', rate: 8.25 }
    ],
    timezone: 'America/Los_Angeles',
    language: 'en'
};

// Use $state for settings
export const settings = $state<Settings>({ ...defaultSettings });

// Use $state for low stock threshold
export const lowStockThreshold = $state<number>(10);

// Export functions that directly mutate the state
export function updateSettings(partialSettings: Partial<Settings>) {
    Object.assign(settings, partialSettings);
}

export function setSettings(newSettings: Settings) {
    Object.assign(settings, newSettings);
}

export function resetSettings() {
    Object.assign(settings, defaultSettings);
}
