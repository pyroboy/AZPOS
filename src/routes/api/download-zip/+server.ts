import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ProductWithStatus } from '../../admin/settings/product-image-downloader/types';
import JSZip from 'jszip';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

async function fetchWithRetry(url: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
			if (res.ok) {
				const contentType = res.headers.get('content-type');
				if (contentType && contentType.startsWith('image/')) {
					return { buffer: await res.arrayBuffer(), contentType };
				}
			}
			if (res.status === 403) {
                console.warn(`Forbidden (403) when fetching ${url}. Skipping.`);
                return null;
            }
		} catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`Attempt ${attempt + 1} failed for ${url}:`, message);
			if (attempt === MAX_RETRIES) {
                console.error(`Final attempt failed for ${url}. Skipping.`);
                return null;
            }
		}
		if (attempt < MAX_RETRIES) {
			await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
		}
	}
	return null;
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const productsJson = formData.get('products') as string;

        if (!productsJson) {
            return json({ success: false, error: 'No product data provided.' }, { status: 400 });
        }

        const products: ProductWithStatus[] = JSON.parse(productsJson);
        const zip = new JSZip();
        let filesAdded = 0;

        for (const product of products) {
            const blob = formData.get(`blob_${product.sku}`) as File | null;
            let buffer: ArrayBuffer | null = null;
            let fileExtension = 'jpg';

            if (blob && blob.size > 0) {
                buffer = await blob.arrayBuffer();
                const type = blob.type;
                if (type && type.startsWith('image/')) {
                    fileExtension = type.split('/')[1] || 'jpg';
                }
            } else if (product.image_url) {
                const image = await fetchWithRetry(product.image_url);
                if (image) {
                    buffer = image.buffer;
                    fileExtension = image.contentType.split('/')[1] || 'jpg';
                }
            }

            if (buffer) {
                zip.file(`${product.sku}.${fileExtension}`, buffer);
                filesAdded++;
            }
        }

        if (filesAdded === 0) {
            return json({ success: false, error: 'No images could be processed to create the ZIP.' }, { status: 400 });
        }

        const zipAsBase64 = await zip.generateAsync({ type: 'base64' });
        return json({ success: true, zip: zipAsBase64 });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error('Error during ZIP creation:', e);
        return json({ success: false, error: `Failed to generate ZIP file: ${message}` }, { status: 500 });
    }
};
