import { writable } from 'svelte/store';
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

function createSettingsStore() {
    const { subscribe, set, update } = writable<Settings>(defaultSettings);

    return {
        subscribe,
        set,
        update,
        updateSettings: (partialSettings: Partial<Settings>) => {
            update(s => ({ ...s, ...partialSettings }));
        },
        // Helper to get the current value non-reactively (for server-side use)
        get: () => {
            let value: Settings = defaultSettings; // Initialize with default
            const unsubscribe = subscribe(v => value = v);
            unsubscribe();
            return value;
        }
    };
}

export const settingsStore = createSettingsStore();

// General application settings

// Threshold for considering a product to have low stock.
export const lowStockThreshold = writable(10);

// Other settings can be added here as the application grows.
