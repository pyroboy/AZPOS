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
			const filePath = path.resolve('./static', 'products_master.csv');
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

	exportCsv: async ({ request }) => {
		const formData = await request.formData();
		const productsJson = formData.get('products') as string;

		try {
			const products: ProductWithStatus[] = JSON.parse(productsJson);
			
			const productsToExport = products.map(p => {
				const fileExtension = p.image_url?.split('.').pop() || 'jpg';
				return {
					id: p.id,
					sku: p.sku,
					name: p.name,
					description: p.description,
					stock: p.stock,
					price: p.price,
					category_id: p.category_id,
					supplier_id: p.supplier_id,
					image_url: p.image_url ? `images/products/${p.sku}.${fileExtension}` : ''
				}
			});

			const csv = Papa.unparse(productsToExport, {
				columns: ['id', 'sku', 'name', 'description', 'stock', 'price', 'category_id', 'supplier_id', 'image_url']
			});

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

			const imageProducts = products.filter((p) => p.status === 'selected' && p.image_url);
			for (const product of imageProducts) {
				try {
					const response = await fetch(product.image_url!);
					if (!response.ok) {
						return fail(400, {
							error: `Failed to download image for SKU ${product.sku}. Server responded with ${response.status}.`
						});
					}

					const contentType = response.headers.get('content-type');
					if (!contentType || !contentType.startsWith('image/')) {
						return fail(400, {
							error: `URL for SKU ${product.sku} did not return an image. Content-Type: ${contentType}`
						});
					}

					const fileExtension = contentType.split('/')[1] || 'jpg';
					const buffer = await response.arrayBuffer();
					zip.file(`${product.sku}.${fileExtension}`, buffer);
				} catch (fetchError: unknown) {
					console.error(`Failed to fetch image for ${product.sku}:`, fetchError);
					const message = fetchError instanceof Error ? fetchError.message : 'An unknown error occurred.';
					return fail(500, {
						error: `A network error occurred while downloading image for SKU ${product.sku}: ${message}`
					});
				}
			}

			// If all downloads succeed, generate the zip
			const zipAsBase64 = await zip.generateAsync({ type: 'base64' });
			return { success: true, zip: zipAsBase64 };
		} catch (e) {
			console.error('Failed to create ZIP:', e);
			return fail(500, { error: 'Failed to generate ZIP file.' });
		}
	}
};