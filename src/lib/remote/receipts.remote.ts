import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { createSupabaseClient, getAuthenticatedUser } from '$lib/server/db';
import type { ReceiptGeneration } from '$lib/types/receipt.schema';

// Receipt generation schema
const generateReceiptSchema = z.object({
	transaction_id: z.string(),
	format: z.enum(['thermal', 'a4', 'email']),
	delivery_method: z.enum(['print', 'email', 'sms']),
	recipient: z.object({
		email: z.string().email().optional(),
		phone: z.string().optional()
	}).optional()
});

// Receipt template schema
const receiptTemplateSchema = z.object({
	name: z.string().min(1),
	type: z.enum(['thermal', 'a4', 'email']),
	template_data: z.object({
		header: z.string().optional(),
		footer: z.string().optional(),
		show_logo: z.boolean().default(true),
		show_qr_code: z.boolean().default(false),
		font_size: z.enum(['small', 'medium', 'large']).default('medium')
	}),
	is_default: z.boolean().default(false)
});

// Generate receipt
export const generateReceipt = command(
	generateReceiptSchema,
	async (receiptData): Promise<any> => {
		const user = getAuthenticatedUser();
		console.log('🧾 [REMOTE] Generating receipt for transaction:', receiptData.transaction_id);
		
		const supabase = createSupabaseClient();
		
		// Get transaction details
		const { data: transaction, error: transactionError } = await supabase
			.from('transactions')
			.select(`
				*,
				transaction_items(*),
				transaction_payments(*)
			`)
			.eq('id', receiptData.transaction_id)
			.single();
		
		if (transactionError || !transaction) {
			console.error('❌ [REMOTE] Transaction not found:', transactionError);
			throw new Error('Transaction not found');
		}
		
		// Get receipt template
		const { data: template } = await supabase
			.from('receipt_templates')
			.select('*')
			.eq('type', receiptData.format)
			.eq('is_default', true)
			.single();
		
		// Generate receipt content
		const receiptContent = await generateReceiptContent(transaction, template, receiptData.format);
		
		// Create receipt record
		const { data: receipt, error: receiptError } = await supabase
			.from('receipts')
			.insert({
				transaction_id: receiptData.transaction_id,
				format: receiptData.format,
				delivery_method: receiptData.delivery_method,
				recipient_email: receiptData.recipient?.email,
				recipient_phone: receiptData.recipient?.phone,
				content: receiptContent,
				status: 'generated',
				generated_by: user.id,
				created_at: new Date().toISOString()
			})
			.select()
			.single();
		
		if (receiptError) {
			console.error('❌ [REMOTE] Receipt creation error:', receiptError);
			throw receiptError;
		}
		
		// Handle delivery
		try {
			await deliverReceipt(receipt, receiptData);
			
			// Update receipt status
			await supabase
				.from('receipts')
				.update({ 
					status: 'delivered',
					delivered_at: new Date().toISOString()
				})
				.eq('id', receipt.id);
				
		} catch (deliveryError) {
			console.error('❌ [REMOTE] Receipt delivery error:', deliveryError);
			
			// Update receipt status to failed
			await supabase
				.from('receipts')
				.update({ 
					status: 'failed',
					error_message: deliveryError instanceof Error ? deliveryError.message : 'Delivery failed'
				})
				.eq('id', receipt.id);
		}
		
		console.log('✅ [REMOTE] Receipt generated:', receipt.id);
		return receipt;
	}
);

