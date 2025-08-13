import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { createSupabaseClient, getAuthenticatedUser } from '$lib/server/db';

// Payment processing schema
const processPaymentSchema = z.object({
	amount: z.number().min(0),
	payment_method_id: z.string(),
	payment_method_type: z.enum(['cash', 'card', 'gcash', 'bank_transfer']),
	reference: z.string().optional(),
	metadata: z.object({
		amount_tendered: z.number().optional(),
		change_given: z.number().optional(),
		customer: z.string().optional()
	}).optional()
});

// Payment result type
type PaymentResult = {
	success: boolean;
	payment_id?: string;
	error_message?: string;
	transaction_reference?: string;
};

// Process payment
export const processPayment = command(
	processPaymentSchema,
	async (paymentData): Promise<PaymentResult> => {
		const user = getAuthenticatedUser();
		console.log('💰 [REMOTE] Processing payment:', paymentData.payment_method_type);
		
		const supabase = createSupabaseClient();
		
		try {
			// For demo purposes, we'll simulate payment processing
			// In a real implementation, you'd integrate with actual payment processors
			
			let paymentResult: PaymentResult;
			
			switch (paymentData.payment_method_type) {
				case 'cash':
					paymentResult = await processCashPayment(paymentData);
					break;
				case 'card':
					paymentResult = await processCardPayment(paymentData);
					break;
				case 'gcash':
					paymentResult = await processGCashPayment(paymentData);
					break;
				case 'bank_transfer':
					paymentResult = await processBankTransferPayment(paymentData);
					break;
				default:
					throw new Error('Unsupported payment method');
			}
			
			// Log payment attempt
			const { error: logError } = await supabase
				.from('payment_logs')
				.insert({
					payment_method: paymentData.payment_method_type,
					amount: paymentData.amount,
					status: paymentResult.success ? 'success' : 'failed',
					error_message: paymentResult.error_message,
					reference: paymentData.reference,
					processed_by: user.id,
					created_at: new Date().toISOString()
				});
			
			if (logError) {
				console.error('❌ [REMOTE] Payment log error:', logError);
			}
			
			console.log('✅ [REMOTE] Payment processed:', paymentResult.success ? 'success' : 'failed');
			return paymentResult;
			
		} catch (error) {
			console.error('❌ [REMOTE] Payment processing error:', error);
			return {
				success: false,
				error_message: error instanceof Error ? error.message : 'Unknown payment error'
			};
		}
	}
);

// Get payment methods
export const getPaymentMethods = query(async (): Promise<any[]> => {
	const user = getAuthenticatedUser();
	console.log('💰 [REMOTE] Fetching payment methods');
	
	const supabase = createSupabaseClient();
	
	const { data, error } = await supabase
		.from('payment_methods')
		.select('*')
		.eq('is_active', true)
		.order('display_order', { ascending: true });
	
	if (error) {
		console.error('❌ [REMOTE] Payment methods fetch error:', error);
		throw error;
	}
	
	console.log('✅ [REMOTE] Fetched', data?.length || 0, 'payment methods');
	return data || [];
});

// Helper function to check if payment was successful
export const isPaymentSuccessful = query(
	z.object({ payment_result: z.any() }),
	async ({ payment_result }): Promise<boolean> => {
		return payment_result?.success === true;
	}
);

// Payment processor implementations
async function processCashPayment(paymentData: any): Promise<PaymentResult> {
	// Cash payments are always successful if tendered amount >= payment amount
	const amountTendered = paymentData.metadata?.amount_tendered || 0;
	
	if (amountTendered >= paymentData.amount) {
		return {
			success: true,
			payment_id: `cash_${Date.now()}`,
			transaction_reference: `CASH${Date.now()}`
		};
	} else {
		return {
			success: false,
			error_message: 'Insufficient cash tendered'
		};
	}
}

async function processCardPayment(paymentData: any): Promise<PaymentResult> {
	// Simulate card processing - in real implementation, integrate with payment gateway
	// For demo, we'll simulate 95% success rate
	const isSuccessful = Math.random() > 0.05;
	
	if (isSuccessful) {
		return {
			success: true,
			payment_id: `card_${Date.now()}`,
			transaction_reference: `CARD${Date.now()}`
		};
	} else {
		return {
			success: false,
			error_message: 'Card payment declined'
		};
	}
}

async function processGCashPayment(paymentData: any): Promise<PaymentResult> {
	// Simulate GCash processing
	// Check if reference number is provided
	if (!paymentData.reference) {
		return {
			success: false,
			error_message: 'GCash reference number required'
		};
	}
	
	// Simulate validation of reference number
	const isValidReference = paymentData.reference.length >= 10;
	
	if (isValidReference) {
		return {
			success: true,
			payment_id: `gcash_${Date.now()}`,
			transaction_reference: paymentData.reference
		};
	} else {
		return {
			success: false,
			error_message: 'Invalid GCash reference number'
		};
	}
}

async function processBankTransferPayment(paymentData: any): Promise<PaymentResult> {
	// Simulate bank transfer processing
	// In real implementation, integrate with banking APIs
	return {
		success: true,
		payment_id: `bank_${Date.now()}`,
		transaction_reference: `BANK${Date.now()}`
	};
}