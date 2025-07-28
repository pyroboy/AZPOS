---
trigger: always_on
---

SvelteKit Architecture: From RuneStores to a Server-Centric Model
This guide outlines a modern, scalable, and type-safe pattern for SvelteKit applications. We will move from managing state in client-side Rune stores to a robust model where the server is the single source of truth.

The Stack:

SvelteKit 5: The core framework.

TanStack Query: Manages server state on the client (caching, refetching, mutations).

Telefunc: Creates a zero-API, type-safe bridge between client and server.

Zod: Defines data schemas for validation and type inference.

Superforms: Creates powerful, type-safe forms with client and server validation.

Supabase: The backend, providing database, authentication, and Role-Based Access Control (RBAC) via Row Level Security (RLS).

1. Core Principles
This architecture is built on a few key ideas:

Server is the Single Source of Truth: Your Supabase database holds the real state. The client is just a view into that state.

Clear Separation of Concerns:

UI Components: Only responsible for displaying data and capturing user input.

Data Access Layer (/data): Manages how and when to fetch/update server data (using TanStack Query).

Server API (/telefuncs): Contains the actual business logic and database operations.

End-to-End Type Safety: Zod schemas defined once are used for database validation, API contracts, form handling, and client-side type-checking.

Declarative Data Fetching: Instead of manually calling fetch and managing loading/error states, you declare what data a component needs, and TanStack Query handles the rest.

Secure by Default: All sensitive logic and data access rules (RBAC) live on the server, inaccessible from the client's browser.

2. The New Folder Structure
This structure organizes your application for clarity and scalability.

src/
├── lib/
│   ├── components/       # Dumb UI components
│   │
│   ├── data/             # (Replaces /stores) CLIENT: TanStack Query hooks
│   │   ├── auth.ts
│   │   ├── product.ts
│   │   └── returns.ts
│   │
│   ├── server/           # SERVER-ONLY CODE
│   │   ├── db.ts         # Supabase client instance
│   │   └── telefuncs/    # SERVER: Business logic & DB operations
│   │       ├── auth.telefunc.ts
│   │       ├── product.telefunc.ts
│   │       └── returns.telefunc.ts
│   │
│   └── types/            # SHARED: Single source of truth for types
│       ├── auth.schema.ts
│       ├── product.schema.ts
│       └── returns.schema.ts
│
├── routes/
│   ├── (protected)/      # Routes requiring authentication
│   │   ├── returns/
│   │   │   ├── +page.svelte    # Consumes `useReturns()` from /data/returns.ts
│   │   │   └── +page.server.ts # For loading Superforms
│   │   └── ...
│   │
│   ├── login/
│   └── +layout.svelte    # Provides the TanStack QueryClient
│
└── app.d.ts

3. The Migration Playbook: Converting a RuneStore
Let's convert your returnsStore.svelte.ts into this new pattern, step-by-step.

Original RuneStore Pattern:
State: const returns = $state([...])

Derived State: const pendingReturns = $derived(...)

Methods: function addReturn(...), function updateReturnStatus(...)

New Server-Centric Pattern:
Step 1: Define the Schema (The "What")

Create the single source of truth for your return data's shape and rules.

File: src/lib/types/returns.schema.ts

Action: Use Zod to define the schema. Infer the TypeScript types from it.

// src/lib/types/returns.schema.ts
import { z } from 'zod';

// Schema for creating a return (used in forms)
export const newReturnSchema = z.object({
  order_id: z.string().min(1),
  customer_name: z.string().min(1),
  // ... other fields
});

// Full schema matching your database table
export const enhancedReturnSchema = newReturnSchema.extend({
  id: z.string().uuid(),
  return_date: z.string().datetime(),
  status: z.enum(['pending', 'approved', 'rejected']),
  user_id: z.string().uuid() // For RBAC
});

// Export the inferred types
export type NewReturnInput = z.infer<typeof newReturnSchema>;
export type EnhancedReturnRecord = z.infer<typeof enhancedReturnSchema>;

Step 2: Move Logic to the Server (The "How")

Re-implement your store's methods as server-side Telefunc functions. This is your secure API.

File: src/lib/server/telefuncs/returns.telefunc.ts

Action: Write async functions that perform validation and interact with Supabase.

