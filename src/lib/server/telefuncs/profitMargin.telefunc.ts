import { getContext } from 'telefunc';
import { z } from 'zod';
import { createSupabaseClient } from '$lib/server/db';
import type { InventoryAdjustment, Product, ProductBatch, Role } from '$lib/schemas/models';

// Allowed roles for accessing profit margin report
const ALLOWED_ROLES: Role[] = ['admin', 'owner'];

// Schema for profit margin report response
export const ProfitMarginReportSchema = z.object({
  salesWithProfit: z.array(z.object({
    id: z.string(),
    product_id: z.string(),
    batch_id: z.string(),
    quantity_adjusted: z.number(),
    adjustment_type: z.enum(['add', 'subtract', 'recount']),
    reason: z.string(),
    created_at: z.string(),
    user_id: z.string(),
    productName: z.string(),
    revenue: z.number(),
    costOfGoodsSold: z.number(),
    profit: z.number(),
    profitMargin: z.number()
  })),
  totalRevenue: z.number(),
  totalCogs: z.number(),
  totalProfit: z.number(),
  averageMargin: z.number()
});

export type ProfitMarginReport = z.infer<typeof ProfitMarginReportSchema>;

/**
 * Calculates profit margins using FIFO (First-In, First-Out) methodology
 * Only accessible by admin and owner roles
 */
export async function onGetProfitMarginReport(): Promise<ProfitMarginReport> {
  const { user } = getContext();
  
  // Check authentication
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Check role-based access control
  if (!ALLOWED_ROLES.includes(user.role as Role)) {
    throw new Error('Not authorized - admin/owner access required');
  }

  const supabase = createSupabaseClient();

  try {
    // Fetch all inventory adjustments (stock transactions)
    const { data: allAdjustments, error: adjustmentsError } = await supabase
      .from('inventory_adjustments')
      .select('*')
      .order('created_at', { ascending: true });

    if (adjustmentsError) {
      throw new Error(`Failed to fetch inventory adjustments: ${adjustmentsError.message}`);
    }

    // Fetch all products
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    // Fetch all product batches
    const { data: allBatches, error: batchesError } = await supabase
      .from('product_batches')
      .select('*')
      .order('created_at', { ascending: true });

    if (batchesError) {
      throw new Error(`Failed to fetch product batches: ${batchesError.message}`);
    }

    // Filter for sale adjustments (subtract operations with "Sale" in reason)
    const saleAdjustments = (allAdjustments || []).filter(
      (adj: InventoryAdjustment) =>
        adj.adjustment_type === 'subtract' && adj.reason.startsWith('Sale')
    );

    // Create a deep copy of batches for FIFO calculations to avoid mutating original data
    const tempBatches: ProductBatch[] = JSON.parse(JSON.stringify(allBatches || []));

    // Calculate profit margins for each sale using FIFO methodology
    const salesWithProfit = saleAdjustments.map((sale: InventoryAdjustment) => {
      const product = (allProducts || []).find((p: Product) => p.id === sale.product_id);
      const saleQty = Math.abs(sale.quantity_adjusted);
      const revenue = (product?.price ?? 0) * saleQty;

      // Get batches for this product, sorted by creation date (FIFO)
      const productBatchesForFifo = tempBatches
        .filter((b: ProductBatch) => b.product_id === sale.product_id)
        .sort(
          (a: ProductBatch, b: ProductBatch) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      let costOfGoodsSold = 0;
      let qtyToFulfill = saleQty;

      // Apply FIFO logic to calculate cost of goods sold
      for (const batch of productBatchesForFifo) {
        if (qtyToFulfill === 0) break;

        const qtyFromBatch = Math.min(qtyToFulfill, batch.quantity_on_hand);
        costOfGoodsSold += qtyFromBatch * (batch.purchase_cost || 0);

        // Update temporary batch quantities for subsequent calculations
        batch.quantity_on_hand -= qtyFromBatch;
        qtyToFulfill -= qtyFromBatch;
      }

      const profit = revenue - costOfGoodsSold;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        ...sale,
        productName: product?.name ?? 'Unknown',
        revenue,
        costOfGoodsSold,
        profit,
        profitMargin
      };
    });

    // Calculate summary statistics
    const totalRevenue = salesWithProfit.reduce((sum, sale) => sum + sale.revenue, 0);
    const totalCogs = salesWithProfit.reduce((sum, sale) => sum + sale.costOfGoodsSold, 0);
    const totalProfit = totalRevenue - totalCogs;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const report: ProfitMarginReport = {
      salesWithProfit,
      totalRevenue,
      totalCogs,
      totalProfit,
      averageMargin
    };

    // Validate the response against the schema
    return ProfitMarginReportSchema.parse(report);

  } catch (error) {
    console.error('Error generating profit margin report:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate profit margin report');
  }
}

