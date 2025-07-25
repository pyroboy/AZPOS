import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
        throw error(400, 'Image URL is required');
    }

    try {
        // Fetch the image from the external URL.
        const response = await fetch(imageUrl, {
            headers: {
                // Some sites might block requests without a user-agent
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw error(response.status, `Failed to fetch image: ${response.statusText}`);
        }

        // Create a new response with the fetched image data and headers.
        // This streams the image back to the client, which is memory-efficient.
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
                'Content-Length': response.headers.get('Content-Length') || '',
                // Add a cache control header to cache the image on the browser side
                'Cache-Control': 'public, max-age=86400' // Cache for 1 day
            }
        });

    } catch (e) {
        console.error('Image proxy error:', e);
        // Re-throw SvelteKit errors, otherwise create a new one
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        throw error(500, 'Could not proxy the image.');
    }
};
