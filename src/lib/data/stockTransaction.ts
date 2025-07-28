import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { 
  onCreateStockTransaction, 
  onProcessBulkAdjustment, 
  onProcessStockTransfer, 
  onGetStockTransactions, 
  onGetStockTransactionStats, 
  onGetStockValuation, 
  onGetStockAging 
} from '$lib/server/telefuncs/stockTransaction.telefunc';
import type { 
  StockTransaction, 
  StockTransactionCreate, 
  BulkAdjustment, 
  StockTransfer, 
  StockTransactionFilters, 
  PaginatedStockTransactions, 
  StockTransactionStats, 
  StockValuation, 
  StockAgingReport
} from '$lib/types/stockTransaction.schema';

const stockTransactionsQueryKey = ['stock-transactions'];
const stockStatsQueryKey = ['stock-stats'];
const stockValuationQueryKey = ['stock-valuation'];
const stockAgingQueryKey = ['stock-aging'];

export function useStockTransactions() {
  const queryClient = useQueryClient();

  // State for filters
  let filters = $state<StockTransactionFilters>({
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Query for paginated stock transactions
  const transactionsQuery = createQuery<PaginatedStockTransactions>({
    queryKey: $derived([...stockTransactionsQueryKey, filters]),
    queryFn: () => onGetStockTransactions(filters)
  });

  // Query for stock transaction statistics
  const statsQuery = createQuery<StockTransactionStats>({
    queryKey: stockStatsQueryKey,
    queryFn: () => onGetStockTransactionStats()
  });

  // Query for stock valuation
  const valuationQuery = createQuery<StockValuation[]>({
    queryKey: stockValuationQueryKey,
    queryFn: () => onGetStockValuation(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Query for stock aging report
  const agingQuery = createQuery<StockAgingReport[]>({
    queryKey: stockAgingQueryKey,
    queryFn: () => onGetStockAging(),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Mutation to create stock transaction
  const createTransactionMutation = createMutation({
    mutationFn: (transactionData: StockTransactionCreate) => onCreateStockTransaction(transactionData),
    onSuccess: (newTransaction) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: stockTransactionsQueryKey });
      queryClient.invalidateQueries({ queryKey: stockStatsQueryKey });
      queryClient.invalidateQueries({ queryKey: stockValuationQueryKey });
      queryClient.invalidateQueries({ queryKey: stockAgingQueryKey });
      
      // Optimistically add to cache
      queryClient.setQueryData<PaginatedStockTransactions>(
        [...stockTransactionsQueryKey, filters],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: [newTransaction, ...old.transactions]
          };
        }
      );
    }
  });

  // Mutation to process bulk adjustment
  const bulkAdjustmentMutation = createMutation({
    mutationFn: (adjustmentData: BulkAdjustment) => onProcessBulkAdjustment(adjustmentData),
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: stockTransactionsQueryKey });
      queryClient.invalidateQueries({ queryKey: stockStatsQueryKey });
      queryClient.invalidateQueries({ queryKey: stockValuationQueryKey });
      queryClient.invalidateQueries({ queryKey: stockAgingQueryKey });
    }
  });

  // Mutation to process stock transfer
  const stockTransferMutation = createMutation({
    mutationFn: (transferData: StockTransfer) => onProcessStockTransfer(transferData),
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: stockTransactionsQueryKey });
      queryClient.invalidateQueries({ queryKey: stockStatsQueryKey });
      queryClient.invalidateQueries({ queryKey: stockValuationQueryKey });
      queryClient.invalidateQueries({ queryKey: stockAgingQueryKey });
    }
  });

  // Derived reactive state
  const transactions = $derived(transactionsQuery.data?.transactions || []);
  const pagination = $derived(transactionsQuery.data?.pagination);
  const stats = $derived(statsQuery.data);
  const valuation = $derived(valuationQuery.data || []);
  const agingReport = $derived(agingQuery.data || []);
  
  // Filtered transactions
  const stockInTransactions = $derived(
    transactions.filter((t: StockTransaction) => ['stock_in', 'adjustment_in', 'transfer_in'].includes(t.movement_type))
  );
  
  const stockOutTransactions = $derived(
    transactions.filter((t: StockTransaction) => ['stock_out', 'adjustment_out', 'transfer_out', 'sale', 'waste', 'damage'].includes(t.movement_type))
  );
  
  const adjustmentTransactions = $derived(
    transactions.filter((t: StockTransaction) => ['adjustment_in', 'adjustment_out'].includes(t.movement_type))
  );
  
  const transferTransactions = $derived(
    transactions.filter((t: StockTransaction) => ['transfer_in', 'transfer_out'].includes(t.movement_type))
  );
  
  const saleTransactions = $derived(
    transactions.filter((t: StockTransaction) => t.movement_type === 'sale')
  );
  
  const wasteTransactions = $derived(
    transactions.filter((t: StockTransaction) => ['waste', 'damage'].includes(t.movement_type))
  );
  
  const todaysTransactions = $derived(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transactions.filter((transaction: StockTransaction) => {
      const transactionDate = new Date(transaction.processed_at || transaction.created_at);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate.getTime() === today.getTime();
    });
  });

  // Movement type breakdown
  const movementTypeBreakdown = $derived(() => {
    const breakdown: Record<string, { count: number; total_quantity: number; total_value: number; percentage: number }> = {};
    
    transactions.forEach((transaction: StockTransaction) => {
      if (!breakdown[transaction.movement_type]) {
        breakdown[transaction.movement_type] = { count: 0, total_quantity: 0, total_value: 0, percentage: 0 };
      }
      breakdown[transaction.movement_type].count++;
      breakdown[transaction.movement_type].total_quantity += transaction.quantity;
      breakdown[transaction.movement_type].total_value += transaction.total_cost || 0;
    });
    
    // Calculate percentages
    const total = transactions.length;
    Object.keys(breakdown).forEach(type => {
      breakdown[type].percentage = total > 0 ? (breakdown[type].count / total) * 100 : 0;
    });
    
    return breakdown;
  });

  // Valuation summary
  const valuationSummary = $derived(() => {
    type ValuationSummary = {
      total_stock_value: number;
      total_retail_value: number;
      total_potential_profit: number;
      total_items: number;
      out_of_stock_items: number;
      low_stock_items: number;
      avg_margin_percentage: number;
    };
    
    const summary = valuation.reduce((acc: ValuationSummary, item: StockValuation) => {
      acc.total_stock_value += item.stock_value;
      acc.total_retail_value += item.retail_value;
      acc.total_potential_profit += item.potential_profit;
      acc.total_items++;
      
      if (item.current_stock === 0) acc.out_of_stock_items++;
      if (item.current_stock < 10) acc.low_stock_items++; // Configurable threshold
      
      return acc;
    }, {
      total_stock_value: 0,
      total_retail_value: 0,
      total_potential_profit: 0,
      total_items: 0,
      out_of_stock_items: 0,
      low_stock_items: 0,
      avg_margin_percentage: 0
    });
    
    summary.avg_margin_percentage = summary.total_retail_value > 0 
      ? (summary.total_potential_profit / summary.total_retail_value) * 100 
      : 0;
    
    return summary;
  });

  // Aging summary
  const agingSummary = $derived(() => {
    type AgingSummary = {
      total_batches: number;
      total_quantity: number;
      fresh_batches: number;
      fresh_quantity: number;
      aging_batches: number;
      aging_quantity: number;
      old_batches: number;
      old_quantity: number;
      expired_batches: number;
      expired_quantity: number;
    };
    
    const summary = agingReport.reduce((acc: AgingSummary, item: StockAgingReport) => {
      acc.total_batches++;
      acc.total_quantity += item.remaining_quantity;
      
      switch (item.aging_category) {
        case 'fresh':
          acc.fresh_batches++;
          acc.fresh_quantity += item.remaining_quantity;
          break;
        case 'aging':
          acc.aging_batches++;
          acc.aging_quantity += item.remaining_quantity;
          break;
        case 'old':
          acc.old_batches++;
          acc.old_quantity += item.remaining_quantity;
          break;
        case 'expired':
          acc.expired_batches++;
          acc.expired_quantity += item.remaining_quantity;
          break;
      }
      
      return acc;
    }, {
      total_batches: 0,
      total_quantity: 0,
      fresh_batches: 0,
      fresh_quantity: 0,
      aging_batches: 0,
      aging_quantity: 0,
      old_batches: 0,
      old_quantity: 0,
      expired_batches: 0,
      expired_quantity: 0
    });
    
    return summary;
  });

  // Helper functions
  function updateFilters(newFilters: Partial<StockTransactionFilters>) {
    filters = { ...filters, ...newFilters };
  }

  function resetFilters() {
    filters = {
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc'
    };
  }

  function goToPage(page: number) {
    updateFilters({ page });
  }

  function setProductFilter(product_id: string) {
    updateFilters({ product_id: product_id || undefined, page: 1 });
  }

  function setMovementTypeFilter(movement_type: StockTransactionFilters['movement_type']) {
    updateFilters({ movement_type, page: 1 });
  }

  function setReferenceTypeFilter(reference_type: StockTransactionFilters['reference_type']) {
    updateFilters({ reference_type, page: 1 });
  }

  function setSupplierFilter(supplier_id: string) {
    updateFilters({ supplier_id: supplier_id || undefined, page: 1 });
  }

  function setLocationFilter(location_id: string) {
    updateFilters({ location_id: location_id || undefined, page: 1 });
  }

  function setReferenceNumberFilter(reference_number: string) {
    updateFilters({ reference_number: reference_number || undefined, page: 1 });
  }

  function setDateRange(date_from?: string, date_to?: string) {
    updateFilters({ date_from, date_to, page: 1 });
  }

  function setSorting(sort_by: StockTransactionFilters['sort_by'], sort_order: StockTransactionFilters['sort_order']) {
    updateFilters({ sort_by, sort_order, page: 1 });
  }

  // Stock transaction operations
  function createStockTransaction(transactionData: StockTransactionCreate) {
    return createTransactionMutation.mutateAsync(transactionData);
  }

  function processBulkAdjustment(adjustmentData: BulkAdjustment) {
    return bulkAdjustmentMutation.mutateAsync(adjustmentData);
  }

  function processStockTransfer(transferData: StockTransfer) {
    return stockTransferMutation.mutateAsync(transferData);
  }

  // Transaction type helpers
  function isStockIn(transaction: StockTransaction): boolean {
    return ['stock_in', 'adjustment_in', 'transfer_in'].includes(transaction.movement_type);
  }

  function isStockOut(transaction: StockTransaction): boolean {
    return ['stock_out', 'adjustment_out', 'transfer_out', 'sale', 'waste', 'damage'].includes(transaction.movement_type);
  }

  function isAdjustment(transaction: StockTransaction): boolean {
    return ['adjustment_in', 'adjustment_out'].includes(transaction.movement_type);
  }

  function isTransfer(transaction: StockTransaction): boolean {
    return ['transfer_in', 'transfer_out'].includes(transaction.movement_type);
  }

  function getMovementTypeColor(movement_type: StockTransaction['movement_type']): string {
    switch (movement_type) {
      case 'stock_in':
      case 'adjustment_in':
      case 'transfer_in':
        return 'success';
      case 'stock_out':
      case 'adjustment_out':
      case 'transfer_out':
      case 'sale':
        return 'primary';
      case 'waste':
      case 'damage':
        return 'error';
      default:
        return 'secondary';
    }
  }

  function getMovementTypeIcon(movement_type: StockTransaction['movement_type']): string {
    switch (movement_type) {
      case 'stock_in':
        return 'arrow-down';
      case 'stock_out':
        return 'arrow-up';
      case 'adjustment_in':
      case 'adjustment_out':
        return 'edit';
      case 'transfer_in':
      case 'transfer_out':
        return 'swap';
      case 'sale':
        return 'shopping-cart';
      case 'waste':
      case 'damage':
        return 'trash';
      default:
        return 'package';
    }
  }

  function formatMovementType(movement_type: StockTransaction['movement_type']): string {
    const typeMap: Record<string, string> = {
      'stock_in': 'Stock In',
      'stock_out': 'Stock Out',
      'adjustment_in': 'Adjustment In',
      'adjustment_out': 'Adjustment Out',
      'transfer_in': 'Transfer In',
      'transfer_out': 'Transfer Out',
      'sale': 'Sale',
      'waste': 'Waste',
      'damage': 'Damage'
    };
    return typeMap[movement_type] || movement_type;
  }

  // Calculate totals for current view
  const currentViewTotals = $derived(() => {
    const total_transactions = transactions.length;
    const total_quantity_in = stockInTransactions.reduce((sum: number, t: StockTransaction) => sum + Math.abs(t.quantity_change), 0);
    const total_quantity_out = stockOutTransactions.reduce((sum: number, t: StockTransaction) => sum + Math.abs(t.quantity_change), 0);
    const total_value_in = stockInTransactions.reduce((sum: number, t: StockTransaction) => sum + (t.total_cost || 0), 0);
    const total_value_out = stockOutTransactions.reduce((sum: number, t: StockTransaction) => sum + (t.total_cost || 0), 0);
    const net_quantity = total_quantity_in - total_quantity_out;
    const net_value = total_value_in - total_value_out;
    
    return {
      total_transactions,
      total_quantity_in,
      total_quantity_out,
      total_value_in,
      total_value_out,
      net_quantity,
      net_value
    };
  });

  return {
    // Queries and their states
    transactionsQuery,
    statsQuery,
    valuationQuery,
    agingQuery,
    
    // Reactive data
    transactions,
    pagination,
    stats,
    valuation,
    agingReport,
    
    // Filtered data
    stockInTransactions,
    stockOutTransactions,
    adjustmentTransactions,
    transferTransactions,
    saleTransactions,
    wasteTransactions,
    todaysTransactions,
    
    // Calculated data
    movementTypeBreakdown,
    valuationSummary,
    agingSummary,
    currentViewTotals,
    
    // Current filters
    filters: $derived(filters),
    
    // Mutations
    createStockTransaction,
    processBulkAdjustment,
    processStockTransfer,
    
    // Filter helpers
    updateFilters,
    resetFilters,
    goToPage,
    setProductFilter,
    setMovementTypeFilter,
    setReferenceTypeFilter,
    setSupplierFilter,
    setLocationFilter,
    setReferenceNumberFilter,
    setDateRange,
    setSorting,
    
    // Transaction helpers
    isStockIn,
    isStockOut,
    isAdjustment,
    isTransfer,
    getMovementTypeColor,
    getMovementTypeIcon,
    formatMovementType,
    
    // Mutation states
    createTransactionStatus: $derived(createTransactionMutation.status),
    bulkAdjustmentStatus: $derived(bulkAdjustmentMutation.status),
    stockTransferStatus: $derived(stockTransferMutation.status),
    
    // Loading states
    isLoading: $derived(transactionsQuery.isPending),
    isError: $derived(transactionsQuery.isError),
    error: $derived(transactionsQuery.error),
    
    // Stats loading
    isStatsLoading: $derived(statsQuery.isPending),
    statsError: $derived(statsQuery.error),
    
    // Valuation loading
    isValuationLoading: $derived(valuationQuery.isPending),
    valuationError: $derived(valuationQuery.error),
    
    // Aging loading
    isAgingLoading: $derived(agingQuery.isPending),
    agingError: $derived(agingQuery.error)
  };
}
