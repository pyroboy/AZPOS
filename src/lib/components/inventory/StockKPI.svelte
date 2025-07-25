<script lang="ts">
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    
    // 🎯 Get meta from page data instead of store
    import { page } from '$app/stores';
    
    $: meta = $page.data.meta || {
        totalProducts: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0
    };
</script>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total SKUs</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{meta.totalProducts}</div>
        </CardContent>
      </Card>
  
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Units in Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{Math.round(meta.totalInventoryValue / 100)}</div>
        </CardContent>
      </Card>
  
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Items to Reorder</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{meta.lowStockCount}</div>
          <p class="text-xs text-muted-foreground">Based on reorder points</p>
        </CardContent>
      </Card>
  
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Out of Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-destructive">{meta.outOfStockCount}</div>
        </CardContent>
      </Card>

