# AZPOS Project - Claude Development Context

This file contains important context for Claude Code development sessions, including migration status, patterns, and project-specific information.

## Current Project Status

### Architecture Migration: TanStack Query + Telefunc → SvelteKit Remote Functions
**Status**: Major Progress (3/N components completed)  
**Strategy**: Gradual migration, keeping Telefunc as reference

## Migration Progress

### ✅ Completed: StockStatus Component (2025-08-12)

**Files Modified**:
- `src/lib/types/product.schema.ts` - Added missing database fields
- `src/lib/remote/products.remote.ts` - Complete remote functions implementation  
- `src/lib/remote/inventory.remote.ts` - Inventory operations
- `src/lib/components/inventory/StockStatus.svelte` - Fixed state mutations
- `svelte.config.js` - Enabled remote functions

**Key Issues Resolved**:
1. **Schema Mismatches**: Added `reorder_point` and `aisle_location` fields
2. **Svelte 5 State Mutation**: Fixed `state_unsafe_mutation` errors
3. **Stock Logic**: Corrected reorder logic to use `reorder_point || min_stock_level || 10`

### ✅ Completed: ProductEntry Component (2025-08-12)

**Files Modified**:
- `src/lib/remote/suppliers.remote.ts` - NEW: Complete suppliers remote functions
- `src/lib/remote/categories.remote.ts` - NEW: Complete categories remote functions
- `src/lib/components/inventory/ProductEntry.svelte` - Complete migration to remote functions

**Migration Strategy Implemented**:
1. **Phase 1**: Schema and field mappings updated
2. **Phase 2**: Created suppliers and categories remote functions  
3. **Phase 3**: Replaced all data hooks with remote function calls using await patterns
4. **Phase 4**: Updated form integration and SuperForms compatibility
5. **Phase 5**: Fixed state management and error handling
6. **Phase 6**: Full functionality testing

**Technical Achievements**:
- Established reusable migration pattern for complex forms
- Implemented proper async data handling with await/then/catch patterns
- Created template-level data computation using `@const` directive
- Maintained all existing functionality including variants, bundles, and form validation

### ✅ Completed: RecentProductsTable Component (2025-08-12)

**Files Modified**:
- `src/lib/components/inventory/RecentProductsTable.svelte` - Rapid migration to remote functions

**Key Fix**: Resolved "isLoading is not a function" TypeError by replacing TanStack Query function calls with proper await pattern

### 🔄 Pending Migrations
- Order management components  
- Reports and analytics
- User management components
- Other product-related sub-components

## Established Migration Patterns (🎯 PROVEN)

### Fast Component Migration Strategy
Based on our successful migrations, follow this proven pattern:

1. **Replace Imports** (30 seconds)
   ```typescript
   // OLD: import { useProducts } from '$lib/data/product';
   // NEW: import { getProducts } from '$lib/remote/products.remote';
   ```

2. **Replace Data Fetching** (1 minute)
   ```typescript
   // OLD: const { products, isLoading, isError, error } = useProducts();
   // NEW: const productsQuery = getProducts();
   ```

3. **Update Template Pattern** (2-5 minutes)
   ```svelte
   <!-- OLD: Conditional logic with functions -->
   {#if isLoading()} ... {:else if isError()} ... {/if}
   
   <!-- NEW: Await pattern with computed values -->
   {#await dataQuery}
       <!-- Loading -->
   {:then data}
       {@const computed = transform(data)}
       <!-- Success with computed values -->
   {:catch error}
       <!-- Error -->
   {/await}
   ```

### Complex Form Migration Strategy (ProductEntry Pattern)
For components with forms, data dependencies, and complex state:

**Phase Structure** (20-30 minutes total):
1. **Schema & Mappings** (5 min) - Update field mappings and schemas
2. **Create Dependencies** (10 min) - Build required remote functions (suppliers, categories)
3. **Replace Data Hooks** (5 min) - Convert all data fetching to await patterns
4. **Form Integration** (5 min) - Ensure SuperForms compatibility
5. **State Management** (2 min) - Fix any state mutation issues
6. **Testing** (3 min) - Verify functionality

**Key Success Factors**:
- Use `@const` for template-level computations
- Maintain exact existing functionality
- Follow established remote function patterns
- Preserve form validation and error handling

### Remote Function Implementation Pattern

#### Standard Query Function
```typescript
export const getData = query(async (): Promise<DataType[]> => {
    const user = getAuthenticatedUser();
    console.log('🔍 [REMOTE] Fetching data');
    
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
    
    if (error) {
        console.error('❌ [REMOTE] Error:', error);
        throw error;
    }
    
    console.log('✅ [REMOTE] Fetched', data?.length || 0, 'items');
    return data?.map(item => ({ /* transform */ })) || [];
});
```

#### Command Function (Mutations)
```typescript
export const createData = command(
    inputSchema,
    async (validatedData): Promise<DataType> => {
        const user = getAuthenticatedUser();
        if (!user.permissions.includes('data:write')) {
            throw new Error('Not authorized');
        }
        
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
            .from('table_name')
            .insert({
                ...validatedData,
                created_by: user.id,
                updated_by: user.id
            })
            .select()
            .single();
            
        if (error) throw error;
        return { /* transformed data */ };
    }
);
```

