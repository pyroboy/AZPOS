/**
 * Generates a data-URI for an SVG image displaying the initials of a name.
 * @param name The full name to derive initials from.
 * @param id A unique identifier to seed the background color, ensuring consistency.
 * @returns A data-URI string for the SVG.
 */
export function getInitialsSvg(name: string, id: string): string {
	const initials = (name || 'N A')
		.split(' ')
		.map((n) => n[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

	// Simple hashing function to get a deterministic color from the ID
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = id.charCodeAt(i) + ((hash << 5) - hash);
	}
	const h = hash % 360;
	const bgColor = `hsl(${h}, 50%, 80%)`;
	const textColor = `hsl(${h}, 100%, 25%)`;

	const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <rect width="100" height="100" fill="${bgColor}"></rect>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${textColor}" font-size="48" font-family="sans-serif" font-weight="bold">
        ${initials}
      </text>
    </svg>
  `.trim();

	return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * A wrapper around fetch that retries a request a specified number of times.
 * @param url The URL to fetch.
 * @param retries The number of retries to attempt.
 * @param options Standard fetch options.
 * @returns A Promise that resolves with the Response or rejects on final failure.
 */
export async function retryableFetch(
	url: string | URL,
	retries = 1,
	options?: RequestInit
): Promise<Response> {
	let lastError: unknown;
	for (let i = 0; i <= retries; i++) {
		try {
			const res = await fetch(url, {
				signal: AbortSignal.timeout(5000), // 5-second timeout
				...options
			});
			if (res.ok) {
				return res;
			}
			lastError = new Error(`Fetch failed with status ${res.status}`);
		} catch (error) {
			lastError = error;
		}
	}
	return Promise.reject(lastError);
}

/**
 * Cleans and validates a URL to ensure it's a valid HTTP/HTTPS URL.
 * @param raw The raw URL string to sanitize.
 * @returns A sanitized URL string or an empty string if invalid.
 */
export function sanitizeImageUrl(raw: string | null | undefined): string {
	if (!raw) return '';

	// Allow relative paths for local images
	if (raw.startsWith('../') || raw.startsWith('/')) {
		return raw;
	}

	// Keep existing logic for absolute URLs
	try {
		const url = new URL(raw);
		if (['http:', 'https:', 'data:'].includes(url.protocol)) {
			return url.href;
		}
		return '';
	} catch {
		// If it's not a valid absolute URL and not a relative path we handle, discard it.
		return '';
	}
}
