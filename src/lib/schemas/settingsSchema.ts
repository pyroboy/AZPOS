import { z } from 'zod';

export const settingsSchema = z.object({
	store_name: z.string().min(1, 'Store name is required'),
	address: z.string().min(1, 'Address is required'),
	tin: z.string().min(1, 'TIN is required'),
	currency: z.string().min(1, 'Currency is required'),
	tax_rates: z
		.array(
			z.object({
				name: z.string().min(1, 'Tax rate name is required'),
				rate: z.number().min(0, 'Tax rate must be non-negative')
			})
		)
		.default([]),
	timezone: z.string().optional(),
	language: z.string().optional(),
	pin: z.string().optional() // For PIN override on tax changes
});

export type Settings = z.infer<typeof settingsSchema>;
