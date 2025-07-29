import { telefunc } from 'telefunc'
import type { RequestHandler } from '@sveltejs/kit'

export const POST: RequestHandler = async (event) => {
  const httpResponse = await telefunc({
    url: event.url.pathname,
    method: event.request.method,
    body: await event.request.text(),
    context: {
      user: event.locals.user,
      request: event.request
    }
  })

  return new Response(httpResponse.body, {
    status: httpResponse.statusCode,
    headers: {
      'Content-Type': httpResponse.contentType ?? 'application/json'
    }
  })
}

// Handle other HTTP methods
export const GET = POST
export const PUT = POST
export const DELETE = POST
