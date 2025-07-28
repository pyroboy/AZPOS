import { fail } from '@sveltejs/kit';
import { onGetSettings, onUpdateSettings } from '$lib/server/telefuncs/settings.telefunc';
import { settingsSchema } from '$lib/types/settings.schema';
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
			const productsWithImages = parsed.data.filter(
				(p) => p.image_url && p.image_url.trim() !== ''
			).length;
			return { totalProducts, productsWithImages };
		}
	} catch (error) {
		console.error('Failed to read or parse master CSV for stats:', error);
	}
	return { totalProducts: 0, productsWithImages: 0 };
}

export const load: PageServerLoad = async () => {
	const settings = await onGetSettings();
	const form = await superValidate(settings, zod(settingsSchema));
	const imageStats = await getProductImageStats();
	return { form, ...imageStats };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(settingsSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const currentSettings = await onGetSettings();
		const newSettings = form.data;

		// Deep comparison of tax rates to check for changes
		const taxRatesChanged =
			JSON.stringify(currentSettings.business?.tax_settings) !==
			JSON.stringify(newSettings.business?.tax_settings);

		// Get PIN from form data separately since it's not part of the settings schema
		const formData = await request.formData();
		const pin = formData.get('pin') as string;

		if (taxRatesChanged) {
			if (!pin) {
				// Add a specific error to the PIN field (manually add to form errors)
				return fail(400, {
					form: {
						...form,
						errors: { ...form.errors, pin: ['PIN is required to change tax rates.'] }
					}
				});
			}

			if (!validatePin(pin)) {
				return fail(401, {
					form: {
						...form,
						errors: { ...form.errors, pin: ['Invalid PIN.'] }
					}
				});
			}
		}

		// Use form data directly (PIN is not included in settings schema)
		const settingsToSave = form.data;

		await onUpdateSettings(settingsToSave);

		return { form };
	}
};
