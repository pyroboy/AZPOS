import { getContext } from 'telefunc';
import {
	paymentProcessingSchema,
	paymentFiltersSchema,
	type PaymentResult,
	type PaymentProcessing,
	type PaginatedPayments,
	type PaymentStats
} from '$lib/types/payment.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper function to generate payment reference
function generatePaymentReference(): string {
	const timestamp = Date.now().toString();
	const random = Math.random().toString(36).substring(2, 8).toUpperCase();
	return `PAY-${timestamp.slice(-6)}-${random}`;
}

// Telefunc to process payment
export async function onProcessPayment(paymentData: unknown): Promise<PaymentResult> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const validatedData = paymentProcessingSchema.parse(paymentData);
	const supabase = createSupabaseClient();

	// Get payment method configuration
	const { data: paymentMethod, error: methodError } = await supabase
		.from('payment_methods')
		.select('*')
		.eq('id', validatedData.payment_method_id)
		.single();

	if (methodError || !paymentMethod || !paymentMethod.is_enabled) {
		throw new Error('Payment method not available');
	}

	const paymentReference = generatePaymentReference();
	const now = new Date().toISOString();

	let paymentResult: PaymentResult = {
		id: crypto.randomUUID(),
		status: 'pending',
		amount: validatedData.amount,
		payment_method_id: validatedData.payment_method_id,
		payment_method_type: validatedData.payment_method_type,
		reference: paymentReference,
		processed_at: now
	};

	try {
		// Process payment based on method type
		switch (validatedData.payment_method_type) {
			case 'cash':
				paymentResult = await processCashPayment(validatedData, paymentResult);
				break;
			case 'card':
				paymentResult = await processCardPayment(validatedData, paymentResult);
				break;
			case 'digital_wallet':
				paymentResult = await processDigitalWalletPayment(validatedData, paymentResult);
				break;
			case 'store_credit':
				paymentResult = await processStoreCreditPayment(validatedData, paymentResult);
				break;
			case 'gift_card':
				paymentResult = await processGiftCardPayment(validatedData, paymentResult);
				break;
			default:
				throw new Error(`Unsupported payment method: ${validatedData.payment_method_type}`);
		}

		// Calculate fees
		const fees = calculatePaymentFees(validatedData.amount, paymentMethod);
		paymentResult.fees = fees;

		// Save payment record
		const { error: saveError } = await supabase
			.from('payments')
			.insert({
				id: paymentResult.id,
				amount: paymentResult.amount,
				payment_method_id: paymentResult.payment_method_id,
				payment_method_type: paymentResult.payment_method_type,
				status: paymentResult.status,
				reference: paymentResult.reference,
				transaction_id: paymentResult.transaction_id,
				gateway_response: paymentResult.gateway_response,
				fees: paymentResult.fees,
				metadata: validatedData.metadata,
				processed_by: user.id,
				processed_at: paymentResult.processed_at,
				error_message: paymentResult.error_message
			})
			.select()
			.single();

		if (saveError) throw saveError;

		return paymentResult;
	} catch (error) {
		// Update payment status to failed
		paymentResult.status = 'failed';
		paymentResult.error_message =
			error instanceof Error ? error.message : 'Payment processing failed';

		// Save failed payment record
		await supabase.from('payments').insert({
			id: paymentResult.id,
			amount: paymentResult.amount,
			payment_method_id: paymentResult.payment_method_id,
			payment_method_type: paymentResult.payment_method_type,
			status: paymentResult.status,
			reference: paymentResult.reference,
			metadata: validatedData.metadata,
			processed_by: user.id,
			processed_at: paymentResult.processed_at,
			error_message: paymentResult.error_message
		});

		return paymentResult;
	}
}

// Helper function to process cash payment
async function processCashPayment(
	_paymentData: PaymentProcessing,
	paymentResult: PaymentResult
): Promise<PaymentResult> {
	// Cash payments are always successful if amount is valid
	if (_paymentData.amount <= 0) {
		throw new Error('Invalid cash amount');
	}

	paymentResult.status = 'completed';
	paymentResult.reference = `CASH-${paymentResult.reference}`;

	return paymentResult;
}

