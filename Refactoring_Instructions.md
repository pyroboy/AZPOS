## **Refactoring Instructions for Dynamic `telefunc` Imports**

To ensure server-side code is not bundled for the client and to prevent potential Server-Side Rendering (SSR) issues, all `telefunc` functions must be called through dynamic import wrappers.

### **Summary of Changes**

1.  **Remove Static Imports**: Eliminate all static imports for `telefunc` functions at the top of your files.

      * **Instead of this:**
        ```typescript
        import { onGetItems, onCreateItem } from '$lib/server/telefuncs/items.telefunc';
        ```
      * **Do this:** Remove the line entirely.

2.  **Create Dynamic Import Wrappers**: For each `telefunc` you need to call, create a new `async` wrapper function that dynamically imports the `telefunc` module before executing the function. This pattern should be applied consistently across the codebase.

### **Wrapper Function Pattern**

Each wrapper function must adhere to the following structure and best practices.

#### **Generic Template**

```typescript
/**
 * A wrapper for the on[FunctionName] telefunc to avoid SSR import issues.
 * @param {any} params - The parameters for the telefunc.
 * @returns {Promise<any>} The result from the telefunc.
 */
export const on[FunctionName] = async (params: any): Promise<any> => {
  const { on[FunctionName] } = await import('$lib/server/telefuncs/[entity].telefunc');
  return on[FunctionName](params);
};
```

-----

### **Key Requirements for Each Wrapper**

  * **Asynchronous Execution**: Use `async/await` for the function definition and the dynamic import.
  * **Dynamic Import Path**: The `import()` path must correctly point to the relevant `telefunc` file (e.g., `await import('$lib/server/telefuncs/[entity].telefunc')`).
  * **TypeScript Typing**: Maintain strong TypeScript types for all parameters and ensure the function returns a `Promise`.
  * **Consistent Naming**: The wrapper function's name should exactly match the name of the `telefunc` it is calling.
  * **JSDoc Comments**: Include a clear JSDoc comment explaining that the wrapper's purpose is to avoid SSR import issues, as shown in the template.

