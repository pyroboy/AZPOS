// Re-export all stores and actions from slices
export * from './products';
export * from './filters';
export * from './selection';
export * from './editing';
export * from './modals';

// Import all the pieces to assemble the hook
import {
    filteredProducts,
    totalSKUs,
    totalUnits,
    outOfStockCount,
    itemsToReorderCount,
    categories
} from './products';
import { searchTerm, activeCategories, sortOrder, setSearchDebounced, toggleCategory, clearFilters } from './filters';
import { selectedProductIds, areAllVisibleRowsSelected, handleRowSelect, toggleSelectAll } from './selection';
import { editingCell, editValue, startEditing, cancelEdit, saveEdit } from './editing';
import { isBulkEditModalOpen } from './modals';

/**
 * A hook-like function to provide a convenient, organized API
 * for interacting with the inventory state.
 */
export const useInventory = () => {
  return {
    // readable state
    products: filteredProducts,
    categories,
    totals: { totalSKUs, totalUnits, outOfStockCount, itemsToReorderCount },
    selection: { selectedProductIds, areAllVisibleRowsSelected },
    filters: { searchTerm, activeCategories, sortOrder },
    editing: { editingCell, editValue },
    isBulkEditModalOpen,

    // actions
    toggleCategory,
    clearFilters,
    toggleSelectAll,
    handleRowSelect,
    startEditing,
    cancelEdit,
    saveEdit,
    setSearchDebounced,
  };
};
