import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { 
  onProcessPayment, 
  onGetPayments, 
  onGetPaymentStats 
} from '$lib/server/telefuncs/payment.telefunc';
import type { 
  PaymentResult, 
  PaymentProcessing, 
  PaymentFilters, 
  PaginatedPayments, 
  PaymentStats
} from '$lib/types/payment.schema';

const paymentsQueryKey = ['payments'];
const paymentStatsQueryKey = ['payment-stats'];

export function usePayments() {
  const queryClient = useQueryClient();

  // State for filters
  let filters = $state<PaymentFilters>({
    page: 1,
    limit: 20,
    sort_by: 'processed_at',
    sort_order: 'desc'
  });

  // Query for paginated payments
  const paymentsQuery = createQuery<PaginatedPayments>({
    queryKey: $derived([...paymentsQueryKey, filters]),
    queryFn: () => onGetPayments(filters)
  });

  // Query for payment statistics
  const statsQuery = createQuery<PaymentStats>({
    queryKey: paymentStatsQueryKey,
    queryFn: () => onGetPaymentStats()
  });

  // Mutation to process payment
  const processPaymentMutation = createMutation({
    mutationFn: (paymentData: PaymentProcessing) => onProcessPayment(paymentData),
    onSuccess: (newPayment) => {
      // Invalidate and refetch payments
      queryClient.invalidateQueries({ queryKey: paymentsQueryKey });
      queryClient.invalidateQueries({ queryKey: paymentStatsQueryKey });
      
      // Optimistically add to cache
      queryClient.setQueryData<PaginatedPayments>(
        [...paymentsQueryKey, filters],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            payments: [newPayment, ...old.payments]
          };
        }
      );
    }
  });

  // Derived reactive state
  const payments = $derived(paymentsQuery.data?.payments || []);
  const pagination = $derived(paymentsQuery.data?.pagination);
  const stats = $derived(statsQuery.data);
  
  // Filtered payments
  const successfulPayments = $derived(
    payments.filter(payment => payment.status === 'completed')
  );
  
  const failedPayments = $derived(
    payments.filter(payment => payment.status === 'failed')
  );
  
  const pendingPayments = $derived(
    payments.filter(payment => payment.status === 'pending' || payment.status === 'processing')
  );
  
  const refundedPayments = $derived(
    payments.filter(payment => payment.status === 'refunded')
  );
  
  const todaysPayments = $derived(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return payments.filter(payment => {
      const paymentDate = new Date(payment.processed_at);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate.getTime() === today.getTime();
    });
  });

  // Payment method breakdown
  const paymentMethodBreakdown = $derived(() => {
    const breakdown: Record<string, { count: number; total: number }> = {};
    
    payments.forEach(payment => {
      if (payment.status === 'completed') {
        if (!breakdown[payment.payment_method_type]) {
          breakdown[payment.payment_method_type] = { count: 0, total: 0 };
        }
        breakdown[payment.payment_method_type].count++;
        breakdown[payment.payment_method_type].total += payment.amount;
      }
    });
    
    return breakdown;
  });

  // Helper functions
  function updateFilters(newFilters: Partial<PaymentFilters>) {
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

  function setStatusFilter(status: PaymentFilters['status']) {
    updateFilters({ status, page: 1 });
  }

  function setPaymentMethodFilter(payment_method_type: PaymentFilters['payment_method_type']) {
    updateFilters({ payment_method_type, page: 1 });
  }

  function setAmountRange(amount_min?: number, amount_max?: number) {
    updateFilters({ amount_min, amount_max, page: 1 });
  }

  function setDateRange(date_from?: string, date_to?: string) {
    updateFilters({ date_from, date_to, page: 1 });
  }

  function setSorting(sort_by: PaymentFilters['sort_by'], sort_order: PaymentFilters['sort_order']) {
    updateFilters({ sort_by, sort_order, page: 1 });
  }

  // Payment operations
  function processPayment(paymentData: PaymentProcessing) {
    return processPaymentMutation.mutateAsync(paymentData);
  }

  // Calculate totals for current view
  const currentViewTotals = $derived(() => {
    const successful = payments.filter(p => p.status === 'completed');
    const total_amount = successful.reduce((sum, p) => sum + p.amount, 0);
    const total_fees = successful.reduce((sum, p) => sum + (p.fees?.total_fee || 0), 0);
    const net_amount = total_amount - total_fees;
    const payment_count = successful.length;
    
    return {
      total_amount,
      total_fees,
      net_amount,
      payment_count,
      avg_payment_amount: payment_count > 0 ? total_amount / payment_count : 0
    };
  });

  // Payment status helpers
  function isPaymentSuccessful(payment: PaymentResult): boolean {
    return payment.status === 'completed';
  }

  function isPaymentFailed(payment: PaymentResult): boolean {
    return payment.status === 'failed';
  }

  function isPaymentPending(payment: PaymentResult): boolean {
    return payment.status === 'pending' || payment.status === 'processing';
  }

  function getPaymentStatusColor(status: PaymentResult['status']): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'secondary';
      case 'refunded':
        return 'info';
      default:
        return 'secondary';
    }
  }

  return {
    // Queries and their states
    paymentsQuery,
    statsQuery,
    
    // Reactive data
    payments,
    pagination,
    stats,
    
    // Filtered data
    successfulPayments,
    failedPayments,
    pendingPayments,
    refundedPayments,
    todaysPayments,
    
    // Calculated data
    paymentMethodBreakdown,
    currentViewTotals,
    
    // Current filters
    filters: $derived(filters),
    
    // Mutations
    processPayment,
    processPaymentStatus: $derived(processPaymentMutation.status),
    
    // Filter helpers
    updateFilters,
    resetFilters,
    goToPage,
    setSearch,
    setStatusFilter,
    setPaymentMethodFilter,
    setAmountRange,
    setDateRange,
    setSorting,
    
    // Payment helpers
    isPaymentSuccessful,
    isPaymentFailed,
    isPaymentPending,
    getPaymentStatusColor,
    
    // Loading states
    isLoading: $derived(paymentsQuery.isPending),
    isError: $derived(paymentsQuery.isError),
    error: $derived(paymentsQuery.error),
    
    // Stats loading
    isStatsLoading: $derived(statsQuery.isPending),
    statsError: $derived(statsQuery.error)
  };
}
