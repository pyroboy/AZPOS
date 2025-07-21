import { writable } from 'svelte/store';
import type { Settings } from '$lib/schemas/models';

function createSettingsStore() {
	const { subscribe, set, update } = writable<Settings>({
		store_name: 'AZPOS',
		address: '123 Main St',
		tin: '123-456-789-000',
		currency: 'PHP',
		tax_rates: [{ name: 'VAT', rate: 12 }]
	});

	return {
		subscribe,
		set,
		update,
		get: () => {
			let value: Settings | undefined;
			subscribe((v) => (value = v))();
			return value as Settings;
		}
	};
}

export const settingsStore = createSettingsStore();

// General application settings

// Threshold for considering a product to have low stock.
export const lowStockThreshold = writable(10);

// Other settings can be added here as the application grows.
