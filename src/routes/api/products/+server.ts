import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { productSchema, type Product } from '$lib/schemas/models';

// In-memory cache for the parsed product data to avoid re-reading the file on every request
let productsCache: Product[] | null = null;

async function parseProducts() {
    if (productsCache) {
        return productsCache;
    }

    try {
        // The 'static' directory is served at the root, but on the server, we need to read from the filesystem.
        const filePath = path.resolve(process.cwd(), 'static', 'products_master.csv');
        const fileContent = await fs.readFile(filePath, { encoding: 'utf-8' });

        const lines = fileContent.trim().split('\n');
        if (lines.length < 2) {
            productsCache = [];
            return []; // No data to parse
        }

        const header = lines[0].split(',').map(h => h.trim());
        const products: Product[] = lines
			.slice(1)
			.map((line, i) => {
				const values = line.split(',');
				const rawProduct: { [key: string]: string | undefined } = {};
				header.forEach((key, index) => {
					rawProduct[key] = values[index] ? values[index].trim() : undefined;
				});

				// Use safeParse to validate and coerce the data against the Zod schema
				const result = productSchema.safeParse(rawProduct);

				if (result.success) {
					return result.data;
				} else {
					// Log the validation error for the specific row
					console.error(`Error parsing product at row ${i + 2}:`, result.error.flatten());
					return null; // Return null for invalid rows
				}
			})
			.filter((p): p is Product => p !== null); // Filter out the null (invalid) entries

        productsCache = products;
        return products;
    } catch (error) {
        console.error('Failed to read or parse products_master.csv:', error);
        return []; // Return empty array on error
    }
}

export async function GET({ url }) {
    const allProducts = await parseProducts();

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedProducts = allProducts.slice(startIndex, endIndex);

    return json({
        products: paginatedProducts,
        page,
        limit,
        total: allProducts.length
    });
}
