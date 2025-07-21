<script lang="ts">
    import { filteredProducts as products } from '$lib/stores/inventory/products';
    import { Badge } from '$lib/components/ui/badge';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Checkbox } from '$lib/components/ui/checkbox';

    let selectedProductIds = $state<string[]>([]);

    function handleRowSelect(productId: string) {
        if (selectedProductIds.includes(productId)) {
            selectedProductIds = selectedProductIds.filter(id => id !== productId);
        } else {
            selectedProductIds = [...selectedProductIds, productId];
        }
    }

    function getStockBadgeColor(stock: number) {
      if (stock === 0) return 'destructive';
      if (stock < 20) return 'secondary';
      return 'outline';
    }
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each $products as product (product.id)}
            <Card class="relative">
              <div class="absolute top-2 left-2 z-10">
                <Checkbox
                  class="bg-background/80 border-2 border-primary"
                  checked={selectedProductIds.includes(product.id)}
                  onCheckedChange={() => handleRowSelect(product.id)}
                />
              </div>
  
              <CardHeader class="p-0">
                <img
                  src={product.image_url}
                  alt={product.name}
                  class="rounded-t-lg object-cover h-40 w-full"
                />
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

