<script lang="ts">
	import { onMount } from 'svelte';
	import { products } from '$lib/stores/productStore'; // The base store with the loader method
	import { filteredProducts } from '$lib/stores/inventory/products';
    import { Badge } from '$lib/components/ui/badge';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
    import ImagePreview from '$lib/components/inventory/ImagePreview.svelte';
    const colors = [
		'#ffadad', '#ffd6a5', '#fdffb6', '#caffbf',
		'#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'
	];

	function getInitials(name: string) {
		return name.substring(0, 4).toUpperCase();
	}

	function getRandomColor(id: string) {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash % colors.length);
		return colors[index];
	}

    function getStockBadgeColor(stock: number) {
      if (stock === 0) return 'destructive';
      if (stock < 20) return 'secondary';
      return 'outline';
    }

	let sentinel: HTMLDivElement;

	onMount(() => {
		const observer = new IntersectionObserver(entries => {
			if (entries[0].isIntersecting) {
				products.loadMoreProducts();
			}
		});

		if (sentinel) {
			observer.observe(sentinel);
		}

		return () => {
			if (sentinel) {
				observer.unobserve(sentinel);
			}
		};
	});
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each $filteredProducts as product (product.id)}
            <Card>
              <CardHeader class="p-0">
                <ImagePreview src={product.image_url} product={product} fallbackSrc={product.image_url} />

              </CardHeader>
  
              <CardContent class="p-4 space-y-2">
                <div class="flex justify-between items-start">
                  <CardTitle class="text-lg">{product.name}</CardTitle>
                  <Badge variant={getStockBadgeColor(product.stock)}>
                    {product.stock} in stock
                  </Badge>
                </div>
                <CardDescription>
                  {product.sku} &bull; {product.category_id}
                </CardDescription>
              </CardContent>
  
              <CardFooter class="p-4 pt-0">
                <div class="text-xl font-semibold w-full text-right">
                  ${product.price.toFixed(2)}
                </div>
              </CardFooter>
            </Card>
          {/each}
        </div>
<div bind:this={sentinel} class="h-1"></div>

