// Simple settings store for AZPOS
export const settings = $state({
	storeName: 'AZPOS Store',
	timezone: 'UTC',
	currency: 'USD',
	language: 'en',
	receiptTemplate: 'default',
	lowStockThreshold: 10,
	enableNotifications: true,
	enableEmailReceipts: false
});