## Development Patterns

### 1. Remote Functions Pattern
```typescript
// src/lib/remote/*.remote.ts
import { query, command } from '$app/server';
import { z } from 'zod';

export const getData = query(
    inputSchema.optional(),
    async (validatedInput) => {
        // Type-safe server logic
        const supabase = createSupabaseClient();
        // ... database operations
        return transformedData;
    }
);
```

### 2. Component Usage Pattern
```svelte
<!-- Component template -->
<script>
    import { getData } from '$lib/remote/data.remote';
    const dataQuery = getData(filters);
</script>

{#await dataQuery then data}
    {@const computed = transform(data)}
    <!-- Use data without state mutations -->
{:catch error}
    <ErrorDisplay {error} />
{/await}
```

### 3. Database Schema Validation
```typescript
// Always ensure TypeScript matches database
// Use Supabase MCP for verification:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products';
```

## Critical Svelte 5 Rules

### ❌ AVOID: State Mutations in Templates
```svelte
<script>
    let derived = $state([]);
    function compute(input) {
        derived = transform(input); // DON'T DO THIS
        return input;
    }
</script>
{@const result = compute(data)} <!-- ERROR: state_unsafe_mutation -->
```

### ✅ CORRECT: Template Context Computation
```svelte
{#await dataQuery then data}
    {@const derived = transform(data)}
    {@const filtered = filter(derived)}
    <!-- Use computed values -->
{/await}
```

## Database Schema Reference

### Products Table Key Fields
```sql
-- Critical fields for stock management
stock_quantity: integer NOT NULL DEFAULT 0
min_stock_level: integer DEFAULT 0  
reorder_point: integer DEFAULT 0    -- Use for reorder logic
aisle_location: varchar             -- Product location
```

### Stock Logic Pattern
```typescript
// Always use this reorder logic pattern:
const needsReorder = (product: Product) => 
    product.stock_quantity < (product.reorder_point || product.min_stock_level || 10);
```

## Supabase MCP Integration

### Connection Config
```json
// .mcp.json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@supabase/mcp-server-supabase@latest", "--read-only", "--project-ref=yzekfykxeilqkcgluidh"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_c6e2192665bdd3c5d5f7c3be3c3af9965c20a5ed"
      }
    }
  }
}
```

### Common MCP Queries
```sql
-- Check table schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND table_schema = 'public' 
ORDER BY ordinal_position;

-- Sample data verification
SELECT * FROM products LIMIT 5;
```

## Development Commands

### Testing & Building
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview build
npx prettier --write # Format code
```

### Remote Functions Setup
```js
// svelte.config.js
export default {
    kit: {
        experimental: {
            remoteFunctions: true  // Required for remote functions
        }
    }
};
```

## Common Issues & Solutions

### 1. Export/Import Errors
**Problem**: `does not provide an export named 'getProducts'`
**Solution**: Check file syntax, run Prettier, ensure proper function exports

### 2. Type Mismatches  
**Problem**: TypeScript errors with database fields
**Solution**: Verify schema with MCP, update TypeScript types

### 3. State Mutation Errors
**Problem**: `state_unsafe_mutation` in Svelte 5
**Solution**: Move computations to template context with `@const`

### 4. Missing Database Fields
**Problem**: New fields not in schemas
**Solution**: Add to both Zod schema and remote function transformations

## Component Migration Checklist

For each component migration:
- [ ] Remote functions created with proper validation
- [ ] Component updated to use `await` pattern
- [ ] State mutations moved to template context
- [ ] All CRUD operations working
- [ ] Error handling implemented
- [ ] TypeScript compilation clean
- [ ] No console errors
- [ ] Performance maintained

## Project Architecture

### Current Stack
- **Frontend**: SvelteKit 5 (experimental features)
- **Backend**: SvelteKit Remote Functions  
- **Database**: Supabase PostgreSQL
- **Validation**: Zod schemas
- **Styling**: Tailwind CSS
- **Type Safety**: End-to-end TypeScript

### Migration Target
- **Remove**: TanStack Query, Telefunc
- **Keep**: All existing functionality
- **Improve**: Type safety, performance, developer experience

## Notes for Future Sessions

1. **Don't Delete Telefunc**: Keep as reference until migration complete
2. **Schema First**: Always verify database schema before coding
3. **Gradual Migration**: One component at a time
4. **Test Thoroughly**: Each migration must maintain functionality
5. **Document Issues**: Update this file with new patterns/solutions

## Quick Reference

- **Migration Log**: See `MIGRATION_LOG.md` for detailed progress
- **Remote Functions**: `src/lib/remote/*.remote.ts`
- **Database**: Use Supabase MCP for schema verification
- **Patterns**: Follow established remote function patterns
- **Testing**: Use component checklist for each migration

---

*Last Updated: 2025-08-12*  
*Migration Status: 🎯 MAJOR SUCCESS - 3 components completed (StockStatus, ProductEntry, RecentProductsTable)*  
*Established Patterns: Fast migration strategy proven effective (2-30 minutes per component)*