// src/lib/server/telefuncs/returns.telefunc.ts
import { getContext } from 'telefunc';
import { newReturnSchema, type EnhancedReturnRecord } from '$lib/types/returns.schema';
import { createSupabaseClient } from '$lib/server/db'; // Your Supabase client

// Telefunc to get all returns
export async function onGetReturns(): Promise<EnhancedReturnRecord[]> {
  const { user } = getContext(); // Get authenticated user
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from('returns').select();
  if (error) throw error;
  return data; // Supabase RLS already filtered this data for the user
}

// Telefunc to add a return
export async function onAddReturn(returnData: unknown): Promise<EnhancedReturnRecord> {
  const { user } = getContext();
  if (!user || user.role !== 'admin') throw new Error('Not authorized'); // RBAC check

  const validatedData = newReturnSchema.parse(returnData); // Server-side validation
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('returns')
    .insert({ ...validatedData, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

Step 3: Create the Data Access Layer (The "Where")

This file replaces your RuneStore. It doesn't hold state; it provides hooks to access the server state.

File: src/lib/data/returns.ts

Action: Use TanStack Query's createQuery and createMutation to call your Telefunc functions.

// src/lib/data/returns.ts
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { onGetReturns, onAddReturn } from '$lib/server/telefuncs/returns.telefunc';
import type { EnhancedReturnRecord, NewReturnInput } from '$lib/types/returns.schema';

const returnsQueryKey = ['returns'];

export function useReturns() {
  const queryClient = useQueryClient();

  // The QUERY to fetch data
  const returnsQuery = createQuery<EnhancedReturnRecord[]>({
    queryKey: returnsQueryKey,
    queryFn: onGetReturns,
  });

  // The MUTATION to add a return
  const addReturnMutation = createMutation({
    mutationFn: (newReturn: NewReturnInput) => onAddReturn(newReturn),
    onSuccess: () => {
      // When successful, automatically refetch the list
      queryClient.invalidateQueries({ queryKey: returnsQueryKey });
    },
  });

  // Re-create derived state using Svelte 5 runes on the query's data
  const returns = $derived(returnsQuery.data ?? []);
  const pendingReturns = $derived(returns.filter(r => r.status === 'pending'));

  return {
    // Queries and their states (isLoading, isError, etc.)
    returnsQuery,
    // Derived state (still works beautifully!)
    returns,
    pendingReturns,
    // Mutations to change data
    addReturn: addReturnMutation.mutate,
    addReturnStatus: addReturnMutation.status, // 'pending', 'success', 'error'
  };
}

Step 4: Use in Components and Forms

Finally, use your new data hook in components and Superforms.

File: src/routes/(protected)/returns/+page.server.ts (for Superforms)

Action: Load the form on the server, connecting it to your Zod schema.

// src/routes/(protected)/returns/+page.server.ts
import { superValidate } from 'sveltekit-superforms/server';
import { newReturnSchema } from '$lib/types/returns.schema';

export const load = async () => {
  const form = await superValidate(newReturnSchema);
  return { form };
};

File: src/routes/(protected)/returns/+page.svelte

Action: Consume the data hook and bind the form.

<!-- src/routes/(protected)/returns/+page.svelte -->
<script lang="ts">
  import { useReturns } from '$lib/data/returns.ts';
  import { superForm } from 'sveltekit-superforms';

  export let data; // From load function

  const { returnsQuery, pendingReturns, addReturn } = useReturns();

  const { form, enhance } = superForm(data.form, {
    onSubmit: async () => {
      // Superforms handles form data, we just call our mutation
      addReturn($form);
    }
  });
</script>

<h1>Returns</h1>

{#if $returnsQuery.isPending}
  <p>Loading...</p>
{:else}
  <p>Pending Returns: {pendingReturns.length}</p>
  <!-- ... display returns -->
{/if}

<!-- Superform for adding a new return -->
<form method="POST" use:enhance>
  <input type="text" data-invalid={$errors.order_id} bind:value={$form.order_id} />
  <!-- ... other form fields -->
  <button type="submit">Add Return</button>
</form>

You have now successfully disseminated your RuneStore's responsibilities into a secure, type-safe, and scalable architecture. Repeat this process for each of your stores.