<!--
  A component that triggers the ZIP download action.
-->
<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import type { ProductWithStatus } from './types';

        let { products }: { products: ProductWithStatus[] } = $props();

    const downloadableProducts = $derived(products.filter(p => p.status === 'selected' || p.status === 'found' && p.image_url));

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

    let isZipping = $state(false);

    async function handleDownload() {
        isZipping = true;
        const formData = new FormData();

        const productsMetadata = downloadableProducts.map(({ imageBlob, ...rest }) => rest);
        formData.append('products', JSON.stringify(productsMetadata));

        console.log('--- handleDownload started ---');
        console.log('Products to download:', productsMetadata);

        for (const product of downloadableProducts) {
            if (product.imageBlob) {
                formData.append(`blob_${product.sku}`, product.imageBlob);
                console.log(`Appended blob for ${product.sku}`, product.imageBlob);
            }
        }

        // For debugging: log all form data entries
        for (const pair of formData.entries()) {
            console.log(pair[0], pair[1]);
        }

        try {
            console.log('Sending request to /api/download-zip...');
            const response = await fetch('/api/download-zip', {
                method: 'POST',
                body: formData
            });

            console.log('Received response:', response);

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || 'Failed to create ZIP.');
                } catch {
                    throw new Error(errorText || 'An unknown server error occurred.');
                }
            }

            const result = await response.json();

            if (result.success && result.zip) {
                const blob = b64toBlob(result.zip, 'application/zip');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `product-images-${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Download Successful', {
                    description: 'All selected images have been zipped.'
                });
            } else {
                const errorMessage = result.error || 'An unknown error occurred during ZIP creation.';
                console.error('Server returned success=false:', errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Caught error during download process:', error);
            toast.error('Download Failed', { description: error.message });
        } finally {
            isZipping = false;
        }
    }
</script>

<Button onclick={handleDownload} disabled={downloadableProducts.length === 0 || isZipping}>
    {#if isZipping}
        Zipping...
    {:else}
        Download ZIP ({downloadableProducts.length})
    {/if}
    </Button>
