import type { RequestHandler } from '@sveltejs/kit'

// Custom Telefunc handler for telefuncName/telefuncArgs format
export const POST: RequestHandler = async (event) => {
  console.log('📡 [TELEFUNC SERVER] Request received:', {
    method: event.request.method,
    url: event.url.pathname,
    hasBody: event.request.body !== null
  });

  try {
    const body = await event.request.text();
    console.log('📡 [TELEFUNC SERVER] Request body:', body);

    // Parse the custom request format
    const { telefuncName, telefuncArgs } = JSON.parse(body);
    
    if (!telefuncName) {
      throw new Error('Missing telefuncName');
    }

    console.log('📡 [TELEFUNC SERVER] Parsed request:', { telefuncName, telefuncArgs });

    // Dynamically import the telefunc function
    const { [telefuncName]: telefuncFunction } = await import('$lib/server/telefuncs/product.telefunc');
    
    if (!telefuncFunction) {
      throw new Error(`Telefunc function '${telefuncName}' not found`);
    }

    // Set up context for the telefunc function
    const context = {
      user: event.locals.user,
      request: event.request
    };

    // Temporarily store context (telefunc functions use getContext())
    global.telefuncContext = context;

    // Call the telefunc function with the provided arguments
    const result = await telefuncFunction(...(telefuncArgs || []));
    
    console.log('📡 [TELEFUNC SERVER] Function result:', { success: true, hasResult: !!result });

    // Clean up context
    delete global.telefuncContext;

    // Return the result in the expected format
    return new Response(JSON.stringify({ ret: result }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('🚨 [TELEFUNC SERVER] Error:', error);
    
    // Clean up context on error
    delete global.telefuncContext;

    return new Response(JSON.stringify({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Handle other HTTP methods
export const GET = POST
export const PUT = POST
export const DELETE = POST