/**
 * Get profit margins for a specific date range
 * Only accessible by admin and owner roles
 */
export async function onGetProfitMarginReportByDateRange(
  startDate: string,
  endDate: string
): Promise<ProfitMarginReport> {
  const { user } = getContext();
  
  // Check authentication
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Check role-based access control
  if (!ALLOWED_ROLES.includes(user.role as Role)) {
    throw new Error('Not authorized - admin/owner access required');
  }

  // Validate date inputs
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }

  const supabase = createSupabaseClient();

  try {
    // Fetch inventory adjustments within date range
    const { data: allAdjustments, error: adjustmentsError } = await supabase
      .from('inventory_adjustments')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (adjustmentsError) {
      throw new Error(`Failed to fetch inventory adjustments: ${adjustmentsError.message}`);
    }

    // Fetch all products (we need all products to get correct pricing)
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    // Fetch all product batches (we need all batches for proper FIFO calculation)
    const { data: allBatches, error: batchesError } = await supabase
      .from('product_batches')
      .select('*')
      .order('created_at', { ascending: true });

    if (batchesError) {
      throw new Error(`Failed to fetch product batches: ${batchesError.message}`);
    }

    // Filter for sale adjustments within the date range
    const saleAdjustments = (allAdjustments || []).filter(
      (adj: InventoryAdjustment) =>
        adj.adjustment_type === 'subtract' && adj.reason.startsWith('Sale')
    );

    // Create a deep copy of batches for FIFO calculations
    const tempBatches: ProductBatch[] = JSON.parse(JSON.stringify(allBatches || []));

    // Calculate profit margins for each sale using FIFO methodology
    const salesWithProfit = saleAdjustments.map((sale: InventoryAdjustment) => {
      const product = (allProducts || []).find((p: Product) => p.id === sale.product_id);
      const saleQty = Math.abs(sale.quantity_adjusted);
      const revenue = (product?.price ?? 0) * saleQty;

      // Get batches for this product, sorted by creation date (FIFO)
      const productBatchesForFifo = tempBatches
        .filter((b: ProductBatch) => b.product_id === sale.product_id)
        .sort(
          (a: ProductBatch, b: ProductBatch) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      let costOfGoodsSold = 0;
      let qtyToFulfill = saleQty;

      // Apply FIFO logic to calculate cost of goods sold
      for (const batch of productBatchesForFifo) {
        if (qtyToFulfill === 0) break;

        const qtyFromBatch = Math.min(qtyToFulfill, batch.quantity_on_hand);
        costOfGoodsSold += qtyFromBatch * (batch.purchase_cost || 0);

        // Update temporary batch quantities for subsequent calculations
        batch.quantity_on_hand -= qtyFromBatch;
        qtyToFulfill -= qtyFromBatch;
      }

      const profit = revenue - costOfGoodsSold;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        ...sale,
        productName: product?.name ?? 'Unknown',
        revenue,
        costOfGoodsSold,
        profit,
        profitMargin
      };
    });

    // Calculate summary statistics
    const totalRevenue = salesWithProfit.reduce((sum, sale) => sum + sale.revenue, 0);
    const totalCogs = salesWithProfit.reduce((sum, sale) => sum + sale.costOfGoodsSold, 0);
    const totalProfit = totalRevenue - totalCogs;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const report: ProfitMarginReport = {
      salesWithProfit,
      totalRevenue,
      totalCogs,
      totalProfit,
      averageMargin
    };

    // Validate the response against the schema
    return ProfitMarginReportSchema.parse(report);

  } catch (error) {
    console.error('Error generating profit margin report by date range:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate profit margin report');
  }
}

