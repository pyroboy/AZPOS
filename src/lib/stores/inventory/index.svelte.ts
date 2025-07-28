import { inventoryManager } from '../inventoryStore.svelte';

/**
 * A hook-like function to provide a convenient, organized API
 * for interacting with the consolidated inventory state using Svelte 5 runes.
 */
export const useInventory = () => {
  return {
    // Reactive state - these are already reactive via runes
    products: inventoryManager.filteredProducts,
    inventory: inventoryManager.inventory,
    allProducts: inventoryManager.products,
    productBatches: inventoryManager.productBatches,
    meta: inventoryManager.meta,
    
    // Selection state
    selection: {
      selectedProductIds: inventoryManager.selectedProductIds,
      areAllVisibleRowsSelected: inventoryManager.areAllVisibleRowsSelected
    },
    
    // Filter state
    filters: {
      searchTerm: inventoryManager.searchTerm,
      activeCategories: inventoryManager.activeCategories,
      sortOrder: inventoryManager.sortOrder,
      stockStatusFilter: inventoryManager.stockStatusFilter
    },
    
    // Editing state
    editing: {
      editingCell: inventoryManager.editingCell,
      editValue: inventoryManager.editValue
    },
    
    // Modal state
    modals: {
      isBulkEditModalOpen: inventoryManager.isBulkEditModalOpen
    },

    // Actions - Product management
    loadProducts: inventoryManager.loadProducts.bind(inventoryManager),
    loadMeta: inventoryManager.loadMeta.bind(inventoryManager),
    addProduct: inventoryManager.addProduct.bind(inventoryManager),
    updateProduct: inventoryManager.updateProduct.bind(inventoryManager),
    deleteProduct: inventoryManager.deleteProduct.bind(inventoryManager),
    
    // Actions - Batch management
    addBatch: inventoryManager.addBatch.bind(inventoryManager),
    updateBatch: inventoryManager.updateBatch.bind(inventoryManager),
    deleteBatch: inventoryManager.deleteBatch.bind(inventoryManager),
    
    // Actions - Filter management
    setSearchDebounced: inventoryManager.setSearchDebounced.bind(inventoryManager),
    toggleCategory: inventoryManager.toggleCategory.bind(inventoryManager),
    clearFilters: inventoryManager.clearFilters.bind(inventoryManager),
    
    // Actions - Selection management
    handleRowSelect: inventoryManager.handleRowSelect.bind(inventoryManager),
    toggleSelectAll: inventoryManager.toggleSelectAll.bind(inventoryManager),
    
    // Actions - Editing management
    startEditing: inventoryManager.startEditing.bind(inventoryManager),
    cancelEdit: inventoryManager.cancelEdit.bind(inventoryManager),
    saveEdit: inventoryManager.saveEdit.bind(inventoryManager),
    
    // Actions - Modal management
    openBulkEditModal: inventoryManager.openBulkEditModal.bind(inventoryManager),
    closeBulkEditModal: inventoryManager.closeBulkEditModal.bind(inventoryManager),
    
    // Utility functions
    getTotalStockForProduct: inventoryManager.getTotalStockForProduct.bind(inventoryManager),
    getProductById: inventoryManager.getProductById.bind(inventoryManager),
    getProductWithStock: inventoryManager.getProductWithStock.bind(inventoryManager),
    getBatchesForProduct: inventoryManager.getBatchesForProduct.bind(inventoryManager)
  };
};

// Export the inventory manager directly for advanced usage
export { inventoryManager };

// Export individual reactive properties for direct access
export const {
  products,
  productBatches,
  inventory,
  filteredProducts,
  meta,
  searchTerm,
  activeCategories,
  sortOrder,
  stockStatusFilter,
  selectedProductIds,
  areAllVisibleRowsSelected,
  editingCell,
  editValue,
  isBulkEditModalOpen
} = inventoryManager;
