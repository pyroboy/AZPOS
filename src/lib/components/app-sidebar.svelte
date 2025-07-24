<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import { page } from '$app/stores';
  import { navLinks } from '$lib/config/nav';

  $: user = $page.data.user;
  $: filteredLinks = user ? navLinks.filter((link) => link.roles.includes(user.role)) : [];
</script>

<Sidebar.Root>
  <Sidebar.Header>
    <h2 class="text-lg font-semibold">AZPOS</h2>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Application</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
                    {#each filteredLinks as link (link.href)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href={link.href} {...props}>
                    <link.icon class="h-4 w-4" />
                    <span>{link.label}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer>
        {#if user}
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Sidebar.MenuButton {...props} class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div class="flex flex-col items-start text-sm">
                                        <span>{user.full_name}</span>
                    <span class="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                  <ChevronUp class="ml-auto" />
                </Sidebar.MenuButton>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side="top" class="w-[--sidebar-width]">
              <DropdownMenu.Item>
                <a href="/settings" class="w-full">Settings</a>
              </DropdownMenu.Item>
              <DropdownMenu.Item>
                <a href="/auth/logout" class="w-full">
					Sign out
				</a>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    {/if}
  </Sidebar.Footer>
</Sidebar.Root>
