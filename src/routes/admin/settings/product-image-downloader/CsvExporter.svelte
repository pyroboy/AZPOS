<!--
  A component that triggers the CSV export action.
-->
<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { enhance, applyAction } from '$app/forms';
    import type { ProductWithStatus } from './types';

    let { products }: { products: ProductWithStatus[] } = $props();

    let productsJson = $derived(JSON.stringify(products ?? []));

    function b64toBlob(b64Data: string, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }
</script>

<form 
    method="POST" 
    action="?/exportCsv" 
    use:enhance={() => {
        return async ({ result }) => {
            if (result.type === 'success' && result.data?.csv) {
                const blob = b64toBlob(result.data.csv as string, 'text/csv');
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
