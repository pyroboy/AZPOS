import { z } from 'zod';
import { inventoryAdjustmentSchema } from '$lib/schemas/models';

// Schema for individual sale with profit calculations
export const saleWithProfitSchema = inventoryAdjustmentSchema.extend({
	productName: z.string(),
	revenue: z.number(),
	costOfGoodsSold: z.number(),
	profit: z.number(),
	profitMargin: z.number() // Percentage value (e.g., 25.5 for 25.5%)
});

// Schema for the complete profit margin report
export const profitMarginReportSchema = z.object({
	salesWithProfit: z.array(saleWithProfitSchema)
});

// Export inferred TypeScript types
export type SaleWithProfit = z.infer<typeof saleWithProfitSchema>;
export type ProfitMarginReport = z.infer<typeof profitMarginReportSchema>;
