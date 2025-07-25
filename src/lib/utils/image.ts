import path from 'path';

export const LOCAL_ROOT = '/images/products';

/**
 * Generates a local, POSIX-style path for a product image.
 * @param sku The product's Stock Keeping Unit.
 * @param file The filename, defaults to 'main.jpg'.
 * @returns The full local path, e.g., /images/products/SKU123/main.jpg
 */
export function localImagePath(sku: string, file = 'main.jpg'): string {
  // Use path.posix.join to ensure forward slashes, which is correct for web URLs.
  return path.posix.join(LOCAL_ROOT, sku, file);
}
