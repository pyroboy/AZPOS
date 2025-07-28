<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { useProfitMarginReport } from '$lib/data/profitMargin';
	import { useAuth } from '$lib/data/auth';
	import RoleGuard from '$lib/components/ui/RoleGuard.svelte';

	import {
		TrendingUp,
		TrendingDown,
		AlertTriangle,
		RefreshCw,
		DollarSign,
		Calculator
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Initialize auth hook
	const auth = useAuth();

	// Use data hooks with proper loading states
	const {
		salesWithProfit,
		totalRevenue,
		totalCogs,
		totalProfit,
		averageMargin,
		topProfitableProducts,
		lossProducts,
		profitMarginQuery,
		isLoading,
		isError,
		error,
		refetch
	} = useProfitMarginReport();

	// Access control using new auth pattern
	$effect(() => {
		if (auth.user && !auth.canViewReports) {
			console.warn('User does not have permission to view reports');
			goto('/');
		}
	});

	// Utility functions
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
	}

	function formatPercentage(value: number): string {
		return `${value.toFixed(2)}%`;
	}

	function getMarginBadgeVariant(margin: number): 'default' | 'secondary' | 'destructive' {
		if (margin < 0) return 'destructive';
		if (margin < 20) return 'secondary';
		return 'default';
	}

	// Handle refresh action
	function handleRefresh() {
		refetch();
	}
</script>

<RoleGuard
	roles={['admin', 'owner', 'manager']}
	permissions={['reports:view', 'reports:profit-margin']}
	requireStaffMode={true}
	requireAuthentication={true}
