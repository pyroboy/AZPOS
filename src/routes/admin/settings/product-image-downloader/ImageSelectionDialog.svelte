<!--
  A modal or dialog component to display image search results in a carousel.
-->
<script lang="ts">
    import type { FoundImage } from './types';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import Search from 'lucide-svelte/icons/search';
    import { toast } from 'svelte-sonner';

    let { open = false, images = [], productName = '', onselect = (image: FoundImage, blob: Blob) => {}, onclose = () => {}, onsearch = (term: string) => {} } = $props<{ 
        open: boolean;
        images: FoundImage[];
        productName: string;
        onselect: (image: FoundImage, blob: Blob) => void;
        onclose: () => void;
        onsearch: (searchTerm: string) => void;
    }>();

    let searchTerm = $state(productName);
    let isFetching = $state(false);

    async function handleSelect(image: FoundImage) {
        isFetching = true;
        try {
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(image.image_url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const blob = await response.blob();
            onselect(image, blob);
            onclose();
        } catch (error) {
            console.error('Error fetching image as blob:', error);
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast.error('Failed to Select Image', {
                description: 'Could not fetch the image. This may be due to a network issue or a cross-origin security restriction (CORS).'
            });
        } finally {
            isFetching = false;
        }
    }

    function handleSearch() {
        onsearch(searchTerm);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleSearch();
        }
    }
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onclose()}>
    <Dialog.Content class="sm:max-w-[600px] overflow-hidden">
        <Dialog.Header>
            <Dialog.Title>Select an Image for {productName}</Dialog.Title>
            <Dialog.Description>
                Review the images below or enter a new search term.
            </Dialog.Description>
        </Dialog.Header>

                        <div class="flex w-full items-center space-x-2 pt-2">
            <Input type="text" placeholder="Enter a search term..." bind:value={searchTerm} onkeydown={handleKeydown} />
            <Button type="button" onclick={handleSearch}><Search class="mr-2 h-4 w-4" /> Search</Button>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 pt-4">
            {#if images.length > 0}
                {#each images.slice(0, 10) as image, i (image.image_url)}
                    <div class="p-1">
                        <button
                            onclick={() => handleSelect(image)}
                            class="group relative block w-full h-full cursor-pointer overflow-hidden rounded-md border-2 border-transparent focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <img src={`/api/image-proxy?url=${encodeURIComponent(image.image_url)}`} alt={`Search result ${i + 1}`} class="w-full h-auto object-cover rounded-md aspect-square"/>
                            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                <span class="text-white font-bold">Select</span>
                            </div>
                        </button>
                    </div>
                {/each}
            {:else}
                <div class="col-span-full flex items-center justify-center h-48 text-muted-foreground">
                    <p>No images found. Try a different search term.</p>
                </div>
            {/if}
        </div>

    </Dialog.Content>
</Dialog.Root>
