import type { AuthUser } from '$lib/types/auth.schema';

declare module 'telefunc' {
  namespace Telefunc {
    interface Context {
      user?: AuthUser;
      request?: globalThis.Request;
    }
  }
}