>
	<div class="space-y-6">
		<!-- Header Section -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Profit Margin Report</h1>
				<p class="text-muted-foreground mt-2">
					Comprehensive analysis of profit margins using FIFO (First-In, First-Out) costing
					methodology.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={handleRefresh}
					disabled={isLoading}
					class="flex items-center gap-2"
				>
					<RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
					Refresh
				</Button>
			</div>
		</div>

		<!-- Loading State -->
		{#if isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="flex items-center gap-3">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					<span class="text-muted-foreground font-medium">Loading profit margin data...</span>
				</div>
			</div>

			<!-- Error State -->
		{:else if isError}
			<Card.Root class="border-destructive/50 bg-destructive/5">
				<Card.Header>
					<Card.Title class="text-destructive flex items-center gap-2">
						<AlertTriangle class="h-5 w-5" />
						Error Loading Data
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground mb-4">
						{error?.message || 'Failed to load profit margin report. Please try again.'}
					</p>
					<Button variant="outline" onclick={handleRefresh} class="flex items-center gap-2">
						<RefreshCw class="h-4 w-4" />
						Try Again
					</Button>
				</Card.Content>
			</Card.Root>

			<!-- Data State -->
		{:else}
			<!-- Summary Cards -->
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">Total Revenue</Card.Title>
						<DollarSign class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
						<p class="text-xs text-muted-foreground mt-1">
							From {salesWithProfit.length} transactions
						</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">Total COGS</Card.Title>
						<Calculator class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatCurrency(totalCogs)}</div>
						<p class="text-xs text-muted-foreground mt-1">Using FIFO method</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">Total Profit</Card.Title>
						{#if totalProfit >= 0}
							<TrendingUp class="h-4 w-4 text-green-600" />
						{:else}
							<TrendingDown class="h-4 w-4 text-destructive" />
						{/if}
					</Card.Header>
					<Card.Content>
						<div
							class="text-2xl font-bold {totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}"
						>
							{formatCurrency(totalProfit)}
						</div>
						<p class="text-xs text-muted-foreground mt-1">Revenue - COGS</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">Average Margin</Card.Title
						>
						<Badge variant={getMarginBadgeVariant(averageMargin)} class="text-xs">
							{formatPercentage(averageMargin)}
						</Badge>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{formatPercentage(averageMargin)}</div>
						<p class="text-xs text-muted-foreground mt-1">Across all products</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Top Profitable Products (Admin/Owner only) -->
			<RoleGuard roles={['admin', 'owner']} requireStaffMode={true}>
				{#if topProfitableProducts.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<TrendingUp class="h-5 w-5 text-green-600" />
								Top Profitable Products
							</Card.Title>
							<Card.Description>Products generating the highest total profit</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								{#each topProfitableProducts.slice(0, 5) as product}
									<div class="flex items-center justify-between p-3 border rounded-lg">
										<div class="flex-1">
											<p class="font-medium">{product.productName}</p>
											<p class="text-sm text-muted-foreground">
												{product.salesCount} sales • {formatPercentage(product.averageMargin)} avg margin
											</p>
										</div>
										<div class="text-right">
											<p class="font-bold text-green-600">{formatCurrency(product.totalProfit)}</p>
											<p class="text-sm text-muted-foreground">
												{formatCurrency(product.totalRevenue)} revenue
											</p>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</RoleGuard>

			<!-- Loss Products Alert -->
			{#if lossProducts.length > 0}
				<Card.Root class="border-destructive/50 bg-destructive/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-destructive">
							<AlertTriangle class="h-5 w-5" />
							Products with Losses ({lossProducts.length})
						</Card.Title>
						<Card.Description>Sales that resulted in negative profit margins</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 max-h-48 overflow-y-auto">
							{#each lossProducts.slice(0, 10) as sale}
								<div class="flex items-center justify-between text-sm">
									<span class="font-medium">{sale.productName}</span>
									<div class="flex items-center gap-2">
										<span class="text-destructive font-mono">{formatCurrency(sale.profit)}</span>
										<Badge variant="destructive" class="text-xs">
											{formatPercentage(sale.profitMargin)}
										</Badge>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Detailed Sales Analysis -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Detailed Sales Analysis</Card.Title>
					<Card.Description>
						Complete breakdown of all transactions with profit calculations
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if salesWithProfit.length === 0}
						<div class="text-center py-12">
							<div class="text-muted-foreground mb-2">
								<DollarSign class="h-12 w-12 mx-auto mb-4 opacity-50" />
							</div>
							<h3 class="text-lg font-semibold mb-2">No Sales Data</h3>
							<p class="text-muted-foreground">No sales transactions found to analyze.</p>
						</div>
					{:else}
						<div class="rounded-md border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Product</Table.Head>
										<Table.Head class="text-right">Revenue</Table.Head>
										<Table.Head class="text-right">COGS (FIFO)</Table.Head>
										<Table.Head class="text-right">Profit</Table.Head>
										<Table.Head class="text-right">Margin</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each salesWithProfit as sale, index}
										<Table.Row class={index % 2 === 0 ? 'bg-muted/25' : ''}>
											<Table.Cell class="font-medium">{sale.productName}</Table.Cell>
											<Table.Cell class="text-right font-mono"
												>{formatCurrency(sale.revenue)}</Table.Cell
											>
											<Table.Cell class="text-right font-mono"
												>{formatCurrency(sale.costOfGoodsSold)}</Table.Cell
											>
											<Table.Cell
												class="text-right font-mono font-semibold {sale.profit < 0
													? 'text-destructive'
													: sale.profit > 0
														? 'text-green-600'
														: 'text-muted-foreground'}"
											>
												{formatCurrency(sale.profit)}
											</Table.Cell>
											<Table.Cell class="text-right">
												<Badge variant={getMarginBadgeVariant(sale.profitMargin)} class="font-mono">
													{formatPercentage(sale.profitMargin)}
												</Badge>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
	{#snippet fallback()}
		<div class="flex items-center justify-center min-h-[400px]">
			<Card.Root class="w-full max-w-md">
				<Card.Header class="text-center">
					<Card.Title class="flex items-center justify-center gap-2 text-muted-foreground">
						<AlertTriangle class="h-6 w-6" />
						Access Restricted
					</Card.Title>
				</Card.Header>
				<Card.Content class="text-center">
					<p class="text-muted-foreground mb-4">
						You don't have permission to view profit margin reports.
					</p>
					<p class="text-sm text-muted-foreground">
						This report requires manager, admin, or owner privileges in staff mode.
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/snippet}
</RoleGuard>
