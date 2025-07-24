import { get } from 'svelte/store';
import { transactions as transactionStore } from '$lib/stores/transactionStore';
import { getTotalStockForProduct } from '$lib/stores/productBatchStore';
import type { Product, Transaction, TransactionItem, Role } from '$lib/schemas/models';
import { redirect } from '@sveltejs/kit';

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager'];

/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
    const { user, products, productBatches } = await parent();

    if (!ALLOWED_ROLES.includes(user.role)) {
        throw redirect(302, '/reports');
    }

    const transactions = get(transactionStore);

    const productMap = new Map<string, Product>(products.map((p: Product) => [p.id, p]));

    const salesStats: Record<string, { last_sale_date: string; units_sold: number }> = {};

    // Sort transactions to find the most recent sale date accurately
    transactions
        .filter((t: Transaction) => t.status === 'completed' && t.items)
        .sort((a: Transaction, b: Transaction) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .forEach((t: Transaction) => {
            t.items.forEach((item: TransactionItem) => {
                if (!salesStats[item.product_id]) {
                    salesStats[item.product_id] = { 
                        last_sale_date: t.created_at, 
                        units_sold: 0 
                    };
                }
            });
        });

    // Calculate total units sold in the last 30 days for fast-movers
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    transactions
        .filter((t: Transaction) => t.status === 'completed' && new Date(t.created_at) >= thirtyDaysAgo)
        .forEach((t: Transaction) => {
            t.items.forEach((item: TransactionItem) => {
                if (salesStats[item.product_id]) {
                    salesStats[item.product_id].units_sold += item.quantity;
                }
            });
        });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgoForSlow = new Date();
    thirtyDaysAgoForSlow.setDate(thirtyDaysAgoForSlow.getDate() - 30);

    const fastMovers = Object.entries(salesStats)
        .filter(([, stats]) => new Date(stats.last_sale_date) >= sevenDaysAgo)
        .map(([product_id, stats]) => {
            const product = productMap.get(product_id);
            return {
                product_id,
                sku: product?.sku ?? 'N/A',
                name: product?.name ?? 'Unknown',
                units_sold: stats.units_sold,
                last_sale_date: stats.last_sale_date
            };
        })
        .sort((a, b) => b.units_sold - a.units_sold);

    const slowMovers = products
        .map(product => ({
            product,
            stats: salesStats[product.id]
        }))
        .filter(({ product, stats }) => {
            const stock = getTotalStockForProduct(product.id, productBatches);
            const last_sale_date = stats ? new Date(stats.last_sale_date) : null;
            return stock > 0 && (!last_sale_date || last_sale_date < thirtyDaysAgoForSlow);
        })
        .map(({ product, stats }) => ({
            product_id: product.id,
            sku: product.sku,
            name: product.name,
            currentStock: getTotalStockForProduct(product.id, productBatches),
            last_sale_date: stats?.last_sale_date ?? null
        }))
        .sort((a, b) => new Date(a.last_sale_date ?? 0).getTime() - new Date(b.last_sale_date ?? 0).getTime());


    return {
        fastMovers,
        slowMovers
    };
}

