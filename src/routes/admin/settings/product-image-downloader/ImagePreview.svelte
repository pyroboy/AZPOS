<script lang="ts">
	let { src, fallbackSrc, alt = 'Product image' } = $props<{
		src: string | undefined;
		fallbackSrc: string | undefined;
		alt?: string;
	}>();

	let error = $state(false);

	$effect(() => {
		// Reset error state when src changes
		// to allow re-rendering the image.
		src; // depend on src
		error = false;
	});

	function handleError(event: Event) {
		const imgElement = event.target as HTMLImageElement;
		if (fallbackSrc && imgElement.src !== fallbackSrc) {
			imgElement.src = fallbackSrc;
			return; // Attempt to load fallback
		}
		// If fallback also fails or doesn't exist, set error
		error = true;
	}
</script>

{#if src && !error}
  <img {src} {alt} class="h-16 w-16 object-cover rounded-md" onerror={handleError} />
{:else}
  <div class="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
    <span>No Img</span>
  </div>
{/if}
