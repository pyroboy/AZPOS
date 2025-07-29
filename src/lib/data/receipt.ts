import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGenerateReceipt = async (receiptData: ReceiptGeneration): Promise<GeneratedReceipt> => {
	const { onGenerateReceipt } = await import('$lib/server/telefuncs/receipt.telefunc');
	return onGenerateReceipt(receiptData);
};

const onGetReceipts = async (filters: ReceiptFilters): Promise<PaginatedReceipts> => {
	const { onGetReceipts } = await import('$lib/server/telefuncs/receipt.telefunc');
	return onGetReceipts(filters);
};

const onGetReceiptStats = async (): Promise<ReceiptStats> => {
	const { onGetReceiptStats } = await import('$lib/server/telefuncs/receipt.telefunc');
	return onGetReceiptStats();
};
import type {
	GeneratedReceipt,
	ReceiptGeneration,
	ReceiptFilters,
	PaginatedReceipts,
	ReceiptStats
} from '$lib/types/receipt.schema';

const receiptsQueryKey = ['receipts'];
const receiptStatsQueryKey = ['receipt-stats'];

export function useReceipts() {
	const queryClient = useQueryClient();

	// State for filters
	let filters = $state<ReceiptFilters>({
		page: 1,
		limit: 20,
		sort_by: 'generated_at',
		sort_order: 'desc'
	});

	// Query for paginated receipts
	const receiptsQuery = createQuery<PaginatedReceipts>({
		queryKey: $derived([...receiptsQueryKey, filters]),
		queryFn: () => onGetReceipts(filters)
	});

	// Query for receipt statistics
	const statsQuery = createQuery<ReceiptStats>({
		queryKey: receiptStatsQueryKey,
		queryFn: () => onGetReceiptStats()
	});

	// Mutation to generate receipt
	const generateReceiptMutation = createMutation({
		mutationFn: (receiptData: ReceiptGeneration) => onGenerateReceipt(receiptData),
		onSuccess: (newReceipt) => {
			// Invalidate and refetch receipts
			queryClient.invalidateQueries({ queryKey: receiptsQueryKey });
			queryClient.invalidateQueries({ queryKey: receiptStatsQueryKey });

			// Optimistically add to cache
			queryClient.setQueryData<PaginatedReceipts>([...receiptsQueryKey, filters], (old) => {
				if (!old) return old;
				return {
					...old,
					receipts: [newReceipt, ...old.receipts]
				};
			});
		}
	});

	// Derived reactive state
	const receipts = $derived(receiptsQuery.data?.receipts || []);
	const pagination = $derived(receiptsQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Filtered receipts
	const printedReceipts = $derived(
		receipts.filter((receipt: any) => receipt.delivery_method === 'print')
	);

	const emailedReceipts = $derived(
		receipts.filter((receipt: any) => receipt.delivery_method === 'email')
	);

	const smsReceipts = $derived(receipts.filter((receipt: any) => receipt.delivery_method === 'sms'));

	const downloadedReceipts = $derived(
		receipts.filter((receipt: any) => receipt.delivery_method === 'download')
	);

	const failedReceipts = $derived(
		receipts.filter((receipt: any) => receipt.delivery_status === 'failed')
	);

	const pendingReceipts = $derived(
		receipts.filter((receipt: any) => receipt.delivery_status === 'pending')
	);

	const todaysReceipts = $derived(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return receipts.filter((receipt: any) => {
			const receiptDate = new Date(receipt.generated_at);
			receiptDate.setHours(0, 0, 0, 0);
			return receiptDate.getTime() === today.getTime();
		});
	});

	// Delivery method breakdown
	const deliveryMethodBreakdown = $derived(() => {
		const breakdown: Record<string, { count: number; percentage: number }> = {};

		receipts.forEach((receipt: any) => {
			if (!breakdown[receipt.delivery_method]) {
				breakdown[receipt.delivery_method] = { count: 0, percentage: 0 };
			}
			breakdown[receipt.delivery_method].count++;
		});

		// Calculate percentages
		const total = receipts.length;
		Object.keys(breakdown).forEach((method) => {
			breakdown[method].percentage = total > 0 ? (breakdown[method].count / total) * 100 : 0;
		});

		return breakdown;
	});

	// Format breakdown
	const formatBreakdown = $derived(() => {
		const breakdown: Record<string, { count: number; percentage: number }> = {};

		receipts.forEach((receipt: any) => {
			if (!breakdown[receipt.format]) {
				breakdown[receipt.format] = { count: 0, percentage: 0 };
			}
			breakdown[receipt.format].count++;
		});

		// Calculate percentages
		const total = receipts.length;
		Object.keys(breakdown).forEach((format) => {
			breakdown[format].percentage = total > 0 ? (breakdown[format].count / total) * 100 : 0;
		});

		return breakdown;
	});

	// Helper functions
	function updateFilters(newFilters: Partial<ReceiptFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function resetFilters() {
		filters = {
			page: 1,
			limit: 20,
			sort_by: 'generated_at',
			sort_order: 'desc'
		};
	}

	function goToPage(page: number) {
		updateFilters({ page });
	}

	function setSearch(search: string) {
		updateFilters({ search: search || undefined, page: 1 });
	}

	function setTransactionFilter(transaction_id: string) {
		updateFilters({ transaction_id: transaction_id || undefined, page: 1 });
	}

	function setTemplateFilter(template_id: string) {
		updateFilters({ template_id: template_id || undefined, page: 1 });
	}

	function setFormatFilter(format: ReceiptFilters['format']) {
		updateFilters({ format, page: 1 });
	}

	function setDeliveryMethodFilter(delivery_method: ReceiptFilters['delivery_method']) {
		updateFilters({ delivery_method, page: 1 });
	}

	function setDeliveryStatusFilter(delivery_status: ReceiptFilters['delivery_status']) {
		updateFilters({ delivery_status, page: 1 });
	}

	function setDateRange(date_from?: string, date_to?: string) {
		updateFilters({ date_from, date_to, page: 1 });
	}

	function setSorting(
		sort_by: ReceiptFilters['sort_by'],
		sort_order: ReceiptFilters['sort_order']
	) {
		updateFilters({ sort_by, sort_order, page: 1 });
	}

	// Receipt operations
	function generateReceipt(receiptData: ReceiptGeneration) {
		return generateReceiptMutation.mutateAsync(receiptData);
	}

	// Receipt status helpers
	function isReceiptDelivered(receipt: GeneratedReceipt): boolean {
		return receipt.delivery_status === 'sent';
	}

	function isReceiptFailed(receipt: GeneratedReceipt): boolean {
		return receipt.delivery_status === 'failed';
	}

	function isReceiptPending(receipt: GeneratedReceipt): boolean {
		return receipt.delivery_status === 'pending';
	}

	function getDeliveryStatusColor(status: GeneratedReceipt['delivery_status']): string {
		switch (status) {
			case 'sent':
				return 'success';
			case 'failed':
				return 'error';
			case 'pending':
				return 'warning';
			default:
				return 'secondary';
		}
	}

	function getDeliveryMethodIcon(method: GeneratedReceipt['delivery_method']): string {
		switch (method) {
			case 'print':
				return 'printer';
			case 'email':
				return 'email';
			case 'sms':
				return 'phone';
			case 'download':
				return 'download';
			default:
				return 'receipt';
		}
	}

	// Format helpers
	function formatReceiptNumber(receipt: GeneratedReceipt): string {
		return receipt.receipt_number;
	}

	function formatDeliveryMethod(method: GeneratedReceipt['delivery_method']): string {
		switch (method) {
			case 'print':
				return 'Print';
			case 'email':
				return 'Email';
			case 'sms':
				return 'SMS';
			case 'download':
				return 'Download';
			default:
				return method;
		}
	}

	function formatDeliveryStatus(status: GeneratedReceipt['delivery_status']): string {
		switch (status) {
			case 'sent':
				return 'Delivered';
			case 'failed':
				return 'Failed';
			case 'pending':
				return 'Pending';
			default:
				return status;
		}
	}

	// Calculate totals for current view
	const currentViewTotals = $derived(() => {
		const total_receipts = receipts.length;
		const successful_deliveries = receipts.filter((r: any) => r.delivery_status === 'sent').length;
		const failed_deliveries = receipts.filter((r: any) => r.delivery_status === 'failed').length;
		const pending_deliveries = receipts.filter((r: any) => r.delivery_status === 'pending').length;
		const success_rate = total_receipts > 0 ? (successful_deliveries / total_receipts) * 100 : 0;

		return {
			total_receipts,
			successful_deliveries,
			failed_deliveries,
			pending_deliveries,
			success_rate
		};
	});

	return {
		// Queries and their states
		receiptsQuery,
		statsQuery,

		// Reactive data
		receipts,
		pagination,
		stats,

		// Filtered data
		printedReceipts,
		emailedReceipts,
		smsReceipts,
		downloadedReceipts,
		failedReceipts,
		pendingReceipts,
		todaysReceipts,

		// Calculated data
		deliveryMethodBreakdown,
		formatBreakdown,
		currentViewTotals,

		// Current filters
		filters: $derived(filters),

		// Mutations
		generateReceipt,
		generateReceiptStatus: $derived(generateReceiptMutation.status),

		// Filter helpers
		updateFilters,
		resetFilters,
		goToPage,
		setSearch,
		setTransactionFilter,
		setTemplateFilter,
		setFormatFilter,
		setDeliveryMethodFilter,
		setDeliveryStatusFilter,
		setDateRange,
		setSorting,

		// Receipt helpers
		isReceiptDelivered,
		isReceiptFailed,
		isReceiptPending,
		getDeliveryStatusColor,
		getDeliveryMethodIcon,
		formatReceiptNumber,
		formatDeliveryMethod,
		formatDeliveryStatus,

		// Loading states
		isLoading: $derived(receiptsQuery.isPending),
		isError: $derived(receiptsQuery.isError),
		error: $derived(receiptsQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
