<script lang="ts">
    import { filteredProducts as products } from '$lib/stores/inventory/products';
    import { Badge } from '$lib/components/ui/badge';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';

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
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each $products as product (product.id)}
            <Card>
              <CardHeader class="p-0">
                <div 
                  class="rounded-t-lg h-40 w-full flex items-center justify-center font-bold text-4xl"
                  style="background-color: {getRandomColor(product.id)}; color: #555;"
                >
                  {getInitials(product.name)}
                </div>
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

