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
                const rawProduct: { [key: string]: string | number | undefined } = {};
                header.forEach((key, index) => {
                    // A 'stock' column is not in the schema but is present in the CSV.
                    // We need to handle it separately.
                    if (key === 'stock') {
                        rawProduct[key] = values[index] ? parseInt(values[index].trim(), 10) : 0;
                    } else {
                        rawProduct[key] = values[index] ? values[index].trim() : undefined;
                    }
                });

                const result = productSchema.safeParse(rawProduct);

                if (result.success) {
                    // Manually add the stock property back to the validated object
                    (result.data as Product & { stock: number }).stock = rawProduct.stock as number;
                    return result.data as Product & { stock: number };
                } else {
                    console.error(`Error parsing product at row ${i + 2}:`, result.error.flatten());
                    return null;
                }
            })
            .filter((p): p is Product & { stock: number } => p !== null);

        productsCache = products;
        return products;
    } catch (error) {
        console.error('Failed to read or parse products_master.csv:', error);
        return []; // Return empty array on error
    }
}

export async function GET() {
    const allProducts = await parseProducts() as (Product & { stock: number })[];

    if (!allProducts || allProducts.length === 0) {
        return json({ error: 'No products found' }, { status: 500 });
    }

    const { totalInventoryValue, potentialRevenue } = allProducts.reduce((acc, product) => {
        const cost = product.average_cost || 0;
        const price = product.price || 0;
        const stock = product.stock || 0;

        acc.totalInventoryValue += cost * stock;
        if (!product.is_archived) {
            acc.potentialRevenue += price * stock;
        }

        return acc;
    }, { totalInventoryValue: 0, potentialRevenue: 0 });

    const lowStockCount = allProducts.filter(p => {
        const stock = p.stock || 0;
        const reorderPoint = p.reorder_point || 0;
        return stock > 0 && stock < reorderPoint;
    }).length;

    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);

    const nearExpiryCount = allProducts.filter(p => {
        if (!p.expiration_date) return false;
        const expiryDate = new Date(p.expiration_date);
        return expiryDate > now && expiryDate <= sixtyDaysFromNow;
    }).length;

    return json({
        totalInventoryValue,
        potentialRevenue,
        lowStockCount,
        nearExpiryCount,
        totalProducts: allProducts.length
    });
}
