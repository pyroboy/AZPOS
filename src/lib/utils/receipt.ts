import type { ReceiptData } from '$lib/stores/receiptStore';

/**
 * Generates a plain text version of the receipt for simple logging or display.
 * @param receiptData - The data for the receipt.
 * @returns A string representing the plain text receipt.
 */
export function generateTextReceipt(receiptData: ReceiptData): string {
	const storeInfo = {
		name: 'AZPOS Pharmacy',
		address: '123 Health St, Wellness City, 1001',
		phone: '(012) 345-6789'
	};

	let text = ``;
	text += `${storeInfo.name}\n`;
	text += `${storeInfo.address}\n`;
	text += `${storeInfo.phone}\n\n`;
	text += `OFFICIAL RECEIPT\n`;
	text += `--------------------------------\n`;
	text += `Date: ${receiptData.timestamp.toLocaleDateString()} ${receiptData.timestamp.toLocaleTimeString()}\n`;
	text += `Transaction #: ${receiptData.transactionId}\n`;
	if (receiptData.customer) {
		text += `Customer: ${receiptData.customer}\n`;
	}
	text += `--------------------------------\n`;

	receiptData.items.forEach((item) => {
		const itemTotal = item.quantity * item.price;
		text += `${item.quantity}x ${item.name.padEnd(15, ' ')} @ ${item.price.toFixed(2).padStart(7, ' ')} = ${itemTotal.toFixed(2).padStart(7, ' ')}\n`;
	});

	text += `--------------------------------\n`;
	text += `Subtotal: ${receiptData.subtotal.toFixed(2).padStart(20, ' ')}\n`;
	text += `Discount: -${receiptData.discount.toFixed(2).padStart(19, ' ')}\n`;
	text += `VAT (12%): ${receiptData.tax.toFixed(2).padStart(19, ' ')}\n`;
	text += `TOTAL: ${receiptData.total.toFixed(2).padStart(23, ' ')}\n`;
	text += `--------------------------------\n`;
	text += `Payment Method: ${receiptData.paymentMethod.toUpperCase()}\n`;

	if (receiptData.paymentMethod === 'cash') {
		text += `Cash Tendered: ${receiptData.amountPaid.toFixed(2).padStart(15, ' ')}\n`;
		text += `Change: ${receiptData.change.toFixed(2).padStart(22, ' ')}\n`;
	} else if (receiptData.paymentMethod === 'gcash') {
		text += `Reference #: ${receiptData.gcashReference}\n`;
	}

	text += `\nThank you for your purchase!\n`;

	return text;
}

/**
 * Placeholder function for generating a QR code.
 * In a real app, this would use a library like 'qrcode'.
 * @param text - The text to encode in the QR code.
 * @returns A data URL for the QR code image.
 */
export async function generateQrCode(text: string): Promise<string> {
	// In a real implementation:
	// import qr from 'qrcode';
	// return await qr.toDataURL(text);

	// Placeholder implementation:
	console.log(`Generating QR Code for: ${text}`);
	// Return a placeholder image URL
	return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
}
