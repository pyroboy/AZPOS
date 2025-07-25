<script lang="ts">
	let { src, fallbackSrc, alt = 'Product image', product } = $props<{
		src: string | undefined;
		fallbackSrc: string | undefined;
		alt?: string;
		product: any;
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


	const colors = [
		'#ffadad', '#ffd6a5', '#fdffb6', '#caffbf',
		'#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'
	];

	function getInitials(name: string) {
		return name.substring(0, 2).toUpperCase();
	}

	function getRandomColor(id: string) {
		// Simple hash function to get a consistent color based on product ID
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash % colors.length);
		return colors[index];
	}
</script>

{#if src && !error}
  <img {src} {alt} class="h-16 w-16 object-cover rounded-md" onerror={handleError} />
{:else}
<div 
class="h-10 w-10 rounded-md flex items-center justify-center font-bold text-lg"
style="background-color: {getRandomColor(product.id)}; color: #555;"
>
{getInitials(product.name)}
</div>
{/if}
