<!--
  A modal or dialog component to display image search results in a carousel.
-->
<script lang="ts">
    import type { FoundImage } from './types';
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Carousel from "$lib/components/ui/carousel";
    import { Button } from '$lib/components/ui/button';

    export let open = false;
    export let images: FoundImage[] = [];
    export let onselect: (image: FoundImage) => void;
    export let onclose: () => void;

    function handleSelect(image: FoundImage) {
        if (onselect) onselect(image);
        if (onclose) onclose();
    }
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onclose && onclose()}>
    <Dialog.Content class="sm:max-w-[600px]">
        <Dialog.Header>
            <Dialog.Title>Select an Image</Dialog.Title>
            <Dialog.Description>
                Click on an image to select it for the product.
            </Dialog.Description>
        </Dialog.Header>

        <Carousel.Root class="w-full max-w-lg mx-auto">
            <Carousel.Content>
                {#each images as image, i}
                    <Carousel.Item class="md:basis-1/2 lg:basis-1/3">
                        <div class="p-1">
                            <!-- @ts-ignore -->
                            <button
                                onclick={() => handleSelect(image)}
                                class="group relative block w-full h-full cursor-pointer overflow-hidden rounded-md border-2 border-transparent focus:border-primary focus:outline-none"
                            >
                                <img src={image.imageUrl} alt={`Search result ${i + 1}`} class="w-full h-auto object-cover rounded-md aspect-square"/>
                                <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                    <span class="text-white font-bold">Select</span>
                                </div>
                            </button>
                        </div>
                    </Carousel.Item>
                {/each}
            </Carousel.Content>
            <Carousel.Previous />
            <Carousel.Next />
        </Carousel.Root>

    </Dialog.Content>
</Dialog.Root>
