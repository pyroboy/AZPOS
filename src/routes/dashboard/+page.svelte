<script lang="ts">
	import type { PageData } from './$types';
	import BusinessOwnerDashboard from '$lib/components/dashboards/BusinessOwnerDashboard.svelte';
	
	type DashboardRole = 'owner' | 'manager' | 'pharmacist';
	import ManagerDashboard from '$lib/components/dashboards/ManagerDashboard.svelte';
	import PharmacistDashboard from '$lib/components/dashboards/PharmacistDashboard.svelte';

	let { data }: { data: PageData } = $props();
	const user = data.user;

	const dashboards: { [key in DashboardRole]: any } = {
			owner: BusinessOwnerDashboard,
		manager: ManagerDashboard,
		pharmacist: PharmacistDashboard
	};

	// Default to a simple message if the role is not a dashboard role (e.g., admin, cashier)
	const dashboardComponent = dashboards[user?.role as DashboardRole] ?? null;

</script>

<div class="p-4">
    {#if dashboardComponent}
        {#if dashboardComponent === BusinessOwnerDashboard}
            <BusinessOwnerDashboard />
        {:else if dashboardComponent === ManagerDashboard}
            <ManagerDashboard />
        {:else if dashboardComponent === PharmacistDashboard}
            <PharmacistDashboard />
        {:else}
            <p>Welcome! You do not have a specific dashboard view.</p>
        {/if}
    {:else}
                <h1 class="text-2xl font-bold">Welcome, {user?.full_name}!</h1>
        <p>Your dashboard is coming soon.</p>
    {/if}
</div>
