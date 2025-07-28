<script>
	import { Button } from '$lib/components/ui/button';
	import { Facebook, Twitter, Instagram } from 'lucide-svelte';
</script>

<footer class="border-t bg-background py-6">
	<div class="container mx-auto text-center">
		<p class="mb-4 text-sm">
			&copy; 2025 AZ Grocery. All rights reserved.
		</p>
		
		<div class="flex items-center justify-center space-x-4">
			<Button variant="ghost" size="sm">
				<Facebook class="h-5 w-5" />
				<span class="sr-only">Facebook</span>
			</Button>
			<Button variant="ghost" size="sm">
				<Twitter class="h-5 w-5" />
				<span class="sr-only">Twitter</span>
			</Button>
			<Button variant="ghost" size="sm">
				<Instagram class="h-5 w-5" />
				<span class="sr-only">Instagram</span>
			</Button>
		</div>
	</div>
</footer>
