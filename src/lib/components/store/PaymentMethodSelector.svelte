<!-- Agent: agent_coder | File: PaymentMethodSelector.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { CreditCard, Banknote, Smartphone } from 'lucide-svelte';

	// Props
	let { selectedMethod = $bindable('cash') } = $props();

	// Payment methods configuration
	const paymentMethods = [
		{
			id: 'cash',
			name: 'Cash',
			description: 'Pay with cash at pickup/delivery',
			icon: Banknote,
			available: true,
			processingFee: 0
		},
		{
			id: 'credit_card',
			name: 'Credit Card',
			description: 'Visa, Mastercard, American Express',
			icon: CreditCard,
			available: true,
			processingFee: 0
		},
		{
			id: 'debit_card',
			name: 'Debit Card',
			description: 'Pay directly from your bank account',
			icon: CreditCard,
			available: true,
			processingFee: 0
		}
	];

	// Handle method selection
	function selectMethod(methodId: string) {
		selectedMethod = methodId;
	}

	// Format processing fee
	function formatFee(fee: number): string {
		if (fee === 0) return 'No fee';
		return `+$${fee.toFixed(2)} fee`;
	}
</script>

<div class="space-y-3">
	{#each paymentMethods as method}
		<Card
			class={`cursor-pointer transition-all hover:shadow-md ${
				selectedMethod === method.id
					? 'ring-2 ring-primary border-primary'
					: 'hover:border-muted-foreground/50'
			} ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
			onclick={() => method.available && selectMethod(method.id)}
		>
			<CardContent class="p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<!-- Radio Button -->
						<div
							class={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
								selectedMethod === method.id
									? 'border-primary bg-primary'
									: 'border-muted-foreground'
							}`}
						>
							{#if selectedMethod === method.id}
								<div class="w-2 h-2 rounded-full bg-primary-foreground"></div>
							{/if}
						</div>

						<!-- Payment Method Icon -->
						<div
							class={`p-2 rounded-lg ${
								selectedMethod === method.id
									? 'bg-primary/10 text-primary'
									: 'bg-muted text-muted-foreground'
							}`}
						>
							{#if method.icon}
								{@const IconComponent = method.icon}
								<IconComponent class="h-5 w-5" />
							{/if}
						</div>

						<!-- Method Details -->
						<div>
							<div class="font-medium flex items-center gap-2">
								{method.name}
								{#if !method.available}
									<Badge variant="secondary" class="text-xs">Unavailable</Badge>
								{/if}
							</div>
							<div class="text-sm text-muted-foreground">
								{method.description}
							</div>
						</div>
					</div>

					<!-- Processing Fee -->
					<div class="text-right">
						<div
							class={`text-sm ${
								method.processingFee > 0 ? 'text-muted-foreground' : 'text-green-600'
							}`}
						>
							{formatFee(method.processingFee)}
						</div>
					</div>
				</div>

				<!-- Additional Info for Selected Method -->
				{#if selectedMethod === method.id}
					<div class="mt-3 pt-3 border-t">
						{#if method.id === 'cash'}
							<div class="text-sm text-muted-foreground">
								<p>• Please have exact change ready</p>
								<p>• Payment due at time of pickup/delivery</p>
								<p>• Receipt will be provided</p>
							</div>
						{:else if method.id === 'credit_card'}
							<div class="text-sm text-muted-foreground">
								<p>• Secure payment processing</p>
								<p>• All major credit cards accepted</p>
								<p>• Payment processed immediately</p>
							</div>
						{:else if method.id === 'debit_card'}
							<div class="text-sm text-muted-foreground">
								<p>• Direct bank account payment</p>
								<p>• Secure PIN verification</p>
								<p>• Payment processed immediately</p>
							</div>
						{/if}
					</div>
				{/if}
			</CardContent>
		</Card>
	{/each}

	<!-- Security Notice -->
	<div class="text-center pt-4">
		<div class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
			<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>All payments are processed securely</span>
		</div>
	</div>
</div>
