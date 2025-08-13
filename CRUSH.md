# AZPOS Project - Claude Development Context

### Build/lint/test commands
`npm run dev`
`npm run build`
`npm run preview`
`npx prettier --write .` (for formatting)

### To run a single test
`npm test src/lib/tests/auth-integration.test.ts`

### Code Style Guidelines

#### Imports
- Use absolute imports for modules within the `src/lib` directory (e.g., `import { getProducts } from '$lib/remote/products.remote';`)
- Use relative imports for sibling or child modules (e.g., `import './styles.css';`)
- Group imports: first external, then internal absolute, then internal relative. Leave a blank line between groups.

#### Formatting
- Use `npx prettier --write .` to format code. Configuration is in `.prettierrc`.
- Indent with 4 spaces.

#### Types
- Use TypeScript for all new code.
- Define Zod schemas for API inputs/outputs and database interactions.
- Ensure TypeScript types match database schemas, especially for critical fields.

#### Naming Conventions
- Variables and functions: `camelCase`
- Components: `PascalCase` (e.g., `StockStatus.svelte`)
- Files: `kebab-case` (e.g., `product-entry.svelte`)
- Remote functions: `getActionName` for queries, `doActionName` for commands (e.g., `getProducts`, `createProduct`)

#### Error Handling
- Remote functions should `throw error` for API failures.
- Components consuming remote functions should use `{:catch error}` blocks in Svelte's `#await` for UI-level error display.
- Log errors appropriately using `console.error`.

### Automated Rule References
No specific Cursor rules (`.cursor/rules/`, `.cursorrules`) or Copilot rules (`.github/copilot-instructions.md`) were found in this repository.