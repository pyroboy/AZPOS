import type { Product } from '$lib/types/product.schema';

export interface ProductWithStock extends Product {
  stock: number;
  price: number;
  is_archived: boolean;
}

// Mock inventory data for now - this should be replaced with actual data fetching
export const inventory: ProductWithStock[] = $state([]);

export const inventoryManager = {
  loadProducts: () => {
    // Implementation for loading products
  },
  loadMoreProducts: () => {
    // Implementation for loading more products
  }
};
