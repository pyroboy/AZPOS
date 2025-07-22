<script lang="ts">
    import { filteredProducts } from '$lib/stores/inventory/products';
	import * as Table from '$lib/components/ui/table/index.js';

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

  <Table.Root class="rounded-lg border bg-card text-card-foreground shadow-sm">
    <Table.Header>
      <Table.Row>
        <Table.Head class="w-[80px]">Image</Table.Head>
        <Table.Head>Name</Table.Head>
        <Table.Head>SKU</Table.Head>
        <Table.Head>Category</Table.Head>
        <Table.Head class="text-right">Stock</Table.Head>
        <Table.Head class="text-right">Price</Table.Head>
      </Table.Row>
    </Table.Header>

    <Table.Body>
      {#each $filteredProducts as product (product.id)}
        <Table.Row>
          <Table.Cell>
            <div 
              class="h-10 w-10 rounded-md flex items-center justify-center font-bold text-lg"
              style="background-color: {getRandomColor(product.id)}; color: #555;"
            >
              {getInitials(product.name)}
            </div>
          </Table.Cell>
          <Table.Cell class="font-medium">{product.name}</Table.Cell>
          <Table.Cell>{product.sku}</Table.Cell>
          <Table.Cell>{product.category_id}</Table.Cell>
          <Table.Cell class="text-right">{product.stock}</Table.Cell>
          <Table.Cell class="text-right">${product.price.toFixed(2)}</Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>

