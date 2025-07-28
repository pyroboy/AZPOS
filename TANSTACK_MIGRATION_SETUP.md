# TanStack Query + Telefunc Migration Setup

This guide outlines the setup required to complete the migration from Svelte 5 runes stores to TanStack Query + Telefunc server-centric architecture.

## 1. Install Required Dependencies

```bash
# Core TanStack Query and Telefunc packages
npm install @tanstack/svelte-query telefunc

# Supabase for database operations
npm install @supabase/supabase-js

# Zod for schema validation (if not already installed)
npm install zod

# Superforms for form handling (if not already installed)
npm install sveltekit-superforms

# Development dependencies
npm install -D @types/uuid
```

## 2. Environment Variables

Add the following to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Telefunc Configuration (optional)
TELEFUNC_URL=http://localhost:5173/_telefunc
```

## 3. Database Setup

Run the SQL schema in your Supabase dashboard or via CLI:

```bash
# Apply the cart schema
supabase db push
# or manually run the SQL from src/lib/server/db/schema/cart.sql
```

## 4. Telefunc Configuration

Create `telefunc.config.js` in your project root:

```javascript
export default {
	baseUrl: 'http://localhost:5173',
	telefuncUrl: '/_telefunc'
};
```

## 5. SvelteKit Configuration

Update your `vite.config.js` to include Telefunc:

```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { telefunc } from 'telefunc/vite';

export default {
	plugins: [sveltekit(), telefunc()]
};
```

## 6. Migration Status

### ✅ Completed

- Cart schema definitions (`src/lib/types/cart.schema.ts`)
- Server-side Telefunc functions (`src/lib/server/telefuncs/cart.telefunc.ts`)
- Data access layer (`src/lib/data/cart.ts`)
- Database schema (`src/lib/server/db/schema/cart.sql`)
- Layout updated with QueryClient provider

### 🔄 Next Steps

1. Install dependencies (see above)
2. Set up environment variables
3. Apply database schema
4. Update components to use `useCart()` hook instead of `cart` store
5. Test cart functionality with server-centric architecture

## 7. Component Migration Example

### Before (Runes Store):

```svelte
<script>
	import { cart } from '$lib/stores/cartStore.svelte';

	// Direct access to reactive state
	const items = cart.state.items;
	const totals = cart.totals;

	function addItem(product) {
		cart.addItem(product, 1);
	}
</script>
```

### After (TanStack Query):

```svelte
<script>
	import { useCart } from '$lib/data/cart';

	// Hook provides reactive queries and mutations
	const { items, cartTotals, addItemOptimistic, isLoading } = useCart();

	function addItem(product) {
		addItemOptimistic(product, 1);
	}
</script>

{#if isLoading}
	<p>Loading cart...</p>
{:else}
	<!-- Cart content -->
{/if}
```

## 8. Benefits of New Architecture

- **Server as Source of Truth**: Cart state persists across sessions and devices
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on errors
- **Automatic Caching**: TanStack Query handles intelligent caching and refetching
- **Type Safety**: End-to-end type safety with Zod schemas
- **Real-time Sync**: Multiple tabs/devices stay in sync
- **Offline Support**: Built-in offline/online state management
- **Error Handling**: Robust error boundaries and retry logic

## 9. Testing the Migration

1. Start the development server: `npm run dev`
2. Open browser console to check for errors
3. Test cart operations: add items, update quantities, apply discounts
4. Verify data persists across page refreshes
5. Test with multiple browser tabs to ensure sync

## 10. Rollback Plan

If issues arise, you can temporarily revert to the original cart store by:

1. Commenting out the TanStack Query provider in layout
2. Reverting component imports back to `cartStore.svelte`
3. The original store files remain intact during migration
