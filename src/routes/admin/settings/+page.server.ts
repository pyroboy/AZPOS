import { fail } from '@sveltejs/kit';
import { settingsStore } from '$lib/stores/settingsStore';
import { settingsSchema } from '$lib/schemas/settingsSchema';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';

// Minimal interface for parsing products to get stats
interface ProductStub {
    image_url?: string;
    [key: string]: unknown;
}

// A simple PIN check function for demonstration purposes.
// In a real app, this would involve a secure check against a hashed PIN.
const DUMMY_ADMIN_PIN = '1234';
const validatePin = (pin: string) => pin === DUMMY_ADMIN_PIN;

async function getProductImageStats() {
    const masterCsvPath = path.resolve('./static', 'products_master.csv');
    try {
        const csvData = await fs.readFile(masterCsvPath, 'utf-8');
        const parsed = Papa.parse<ProductStub>(csvData, {
            header: true,
            skipEmptyLines: true
        });

        if (parsed.data) {
            const totalProducts = parsed.data.length;
            const productsWithImages = parsed.data.filter((p) => p.image_url && p.image_url.trim() !== '').length;
            return { totalProducts, productsWithImages };
        }
    } catch (error) {
        console.error('Failed to read or parse master CSV for stats:', error);
    }
    return { totalProducts: 0, productsWithImages: 0 };
}

export const load: PageServerLoad = async () => {
    const form = await superValidate(settingsStore.get(), zod(settingsSchema));
    const imageStats = await getProductImageStats();
    return { form, ...imageStats };
};

export const actions: Actions = {
    default: async ({ request }) => {
        const form = await superValidate(request, zod(settingsSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        const currentSettings = settingsStore.get();
        const newSettings = form.data;

        // Deep comparison of tax rates to check for changes
        const taxRatesChanged = JSON.stringify(currentSettings.tax_rates) !== JSON.stringify(newSettings.tax_rates);

        if (taxRatesChanged) {
            if (!newSettings.pin) {
                // Add a specific error to the PIN field
				form.errors.pin = ['PIN is required to change tax rates.'];
                return fail(400, { form });
            }

            if (!validatePin(newSettings.pin ?? '')) {
                form.errors.pin = ['Invalid PIN.'];
                return fail(401, { form });
            }
        }

        // Remove PIN from the data before saving
        // The linter will complain that 'pin' is unused, which is the point.
        // We are destructuring it out so it doesn't get saved.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pin, ...settingsToSave } = newSettings;

        settingsStore.updateSettings(settingsToSave);

        return { form };
    }
};