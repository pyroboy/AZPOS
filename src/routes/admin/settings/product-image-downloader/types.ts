/**
 * Centralized type definitions for the Product Image Downloader feature.
 */

/**
 * Represents a single product record from the CSV.
 */
export interface Product {
	id: string;
	sku: string;
	name: string;
	description: string;
	stock: number;
	price: number;
	category_id: string;
	supplier_id: string;
	image_url: string;
}

/**
 * Represents an image found by the Google Search API.
 */
export interface FoundImage {
	thumbnailUrl: string;
	image_url: string;
	contextLink?: string;
}

/**
 * Represents a product with its image search status and results.
 */
export interface ProductWithStatus extends Product {
	status: 'initial' | 'pending' | 'searching' | 'found' | 'error' | 'selected';
	image_url: string; // The URL of the new, selected image
	foundImages?: FoundImage[];
}
