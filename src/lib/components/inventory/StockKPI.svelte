<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	let {
		totalSKUs,
		totalUnits,
		itemsToReorderCount,
		outOfStockCount
	} = $props<{
		totalSKUs: number;
		totalUnits: number;
		itemsToReorderCount: number;
		outOfStockCount: number;
	}>();
</script>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total SKUs</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{totalSKUs}</div>
        </CardContent>
      </Card>
  
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Units in Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{totalUnits}</div>
        </CardContent>
      </Card>
  
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Items to Reorder</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{itemsToReorderCount}</div>
          <p class="text-xs text-muted-foreground">Based on reorder points</p>
        </CardContent>
      </Card>
  
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Out of Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-destructive">{outOfStockCount}</div>
        </CardContent>
      </Card>

