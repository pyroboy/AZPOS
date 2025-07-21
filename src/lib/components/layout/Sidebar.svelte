<script lang="ts">
	import { page } from '$app/stores';
	import { navLinks, type NavLink } from '$lib/config/nav';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';

	// Get user directly from $page store. It's always up-to-date.
	const user = $derived($page.data.user);

	const filteredLinks = $derived<NavLink[]>(
		user ? navLinks.filter((link) => link.roles.includes(user.role)) : []
	);
</script>

<aside class="hidden w-64 flex-col border-r bg-background p-4 md:flex">
	<div class="mb-6 flex items-center gap-2">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="h-8 w-8">
			<rect width="256" height="256" fill="none"></rect>
			<path d="M43.6,136,21.9,96.5a8,8,0,0,1,7-11.9L77.1,96.8l21.3-63.8a8,8,0,0,1,15.2,0L135,96.8l48.2-12.2a8,8,0,0,1,7,11.9L168.4,136Z" opacity="0.2"></path>
			<path d="M232,128a7.9,7.9,0,0,1-8.5,7.5l-50.2-12.7-21.7,65.2a8,8,0,0,1-15.2,0L114.9,123l-50,4.2a8,8,0,0,1-7.9-9.1L78.7,32.4a8,8,0,0,1,15.2,0l21.3,63.8,21.3-63.8a8,8,0,0,1,15.2,0L173.4,96.3,224.5,84.1a8,8,0,0,1,7,11.9Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
		</svg>
		<h1 class="text-xl font-bold">AZPOS</h1>
	</div>
	<nav class="flex flex-1 flex-col gap-2">
		{#each filteredLinks as link (link.href)}
			<a href={link.href}>
				<Button
					variant={$page.url.pathname.startsWith(link.href) ? 'default' : 'ghost'}
					class="w-full justify-start gap-2"
				>
					{link.icon}
					{link.label}
				</Button>
			</a>
		{/each}
	</nav>
	{#if user}
		<div class="mt-auto border-t pt-4">
			<p class="font-semibold">{user.full_name}</p>
			<p class="text-sm text-muted-foreground capitalize">{user.role}</p>
			<form action="/login?/logout" method="POST" use:enhance>
				<Button variant="ghost" class="w-full justify-start px-0 text-muted-foreground hover:text-destructive">Logout</Button>
			</form>
		</div>
	{/if}
</aside>