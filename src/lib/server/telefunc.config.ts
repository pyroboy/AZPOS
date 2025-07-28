import { telefunc } from 'telefunc';
import type { RequestEvent } from '@sveltejs/kit';

// Configure Telefunc to work with SvelteKit
export async function handleTelefuncRequest(event: RequestEvent) {
	const { request } = event;

	// Set up Telefunc context with user from SvelteKit locals and request
	const context = {
		user: event.locals.user,
		request: event.request
	};

	// Handle the Telefunc request
	const response = await telefunc({
		url: request.url,
		method: request.method,
		body: await request.text(),
		context
	});

	if (response) {
		return new Response(response.body, {
			status: response.statusCode,
			headers: {
				'Content-Type': response.contentType ?? 'application/json'
			}
		});
	}

	return null;
}
