import { handleTelefuncRequest } from '$lib/server/telefunc.config';
import type { RequestEvent } from '@sveltejs/kit';

export const POST = async (event: RequestEvent) => {
	const response = await handleTelefuncRequest(event);

	if (response) {
		return response;
	}

	// If Telefunc doesn't handle this request, return 404
	return new Response('Not Found', { status: 404 });
};
