<!--
  A component that triggers the ZIP download action.
-->
<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { enhance, applyAction } from '$app/forms';
    import type { ProductWithStatus } from './types';

        let { products }: { products: ProductWithStatus[] } = $props();

    const downloadableProducts = $derived(products.filter(p => p.status === 'selected' && p.imageUrl));

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
    action="?/downloadZip"
    use:enhance={() => {
        return async ({ result }) => {
            if (result.type === 'success' && result.data?.zip) {
                const blob = b64toBlob(result.data.zip as string, 'application/zip');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `product-images-${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
            await applyAction(result);
        };
    }}>
    <input type="hidden" name="products" value={JSON.stringify(downloadableProducts)} />
    <Button type="submit" disabled={downloadableProducts.length === 0}>
        Download ZIP ({downloadableProducts.length})
    </Button>
</form>
