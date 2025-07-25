<script lang="ts">
  export let src: string | undefined | null = '';
  export let alt = 'Product image';

  let error = false;

  function handleError() {
    error = true;
  }
</script>

{#if src && !error}
  <img {src} {alt} class="h-16 w-16 object-cover rounded-md" on:error={handleError} />
{:else}
  <div class="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
    <span>No Img</span>
  </div>
{/if}
