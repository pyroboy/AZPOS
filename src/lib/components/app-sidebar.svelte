<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import HouseIcon from "@lucide/svelte/icons/house";
  import BarChartIcon from '@lucide/svelte/icons/bar-chart';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import UsersIcon from '@lucide/svelte/icons/users';
  import PackageIcon from '@lucide/svelte/icons/package';
  import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import { session } from "$lib/stores/sessionStore";

  // Menu items.
  const items = [
    {
      title: "Dashboard",
      url: "/",
      icon: HouseIcon,
    },
    {
      title: "POS",
      url: "/pos",
      icon: ShoppingCartIcon,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: PackageIcon,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: UsersIcon,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChartIcon,
    },

  ];
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
          {#each items as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href={item.url} {...props}>
                    <item.icon class="h-4 w-4" />
                    <span>{item.title}</span>
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
    {#if $session.currentUser}
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Sidebar.MenuButton {...props} class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div class="flex flex-col items-start text-sm">
                    <span>{$session.currentUser!.username}</span>
                    <span class="text-xs text-muted-foreground">{$session.currentUser!.role}</span>
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
