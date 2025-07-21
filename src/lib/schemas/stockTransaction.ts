// --- Data Contracts from PRD ---

// 6.5 Stock Transaction (immutable log)
export interface StockTransaction {
  id: string;
  product_id: string;
  batch_id?: string; // FK to ProductBatch
  qty_change: number;     // positive = in, negative = out
  transaction_type: 'stock_in' | 'sale' | 'adjustment' | 'return' | 'assembly';
  reason?: string;        // adjustment or return reason
  related_po_item_id?: string;
  related_return_id?: string;
  related_order_id?: string; // for sales
  created_at: string;     // ISO
  user_id: string;
}
