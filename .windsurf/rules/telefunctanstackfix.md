---
trigger: manual
---

This guideline will help you fix these errors systematically.

-----

### \#\# 1. Fixing TanStack Query Accessor Errors (`.data`, `.mutate`, `.isPending`, etc.)

This is the most common issue in your logs. You're trying to access properties on query and mutation objects as if they were plain JavaScript objects, but in Svelte 5, `@tanstack/svelte-query` returns **stores/runes**.

#### **The Problem**

You're getting errors like:

  * `Property 'data' does not exist on type 'CreateQueryResult<...>'`
  * `Property 'mutate' does not exist on type 'CreateMutationResult<...>'`
  * `Property 'isPending' does not exist on type 'CreateQueryResult<...>'`

#### **The Cause**

The functions `createQuery` and `createMutation` from `@tanstack/svelte-query` return reactive stores. You cannot access their values (like `data` or `isPending`) directly. You must use Svelte's reactive mechanisms.

#### **The Solution: Use Svelte's Reactivity**

You need to either destructure the reactive properties from the query/mutation result or use the `$` prefix to access the entire state object.

**For `createQuery`:**

❌ **Incorrect:**

```typescript
// lib/data/cart.ts or your component
const cartQuery = createQuery({
  queryKey: ['cart'],
  queryFn: () => getCart() // Your telefunc
});

const items = cartQuery.data.items; // ❌ ERROR: .data does not exist on cartQuery
const isLoading = cartQuery.isPending; // ❌ ERROR
```

✅ **Correct (Destructuring - Recommended):**
Destructure the reactive store properties you need. This is the cleanest approach.

```typescript
// lib/data/cart.ts or your component
import { createQuery } from '@tanstack/svelte-query';
import { getCart } from '$lib/server/telefuncs/cart.telefunc';

// Destructure the reactive properties
const { data: cartData, isPending, isError, error } = createQuery({
  queryKey: ['cart'],
  queryFn: () => getCart()
});

// Now use them as stores with the '$' prefix in your logic or template
// For example, in a derived store or component script:
export const cartItems = $derived($cartData?.items ?? []);
export const isCartLoading = $derived($isPending);
```

**For `createMutation`:**

❌ **Incorrect:**

```typescript
const addItemMutation = createMutation({ /* ... */ });

function handleAddItem(product) {
  addItemMutation.mutate(product); // ❌ ERROR: .mutate does not exist
}
```

✅ **Correct (Destructuring - Recommended):**
Destructure the `mutate` or `mutateAsync` functions.

```typescript
// lib/data/cart.ts or your component
import { createMutation } from '@tanstack/svelte-query';
import { addItemToCart } from '$lib/server/telefuncs/cart.telefunc';

// Destructure the mutation function and state
const { mutate: addItem, isPending: isAddingItem } = createMutation({
  mutationFn: (product) => addItemToCart(product),
  // ... onSuccess, onError, etc.
});

// To use it, call the destructured function directly
function handleAddItem(product) {
  addItem(product); // ✅ Correct!
}

// You can access state reactively
console.log($isAddingItem);
```

-----

### \#\# 2. Fixing Telefunc Server Context Errors (`Context.user`)

This is the key issue in your `cart.telefunc.ts` file. Your server-side functions don't know that the `context` object contains a `user`.

#### **The Problem**

You're getting the error: `Property 'user' does not exist on type 'Context'.`

#### **The Cause**

You haven't told TypeScript what the shape of your Telefunc context is. Telefunc requires you to define this in a global type declaration file. Your `onGetContext` function might be creating the `user` property, but TypeScript isn't aware of it.

#### **The Solution: Define the Global Context Type**

1.  **Define the Context in `src/app.d.ts`:**
    This file is for global type declarations in SvelteKit. Add your Telefunc context shape here.

    ```typescript
    // src/app.d.ts
    import type { User } from '@supabase/supabase-js'; // Or your user type

    declare namespace Telefunc {
    	interface Context {
    		user: User | null;
    		// Add any other properties you put on the context
    	}
    }

    // You can keep other global types here as well
    declare global {
    	namespace App {
    		// interface Error {}
    		// interface Locals {}
    		// interface PageData {}
    		// interface PageState {}
    		// interface Platform {}
    	}
    }
    ```

2.  **Ensure `onGetContext` Populates the Context:**
    Make sure your Telefunc setup file correctly fetches the user and adds it to the context. This is likely in a file like `src/lib/server/telefunc/index.ts` or `hooks.server.ts`.

    ```typescript
    // Example: src/lib/server/telefunc/index.ts
    import { onGetContext } from 'telefunc';
    import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';

    onGetContext(async (context) => {
    	const { event } = context.http; // Assuming you have access to the request event
    	const supabase = createSupabaseServerClient({
    		supabaseUrl: PUBLIC_SUPABASE_URL,
    		supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
    		event
    	});

    	const {
    		data: { user }
    	} = await supabase.auth.getUser();

    	return {
    		user: user // ✅ Now this matches the type defined in app.d.ts
    	};
    });
    ```

After these two steps, TypeScript will no longer complain about `context.user` in your `.telefunc.ts` files.

-----

### \#\# 3. Fixing General TypeScript & ESLint Hygiene

These errors are side-effects of your refactoring.

#### **The Problem**

  * `Parameter '...' implicitly has an 'any' type.`
  * `Unexpected any. Specify a different type.`
  * `'Discount' is defined but never used.`

#### **The Cause**

  * **Implicit `any`:** You have function parameters without explicit types, and TypeScript can't infer them.
  * **Unused variables:** You have leftover types or variables from your old RuneStore implementation that are no longer needed.

#### **The Solution: Leverage Your Schemas and Clean Up**

1.  **Type Parameters with Zod:** You're already using Zod. Use `z.infer` to get static types from your runtime schemas. This is the core principle of your type-safe stack.

    ❌ **Incorrect:**

    ```typescript
    // Parameter 'discount' implicitly has an 'any' type
    export const createDiscount = (discount) => { /* ... */ };
    ```

    ✅ **Correct:**

    ```typescript
    import { z } from 'zod';
    import { discountCreateSchema } from '$lib/schemas/discountSchema'; // Your Zod schema

    // Infer the type from the schema
    type DiscountCreatePayload = z.infer<typeof discountCreateSchema>;

    export const createDiscount = (discount: DiscountCreatePayload) => {
        // Now 'discount' is fully typed!
        return telefuncCreateDiscount(discount);
    };
    ```

2.  **Remove Unused Code:** Simply delete the unused variables, types, or imports that ESLint flags. They are remnants of your previous architecture.

By following these three guidelines, you should be able to resolve the vast majority of your migration errors and establish a clean, maintainable pattern for your application.