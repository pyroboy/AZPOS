// src/routes/admin/settings/product-image-downloader/search/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { FoundImage } from '../types';
import { PRIVATE_GOOGLE_API_KEY, PRIVATE_GOOGLE_CSE_ID } from '$env/static/private';

// --- Type definitions for Google Custom Search API Response ---
interface GoogleSearchItem {
	link: string;
	image?: {
		contextLink?: string;
		thumbnailLink?: string;
	};
}

interface GoogleSearchResponse {
	items?: GoogleSearchItem[];
}

const BASE = 'https://www.googleapis.com/customsearch/v1';

export const GET: RequestHandler = async ({ url }) => {
	console.log('[/search] Received GET request.');
	const name = (url.searchParams.get('name') || '').trim();

	if (!name) {
		console.error('[/search] Error: Search query (name) is required.');
		throw error(400, 'Product name is required for searching.');
	}

	const q = name;
	const API_KEY = PRIVATE_GOOGLE_API_KEY;
	const CX = PRIVATE_GOOGLE_CSE_ID;

	if (!API_KEY || !CX) {
		console.error('[/search] Error: Google API Key or CX ID is not configured on the server.');
		throw error(500, 'Image search is not configured.');
	}

	console.log(`[/search] Searching Google for: "${q}"`);

	try {
		const searchUrl = `${BASE}?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(q)}&searchType=image&num=10&safe=active`;
		const res = await fetch(searchUrl);

		if (!res.ok) {
			const errorBody = await res.text();
			console.error(`[/search] Google API request failed with status ${res.status}:`, errorBody);
			throw new Error(`Google API responded with status ${res.status}`);
		}

		const data: GoogleSearchResponse = await res.json();

		console.log('[API] Google Search response received:', data);

		if (!data.items || data.items.length === 0) {
			console.log('[API] No image items found in response.');
			return json({ images: [] });
		}

		// Map the response to the FoundImage type, filtering out any incomplete items.
		const images: FoundImage[] = data.items
			.map((item: GoogleSearchItem) => ({
				thumbnailUrl: item.image?.thumbnailLink ?? '', // Ensure thumbnailUrl is always a string
				image_url: item.link,
				contextLink: item.image?.contextLink
			}))
			.filter((img) => img.image_url);

		console.log(`[/search] Found ${images.length} images for "${q}".`);
		return json({ images });
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : 'An unknown error occurred.';
		console.error('[/search] An unexpected error occurred during image search:', e);
		throw error(502, `Image search provider is currently unavailable: ${message}`);
	}
};
