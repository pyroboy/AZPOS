<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import BusinessOwnerDashboard from '$lib/components/dashboards/BusinessOwnerDashboard.svelte';
	import ManagerDashboard from '$lib/components/dashboards/ManagerDashboard.svelte';
	import PharmacistDashboard from '$lib/components/dashboards/PharmacistDashboard.svelte';

	export let data;
	const { user } = data;

	const dashboardMap: Record<string, any> = {
		admin: BusinessOwnerDashboard,
		owner: BusinessOwnerDashboard,
		manager: ManagerDashboard,
		pharmacist: PharmacistDashboard
	};

	onMount(() => {
		if (user?.role === 'cashier') {
			goto('/pos');
		}
	});

	const selectedDashboard = dashboardMap[user?.role];
</script>

{#if selectedDashboard}
	<svelte:component this={selectedDashboard} {user} />
{:else if user?.role !== 'cashier'}
	<div class="p-4">
		<h1 class="text-2xl font-bold">Welcome, {user?.full_name}</h1>
		<p>Your dashboard is not available at the moment.</p>
	</div>
{/if}


