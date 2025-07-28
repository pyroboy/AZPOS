---
trigger: manual
---

FOR SELECT COMPONENT ERROR FIX!
!!!!DO NOT USE ```

```
<SelectValue>
```

---

### ## 1. Single Selection (`type="single"`)

This is the default and most common way to use the Select component. It allows a user to choose one option from a list.

**Key Steps:**

1. **Import** the `Select`, `SelectTrigger`, `SelectContent`, and `SelectItem` components.
2. **Define** an array of objects for the options. Each object needs a `value` and `label`.
3. **Manage State** using Svelte 5 runes.
   - Use `$state` to hold the selected option's `value` (a `string`).
   - Use `$derived` to compute the display `label` for the trigger.

4. **Bind Value** using `bind:value` on the main `<Select>` component.
5. **Render Items** by iterating over your options array with an `{#each}` block.

**Example:**

Svelte

```
<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";

  // Define the list of options
  const frameworks = [
    { value: "svelte", label: "Svelte" },
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "solid", label: "Solid", disabled: true }, // You can disable options
  ];

  // The selected value is a single string
  let selectedValue = $state<string>("");

  // Derive the display label from the state
  const selectedLabel = $derived(
    selectedValue
      ? frameworks.find((f) => f.value === selectedValue)?.label
      : "Select a framework"
  );
</script>

<Select type="single" bind:value={selectedValue}>
  <SelectTrigger class="w-[280px]">
    {selectedLabel}
  </SelectTrigger>
  <SelectContent>
    {#each frameworks as { value, label, disabled }}
      <SelectItem {value} {disabled}>{label}</SelectItem>
    {/each}
  </SelectContent>
</Select>

{#if selectedValue}
  <p class="mt-4">You selected: <strong>{selectedValue}</strong></p>
{/if}
```

---

### ## 2. Multiple Selections (`type="multiple"`)

To allow selecting multiple items, set the `type` prop to `"multiple"`. This requires changing your state management to handle an array of values.

**Key Changes:**

1. **`type` Prop**: Add `type="multiple"` to the `<Select>` component.
2. **State**: The bound `value` must be an array of strings: `$state<string[]>([])`.
3. **Display Logic**: The `$derived` label must be updated to handle multiple selections, for example, by joining the labels into a comma-separated list.

**Example:**

Svelte

```
<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";

  const frameworks = [
    { value: "svelte", label: "Svelte" },
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "angular", label: "Angular" },
  ];

  // The value is now an array of strings
  let selectedValues = $state<string[]>([]);

  // The derived label handles the array
  const selectedLabel = $derived(
    selectedValues.length
      ? frameworks
          .filter((f) => selectedValues.includes(f.value))
          .map((f) => f.label)
          .join(", ")
      : "Select your favorite frameworks"
  );
</script>

<Select type="multiple" bind:value={selectedValues}>
  <SelectTrigger class="w-[280px]">
    <span class="truncate">{selectedLabel}</span>
  </SelectTrigger>
  <SelectContent>
    {#each frameworks as { value, label }}
      <SelectItem {value}>{label}</SelectItem>
    {/each}
  </SelectContent>
</Select>

{#if selectedValues.length}
  <p class="mt-4">You have selected {selectedValues.length} framework(s).</p>
{/if}
```

---

### ## 3. Other Important Props

Since `shadcn-svelte`'s `<Select>` wraps `bits-ui`'s `Select.Root`, you can pass its props directly to the component for more control.

- **`disabled={boolean}`**: Disables the entire select control.
  Svelte
  ```
  <Select disabled={true}>...</Select>
  ```
- **`open={boolean}`**: Programmatically control the dropdown's visibility. This can be two-way bound with `bind:open`.
  Svelte
  ```
  <Select bind:open={isOpen}>...</Select>
  ```
- **`required={boolean}`**: Marks the select as required for HTML form validation.
- **`name="string"`**: Sets the `name` attribute for a hidden input, allowing the select's value to be included in a form submission.