// Get receipts
export const getReceipts = query(
	z.object({
		transaction_id: z.string().optional(),
		limit: z.number().default(50),
		offset: z.number().default(0)
	}).optional(),
	async (filters = {}): Promise<any[]> => {
		const user = getAuthenticatedUser();
		console.log('🧾 [REMOTE] Fetching receipts');
		
		const supabase = createSupabaseClient();
		
		let query = supabase
			.from('receipts')
			.select(`
				*,
				transaction:transactions(*)
			`)
			.order('created_at', { ascending: false })
			.limit(filters.limit || 50);
		
		if (filters.transaction_id) {
			query = query.eq('transaction_id', filters.transaction_id);
		}
		
		if (filters.offset) {
			query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
		}
		
		const { data, error } = await query;
		
		if (error) {
			console.error('❌ [REMOTE] Receipts fetch error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Fetched', data?.length || 0, 'receipts');
		return data || [];
	}
);

// Get receipt templates
export const getReceiptTemplates = query(async (): Promise<any[]> => {
	const user = getAuthenticatedUser();
	console.log('🧾 [REMOTE] Fetching receipt templates');
	
	const supabase = createSupabaseClient();
	
	const { data, error } = await supabase
		.from('receipt_templates')
		.select('*')
		.eq('is_active', true)
		.order('name', { ascending: true });
	
	if (error) {
		console.error('❌ [REMOTE] Receipt templates fetch error:', error);
		throw error;
	}
	
	console.log('✅ [REMOTE] Fetched', data?.length || 0, 'receipt templates');
	return data || [];
});

// Create receipt template
export const createReceiptTemplate = command(
	receiptTemplateSchema,
	async (templateData): Promise<any> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('receipts:write')) {
			throw new Error('Not authorized to create receipt templates');
		}
		
		console.log('🧾 [REMOTE] Creating receipt template:', templateData.name);
		
		const supabase = createSupabaseClient();
		
		// If this is set as default, remove default from others of same type
		if (templateData.is_default) {
			await supabase
				.from('receipt_templates')
				.update({ is_default: false })
				.eq('type', templateData.type);
		}
		
		const { data: template, error } = await supabase
			.from('receipt_templates')
			.insert({
				name: templateData.name,
				type: templateData.type,
				template_data: templateData.template_data,
				is_default: templateData.is_default,
				is_active: true,
				created_by: user.id,
				updated_by: user.id,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.select()
			.single();
		
		if (error) {
			console.error('❌ [REMOTE] Receipt template creation error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Receipt template created:', template.id);
		return template;
	}
);

// Helper function to generate receipt content
async function generateReceiptContent(transaction: any, template: any, format: string): Promise<string> {
	const businessInfo = {
		name: 'AZPOS Pharmacy',
		address: '123 Main St, City, Country',
		phone: '+1234567890',
		email: 'info@azpos.com'
	};
	
	let content = '';
	
	if (format === 'thermal') {
		content = generateThermalReceipt(transaction, businessInfo, template);
	} else if (format === 'a4') {
		content = generateA4Receipt(transaction, businessInfo, template);
	} else if (format === 'email') {
		content = generateEmailReceipt(transaction, businessInfo, template);
	}
	
	return content;
}

function generateThermalReceipt(transaction: any, businessInfo: any, template: any): string {
	return `
=================================
${businessInfo.name}
${businessInfo.address}
Tel: ${businessInfo.phone}
=================================

Receipt #: ${transaction.id}
Date: ${new Date(transaction.created_at).toLocaleString()}
Cashier: ${transaction.processed_by}

---------------------------------
${transaction.transaction_items.map((item: any) => 
	`${item.product_name}\n${item.quantity}x ${(item.unit_price / 100).toFixed(2)} = ${(item.total_amount / 100).toFixed(2)}`
).join('\n')}
---------------------------------

Subtotal: ${(transaction.subtotal / 100).toFixed(2)}
Tax: ${(transaction.tax_amount / 100).toFixed(2)}
${transaction.discount_amount > 0 ? `Discount: -${(transaction.discount_amount / 100).toFixed(2)}` : ''}
TOTAL: ${(transaction.total_amount / 100).toFixed(2)}

Payment Method: ${transaction.transaction_payments[0]?.payment_method || 'Cash'}

Thank you for your business!
=================================
	`.trim();
}

function generateA4Receipt(transaction: any, businessInfo: any, template: any): string {
	// Generate HTML for A4 receipt
	return `
		<html>
		<head><title>Receipt</title></head>
		<body>
			<h1>${businessInfo.name}</h1>
			<p>${businessInfo.address}</p>
			<hr>
			<p>Receipt #: ${transaction.id}</p>
			<p>Date: ${new Date(transaction.created_at).toLocaleString()}</p>
			<table>
				${transaction.transaction_items.map((item: any) => 
					`<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${(item.total_amount / 100).toFixed(2)}</td></tr>`
				).join('')}
			</table>
			<hr>
			<p>Total: ${(transaction.total_amount / 100).toFixed(2)}</p>
		</body>
		</html>
	`;
}

function generateEmailReceipt(transaction: any, businessInfo: any, template: any): string {
	// Generate HTML email receipt
	return generateA4Receipt(transaction, businessInfo, template);
}

// Helper function to deliver receipt
async function deliverReceipt(receipt: any, receiptData: any): Promise<void> {
	switch (receiptData.delivery_method) {
		case 'print':
			// In a real implementation, send to printer
			console.log('📄 Printing receipt:', receipt.id);
			break;
		case 'email':
			// In a real implementation, send email
			console.log('📧 Emailing receipt to:', receiptData.recipient?.email);
			break;
		case 'sms':
			// In a real implementation, send SMS
			console.log('📱 Sending SMS receipt to:', receiptData.recipient?.phone);
			break;
	}
}