// Helper function to process card payment
async function processCardPayment(
	_paymentData: PaymentProcessing,
	paymentResult: PaymentResult
): Promise<PaymentResult> {
	// In a real implementation, this would integrate with a payment gateway
	// For now, we'll simulate the process

	// Simulate gateway processing delay
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Simulate success/failure (90% success rate)
	const isSuccessful = Math.random() > 0.1;

	if (isSuccessful) {
		paymentResult.status = 'completed';
		paymentResult.transaction_id = `TXN-${crypto.randomUUID().substring(0, 8)}`;
		paymentResult.gateway_response = {
			code: '00',
			message: 'Approved',
			transaction_id: paymentResult.transaction_id,
			authorization_code: `AUTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
		};
	} else {
		throw new Error('Card declined');
	}

	return paymentResult;
}

// Helper function to process digital wallet payment
async function processDigitalWalletPayment(
	_paymentData: PaymentProcessing,
	paymentResult: PaymentResult
): Promise<PaymentResult> {
	// Similar to card payment but with different processing
	await new Promise((resolve) => setTimeout(resolve, 500));

	const isSuccessful = Math.random() > 0.05; // 95% success rate for digital wallets

	if (isSuccessful) {
		paymentResult.status = 'completed';
		paymentResult.transaction_id = `WALLET-${crypto.randomUUID().substring(0, 8)}`;
		paymentResult.gateway_response = {
			code: 'SUCCESS',
			message: 'Payment completed',
			transaction_id: paymentResult.transaction_id
		};
	} else {
		throw new Error('Digital wallet payment failed');
	}

	return paymentResult;
}

// Helper function to process store credit payment
async function processStoreCreditPayment(
	paymentData: PaymentProcessing,
	paymentResult: PaymentResult
): Promise<PaymentResult> {
	const supabase = createSupabaseClient();

	// Get store credit balance
	const storeCreditId = paymentData.metadata?.store_credit_id;
	if (!storeCreditId) {
		throw new Error('Store credit ID required');
	}

	const { data: storeCredit, error } = await supabase
		.from('store_credits')
		.select('*')
		.eq('id', storeCreditId)
		.single();

	if (error || !storeCredit) {
		throw new Error('Store credit not found');
	}

	if (storeCredit.balance < paymentData.amount) {
		throw new Error('Insufficient store credit balance');
	}

	// Deduct amount from store credit
	await supabase
		.from('store_credits')
		.update({
			balance: storeCredit.balance - paymentData.amount,
			updated_at: new Date().toISOString()
		})
		.eq('id', storeCreditId);

	paymentResult.status = 'completed';
	paymentResult.reference = `CREDIT-${paymentResult.reference}`;

	return paymentResult;
}

// Helper function to process gift card payment
async function processGiftCardPayment(
	paymentData: PaymentProcessing,
	paymentResult: PaymentResult
): Promise<PaymentResult> {
	const supabase = createSupabaseClient();

	// Get gift card details
	const giftCardNumber = paymentData.metadata?.gift_card_number;
	if (!giftCardNumber) {
		throw new Error('Gift card number required');
	}

	const { data: giftCard, error } = await supabase
		.from('gift_cards')
		.select('*')
		.eq('card_number', giftCardNumber)
		.single();

	if (error || !giftCard) {
		throw new Error('Gift card not found');
	}

	if (!giftCard.is_active) {
		throw new Error('Gift card is not active');
	}

	if (giftCard.balance < paymentData.amount) {
		throw new Error('Insufficient gift card balance');
	}

	// Deduct amount from gift card
	await supabase
		.from('gift_cards')
		.update({
			balance: giftCard.balance - paymentData.amount,
			updated_at: new Date().toISOString()
		})
		.eq('id', giftCard.id);

	paymentResult.status = 'completed';
	paymentResult.reference = `GIFT-${paymentResult.reference}`;

	return paymentResult;
}

// Helper function to calculate payment fees
function calculatePaymentFees(
	amount: number,
	paymentMethod: { settings?: { fixed_fee?: number; percentage_fee?: number } }
): { fixed_fee: number; percentage_fee: number; total_fee: number } {
	const settings = paymentMethod.settings || {};
	const fixedFee = settings.fixed_fee || 0;
	const percentageFee = settings.percentage_fee || 0;

	const calculatedPercentageFee = (amount * percentageFee) / 100;
	const totalFee = fixedFee + calculatedPercentageFee;

	return {
		fixed_fee: fixedFee,
		percentage_fee: calculatedPercentageFee,
		total_fee: totalFee
	};
}

// Telefunc to get paginated payments
export async function onGetPayments(filters?: unknown): Promise<PaginatedPayments> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const supabase = createSupabaseClient();
	const validatedFilters = filters ? paymentFiltersSchema.parse(filters) : {};

	const page = validatedFilters.page || 1;
	const limit = validatedFilters.limit || 20;
	const offset = (page - 1) * limit;

	let query = supabase.from('payments').select('*', { count: 'exact' });

	// Apply filters
	if (validatedFilters.search) {
		query = query.or(
			`reference.ilike.%${validatedFilters.search}%,transaction_id.ilike.%${validatedFilters.search}%`
		);
	}

	if (validatedFilters.status && validatedFilters.status !== 'all') {
		query = query.eq('status', validatedFilters.status);
	}

	if (validatedFilters.payment_method_type) {
		query = query.eq('payment_method_type', validatedFilters.payment_method_type);
	}

	if (validatedFilters.amount_min) {
		query = query.gte('amount', validatedFilters.amount_min);
	}

	if (validatedFilters.amount_max) {
		query = query.lte('amount', validatedFilters.amount_max);
	}

	if (validatedFilters.date_from) {
		query = query.gte('processed_at', validatedFilters.date_from);
	}

	if (validatedFilters.date_to) {
		query = query.lte('processed_at', validatedFilters.date_to);
	}

	// Apply sorting
	const sortBy = validatedFilters.sort_by || 'processed_at';
	const sortOrder = validatedFilters.sort_order || 'desc';
	query = query.order(sortBy, { ascending: sortOrder === 'asc' });

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	const { data: payments, error, count } = await query;
	if (error) throw error;

	const totalPages = Math.ceil((count || 0) / limit);

	return {
		payments: payments || [],
		pagination: {
			page,
			limit,
			total: count || 0,
			total_pages: totalPages,
			has_more: page < totalPages
		}
	};
}

// Telefunc to get payment statistics
export async function onGetPaymentStats(dateFrom?: string, dateTo?: string): Promise<PaymentStats> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const supabase = createSupabaseClient();

	let query = supabase
		.from('payments')
		.select('status, amount, payment_method_type, processed_at, fees');

	if (dateFrom) {
		query = query.gte('processed_at', dateFrom);
	}

	if (dateTo) {
		query = query.lte('processed_at', dateTo);
	}

	const { data: payments, error } = await query;
	if (error) throw error;

	const stats = payments?.reduce(
		(acc, payment) => {
			acc.total_payments++;
			acc.total_amount += payment.amount;

			switch (payment.status) {
				case 'completed':
					acc.successful_payments++;
					break;
				case 'failed':
					acc.failed_payments++;
					break;
				case 'refunded':
					acc.refunded_payments++;
					acc.total_refunds += payment.amount;
					break;
			}

			// Payment method breakdown
			if (!acc.payment_method_breakdown[payment.payment_method_type]) {
				acc.payment_method_breakdown[payment.payment_method_type] = {
					count: 0,
					total_amount: 0,
					percentage: 0,
					avg_amount: 0
				};
			}
			acc.payment_method_breakdown[payment.payment_method_type].count++;
			acc.payment_method_breakdown[payment.payment_method_type].total_amount += payment.amount;

			return acc;
		},
		{
			total_payments: 0,
			total_amount: 0,
			successful_payments: 0,
			failed_payments: 0,
			refunded_payments: 0,
			total_refunds: 0,
			net_amount: 0,
			avg_payment_amount: 0,
			payment_method_breakdown: {} as Record<
				string,
				{ count: number; total_amount: number; percentage: number; avg_amount: number }
			>
		}
	) || {
		total_payments: 0,
		total_amount: 0,
		successful_payments: 0,
		failed_payments: 0,
		refunded_payments: 0,
		total_refunds: 0,
		net_amount: 0,
		avg_payment_amount: 0,
		payment_method_breakdown: {}
	};

	// Calculate derived values
	stats.net_amount = stats.total_amount - stats.total_refunds;
	stats.avg_payment_amount =
		stats.successful_payments > 0 ? stats.total_amount / stats.successful_payments : 0;

	// Calculate payment method percentages and averages
	Object.keys(stats.payment_method_breakdown).forEach((method) => {
		const methodStats = stats.payment_method_breakdown[method];
		methodStats.percentage =
			stats.total_amount > 0 ? (methodStats.total_amount / stats.total_amount) * 100 : 0;
		methodStats.avg_amount =
			methodStats.count > 0 ? methodStats.total_amount / methodStats.count : 0;
	});

	return stats;
}
