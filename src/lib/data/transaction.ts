import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
	onGetTransactions,
	onGetTransaction,
	onCreateTransaction,
	onProcessRefund,
	onGetTransactionStats,
	onGenerateReceipt
} from '$lib/server/telefuncs/transaction.telefunc';
import type {
	Transaction,
	CreateTransaction,
	TransactionFilters,
	PaginatedTransactions,
	TransactionStats,
	RefundRequest
} from '$lib/types/transaction.schema';

const transactionsQueryKey = ['transactions'];
const transactionStatsQueryKey = ['transaction-stats'];

export function useTransactions() {
	const queryClient = useQueryClient();

	// State for filters
	let filters = $state<TransactionFilters>({
		page: 1,
		limit: 20,
		sort_by: 'processed_at',
		sort_order: 'desc'
	});

	// Query for paginated transactions
	const transactionsQuery = createQuery<PaginatedTransactions>({
		queryKey: $derived([...transactionsQueryKey, filters]),
		queryFn: () => onGetTransactions(filters)
	});

	// Query for transaction statistics
	const statsQuery = createQuery<TransactionStats>({
		queryKey: transactionStatsQueryKey,
		queryFn: () => onGetTransactionStats()
	});

	// Mutation to create transaction
	const createTransactionMutation = createMutation({
		mutationFn: (transactionData: CreateTransaction) => onCreateTransaction(transactionData),
		onSuccess: (newTransaction) => {
			// Invalidate and refetch transactions
			queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
			queryClient.invalidateQueries({ queryKey: transactionStatsQueryKey });

			// Optimistically add to cache
			queryClient.setQueryData<PaginatedTransactions>([...transactionsQueryKey, filters], (old) => {
				if (!old) return old;
				return {
					...old,
					transactions: [newTransaction, ...old.transactions]
				};
			});
		}
	});

	// Mutation to process refund
	const processRefundMutation = createMutation({
		mutationFn: (refundData: RefundRequest) => onProcessRefund(refundData),
		onSuccess: (updatedTransaction) => {
			// Invalidate and refetch transactions
			queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
			queryClient.invalidateQueries({ queryKey: transactionStatsQueryKey });

			// Update specific transaction in cache
			queryClient.setQueryData<Transaction>(
				['transaction', updatedTransaction.id],
				updatedTransaction
			);

			// Update transaction in list cache
			queryClient.setQueryData<PaginatedTransactions>([...transactionsQueryKey, filters], (old) => {
				if (!old) return old;
				return {
					...old,
					transactions: old.transactions.map((transaction) =>
						transaction.id === updatedTransaction.id ? updatedTransaction : transaction
					)
				};
			});
		}
	});

	// Mutation to generate receipt
	const generateReceiptMutation = createMutation({
		mutationFn: (transactionId: string) => onGenerateReceipt(transactionId)
	});

	// Derived reactive state
	const transactions = $derived(transactionsQuery.data?.transactions || []);
	const pagination = $derived(transactionsQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Filtered transactions
	const completedTransactions = $derived(
		transactions.filter((transaction: Transaction) => transaction.status === 'completed')
	);

	const pendingTransactions = $derived(
		transactions.filter((transaction: Transaction) => transaction.status === 'pending')
	);

	const refundedTransactions = $derived(
		transactions.filter(
			(transaction: Transaction) =>
				transaction.status === 'refunded' || transaction.status === 'partially_refunded'
		)
	);

	const cancelledTransactions = $derived(
		transactions.filter((transaction: Transaction) => transaction.status === 'cancelled')
	);

	const todaysTransactions = $derived(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return transactions.filter((transaction: Transaction) => {
			const transactionDate = new Date(transaction.processed_at);
			transactionDate.setHours(0, 0, 0, 0);
			return transactionDate.getTime() === today.getTime();
		});
	});

	// Helper functions
	function updateFilters(newFilters: Partial<TransactionFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function resetFilters() {
		filters = {
			page: 1,
			limit: 20,
			sort_by: 'processed_at',
			sort_order: 'desc'
		};
	}

	function goToPage(page: number) {
		updateFilters({ page });
	}

	function setSearch(search: string) {
		updateFilters({ search: search || undefined, page: 1 });
	}

	function setStatusFilter(status: TransactionFilters['status']) {
		updateFilters({ status, page: 1 });
	}

	function setCustomerFilter(customer_id: string | undefined) {
		updateFilters({ customer_id, page: 1 });
	}

	function setProcessedByFilter(processed_by: string | undefined) {
		updateFilters({ processed_by, page: 1 });
	}

	function setPaymentTypeFilter(payment_type: TransactionFilters['payment_type']) {
		updateFilters({ payment_type, page: 1 });
	}

	function setDateRange(date_from?: string, date_to?: string) {
		updateFilters({ date_from, date_to, page: 1 });
	}

	function setAmountRange(amount_min?: number, amount_max?: number) {
		updateFilters({ amount_min, amount_max, page: 1 });
	}

	function setRefundFilter(has_refund: boolean | undefined) {
		updateFilters({ has_refund, page: 1 });
	}

	function setSorting(
		sort_by: TransactionFilters['sort_by'],
		sort_order: TransactionFilters['sort_order']
	) {
		updateFilters({ sort_by, sort_order, page: 1 });
	}

	// Transaction operations
	function createTransaction(transactionData: CreateTransaction) {
		return createTransactionMutation.mutateAsync(transactionData);
	}

	function processRefund(refundData: RefundRequest) {
		return processRefundMutation.mutateAsync(refundData);
	}

	function generateReceipt(transactionId: string) {
		return generateReceiptMutation.mutateAsync(transactionId);
	}

	// Single transaction query helper
	function useTransaction(transactionId: string) {
		return createQuery<Transaction>({
			queryKey: ['transaction', transactionId],
			queryFn: () => onGetTransaction(transactionId),
			enabled: !!transactionId
		});
	}

	// Calculate totals for current view
	const currentViewTotals = $derived(() => {
		const total_amount = transactions.reduce(
			(sum: number, t: Transaction) => sum + t.total_amount,
			0
		);
		const refund_amount = transactions.reduce(
			(sum: number, t: Transaction) => sum + t.refund_amount,
			0
		);
		const net_amount = total_amount - refund_amount;
		const transaction_count = transactions.length;

		return {
			total_amount,
			refund_amount,
			net_amount,
			transaction_count,
			avg_transaction_value: transaction_count > 0 ? total_amount / transaction_count : 0
		};
	});

	return {
		// Queries and their states
		transactionsQuery,
		statsQuery,

		// Reactive data
		transactions,
		pagination,
		stats,

		// Filtered data
		completedTransactions,
		pendingTransactions,
		refundedTransactions,
		cancelledTransactions,
		todaysTransactions,

		// Current filters
		filters: $derived(filters),

		// Mutations
		createTransaction,
		createTransactionStatus: $derived(createTransactionMutation.status),

		processRefund,
		processRefundStatus: $derived(processRefundMutation.status),

		generateReceipt,
		generateReceiptStatus: $derived(generateReceiptMutation.status),
		generatedReceipt: $derived(generateReceiptMutation.data),

		// Filter helpers
		updateFilters,
		resetFilters,
		goToPage,
		setSearch,
		setStatusFilter,
		setCustomerFilter,
		setProcessedByFilter,
		setPaymentTypeFilter,
		setDateRange,
		setAmountRange,
		setRefundFilter,
		setSorting,

		// Single transaction helper
		useTransaction,

		// Calculated values
		currentViewTotals,

		// Loading states
		isLoading: $derived(transactionsQuery.isPending),
		isError: $derived(transactionsQuery.isError),
		error: $derived(transactionsQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
