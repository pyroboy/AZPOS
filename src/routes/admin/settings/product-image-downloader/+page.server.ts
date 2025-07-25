import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Product, ProductWithStatus } from './types';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to parse CSV text into Product array
async function parseCsv(csvText: string): Promise<Product[]> {
	return new Promise((resolve, reject) => {
		Papa.parse<Product>(csvText, {
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true,
			complete: (results) => {
				if (results.errors.length) {
					console.error('CSV parsing errors:', results.errors);
					// Even with errors, we might have valid data, so we resolve with what we have.
					const validData = results.data.filter((d) => d.sku && d.name);
					resolve(validData);
				} else {
					resolve(results.data);
				}
			},
			error: (error: Error) => {
					reject(error);
			}
		});
	});
}

// Load initial data - returning an empty array.
export const load: PageServerLoad = async () => {
	return { products: [] as ProductWithStatus[] };
};

export const actions: Actions = {
	// Action to load the master product list from a predefined path
	loadMasterCsv: async () => {
		try {
			const filePath = path.resolve('./src/lib/assets/master_products.csv');
			const csvText = await fs.readFile(filePath, 'utf-8');
			const products = await parseCsv(csvText);
			const productsWithStatus: ProductWithStatus[] = products.map((p) => ({ ...p, status: 'initial' }));
			return { success: true, products: productsWithStatus };
		} catch (e) {
			console.error('Failed to load master CSV:', e);
			return fail(500, { error: 'Failed to load master product list.' });
		}
	},

	// Action to upload a custom CSV file
	uploadCsv: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('csvfile') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'No CSV file uploaded.' });
		}

		try {
			const csvText = await file.text();
			const products = await parseCsv(csvText);
			const productsWithStatus: ProductWithStatus[] = products.map((p) => ({ ...p, status: 'initial' }));
			return { success: true, products: productsWithStatus };
		} catch (e) {
			console.error('Failed to process uploaded CSV:', e);
			return fail(500, { error: 'Could not process the uploaded CSV file.' });
		}
	},

	// Action to export product data to a CSV file
	exportCsv: async ({ request }) => {
		const formData = await request.formData();
		const productsJson = formData.get('products') as string;

		try {
			const products: ProductWithStatus[] = JSON.parse(productsJson);
			const csv = Papa.unparse(products);
			return { success: true, csv };
		} catch (e) {
			console.error('Failed to export CSV:', e);
			return fail(500, { error: 'Failed to generate CSV for export.' });
		}
	},

	// Action to download selected images as a ZIP file
	downloadZip: async ({ request }) => {
		const formData = await request.formData();
		const productsJson = formData.get('products') as string;

		try {
			const products: ProductWithStatus[] = JSON.parse(productsJson);
			const zip = new JSZip();

			const imageProducts = products.filter((p) => p.status === 'selected' && p.imageUrl);

			for (const product of imageProducts) {
				try {
					const response = await fetch(product.imageUrl!);
					if (response.ok) {
						const buffer = await response.arrayBuffer();
						const fileExtension = product.imageUrl!.split('.').pop() || 'jpg';
						zip.file(`${product.sku}.${fileExtension}`, buffer);
					}
				} catch (fetchError) {
					console.error(`Failed to fetch image for ${product.sku}:`, fetchError);
				}
			}

			const zipAsBase64 = await zip.generateAsync({ type: 'base64' });
			return { success: true, zip: zipAsBase64 };
		} catch (e) {
			console.error('Failed to create ZIP:', e);
			return fail(500, { error: 'Failed to generate ZIP file.' });
		}
	}
};