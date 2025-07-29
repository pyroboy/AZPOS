import type { AuthUser } from '$lib/types/auth.schema';
import type { Request } from '@sveltejs/kit';

declare module 'telefunc' {
  namespace Telefunc {
    interface Context {
      user?: AuthUser;
      request?: Request;
    }
  }
}