/**
 * Get profit margins for a specific product
 * Only accessible by admin and owner roles
 */
export async function onGetProductProfitMargin(productId: string): Promise<ProfitMarginReport> {
  const { user } = getContext();
  
  // Check authentication
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Check role-based access control
  if (!ALLOWED_ROLES.includes(user.role as Role)) {
    throw new Error('Not authorized - admin/owner access required');
  }

  // Validate product ID
  if (!productId) {
    throw new Error('Product ID is required');
  }

  const supabase = createSupabaseClient();

  try {
    // Fetch inventory adjustments for the specific product
    const { data: allAdjustments, error: adjustmentsError } = await supabase
      .from('inventory_adjustments')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (adjustmentsError) {
      throw new Error(`Failed to fetch inventory adjustments: ${adjustmentsError.message}`);
    }

    // Fetch the specific product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) {
      throw new Error(`Failed to fetch product: ${productError.message}`);
    }

    // Fetch product batches for this product
    const { data: productBatches, error: batchesError } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (batchesError) {
      throw new Error(`Failed to fetch product batches: ${batchesError.message}`);
    }

    // Filter for sale adjustments
    const saleAdjustments = (allAdjustments || []).filter(
      (adj: InventoryAdjustment) =>
        adj.adjustment_type === 'subtract' && adj.reason.startsWith('Sale')
    );

    // Create a deep copy of batches for FIFO calculations
    const tempBatches: ProductBatch[] = JSON.parse(JSON.stringify(productBatches || []));

    // Calculate profit margins for each sale using FIFO methodology
    const salesWithProfit = saleAdjustments.map((sale: InventoryAdjustment) => {
      const saleQty = Math.abs(sale.quantity_adjusted);
      const revenue = (product?.price ?? 0) * saleQty;

      // Get batches for FIFO calculation, sorted by creation date
      const batchesForFifo = tempBatches
        .sort(
          (a: ProductBatch, b: ProductBatch) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      let costOfGoodsSold = 0;
      let qtyToFulfill = saleQty;

      // Apply FIFO logic to calculate cost of goods sold
      for (const batch of batchesForFifo) {
        if (qtyToFulfill === 0) break;

        const qtyFromBatch = Math.min(qtyToFulfill, batch.quantity_on_hand);
        costOfGoodsSold += qtyFromBatch * (batch.purchase_cost || 0);

        // Update temporary batch quantities for subsequent calculations
        batch.quantity_on_hand -= qtyFromBatch;
        qtyToFulfill -= qtyFromBatch;
      }

      const profit = revenue - costOfGoodsSold;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        ...sale,
        productName: product?.name ?? 'Unknown',
        revenue,
        costOfGoodsSold,
        profit,
        profitMargin
      };
    });

    // Calculate summary statistics
    const totalRevenue = salesWithProfit.reduce((sum, sale) => sum + sale.revenue, 0);
    const totalCogs = salesWithProfit.reduce((sum, sale) => sum + sale.costOfGoodsSold, 0);
    const totalProfit = totalRevenue - totalCogs;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const report: ProfitMarginReport = {
      salesWithProfit,
      totalRevenue,
      totalCogs,
      totalProfit,
      averageMargin
    };

    // Validate the response against the schema
    return ProfitMarginReportSchema.parse(report);

  } catch (error) {
    console.error('Error generating product profit margin report:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate product profit margin report');
  }
}
