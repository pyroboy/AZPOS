<!--
  A component that triggers the CSV export action.
-->
<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { enhance, applyAction } from '$app/forms';
    import type { ProductWithStatus } from './types';

    let { products }: { products: ProductWithStatus[] } = $props();

    let productsJson = $derived(JSON.stringify(products ?? []));


</script>

<form 
    method="POST" 
    action="?/exportCsv" 
    use:enhance={() => {
        return async ({ result }) => {
            if (result.type === 'success' && result.data?.csv) {
                const blob = new Blob([result.data.csv as string], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `products_with_images_${Date.now()}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
            await applyAction(result);
        };
    }}>
    <input type="hidden" name="products" value={productsJson} />
    <Button type="submit" disabled={!products || products.length === 0}>
        Export to CSV
    </Button>
</form>
