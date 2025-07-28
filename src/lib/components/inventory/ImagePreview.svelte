<script lang="ts">
	import { getInitialsSvg, sanitizeImageUrl } from '$lib/utils/image';
	import { cn } from '$lib/utils';

	type $$Props = {
		src: string | undefined | null;
		fallbackSrc?: string | undefined | null;
		alt?: string;
		product: { name: string; id: string };
		size?: keyof typeof sizeClasses;
		class?: string;
	};

	let {
		src,
		fallbackSrc,
		alt = 'Product image',
		product,
		size = 'md',
		class: className = ''
	}: $$Props = $props();

	let loading = $state(true);
	let error = $state(false);
	let attemptCount = $state(0);
	let currentSrc = $state('');

	const sizeClasses = {
		xs: 'size-8',
		sm: 'size-12',
		md: 'size-16',
		lg: 'size-24',
		xl: 'size-32'
	};

	const initialsSvg = getInitialsSvg(product.name, product.id);

	function updateSource() {
		loading = true;
		error = false;
		const sanitizedSrc = sanitizeImageUrl(src);
		const sanitizedFallback = sanitizeImageUrl(fallbackSrc);
		console.log(sanitizedSrc, sanitizedFallback);
		if (attemptCount === 0 && sanitizedSrc) {
			currentSrc = sanitizedSrc;
		} else if (attemptCount === 1 && sanitizedSrc) {
			// Retry with a cache-busting query param
			currentSrc = `${sanitizedSrc}?retry=${Date.now()}`;
		} else if (attemptCount === 2 && sanitizedFallback) {
			currentSrc = sanitizedFallback;
		} else {
			currentSrc = initialsSvg;
			loading = false; // No loading for SVG
		}
	}

	function handleError() {
		error = true;
		loading = false;
		attemptCount += 1;
		updateSource();
	}

	function handleLoad() {
		loading = false;
		error = false;
	}

	$effect(() => {
		attemptCount = 0;
		updateSource();
	});
</script>

<div class={cn('relative overflow-hidden rounded-md bg-muted', sizeClasses[size], className)}>
	{#if loading}
		<div class="h-full w-full animate-pulse bg-secondary"></div>
	{/if}
	<img
		src={currentSrc}
		loading="lazy"
		decoding="async"
		{alt}
		onerror={handleError}
		onload={handleLoad}
		class={cn(
			'h-full w-full object-cover transition-opacity',
			loading ? 'opacity-0' : 'opacity-100'
		)}
	/>
</div>
